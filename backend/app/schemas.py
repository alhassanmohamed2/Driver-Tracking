from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .models import UserRole, TripStatus, TripState, CarStatus

class CarBase(BaseModel):
    plate: str
    model: str
    status: CarStatus = CarStatus.ACTIVE

class CarCreate(CarBase):
    pass

class CarUpdate(BaseModel):
    plate: Optional[str] = None
    model: Optional[str] = None
    status: Optional[CarStatus] = None

class Car(CarBase):
    id: int
    
    class Config:
        orm_mode = True

class UserBase(BaseModel):
    username: str
    car_id: Optional[int] = None
    car_plate: Optional[str] = None # Output only

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.DRIVER

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    car_id: Optional[int] = None

class PasswordChange(BaseModel):
    password: str

class User(UserBase):
    id: int
    role: UserRole
    car: Optional[Car] = None

    class Config:
        orm_mode = True

class TripLogBase(BaseModel):
    state: TripState
    latitude: float
    longitude: float
    address: Optional[str] = None

class TripLogCreate(TripLogBase):
    pass

class TripLog(TripLogBase):
    id: int
    trip_id: int
    timestamp: datetime

    class Config:
        orm_mode = True

class TripBase(BaseModel):
    pass

class TripCreate(TripBase):
    pass # Driver comes from token

class Trip(TripBase):
    id: int
    driver_id: int
    start_date: datetime
    status: TripStatus
    exit_factory_time: Optional[datetime] = None
    exit_factory_address: Optional[str] = None
    arrive_warehouse_time: Optional[datetime] = None
    arrive_warehouse_address: Optional[str] = None
    exit_warehouse_time: Optional[datetime] = None
    exit_warehouse_address: Optional[str] = None
    arrive_factory_time: Optional[datetime] = None
    arrive_factory_address: Optional[str] = None
    logs: List[TripLog] = []
    driver: Optional[User] = None

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    user_id: int

class TokenData(BaseModel):
    username: Optional[str] = None
