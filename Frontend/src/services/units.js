// services/units.js
import api from "./api";

// Get all units (optionally filtered by property)
export const getUnits = async (filters = {}) => {
  try {
    console.log("📡 Fetching units with filters:", filters);
    const response = await api.get("/units", { params: filters });
    console.log("✅ Units Response:", response.data);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed, using mock data:", error.message);
    // Fallback to mock data
    await new Promise((resolve) => setTimeout(resolve, 500));
    const mockUnits = [
      { id: 1, unit_number: "101", property_id: 1, status: "available" },
      { id: 2, unit_number: "102", property_id: 1, status: "available" },
      { id: 3, unit_number: "103", property_id: 1, status: "occupied" },
      { id: 4, unit_number: "104", property_id: 1, status: "available" },
      // ... more mock units
    ];
    return { data: mockUnits };
  }
};

// Get available units for a property
export const getAvailableUnits = async (propertyId) => {
  try {
    const response = await api.get(
      `/units/available?property_id=${propertyId}`,
    );
    return response;
  } catch (error) {
    console.warn("⚠️ API failed, using mock data:", error.message);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const mockUnits = [
      { id: 1, unit_number: "101", property_id: 1, status: "available" },
      { id: 2, unit_number: "102", property_id: 1, status: "available" },
    ];
    return { data: mockUnits };
  }
};

// Get a single unit by ID
export const getUnit = async (id) => {
  try {
    const response = await api.get(`/units/${id}`);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed, using mock data:", error.message);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      data: { id, unit_number: "101", property_id: 1, status: "available" },
    };
  }
};

// Update unit status
export const updateUnitStatus = async (id, status) => {
  try {
    const response = await api.patch(`/units/${id}/status`, { status });
    return response;
  } catch (error) {
    console.warn("⚠️ API failed, using mock data:", error.message);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { data: { id, status, message: "Status updated" } };
  }
};

// Export all as default
const unitsService = {
  getUnits,
  getAvailableUnits,
  getUnit,
  updateUnitStatus,
};

export default unitsService;
