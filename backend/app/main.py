from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, trips, admin

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Driver Trip Tracker")

# CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8547",
    "*" # For ease of development, tighten in prod
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"message": "Driver Tracker API is running"}

@app.on_event("startup")
def startup_event():
    from .database import SessionLocal
    from . import models
    from .routers.auth import get_password_hash
    db = SessionLocal()
    try:
        # Create default admin
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            admin_user = models.User(
                username="admin", 
                hashed_password=get_password_hash("admin123"), 
                role=models.UserRole.ADMIN
            )
            db.add(admin_user)
            print("Created default admin user: admin/admin123")

        # Create default driver
        driver = db.query(models.User).filter(models.User.username == "driver").first()
        if not driver:
            driver_user = models.User(
                username="driver", 
                hashed_password=get_password_hash("driver123"), 
                role=models.UserRole.DRIVER
            )
            db.add(driver_user)
            print("Created default driver user: driver/driver123")
        
        db.commit()
    finally:
        db.close()
