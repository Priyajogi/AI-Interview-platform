// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Secure storage utilities - FIXED: Moved inside useCallback
  const getSecureStorage = useCallback(() => ({
    setToken: (newToken) => {
      try {
        const encrypted = btoa(newToken);
        localStorage.setItem('enc_token', encrypted);
      } catch (error) {
        console.error('Token storage error:', error);
      }
    },
    getToken: () => {
      try {
        const encrypted = localStorage.getItem('enc_token');
        return encrypted ? atob(encrypted) : null;
      } catch (error) {
        return null;
      }
    },
    setUser: (userData) => {
      localStorage.setItem('interviewAppUser', JSON.stringify(userData));
    },
    getUser: () => {
      try {
        const userData = localStorage.getItem('interviewAppUser');
        return userData ? JSON.parse(userData) : null;
      } catch (error) {
        return null;
      }
    },
    clear: () => {
      localStorage.removeItem('enc_token');
      localStorage.removeItem('interviewAppUser');
    }
  }), []);

  // Load user from storage on initial load - FIXED: Added getSecureStorage to dependencies
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const secureStorage = getSecureStorage();
        const savedUser = secureStorage.getUser();
        const savedToken = secureStorage.getToken();
        
        if (savedUser && savedToken) {
          try {
            const decoded = jwtDecode(savedToken);
            const currentTime = Date.now() / 1000;
            
            if (decoded.exp > currentTime) {
              setUser(savedUser);
              setToken(savedToken);
            } else {
              secureStorage.clear();
            }
          } catch (error) {
            console.error('Token decode error:', error);
            secureStorage.clear();
          }
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
        getSecureStorage().clear();
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, [getSecureStorage]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call logout endpoint on server
      if (token) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(err => console.error('Logout API error (non-critical):', err));
      }
    } finally {
      // Clear local storage and state regardless
      getSecureStorage().clear();
      setUser(null);
      setToken(null);
    }
  }, [token, API_URL, getSecureStorage]);

  // Token refresh function - FIXED: Added logout and getSecureStorage dependencies
  const refreshToken = useCallback(async () => {
    if (refreshing || !token) return null;
    
    try {
      setRefreshing(true);
      const res = await fetch(`${API_URL}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      
      if (data.success && data.token) {
        const secureStorage = getSecureStorage();
        secureStorage.setToken(data.token);
        if (data.user) secureStorage.setUser(data.user);
        
        setToken(data.token);
        if (data.user) setUser(data.user);
        
        console.log('✅ Token refreshed successfully');
        return data.token;
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      // If refresh fails, logout the user
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        logout();
      }
    } finally {
      setRefreshing(false);
    }
    return null;
  }, [token, refreshing, API_URL, getSecureStorage, logout]);

  // Check token expiration periodically
  useEffect(() => {
    const checkTokenExpiration = async () => {
      if (!token || refreshing) return;
      
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        // If token expires in less than 5 minutes, refresh it
        if (decoded.exp - currentTime < 300) {
          console.log('Token expiring soon, refreshing...');
          await refreshToken();
        }
      } catch (error) {
        console.error('Token validation error:', error);
      }
    };

    // Check immediately on mount
    checkTokenExpiration();
    
    // Then check every minute
    const interval = setInterval(checkTokenExpiration, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [token, refreshToken, refreshing]);

  // Signup function
  const signup = async (userData) => {
    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Signup failed');

      const secureStorage = getSecureStorage();
      secureStorage.setUser(data.user);
      secureStorage.setToken(data.token);
      setUser(data.user);
      setToken(data.token);

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Login function
  const login = async (identifier, password) => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Login failed');

      const secureStorage = getSecureStorage();
      secureStorage.setUser(data.user);
      secureStorage.setToken(data.token);
      setUser(data.user);
      setToken(data.token);

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Google login function
  const googleLogin = async (decodedUser) => {
    try {
      const res = await fetch(`${API_URL}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: decodedUser.sub,
          name: decodedUser.name,
          email: decodedUser.email,
          photo: decodedUser.picture
        })
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Google login failed');

      const secureStorage = getSecureStorage();
      secureStorage.setUser(data.user);
      secureStorage.setToken(data.token);
      setUser(data.user);
      setToken(data.token);

      return { success: true, data };
    } catch (err) {
      console.error('Google login error:', err);
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      signup,
      login,
      googleLogin,
      logout,
      refreshToken,
      loading,
      refreshing,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  );
};