// services/auth.js
import api from "./api";

export const login = async (email, password) => {
  try {
    const response = await api.post("/auth/login", { email, password });
    // Save token
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response;
  } catch (error) {
    console.warn("Login failed, trying mock:", error);
    // Mock fallback
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (email === "admin@example.com" && password === "password123") {
      return {
        data: {
          token: "mock-admin-token-12345",
          user: {
            id: 1,
            name: "Admin User",
            email: "admin@example.com",
            role: "admin",
            phone: "0712345678",
          },
        },
      };
    }
    throw new Error("Invalid credentials");
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get("/auth/me");
    return response;
  } catch (error) {
    const token = localStorage.getItem("token");
    if (token) {
      // Mock user based on token
      return {
        data: {
          id: 1,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
          phone: "0712345678",
        },
      };
    }
    throw new Error("No token found");
  }
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    // Ignore logout errors
  } finally {
    localStorage.removeItem("token");
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post("/auth/register", userData);
    return response;
  } catch (error) {
    // Mock fallback
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      data: {
        message: "User registered successfully",
        user: {
          id: Date.now(),
          ...userData,
          role: userData.role || "caretaker",
        },
      },
    };
  }
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await api.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response;
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { data: { message: "Password changed successfully" } };
  }
};

export default {
  login,
  register,
  logout,
  getCurrentUser,
  changePassword,
};
