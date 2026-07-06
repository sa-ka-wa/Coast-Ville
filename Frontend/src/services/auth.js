// services/auth.js - Mock version for testing
import api from "./api";

// Mock user data for testing
const MOCK_USERS = {
  "admin@example.com": {
    id: 1,
    name: "Admin User",
    email: "admin@example.com",
    password: "password123",
    role: "admin",
    phone: "0712345678",
    token: "mock-admin-token-12345",
  },
  "caretaker@example.com": {
    id: 2,
    name: "Caretaker User",
    email: "caretaker@example.com",
    password: "password123",
    role: "caretaker",
    phone: "0723456789",
    token: "mock-caretaker-token-67890",
  },
  "test@example.com": {
    id: 3,
    name: "Test User",
    email: "test@example.com",
    password: "password123",
    role: "caretaker",
    phone: "0734567890",
    token: "mock-test-token-11111",
  },
};

// Login user - Mock version
export const login = async (email, password) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if user exists
  const user = MOCK_USERS[email];

  if (!user) {
    throw new Error("User not found");
  }

  if (user.password !== password) {
    throw new Error("Invalid password");
  }

  // Return mock response
  return {
    data: {
      token: user.token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    },
  };
};

// Register user - Mock version
export const register = async (userData) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if user already exists
  if (MOCK_USERS[userData.email]) {
    throw new Error("User already exists");
  }

  // Create new user
  const newUser = {
    id: Object.keys(MOCK_USERS).length + 1,
    name: userData.name,
    email: userData.email,
    password: userData.password,
    role: userData.role || "caretaker",
    phone: userData.phone,
    token: `mock-token-${Date.now()}`,
  };

  // Add to mock users (in memory only)
  MOCK_USERS[userData.email] = newUser;

  return {
    data: {
      message: "User registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
      },
    },
  };
};

// Logout user
export const logout = async () => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Clear local storage
  localStorage.removeItem("token");

  return { data: { message: "Logged out successfully" } };
};

// Get current user - Mock version
export const getCurrentUser = async () => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Get token from localStorage
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("No token found");
  }

  // Find user by token
  let foundUser = null;
  for (const key in MOCK_USERS) {
    if (MOCK_USERS[key].token === token) {
      foundUser = MOCK_USERS[key];
      break;
    }
  }

  if (!foundUser) {
    throw new Error("Invalid token");
  }

  return {
    data: {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role,
      phone: foundUser.phone,
    },
  };
};

// Update user profile - Mock version
export const updateProfile = async (data) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    data: {
      message: "Profile updated successfully",
      user: data,
    },
  };
};

// Change password - Mock version
export const changePassword = async (currentPassword, newPassword) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate validation
  if (currentPassword !== "password123") {
    throw new Error("Current password is incorrect");
  }

  return {
    data: {
      message: "Password changed successfully",
    },
  };
};

// Request password reset - Mock version
export const requestPasswordReset = async (email) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check if user exists
  if (!MOCK_USERS[email]) {
    throw new Error("User not found");
  }

  return {
    data: {
      message: "Password reset link sent to your email",
      resetToken: `reset-token-${Date.now()}`,
    },
  };
};

// Reset password - Mock version
export const resetPassword = async (token, newPassword) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    data: {
      message: "Password reset successfully",
    },
  };
};

// Verify token - Mock version
export const verifyToken = async (token) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Find user by token
  let foundUser = null;
  for (const key in MOCK_USERS) {
    if (MOCK_USERS[key].token === token) {
      foundUser = MOCK_USERS[key];
      break;
    }
  }

  if (!foundUser) {
    return { data: { valid: false } };
  }

  return {
    data: {
      valid: true,
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        phone: foundUser.phone,
      },
    },
  };
};

// Export all functions as default as well
const authService = {
  login,
  register,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyToken,
};

export default authService;
