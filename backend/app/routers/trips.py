from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from sqlalchemy import func
import pytz
from .. import database, models, schemas
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
        
    saudi_tz = pytz.timezone('Asia/Riyadh')
    start_date = datetime.now(saudi_tz).replace(tzinfo=None)
    new_trip = models.Trip(driver_id=current_user.id, start_date=start_date)
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

    saudi_tz = pytz.timezone('Asia/Riyadh')
    today = datetime.now(saudi_tz).replace(tzinfo=None)
    
    new_log = models.TripLog(trip_id=trip.id, timestamp=today, **log.dict())
    db.add(new_log)
    
    # Update flattened columns
    if log.state == models.TripState.EXIT_FACTORY:
        trip.exit_factory_time = today
        trip.exit_factory_address = log.address
    elif log.state == models.TripState.ARRIVE_WAREHOUSE:
        trip.arrive_warehouse_time = today
        trip.arrive_warehouse_address = log.address
    elif log.state == models.TripState.EXIT_WAREHOUSE:
        trip.exit_warehouse_time = today
        trip.exit_warehouse_address = log.address
    elif log.state == models.TripState.ARRIVE_FACTORY:
        trip.arrive_factory_time = today
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
