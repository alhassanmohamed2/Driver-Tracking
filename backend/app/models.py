from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from .database import Base
import enum
from datetime import datetime

class UserRole(str, enum.Enum):
    DRIVER = "driver"
    ADMIN = "admin"

class TripStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class TripState(str, enum.Enum):
    EXIT_FACTORY = "Exit Factory"
    ARRIVE_WAREHOUSE = "Arrival at Warehouse"
    EXIT_WAREHOUSE = "Exit Warehouse"
    ARRIVE_FACTORY = "Arrival at Factory"

class CarStatus(str, enum.Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"

class Car(Base):
    __tablename__ = "cars"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String(20), unique=True, index=True)
    model = Column(String(50))
    status = Column(Enum(CarStatus), default=CarStatus.ACTIVE)

    drivers = relationship("User", back_populates="car")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(100))
    role = Column(Enum(UserRole), default=UserRole.DRIVER)
    car_id = Column(Integer, ForeignKey("cars.id"), nullable=True)
    
    # Legacy support / Denormalization can be removed if we migrate fully
    # car_plate = Column(String(20), nullable=True) 

    car = relationship("Car", back_populates="drivers")
    trips = relationship("Trip", back_populates="driver", cascade="all, delete-orphan")

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"))
    start_date = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(TripStatus), default=TripStatus.IN_PROGRESS)
    
    # Flattened timestamps for report
    exit_factory_time = Column(DateTime, nullable=True)
    exit_factory_address = Column(String(255), nullable=True)
    arrive_warehouse_time = Column(DateTime, nullable=True)
    arrive_warehouse_address = Column(String(255), nullable=True)
    exit_warehouse_time = Column(DateTime, nullable=True)
    exit_warehouse_address = Column(String(255), nullable=True)
    arrive_factory_time = Column(DateTime, nullable=True)
    arrive_factory_address = Column(String(255), nullable=True)

    driver = relationship("User", back_populates="trips")
    logs = relationship("TripLog", back_populates="trip")

class TripLog(Base):
    __tablename__ = "trip_logs"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    state = Column(Enum(TripState))
    timestamp = Column(DateTime, default=datetime.utcnow)
    latitude = Column(Float)
    longitude = Column(Float)
    address = Column(String(255), nullable=True)

    trip = relationship("Trip", back_populates="logs")
