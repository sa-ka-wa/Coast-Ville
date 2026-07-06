// services/properties.js
import api from "./api";

// Mock data for multiple properties
let MOCK_PROPERTIES = [
  {
    id: 1,
    name: "Sunset Apartments",
    address: "123 Mombasa Road",
    city: "Nairobi",
    county: "Nairobi",
    total_units: 48,
    status: "active",
    owner_name: "John Doe",
    owner_phone: "0712345678",
    owner_email: "john@example.com",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Ocean View Villas",
    address: "456 Beach Road",
    city: "Mombasa",
    county: "Mombasa",
    total_units: 24,
    status: "active",
    owner_name: "Jane Smith",
    owner_phone: "0723456789",
    owner_email: "jane@example.com",
    created_at: "2024-02-15T00:00:00Z",
  },
  {
    id: 3,
    name: "Green Valley Estate",
    address: "789 Valley Road",
    city: "Nakuru",
    county: "Nakuru",
    total_units: 36,
    status: "active",
    owner_name: "Bob Johnson",
    owner_phone: "0734567890",
    owner_email: "bob@example.com",
    created_at: "2024-03-01T00:00:00Z",
  },
];

// Get all properties
export const getProperties = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { data: MOCK_PROPERTIES };
};

// Get property by ID
export const getProperty = async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const property = MOCK_PROPERTIES.find((p) => p.id === id);
  if (!property) throw new Error("Property not found");
  return { data: property };
};

// Add new property
export const addProperty = async (propertyData) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newProperty = {
    id: Date.now(),
    ...propertyData,
    total_units: propertyData.total_units || 0,
    status: "active",
    created_at: new Date().toISOString(),
  };
  MOCK_PROPERTIES = [newProperty, ...MOCK_PROPERTIES];
  return { data: newProperty };
};

// Update property
export const updateProperty = async (id, propertyData) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const index = MOCK_PROPERTIES.findIndex((p) => p.id === id);
  if (index === -1) throw new Error("Property not found");
  MOCK_PROPERTIES[index] = { ...MOCK_PROPERTIES[index], ...propertyData };
  return { data: MOCK_PROPERTIES[index] };
};

// Delete property
export const deleteProperty = async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  MOCK_PROPERTIES = MOCK_PROPERTIES.filter((p) => p.id !== id);
  return { data: { message: "Property deleted successfully" } };
};

// Get property stats
export const getPropertyStats = async (propertyId) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  // Return different stats based on property
  const statsMap = {
    1: {
      totalUnits: 48,
      occupied: 44,
      vacant: 4,
      expectedRent: 720000,
      collected: 650000,
      balance: 70000,
    },
    2: {
      totalUnits: 24,
      occupied: 20,
      vacant: 4,
      expectedRent: 360000,
      collected: 320000,
      balance: 40000,
    },
    3: {
      totalUnits: 36,
      occupied: 30,
      vacant: 6,
      expectedRent: 540000,
      collected: 480000,
      balance: 60000,
    },
  };
  return { data: statsMap[propertyId] || statsMap[1] };
};

// Set active property (API call)
export const setActiveProperty = async (propertyId) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { data: { message: "Property switched successfully" } };
};

// Export all as default
const propertiesService = {
  getProperties,
  getProperty,
  addProperty,
  updateProperty,
  deleteProperty,
  getPropertyStats,
  setActiveProperty,
};

export default propertiesService;
