from fastapi import UploadFile, File
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

@router.put("/trips/{trip_id}", response_model=schemas.Trip)
def update_trip(trip_id: int, trip_update: schemas.TripUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip_update.driver_id is not None:
        trip.driver_id = trip_update.driver_id
    if trip_update.status is not None:
        trip.status = trip_update.status
    if trip_update.start_date is not None:
        trip.start_date = trip_update.start_date
        
    if trip_update.logs:
        for log_update in trip_update.logs:
            log = db.query(models.TripLog).filter(models.TripLog.id == log_update.id, models.TripLog.trip_id == trip_id).first()
            if log:
                if log_update.timestamp is not None:
                    log.timestamp = log_update.timestamp
                if log_update.address is not None:
                    log.address = log_update.address
                if log_update.state is not None:
                    log.state = log_update.state

    db.commit()
    db.refresh(trip)
    return trip

@router.delete("/trips/{trip_id}")
def delete_trip(trip_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Manually delete logs first to be safe (cascade might not be set in DB)
    db.query(models.TripLog).filter(models.TripLog.trip_id == trip_id).delete()
    
    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted successfully"}

@router.get("/export")
def export_trips(
    driver_id: Optional[int] = None, 
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(database.get_db)
):
    check_admin(current_user)
    
    # Query trips with logs
    from sqlalchemy.orm import joinedload
    query = db.query(models.Trip).options(joinedload(models.Trip.logs), joinedload(models.Trip.driver).joinedload(models.User.car))
    
    if driver_id:
        query = query.filter(models.Trip.driver_id == driver_id)
    
    from datetime import datetime
    if start_date:
        try:
            # Assuming start_date comes as YYYY-MM-DD
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(models.Trip.start_date >= start_dt)
        except ValueError:
            pass # Ignore invalid date format
            
    if end_date:
        try:
            # Assuming end_date comes as YYYY-MM-DD
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            # Set time to end of day
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
            query = query.filter(models.Trip.start_date <= end_dt)
        except ValueError:
            pass # Ignore invalid date format
    
    trips = query.all()

    data = []
    for trip in trips:
        logs = sorted(trip.logs, key=lambda x: x.timestamp)
        
        def get_log_parts(state):
            relevant = [l for l in logs if l.state == state]
            if not relevant: return "", ""
            # Join multiple entries if they exist (e.g. multiple warehouses)
            times = " | ".join([l.timestamp.strftime('%Y-%m-%d %H:%M') for l in relevant])
            locs = " | ".join([l.address or 'N/A' for l in relevant])
            return times, locs

        ef_time, ef_loc = get_log_parts(models.TripState.EXIT_FACTORY)
        aw_time, aw_loc = get_log_parts(models.TripState.ARRIVE_WAREHOUSE)
        ew_time, ew_loc = get_log_parts(models.TripState.EXIT_WAREHOUSE)
        af_time, af_loc = get_log_parts(models.TripState.ARRIVE_FACTORY)

        row = {
            "Trip ID": trip.id,
            "Driver": trip.driver.username if trip.driver else "Unknown",
            "Car Plate": trip.driver.car.plate if trip.driver and trip.driver.car else "N/A",
            "Start Date": trip.start_date.strftime("%Y-%m-%d %H:%M") if trip.start_date else "",
            "Status": trip.status.value,
            "Exit Factory Time": ef_time,
            "Exit Factory Location": ef_loc,
            "Arrive Warehouse Time": aw_time,
            "Arrive Warehouse Location": aw_loc,
            "Exit Warehouse Time": ew_time,
            "Exit Warehouse Location": ew_loc,
            "Arrive Factory Time": af_time,
            "Arrive Factory Location": af_loc,
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

@router.get("/settings")
def get_settings(db: Session = Depends(database.get_db)):
    # Public endpoint for branding
    settings = db.query(models.SystemSetting).all()
    return {s.key: s.value for s in settings}

@router.put("/settings")
def update_settings(settings: dict, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    for key, value in settings.items():
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if setting:
            setting.value = value
        else:
            db.add(models.SystemSetting(key=key, value=value))
    db.commit()
    return {"message": "Settings updated"}

@router.post("/upload-logo")
def upload_logo(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    check_admin(current_user)
    import shutil
    import os
    
    file_location = f"app/static/logo.png"
    with open(file_location, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": "/static/logo.png"}
