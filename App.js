import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './components/Dashboard';
import Interview from './components/Interview';
import InterviewPage from './components/InterviewPage';
import './App.css';

// FIXED Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  // Show loading while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner-border animate-spin inline-block w-12 h-12 border-4 rounded-full border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }
  
  // Only check user AFTER loading is complete
  return user ? children : <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
};

function App() {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID_HERE";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <Layout>
              <div className="App">
                <Routes>
                  {/* ========== PUBLIC ROUTES ========== */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  
                  {/* ========== PROTECTED ROUTES ========== */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  
                  {/* ========== INTERVIEW FLOW ========== */}
                  {/* 1. Interview Selection Page (Subject & Resume Selection) */}
                  <Route path="/interview" element={
                    <ProtectedRoute>
                      <Interview />
                    </ProtectedRoute>
                  } />
                  
                  {/* 2. AI Interview Session Page (Handles ALL interviews - both old and new) */}
                  <Route path="/interview/:sessionId" element={
                    <ProtectedRoute>
                      <InterviewPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* 3. Compatibility route - Redirect old category-based interviews to AI system */}
                  <Route path="/interview-category/:categoryId" element={
                    <ProtectedRoute>
                      <Navigate to="/interview" replace />
                    </ProtectedRoute>
                  } />
                  
                  {/* ========== COMPATIBILITY ROUTES ========== */}
                  {/* Redirect old routes to new system */}
                  <Route path="/quick-interview" element={
                    <ProtectedRoute>
                      <Navigate to="/interview" replace />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/mock-interview" element={
                    <ProtectedRoute>
                      <Navigate to="/interview" replace />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/timer-test" element={
                    <ProtectedRoute>
                      <Navigate to="/interview" replace />
                    </ProtectedRoute>
                  } />
                  
                  {/* ========== DEFAULT REDIRECT ========== */}
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
            </Layout>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;