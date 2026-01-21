import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DriverDashboard from './components/DriverDashboard';
import AdminDashboard from './components/AdminDashboard';
import { jwtDecode } from 'jwt-decode';
import { LanguageProvider } from './contexts/LanguageContext';

// Protected Route Component
const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" />;

  try {
    const decoded = jwtDecode(token);
    // You might want to verify role here as well in a real app
    // For now we trust the token exists
    return children;
  } catch (e) {
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
            <ProtectedRoute>
              <LanguageProvider>
                <DriverDashboard />
              </LanguageProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
