from fastapi import UploadFile, File
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi.responses import Response
from typing import List, Optional
from datetime import datetime
import pandas as pd
from io import BytesIO
from .. import database, models, schemas
from ..timezone import ensure_saudi_naive, now_saudi
from ..utils import calculate_trip_distance, estimate_fuel_consumption
from .auth import get_current_user
from ..services.backup import create_backup, restore_backup, get_backup_list
from ..services.scheduler import update_backup_schedule
import asyncio
from fastapi.concurrency import run_in_threadpool

router = APIRouter(prefix="/admin", tags=["admin"])

# Global lock to prevent concurrent mysqldump/restore operations
backup_lock = asyncio.Lock()

def check_admin(user: models.User):
    if user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin privileges required")

@router.get("/trips", response_model=List[schemas.Trip])
def get_all_trips(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    trips = db.query(models.Trip).options(
        joinedload(models.Trip.driver),
        joinedload(models.Trip.car),
        selectinload(models.Trip.logs)
    ).order_by(models.Trip.id.desc()).all()
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

@router.put("/cars/{car_id}", response_model=schemas.Car)
def update_car(car_id: int, car_update: schemas.CarUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    check_admin(current_user)
    car = db.query(models.Car).filter(models.Car.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    
    if car_update.plate and car_update.plate != car.plate:
        existing = db.query(models.Car).filter(models.Car.plate == car_update.plate).first()
        if existing:
            raise HTTPException(status_code=400, detail="Car plate already exists")
    
    update_data = car_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(car, key, value)
    
    db.commit()
    db.refresh(car)
    return car

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
    
    update_data = user.dict(exclude_unset=True)
    
    if "username" in update_data:
        new_username = update_data["username"]
        existing = db.query(models.User).filter(models.User.username == new_username).first()
        if existing and existing.id != driver_id:
             raise HTTPException(status_code=400, detail="Username already taken")
        db_user.username = new_username
        
    if "car_id" in update_data:
        db_user.car_id = update_data["car_id"]
        
    if "password" in update_data:
        from .auth import get_password_hash
        db_user.hashed_password = get_password_hash(update_data["password"])
        
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
        trip.start_date = ensure_saudi_naive(trip_update.start_date)
    
    # Excel Report Fields
    if trip_update.waiting_reason is not None:
        trip.waiting_reason = trip_update.waiting_reason
    if trip_update.estimated_trip_time is not None:
        trip.estimated_trip_time = trip_update.estimated_trip_time
    if trip_update.destination_city is not None:
        trip.destination_city = trip_update.destination_city
        
    if trip_update.logs is not None:
        # 1. Identify existing logs vs logs to delete
        current_logs = db.query(models.TripLog).filter(models.TripLog.trip_id == trip_id).all()
        current_log_ids = {log.id for log in current_logs}
        received_log_ids = {l.id for l in trip_update.logs if l.id is not None}
        
        logs_to_delete = current_log_ids - received_log_ids
        if logs_to_delete:
            db.query(models.TripLog).filter(models.TripLog.id.in_(logs_to_delete)).delete(synchronize_session=False)

        # 2. Update or Create logs
        for log_data in trip_update.logs:
            if log_data.id:
                # Update existing
                log = db.query(models.TripLog).filter(models.TripLog.id == log_data.id).first()
                if log:
                    if log_data.timestamp is not None:
                        log.timestamp = ensure_saudi_naive(log_data.timestamp)
                    if log_data.address is not None:
                        log.address = log_data.address
                    if log_data.state is not None:
                        log.state = log_data.state
            else:
                # Create new
                new_log = models.TripLog(
                    trip_id=trip_id,
                    state=log_data.state,
                    timestamp=ensure_saudi_naive(log_data.timestamp) if log_data.timestamp else now_saudi(),
                    address=log_data.address,
                    latitude=0.0,
                    longitude=0.0
                )
                db.add(new_log)

        # 3. Re-sync flattened columns from ALL current logs (after changes)
        db.flush() # Ensure new logs have IDs if needed, though we query again
        all_logs = db.query(models.TripLog).filter(models.TripLog.trip_id == trip_id).all()
        
        # Reset flattened columns
        trip.exit_factory_time = None
        trip.exit_factory_address = None
        trip.arrive_warehouse_time = None
        trip.arrive_warehouse_address = None
        trip.exit_warehouse_time = None
        trip.exit_warehouse_address = None
        trip.arrive_factory_time = None
        trip.arrive_factory_address = None
        
        # Re-populate (sort by timestamp so last state wins if multiples, though usually it's unique)
        for log in sorted(all_logs, key=lambda x: x.id):
            if log.state == models.TripState.EXIT_FACTORY:
                trip.exit_factory_time = log.timestamp
                trip.exit_factory_address = log.address
            elif log.state == models.TripState.ARRIVE_WAREHOUSE:
                trip.arrive_warehouse_time = log.timestamp
                trip.arrive_warehouse_address = log.address
            elif log.state == models.TripState.EXIT_WAREHOUSE:
                trip.exit_warehouse_time = log.timestamp
                trip.exit_warehouse_address = log.address
            elif log.state == models.TripState.ARRIVE_FACTORY:
                trip.arrive_factory_time = log.timestamp
                trip.arrive_factory_address = log.address

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
            "Car Plate": (trip.car.plate if trip.car else (trip.driver.car.plate if trip.driver and trip.driver.car else "N/A")),
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

# --- Backup Endpoints ---

@router.get("/backups")
def list_backups(current_user: models.User = Depends(get_current_user)):
    check_admin(current_user)
    try:
        backups = get_backup_list()
        return {"backups": backups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/backups/create")
async def trigger_backup(current_user: models.User = Depends(get_current_user)):
    check_admin(current_user)
    
    if backup_lock.locked():
        raise HTTPException(status_code=429, detail="A backup operation is already in progress. Please wait.")
        
    async with backup_lock:
        try:
            filename = await run_in_threadpool(create_backup)
            return {"message": "Backup created successfully", "filename": filename}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/backups/restore/{filename}")
async def trigger_restore(filename: str, current_user: models.User = Depends(get_current_user)):
    check_admin(current_user)
    
    if backup_lock.locked():
        raise HTTPException(status_code=429, detail="A backup or restore operation is already in progress. Please wait.")
        
    async with backup_lock:
        try:
            await run_in_threadpool(restore_backup, filename)
            return {"message": f"Database restored from {filename} successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/backup-settings")
def save_backup_settings(
    settings: dict, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(database.get_db)
):
    check_admin(current_user)
    
    # settings = {"enabled": True/False, "time": "03:00"}
    time_val = settings.get("time", "03:00")
    enabled_val = "1" if settings.get("enabled", True) else "0"
    
    # Save to db
    for key, value in [("backup_enabled", enabled_val), ("backup_time", time_val)]:
        db_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if db_setting:
            db_setting.value = value
        else:
            db.add(models.SystemSetting(key=key, value=value))
            
    db.commit()
    
    # Update scheduler dynamically
    h, m = map(int, time_val.split(":"))
    try:
        update_backup_schedule(hour=h, minute=m, is_enabled=(enabled_val == "1"))
    except Exception as e:
        print(f"Failed to dynamically update scheduler: {e}")
        
    return {"message": "Backup settings saved"}

@router.get("/fuel-reports")
def get_fuel_reports(
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(database.get_db)
):
    check_admin(current_user)
    
    # Get all trips with their logs and fuel logs
    trips = db.query(models.Trip).all()
    
    reports = []
    for trip in trips:
        distance = calculate_trip_distance(trip.logs)
        estimated_consumption = estimate_fuel_consumption(distance, trip.car.plate if trip.car else None)
        actual_refills = sum(f.amount_liters for f in trip.fuel_logs if f.amount_liters)
        
        reports.append({
            "id": trip.id,
            "driver_name": trip.driver.username if trip.driver else "Unknown",
            "car_plate": trip.car.plate if trip.car else "Unknown",
            "distance_km": round(distance, 2),
            "estimated_consumption_liters": round(estimated_consumption, 2),
            "actual_refills_liters": round(actual_refills, 2),
            "discrepancy": round(actual_refills - estimated_consumption, 2),
            "status": trip.status,
            "fuel_logs": [
                {
                    "id": f.id,
                    "timestamp": f.timestamp,
                    "amount": f.amount_liters,
                    "indicator_img": f.indicator_image_url,
                    "machine_img": f.machine_image_url,
                    "address": f.address
                } for f in trip.fuel_logs
            ]
        })
        
    return reports

