import math

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
        
    # Radius of the Earth in km
    R = 6371.0
    
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi / 2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
        
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def calculate_trip_distance(logs):
    """
    Calculate total distance of a trip based on its logs.
    logs should be a list of TripLog objects or dicts with latitude/longitude.
    """
    if not logs or len(logs) < 2:
        return 0.0
    
    total_distance = 0.0
    # Sort logs by timestamp if they are objects, or rely on order if they are from DB relationship
    # SQLAlchemy relationships are usually ordered by ID or whatever is defined, but let's be safe.
    try:
        sorted_logs = sorted(logs, key=lambda x: getattr(x, 'timestamp', 0))
    except:
        sorted_logs = logs

    for i in range(len(sorted_logs) - 1):
        l1 = sorted_logs[i]
        l2 = sorted_logs[i+1]
        
        lat1 = getattr(l1, 'latitude', None)
        lon1 = getattr(l1, 'longitude', None)
        lat2 = getattr(l2, 'latitude', None)
        lon2 = getattr(l2, 'longitude', None)
        
        if lat1 is not None and lat2 is not None:
            total_distance += haversine(lat1, lon1, lat2, lon2)
            
    return total_distance

def estimate_fuel_consumption(distance_km, car_plate=None):
    """
    Estimate fuel consumption for a truck.
    Standard trucks (600L tank) use ~35L/100km.
    Special trucks (800L tank: 9728, 9573) might have higher consumption or just larger tanks.
    User said: "caclaute the estimated fuel consumption by knowing the tank is for all car is 600 liters... 
    and for the two card of 9728 , 9573 is 800 liters so make an approxamtion for that".
    """
    # Assuming standard consumption is 35L per 100km for all, 
    # but we could differentiate if needed.
    rate = 0.35 # L/km
    
    if car_plate in ['9728', '9573']:
        # Maybe these larger trucks consume slightly more? e.g. 40L/100km
        rate = 0.40
        
    return distance_km * rate
