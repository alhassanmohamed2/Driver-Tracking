from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import uuid
from sqlalchemy import func
from .. import database, models, schemas
from ..timezone import now_saudi
from .auth import get_current_user

router = APIRouter(prefix="/trips", tags=["trips"])

@router.post("/", response_model=schemas.Trip)
def start_trip(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    if current_user.role != models.UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can start trips")
    
    # Check if there is an active trip
    active_trip = db.query(models.Trip).filter(
        models.Trip.driver_id == current_user.id, 
        models.Trip.status == models.TripStatus.IN_PROGRESS
    ).first()
    
    if active_trip:
        return active_trip
        
    new_trip = models.Trip(
        driver_id=current_user.id, 
        car_id=current_user.car_id, 
        start_date=now_saudi()
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    return new_trip

@router.get("/active", response_model=schemas.Trip)
def get_active_trip(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    active_trip = db.query(models.Trip).filter(
        models.Trip.driver_id == current_user.id, 
        models.Trip.status == models.TripStatus.IN_PROGRESS
    ).first()
    if not active_trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    return active_trip

@router.post("/{trip_id}/logs", response_model=schemas.TripLog)
def add_trip_log(
    trip_id: int, 
    log: schemas.TripLogCreate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(database.get_db)
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    if trip.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to log for this trip")
        
    if trip.status == models.TripStatus.COMPLETED:
         raise HTTPException(status_code=400, detail="Trip is already completed")

    saudi_now = now_saudi()
    
    new_log = models.TripLog(trip_id=trip.id, timestamp=saudi_now, **log.dict())
    db.add(new_log)
    
    # Update flattened columns
    if log.state == models.TripState.EXIT_FACTORY:
        trip.exit_factory_time = saudi_now
        trip.exit_factory_address = log.address
    elif log.state == models.TripState.ARRIVE_WAREHOUSE:
        trip.arrive_warehouse_time = saudi_now
        trip.arrive_warehouse_address = log.address
    elif log.state == models.TripState.EXIT_WAREHOUSE:
        trip.exit_warehouse_time = saudi_now
        trip.exit_warehouse_address = log.address
    elif log.state == models.TripState.ARRIVE_FACTORY:
        trip.arrive_factory_time = saudi_now
        trip.arrive_factory_address = log.address
        trip.status = models.TripStatus.COMPLETED
    
    db.commit()
    db.refresh(new_log)
    return new_log

@router.get("/history", response_model=List[schemas.Trip])
def get_trip_history(
    month: int = None,
    year: int = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get driver's completed trip history, optionally filtered by month/year"""
    if current_user.role != models.UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can access trip history")
    
    query = db.query(models.Trip).filter(
        models.Trip.driver_id == current_user.id,
        models.Trip.status == models.TripStatus.COMPLETED
    )
    
    # Filter by month/year if provided
    if year:
        query = query.filter(func.year(models.Trip.start_date) == year)
    if month:
        query = query.filter(func.month(models.Trip.start_date) == month)
    
    trips = query.order_by(models.Trip.start_date.desc()).all()
    return trips

@router.post("/{trip_id}/fuel", response_model=schemas.FuelLog)
async def log_fuel_refill(
    trip_id: int,
    amount_liters: float = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    address: Optional[str] = Form(None),
    indicator_img: UploadFile = File(...),
    machine_img: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Save images
    # We use app/static/fuel internally, but served as /static/fuel
    base_dir = "app/static/fuel"
    if not os.path.exists(base_dir):
        os.makedirs(base_dir, exist_ok=True)

    indicator_fn = f"{trip_id}_ind_{uuid.uuid4().hex[:8]}.png"
    machine_fn = f"{trip_id}_mac_{uuid.uuid4().hex[:8]}.png"

    with open(f"{base_dir}/{indicator_fn}", "wb") as f:
        f.write(await indicator_img.read())
    with open(f"{base_dir}/{machine_fn}", "wb") as f:
        f.write(await machine_img.read())

    new_fuel_log = models.FuelLog(
        trip_id=trip_id,
        driver_id=current_user.id,
        amount_liters=amount_liters,
        latitude=latitude,
        longitude=longitude,
        address=address,
        indicator_image_url=f"/static/fuel/{indicator_fn}",
        machine_image_url=f"/static/fuel/{machine_fn}",
        timestamp=now_saudi()
    )
    db.add(new_fuel_log)
    db.commit()
    db.refresh(new_fuel_log)
    return new_fuel_log
