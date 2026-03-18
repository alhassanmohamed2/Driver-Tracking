# Implementation Plan - Car-Centric Fuel Monitoring

Refactor the fuel monitoring system to aggregate data by vehicle (Car) instead of individually by Trip. This allows admins to see the total fuel history and consumption performance of each truck over time, regardless of the driver.

## Proposed Changes

### Backend

#### [MODIFY] [main.py](file:///docker/driver-tracking/backend/app/main.py)
- Replace or augment [get_fuel_reports](file:///docker/driver-tracking/backend/app/routers/admin.py#461-499) with `get_car_fuel_reports`.
- Implement aggregation logic:
    - Group [FuelLog](file:///docker/driver-tracking/backend/app/schemas.py#78-88) entries by `car_id`.
    - Calculate total fuel refills per car.
    - Calculate total distance driven per car (sum of all completed trips for that car).
    - Provide a complete history of refills per car.

### Frontend

#### [MODIFY] [AdminDashboard.jsx](file:///docker/driver-tracking/frontend/src/components/AdminDashboard.jsx)
- Update [FuelView](file:///docker/driver-tracking/frontend/src/components/AdminDashboard.jsx#633-756) component:
    - Change the main table to list **Cars** instead of trips.
    - Add columns for: Car Plate, Total Distance, Total Refills, Average Consumption, and Discrepancy.
- Implement `CarFuelHistoryModal`:
    - A drill-down view showing every fuel refill logged for a specific car.
    - Includes date, driver name, amount, and photos.

## Verification Plan

### Automated Tests
- Run backend unit tests for the new aggregation logic.

### Manual Verification
- Log fuel refills from different drivers for the same car and verify they all appear in the car's history in the Admin Dashboard.
- Verify that total distance and fuel calculations are accurate across multiple trips for the same vehicle.
