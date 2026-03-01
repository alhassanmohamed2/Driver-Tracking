import requests
from datetime import datetime

base_url = "http://localhost:8003"
resp = requests.post(f"{base_url}/auth/token", data={"username": "admin", "password": "admin123"})
if resp.status_code != 200:
    print("Admin login failed")
    exit(1)
token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

drivers = requests.get(f"{base_url}/admin/drivers-list", headers=headers).json()
if not drivers:
    requests.post(f"{base_url}/admin/drivers", json={"username": "testdriver3", "password": "123", "car_id": None}, headers=headers)
    drivers = requests.get(f"{base_url}/admin/drivers-list", headers=headers).json()
driver_id = drivers[-1]["id"]
print("Driver ID:", driver_id)

resp = requests.post(f"{base_url}/auth/token", data={"username": "testdriver3", "password": "123"})
if resp.status_code != 200:
    print("Driver login failed", resp.json())
    exit(1)
d_token = resp.json()["access_token"]
d_headers = {"Authorization": f"Bearer {d_token}"}

trip = requests.post(f"{base_url}/trips/", headers=d_headers).json()
trip_id = trip["id"]
print("Created Trip ID:", trip_id)
print("Created Trip Start Date:", trip.get("start_date"))

payload = {
    "driver_id": driver_id,
    "status": "in_progress",
    "start_date": "2026-03-01T02:40",
    "logs": []
}
ret = requests.put(f"{base_url}/admin/trips/{trip_id}", json=payload, headers=headers)
print("Naive Update Start Date:", ret.json().get("start_date"))

payload2 = {
    "driver_id": driver_id,
    "status": "in_progress",
    "start_date": "2026-03-01T02:40:00Z",
    "logs": []
}
ret2 = requests.put(f"{base_url}/admin/trips/{trip_id}", json=payload2, headers=headers)
print("ZUpdate Start Date:", ret2.json().get("start_date"))

