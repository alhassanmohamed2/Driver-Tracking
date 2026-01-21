from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import Response
from typing import List, Optional
import pandas as pd
from io import BytesIO
from .. import database, models, schemas
from .auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

def check_admin(user: models.User):
    if user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin privileges required")

@router.get("/trips", response_model=List[schemas.Trip])
def get_all_trips(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    trips = db.query(models.Trip).all()
    return trips

@router.get("/cars", response_model=List[schemas.Car])
def get_cars(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    return db.query(models.Car).all()

@router.post("/cars", response_model=schemas.Car)
def create_car(car: schemas.CarCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    existing = db.query(models.Car).filter(models.Car.plate == car.plate).first()
    if existing:
        raise HTTPException(status_code=400, detail="Car plate already exists")
    new_car = models.Car(**car.dict())
    db.add(new_car)
    db.commit()
    db.refresh(new_car)
    return new_car

@router.delete("/cars/{car_id}")
def delete_car(car_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    car = db.query(models.Car).filter(models.Car.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    if car.drivers: 
        raise HTTPException(status_code=400, detail="Cannot delete car assigned to drivers. Unassign first.")
    db.delete(car)
    db.commit()
    return {"message": "Car deleted"}

@router.post("/drivers", response_model=schemas.User)
def create_driver(user: schemas.UserCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    from .auth import get_password_hash 
    
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        username=user.username, 
        hashed_password=hashed_password, 
        role=models.UserRole.DRIVER,
        car_id=user.car_id # Using car_id now
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/change-password")
def change_admin_password(payload: schemas.PasswordChange, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    from .auth import get_password_hash
    current_user.hashed_password = get_password_hash(payload.password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.put("/drivers/{driver_id}", response_model=schemas.User)
def update_driver(driver_id: int, user: schemas.UserUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    db_user = db.query(models.User).filter(models.User.id == driver_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    if user.username:
        existing = db.query(models.User).filter(models.User.username == user.username).first()
        if existing and existing.id != driver_id:
             raise HTTPException(status_code=400, detail="Username already taken")
        db_user.username = user.username
        
    if user.car_id is not None:
        db_user.car_id = user.car_id
        
    if user.password:
        from .auth import get_password_hash
        db_user.hashed_password = get_password_hash(user.password)
        
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/drivers/{driver_id}")
def delete_driver(driver_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    db_user = db.query(models.User).filter(models.User.id == driver_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Driver not found")
        
    db.delete(db_user)
    db.commit()
    return {"message": "Driver deleted successfully"}

@router.get("/drivers-list", response_model=List[schemas.User])
def get_drivers(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    from sqlalchemy.orm import joinedload
    drivers = db.query(models.User).options(joinedload(models.User.car)).filter(models.User.role == models.UserRole.DRIVER).all()
    return drivers

@router.get("/export")
def export_trips(driver_id: Optional[int] = None, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    
    # Query trips with logs
    from sqlalchemy.orm import joinedload
    query = db.query(models.Trip).options(joinedload(models.Trip.logs), joinedload(models.Trip.driver).joinedload(models.User.car))
    if driver_id:
        query = query.filter(models.Trip.driver_id == driver_id)
    
    trips = query.all()

    data = []
    for trip in trips:
        logs = sorted(trip.logs, key=lambda x: x.timestamp)
        def get_logs_str(state):
            relevant = [l for l in logs if l.state == state]
            if not relevant: return ""
            return " | ".join([f"{l.address or 'N/A'} ({l.timestamp.strftime('%Y-%m-%d %H:%M')})" for l in relevant])

        row = {
            "Trip ID": trip.id,
            "Driver": trip.driver.username if trip.driver else "Unknown",
            "Car Plate": trip.driver.car.plate if trip.driver and trip.driver.car else "N/A",
            "Start Date": trip.start_date.strftime("%Y-%m-%d %H:%M") if trip.start_date else "",
            "Status": trip.status.value,
            "Exit Factory": get_logs_str(models.TripState.exit_factory),
            "Arrive Warehouse": get_logs_str(models.TripState.arrive_warehouse),
            "Exit Warehouse": get_logs_str(models.TripState.exit_warehouse),
            "Arrive Factory": get_logs_str(models.TripState.arrive_factory),
        }
        data.append(row)

    df = pd.DataFrame(data)
    
    filename = "trips_export.xlsx"
    if driver_id and trips:
         driver = trips[0].driver
         if driver:
             clean_user = driver.username.replace(" ", "_")
             # Use related car plate
             clean_plate = (driver.car.plate if driver.car else "NoPlate").replace(" ", "")
             filename = f"{clean_user}_{clean_plate}.xlsx"

    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Trips')
        worksheet = writer.sheets['Trips']
        for i, col in enumerate(df.columns):
            max_len = max(df[col].astype(str).map(len).max(), len(col)) + 2
            worksheet.set_column(i, i, max_len)
            
    output.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return Response(content=output.getvalue(), media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers=headers)
