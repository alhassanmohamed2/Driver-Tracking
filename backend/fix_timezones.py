"""
One-Time Migration Script: Fix Historical Data Timezones

This script will read all existing Trips and TripLogs from the database
and add 3 hours to their datetime fields. This shifts historical data
that was previously saved in UTC into Saudi Arabia Time (AST, UTC+3)
so that it aligns perfectly with the new application logic.

Usage:
1. Run this script ONCE in your production environment.
   python fix_timezones.py
"""

from datetime import timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Trip, TripLog

def fix_historical_timezones():
    db: Session = SessionLocal()
    try:
        # We are shifting everything by +3 hours
        shift = timedelta(hours=3)
        
        # 1. Update all general Trip start dates
        trips = db.query(Trip).all()
        trips_updated = 0
        for trip in trips:
            if trip.start_date:
                trip.start_date += shift
            
            # Also update flattened columns
            if trip.exit_factory_time:
                trip.exit_factory_time += shift
            if trip.arrive_warehouse_time:
                trip.arrive_warehouse_time += shift
            if trip.exit_warehouse_time:
                trip.exit_warehouse_time += shift
            if trip.arrive_factory_time:
                trip.arrive_factory_time += shift
            
            trips_updated += 1
            
        print(f"Updated {trips_updated} Trips (+3 hours).")

        # 2. Update all TripLog timestamps
        logs = db.query(TripLog).all()
        logs_updated = 0
        for log in logs:
            if log.timestamp:
                log.timestamp += shift
            logs_updated += 1
            
        print(f"Updated {logs_updated} TripLogs (+3 hours).")

        # Commit all changes to the database
        db.commit()
        print("Migration complete. All historical data is now in Saudi Time (AST).")

    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    confirm = input("WARNING: This will add 3 hours to all datetimes in the database. Only run this ONCE. Proceed? (y/N): ")
    if confirm.lower() == 'y':
        fix_historical_timezones()
    else:
        print("Migration aborted.")
