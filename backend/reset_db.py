from app.database import engine, Base
from app.models import User, Trip, TripLog, Car

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Creating all tables...")
Base.metadata.create_all(bind=engine)
print("Tables created.")

from app.routers.auth import get_password_hash
from sqlalchemy.orm import Session
db = Session(bind=engine)

print("Creating default admin...")
admin = User(username="admin", hashed_password=get_password_hash("admin123"), role="admin")
db.add(admin)
db.commit()
print("Default admin created (admin/admin123).")
print("Database reset complete.")
