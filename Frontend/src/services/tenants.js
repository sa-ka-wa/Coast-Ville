// services/tenants.js - Mock version
import api from "./api";

// Mock data
let MOCK_TENANTS = [
  {
    id: 1,
    name: "John Mwangi",
    houseNo: "A03",
    phone: "0712345678",
    monthlyRent: 15000,
    deposit: 15000,
    moveInDate: "2024-01-15",
    status: "active",
    balance: 0,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    name: "Mary Wanjiku",
    houseNo: "B12",
    phone: "0723456789",
    monthlyRent: 12000,
    deposit: 12000,
    moveInDate: "2024-02-01",
    status: "active",
    balance: 0,
    createdAt: "2024-02-01T10:00:00Z",
  },
  {
    id: 3,
    name: "Peter Ochieng",
    houseNo: "C05",
    phone: "0734567890",
    monthlyRent: 18000,
    deposit: 18000,
    moveInDate: "2024-03-10",
    status: "active",
    balance: 15000,
    createdAt: "2024-03-10T10:00:00Z",
  },
  {
    id: 4,
    name: "Sarah Kimani",
    houseNo: "D08",
    phone: "0745678901",
    monthlyRent: 10000,
    deposit: 10000,
    moveInDate: "2024-04-05",
    status: "vacating",
    balance: 5000,
    createdAt: "2024-04-05T10:00:00Z",
  },
];

// Get all tenants
export const getTenants = async (filters = {}) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  let tenants = [...MOCK_TENANTS];

  if (filters.search) {
    const search = filters.search.toLowerCase();
    tenants = tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(search) ||
        t.houseNo.toLowerCase().includes(search),
    );
  }

  if (filters.status) {
    tenants = tenants.filter((t) => t.status === filters.status);
  }

  return { data: tenants };
};

// Get a single tenant by ID
export const getTenant = async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const tenant = MOCK_TENANTS.find((t) => t.id === id);
  if (!tenant) throw new Error("Tenant not found");
  return { data: tenant };
};

// Add a new tenant
export const addTenant = async (tenantData) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newTenant = {
    id: Date.now(),
    ...tenantData,
    status: "active",
    balance: 0,
    createdAt: new Date().toISOString(),
  };
  MOCK_TENANTS = [newTenant, ...MOCK_TENANTS];
  return { data: newTenant };
};

// Update an existing tenant
export const updateTenant = async (id, tenantData) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const index = MOCK_TENANTS.findIndex((t) => t.id === id);
  if (index === -1) throw new Error("Tenant not found");
  MOCK_TENANTS[index] = { ...MOCK_TENANTS[index], ...tenantData };
  return { data: MOCK_TENANTS[index] };
};

// Delete a tenant
export const deleteTenant = async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  MOCK_TENANTS = MOCK_TENANTS.filter((t) => t.id !== id);
  return { data: { message: "Tenant deleted successfully" } };
};

// Get tenant by house number
export const getTenantByHouse = async (houseNo) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const tenant = MOCK_TENANTS.find((t) => t.houseNo === houseNo);
  return { data: tenant || null };
};

// Get tenant by phone number
export const getTenantByPhone = async (phone) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const tenant = MOCK_TENANTS.find((t) => t.phone === phone);
  return { data: tenant || null };
};

// Get tenant payment history
export const getTenantPayments = async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  // Mock payments
  const payments = [
    {
      id: 1,
      amount: 15000,
      date: "2026-07-01",
      method: "mpesa",
      status: "paid",
      receiptNo: "RCP-001",
    },
    {
      id: 2,
      amount: 15000,
      date: "2026-06-01",
      method: "mpesa",
      status: "paid",
      receiptNo: "RCP-002",
    },
  ];
  return { data: payments };
};

// Get tenant water readings
export const getTenantWaterReadings = async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const readings = [
    {
      id: 1,
      previousReading: 2450,
      currentReading: 2478,
      unitsUsed: 28,
      amount: 1960,
      readingDate: "2026-07-01",
    },
    {
      id: 2,
      previousReading: 2420,
      currentReading: 2450,
      unitsUsed: 30,
      amount: 2100,
      readingDate: "2026-06-01",
    },
  ];
  return { data: readings };
};

// Update tenant status
export const updateTenantStatus = async (id, status) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const index = MOCK_TENANTS.findIndex((t) => t.id === id);
  if (index === -1) throw new Error("Tenant not found");
  MOCK_TENANTS[index].status = status;
  return { data: MOCK_TENANTS[index] };
};

// Get tenant statistics
export const getTenantStats = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return {
    data: {
      total: MOCK_TENANTS.length,
      active: MOCK_TENANTS.filter((t) => t.status === "active").length,
      vacating: MOCK_TENANTS.filter((t) => t.status === "vacating").length,
      vacated: MOCK_TENANTS.filter((t) => t.status === "vacated").length,
    },
  };
};

// Bulk import tenants
export const bulkImportTenants = async (tenants) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const newTenants = tenants.map((t, index) => ({
    id: Date.now() + index,
    ...t,
    status: "active",
    balance: 0,
    createdAt: new Date().toISOString(),
  }));
  MOCK_TENANTS = [...newTenants, ...MOCK_TENANTS];
  return { data: newTenants };
};

// Export tenants
export const exportTenants = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { data: MOCK_TENANTS };
};

// Export all as default
const tenantsService = {
  getTenants,
  getTenant,
  addTenant,
  updateTenant,
  deleteTenant,
  getTenantByHouse,
  getTenantByPhone,
  getTenantPayments,
  getTenantWaterReadings,
  updateTenantStatus,
  getTenantStats,
  bulkImportTenants,
  exportTenants,
};

export default tenantsService;
