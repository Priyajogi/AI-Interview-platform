// src/components/RouteGuard.js
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const RouteGuard = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (modify this based on your auth system)
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      
      // If no token and not on login/signup page, redirect to login
      if (!token && !location.pathname.includes('/login') && !location.pathname.includes('/signup')) {
        navigate('/login');
        return false;
      }
      
      // If token exists, user is authenticated
      if (token) {
        setIsAuthenticated(true);
        return true;
      }
      
      return false;
    };

    // Simulate checking auth (you might have actual API call here)
    const timer = setTimeout(() => {
      checkAuth();
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [location, navigate]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading interview session...</p>
      </div>
    );
  }

  // If not authenticated and trying to access protected route, redirect happens above
  return children;
};

export default RouteGuard;