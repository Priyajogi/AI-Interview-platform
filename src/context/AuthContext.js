// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved user in localStorage
    const savedUser = localStorage.getItem('interviewAppUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    const newUser = {
      id: Date.now().toString(),
      name: userData.name || 'User',
      email: userData.email || 'user@example.com',
      photo: userData.photo || `https://ui-avatars.com/api/?name=${userData.name || 'User'}&background=667eea&color=fff`,
      joined: new Date().toISOString()
    };
    
    localStorage.setItem('interviewAppUser', JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  };

  const googleLogin = () => {
    const googleUser = {
      id: 'google_' + Date.now(),
      name: 'Alex Johnson',
      email: 'alex.johnson@gmail.com',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      provider: 'google',
      joined: new Date().toISOString()
    };
    
    localStorage.setItem('interviewAppUser', JSON.stringify(googleUser));
    setUser(googleUser);
    return googleUser;
  };

  const demoLogin = () => {
    const demoUser = {
      id: 'demo_user',
      name: 'Demo User',
      email: 'demo@interviewapp.com',
      photo: `https://ui-avatars.com/api/?name=Demo+User&background=667eea&color=fff`,
      isDemo: true,
      joined: new Date().toISOString()
    };
    
    localStorage.setItem('interviewAppUser', JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  };

  const logout = () => {
    localStorage.removeItem('interviewAppUser');
    setUser(null);
  };

  const value = {
    user,
    login,
    googleLogin,
    demoLogin,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};