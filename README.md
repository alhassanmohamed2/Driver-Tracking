# Driver Tracking System 🚛

A comprehensive full-stack solution for managing and tracking vehicle fleets, drivers, and deliveries. This system provides a dual-interface for Admins and Drivers, supporting real-time tracking, trip management, and bilingual (English/Arabic) operations.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🌟 Features

### 🏢 Admin Dashboard
- **Fleet Management**: Add, edit, and assign Drivers and Cars.
- **Live Map Tracking**: View real-time locations of all active drivers on an interactive map.
- **Trip Monitoring**: See status of all ongoing trips (e.g., "Exit Factory", "Arrival at Warehouse").
- **Reporting**: Export trip data and driver logs.

### 🚗 Driver Mobile Dashboard
- **Simple UI**: Large, touch-friendly buttons for easy logging on the go.
- **Trip Workflow**: Guided steps:
  1.  Start Trip
  2.  Log Exit Factory
  3.  Log Arrival/Exit at Warehouses (supports multiple stops)
  4.  Return to Factory (Complete Trip)
- **Bilingual Support (AR/EN)**:
    - Full Arabic translation.
    - **RTL (Right-to-Left)** layout support for Arabic users.
    - Smart language persistence.
- **History & Timeline**: View past trips with detailed timeline steps.

## 🛠️ Technology Stack

- **Backend**: Python (FastAPI), SQLAlchemy, Pydantic.
- **Database**: MySQL (Dockerized).
- **Frontend**: React.js (Vite), Tailwind CSS, Lucide Icons.
- **Mapping**: Leaflet / OpenStreetMap / Nominatim (Reverse Geocoding).
- **Infrastructure**: Docker & Docker Compose, Nginx Reverse Proxy.

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose installed on your machine.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/alhassanmohamed2/Driver-Tracking.git
    cd Driver-Tracking
    ```

2.  **Start the application:**
    ```bash
    docker compose up --build -d
    ```

3.  **Access the interfaces:**
    - **Admin Panel**: `http://localhost` (or your server domain)
    - **Driver App**: `http://localhost/driver` (or auto-redirects based on role)

### Default Credentials
- **Admin**: Log in with your configured admin credentials.
- **Driver**: Log in with credentials created by the Admin.

## 📂 Project Structure

```
├── backend/            # FastAPI Backend
│   ├── app/            # API Routes, Models, Schemas
│   └── Dockerfile
├── frontend/           # React Frontend
│   ├── src/            # Components, Contexts, Translations
│   └── Dockerfile
├── docker-compose.yml  # Orchestration
└── README.md
```

## 🌍 Localization
The app supports instant switching between **English** and **Arabic**.
- Click the 🌐 icon in the header to toggle.
- The interface automatically adjusts direction (LTR/RTL).

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.