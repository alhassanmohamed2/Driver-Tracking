import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DriverDashboard from './components/DriverDashboard';
import AdminDashboard from './components/AdminDashboard';
import { jwtDecode } from 'jwt-decode';
import { LanguageProvider } from './contexts/LanguageContext';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" />;

  try {
    const decoded = jwtDecode(token);

    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return <Navigate to="/" />;
    }

    // Role-based Access Control
    if (allowedRoles && !allowedRoles.includes(decoded.role)) {
      // Redirect to their appropriate dashboard if they try to access unauthorized pages
      if (decoded.role === 'admin') return <Navigate to="/admin" />;
      if (decoded.role === 'driver') return <Navigate to="/driver" />;
      return <Navigate to="/" />;
    }

    return children;
  } catch (e) {
    localStorage.removeItem('token');
    return <Navigate to="/" />;
  }
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/driver"
          element={
            <ProtectedRoute allowedRoles={['driver']}>
              <LanguageProvider>
                <DriverDashboard />
              </LanguageProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
