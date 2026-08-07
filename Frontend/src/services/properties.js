// services/properties.js
import api from "./api";

// Get all properties - NO MOCK FALLBACK
export const getProperties = async () => {
  console.log("📡 Fetching properties from API...");
  const response = await api.get("/properties");
  console.log("✅ API Response:", response.data);
  return response;
};

// Get property by ID - NO MOCK FALLBACK
export const getProperty = async (id) => {
  const response = await api.get(`/properties/${id}`);
  return response;
};

// Add new property
export const addProperty = async (propertyData) => {
  const response = await api.post("/properties", propertyData);
  return response;
};

// Update property
export const updateProperty = async (id, propertyData) => {
  const response = await api.put(`/properties/${id}`, propertyData);
  return response;
};

// Delete property
export const deleteProperty = async (id) => {
  const response = await api.delete(`/properties/${id}`);
  return response;
};

// Get property stats
export const getPropertyStats = async (propertyId) => {
  if (!propertyId) {
    throw new Error("Property ID is required");
  }
  const response = await api.get(`/properties/${propertyId}/stats`);
  return response;
};

// Export all as default
const propertiesService = {
  getProperties,
  getProperty,
  addProperty,
  updateProperty,
  deleteProperty,
  getPropertyStats,
};

export default propertiesService;
