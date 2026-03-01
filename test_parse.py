from pydantic import BaseModel
from datetime import datetime

class TripUpdate(BaseModel):
    start_date: datetime

print(repr(TripUpdate(start_date="2026-03-01T04:00").start_date))
print(repr(TripUpdate(start_date="2026-03-01T04:00Z").start_date))
