import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authAPI, usersAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const STORAGE_KEYS = ['token', 'user', 'rememberMe'];

const clearStorages = () => {
  STORAGE_KEYS.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

const getStoredValue = (key) => localStorage.getItem(key) || sessionStorage.getItem(key);

const setStoredValue = (key, value, persistent) => {
  const storage = persistent ? localStorage : sessionStorage;
  storage.setItem(key, value);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredValue('token');
      const storedUser = getStoredValue('user');
      const shouldRemember = localStorage.getItem('rememberMe') === 'true';
      
      if (token && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        setRememberMe(shouldRemember);
        setLoading(false);
        
        try {
          const response = await authAPI.getCurrentUser();
          if (JSON.stringify(response.user) !== JSON.stringify(parsedUser)) {
            setUser(response.user);
            setStoredValue('user', JSON.stringify(response.user), shouldRemember);
          }
        } catch (error) {
          if (error.message?.includes('Session expired') || error.message?.includes('401')) {
            clearStorages();
            setUser(null);
            setIsAuthenticated(false);
            setRememberMe(false);
          }
        }
      } else {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password, shouldRemember = false) => {
    try {
      const data = await authAPI.login(email, password, shouldRemember);
      
      setUser(data.user);
      setIsAuthenticated(true);
      setRememberMe(shouldRemember);
      
      setStoredValue('token', data.token, shouldRemember);
      setStoredValue('user', JSON.stringify(data.user), shouldRemember);
      localStorage.setItem('rememberMe', shouldRemember.toString());
      
      toast.success(`Welcome back, ${data.user.full_name}!`);
      return { success: true, data };
    } catch (error) {
      toast.error(error.message || 'Login failed');
      return { success: false, error: error.message };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const data = await authAPI.register(userData);
      setUser(data.user);
      setIsAuthenticated(true);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Registration successful!');
      return { success: true, data };
    } catch (error) {
      toast.error(error.message || 'Registration failed');
      return { success: false, error: error.message };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setRememberMe(false);
    clearStorages();
    toast.success('Logged out successfully');
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    try {
      await usersAPI.updateProfile(profileData);
      const response = await authAPI.getCurrentUser();
      setUser(response.user);
      setStoredValue('user', JSON.stringify(response.user), rememberMe);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
      return { success: false, error: error.message };
    }
  }, [rememberMe]);

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, updateProfile,
      isAuthenticated, rememberMe,
      isAdmin: user?.role === 'admin',
      isMember: user?.role === 'member',
    }}>
      {children}
    </AuthContext.Provider>
  );
};