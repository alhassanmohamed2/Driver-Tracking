import axios from 'axios';

// Ensure the REACT_APP_API_URL or VITE_API_URL is used, or fallback to localhost
// Use relative path '/api' which will be proxied by Nginx to the backend
const API_URL = '/api';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export const login = async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await api.post('/auth/token', formData);
    return response.data;
};

export const startTrip = async () => {
    const response = await api.post('/trips/');
    return response.data;
};

export const getActiveTrip = async () => {
    try {
        const response = await api.get('/trips/active');
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null;
        }
        throw error;
    }
}

export const logTripState = async (tripId, state, latitude, longitude, address) => {
    const response = await api.post(`/trips/${tripId}/logs`, {
        state,
        latitude,
        longitude,
        address
    });
    return response.data;
};

export const getTrips = async () => {
    const response = await api.get('/admin/trips');
    return response.data;
};

export const deleteTrip = async (tripId) => {
    const response = await api.delete(`/admin/trips/${tripId}`);
    return response.data;
};

export const updateTrip = async (tripId, data) => {
    const response = await api.put(`/admin/trips/${tripId}`, data);
    return response.data;
};

export const createDriver = async (username, password, carId) => {
    const response = await api.post('/admin/drivers', {
        username,
        password,
        car_id: carId ? parseInt(carId) : null,
        role: 'driver' // explicit, though backend enforces it
    });
    return response.data;
};

export const changeAdminPassword = async (password) => {
    const response = await api.put('/admin/change-password', { password });
    return response.data;
};

export const updateDriver = async (driverId, username, password, carId) => {
    const payload = { username, car_id: carId ? parseInt(carId) : null };
    if (password) payload.password = password;
    const response = await api.put(`/admin/drivers/${driverId}`, payload);
    return response.data;
};

export const getCars = async () => {
    const response = await api.get('/admin/cars');
    return response.data;
};

export const createCar = async (plate, model) => {
    const response = await api.post('/admin/cars', { plate, model, status: 'active' });
    return response.data;
};

export const deleteCar = async (carId) => {
    const response = await api.delete(`/admin/cars/${carId}`);
    return response.data;
};

export const deleteDriver = async (driverId) => {
    const response = await api.delete(`/admin/drivers/${driverId}`);
    return response.data;
};

export const getDrivers = async () => {
    const response = await api.get('/admin/drivers-list');
    return response.data;
};

export const exportTrips = async (driverId = null, dateFrom = null, dateTo = null) => {
    try {
        let url = '/admin/export?';
        const params = new URLSearchParams();
        if (driverId) params.append('driver_id', driverId);
        if (dateFrom) params.append('start_date', dateFrom);
        if (dateTo) params.append('end_date', dateTo);

        url += params.toString();

        const response = await api.get(url, {
            responseType: 'blob'
        });

        // Create blob link to download
        const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = urlBlob;
        link.setAttribute('download', 'trips_export.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export trips. Please try again.');
    }
};

export const getDriverHistory = async (month = null, year = null) => {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const response = await api.get('/trips/history', { params });
    return response.data;
};

export const getSettings = async () => {
    const response = await api.get('/admin/settings');
    return response.data;
};

export const updateSettings = async (settings) => {
    const response = await api.put('/admin/settings', settings);
    return response.data;
};

export const uploadLogo = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export default api;
