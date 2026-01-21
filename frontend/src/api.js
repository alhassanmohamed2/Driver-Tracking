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

export const exportTrips = (driverId = null) => {
    // Generate the URL for the export
    const token = localStorage.getItem('token')
    const url = driverId ? `${API_URL}/admin/export?driver_id=${driverId}` : `${API_URL}/admin/export`;

    fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            // Extract filename from header if possible
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'trips_export.xlsx';
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            return response.blob().then(blob => ({ blob, filename }));
        })
        .then(({ blob, filename }) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(error => console.error(error))
};

export const getDriverHistory = async (month = null, year = null) => {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const response = await api.get('/trips/history', { params });
    return response.data;
};

export default api;
