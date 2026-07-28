// context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import * as authService from "../services/auth";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      localStorage.removeItem("token");
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      setToken(token);
      setUser(user);

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Login failed",
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Registration failed",
      };
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await authService.updateProfile(data);
      setUser(response.data.user);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Update failed",
      };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authService.changePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Password change failed",
      };
    }
  };

  // ✅ Add switchRole function
  const switchRole = async (newRole) => {
    try {
      const response = await authService.switchRole(newRole);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error("Failed to switch role:", error);
      return {
        success: false,
        error: error.message || "Failed to switch role",
      };
    }
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    switchRole, // ✅ Add switchRole to the context value
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isCaretaker: user?.role === "caretaker",
    // ✅ Add helper to check if user has multiple roles
    hasMultipleRoles:
      user?.secondary_role !== null && user?.secondary_role !== undefined,
    // ✅ Get available roles
    getAvailableRoles: () => {
      if (!user) return [];
      const roles = [user.role];
      if (user.secondary_role) {
        roles.push(user.secondary_role);
      }
      return roles;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
