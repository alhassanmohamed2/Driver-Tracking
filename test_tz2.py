import requests
base_url = "http://localhost:8003"
resp = requests.post(f"{base_url}/auth/token", data={"username": "admin", "password": "admin123"})
token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

drivers = requests.get(f"{base_url}/admin/drivers-list", headers=headers).json()
driver_id = drivers[-1]["id"]
d_username = drivers[-1]["username"]

d_resp = requests.post(f"{base_url}/auth/token", data={"username": d_username, "password": "123"})
d_token = d_resp.json()["access_token"]
d_headers = {"Authorization": f"Bearer {d_token}"}

trip = requests.post(f"{base_url}/trips/", headers=d_headers).json()
trip_id = trip["id"]
print("Created Trip Start Date:", trip.get("start_date"))

payload = {
    "driver_id": driver_id,
    "status": "in_progress",
    "start_date": "2026-03-01T02:40",
    "logs": []
}
ret = requests.put(f"{base_url}/admin/trips/{trip_id}", json=payload, headers=headers)
print("Naive Update Start Date:", ret.json().get("start_date"))
