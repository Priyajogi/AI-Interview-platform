// src/components/ProtectedRoute.js
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Save the current path to localStorage so we can redirect back after login
    if (location.pathname !== '/login' && location.pathname !== '/signup') {
      localStorage.setItem('redirectAfterLogin', location.pathname);
    }
  }, [location]);

  useEffect(() => {
    // Only stop checking when loading is complete
    if (!loading) {
      // Small delay to ensure state is fully settled
      const timer = setTimeout(() => {
        setAuthChecked(true);
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Show loading while checking authentication
  if (!authChecked) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Only check isAuthenticated AFTER loading is complete
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    localStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;