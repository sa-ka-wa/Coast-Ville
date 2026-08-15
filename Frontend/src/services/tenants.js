// services/tenants.js - Updated version with NO mock fallback for individual tenant data
import api from "./api";

// Mock data (fallback only for LIST view, NOT for individual tenant)
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
    property_id: 1,
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
    property_id: 1,
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
    property_id: 2,
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
    property_id: 2,
    createdAt: "2024-04-05T10:00:00Z",
  },
];

// ============================================================
// LIST TENANTS - with mock fallback for UI testing
// ============================================================

// Get all tenants - TRY REAL API FIRST, fallback to mock for UI
export const getTenants = async (filters = {}) => {
  try {
    console.log("📡 Fetching tenants with filters:", filters);

    const cleanFilters = {};
    Object.keys(filters).forEach((key) => {
      if (
        filters[key] !== undefined &&
        filters[key] !== null &&
        filters[key] !== ""
      ) {
        cleanFilters[key] = filters[key];
      }
    });

    const response = await api.get("/tenants", {
      params: cleanFilters,
    });

    console.log("✅ API Response:", response.data);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed, using mock data:", error.message);
    await new Promise((resolve) => setTimeout(resolve, 500));
    let tenants = [...MOCK_TENANTS];

    if (filters.property_id) {
      tenants = tenants.filter(
        (t) => t.property_id === parseInt(filters.property_id),
      );
    }

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

    console.log(`📊 Found ${tenants.length} mock tenants`);
    return { data: tenants };
  }
};

// ============================================================
// SINGLE TENANT - NO MOCK FALLBACK (Use real data only)
// ============================================================

// Get a single tenant by ID - NO MOCK FALLBACK
export const getTenant = async (id) => {
  console.log(`📡 Fetching tenant with ID: ${id}`);
  const response = await api.get(`/tenants/${id}`);
  console.log("✅ Tenant Response:", response.data);
  return response;
};

// ============================================================
// TENANT PAYMENTS - NO MOCK FALLBACK
// ============================================================

// Get tenant payment history - NO MOCK FALLBACK
export const getTenantPayments = async (id) => {
  try {
    console.log(`📡 Fetching payments for tenant: ${id}`);
    const response = await api.get(`/tenants/${id}/payments`);
    console.log("✅ Payments Response:", response.data);
    return response;
  } catch (error) {
    console.warn(
      `⚠️ Failed to fetch payments for tenant ${id}:`,
      error.message,
    );
    // Return empty array instead of mock data
    return { data: [] };
  }
};

// ============================================================
// TENANT WATER READINGS - NO MOCK FALLBACK
// ============================================================

// Get tenant water readings - NO MOCK FALLBACK
export const getTenantWaterReadings = async (id) => {
  try {
    console.log(`📡 Fetching water readings for tenant: ${id}`);
    const response = await api.get(`/tenants/${id}/water/readings`);
    console.log("✅ Water Readings Response:", response.data);
    return response;
  } catch (error) {
    console.warn(
      `⚠️ Failed to fetch water readings for tenant ${id}:`,
      error.message,
    );
    return { data: [] };
  }
};

// ============================================================
// TENANT WATER BILLS - NO MOCK FALLBACK
// ============================================================

// Get tenant water bills - NO MOCK FALLBACK
export const getTenantWaterBills = async (tenantId) => {
  try {
    console.log(`📡 Fetching water bills for tenant: ${tenantId}`);
    const response = await api.get(`/tenants/${tenantId}/water/bills`);
    console.log("✅ Water Bills Response:", response.data);
    return response;
  } catch (error) {
    console.warn(
      `⚠️ Failed to fetch water bills for tenant ${tenantId}:`,
      error.message,
    );
    return { data: [] };
  }
};

// ============================================================
// TENANT STATS - NO MOCK FALLBACK
// ============================================================

// Get tenant statistics - NO MOCK FALLBACK
export const getTenantStats = async (id) => {
  try {
    console.log(`📡 Fetching stats for tenant: ${id}`);
    const response = await api.get(`/tenants/${id}/stats`);
    console.log("✅ Tenant Stats Response:", response.data);
    return response;
  } catch (error) {
    console.warn(`⚠️ Failed to fetch stats for tenant ${id}:`, error.message);
    return {
      data: {
        total: 0,
        active: 0,
        vacating: 0,
        vacated: 0,
        totalPaid: 0,
        totalBalance: 0,
      },
    };
  }
};

// ============================================================
// CRUD OPERATIONS - with mock fallback for UI testing
// ============================================================

// Add a new tenant
export const addTenant = async (tenantData) => {
  try {
    console.log("📝 Adding tenant with data:", tenantData);
    const response = await api.post("/tenants", tenantData);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed, using mock data:", error.message);
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
  }
};

// Update an existing tenant
export const updateTenant = async (id, tenantData) => {
  try {
    const response = await api.put(`/tenants/${id}`, tenantData);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed, using mock data:", error.message);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const index = MOCK_TENANTS.findIndex((t) => t.id === id);
    if (index === -1) throw new Error("Tenant not found");
    MOCK_TENANTS[index] = { ...MOCK_TENANTS[index], ...tenantData };
    return { data: MOCK_TENANTS[index] };
  }
};

// Delete a tenant
export const deleteTenant = async (id) => {
  try {
    const response = await api.delete(`/tenants/${id}`);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed, using mock data:", error.message);
    await new Promise((resolve) => setTimeout(resolve, 500));
    MOCK_TENANTS = MOCK_TENANTS.filter((t) => t.id !== id);
    return { data: { message: "Tenant deleted successfully" } };
  }
};

// Get tenant by house number
export const getTenantByHouse = async (houseNo) => {
  try {
    const response = await api.get(`/tenants/house/${houseNo}`);
    return response;
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const tenant = MOCK_TENANTS.find((t) => t.houseNo === houseNo);
    return { data: tenant || null };
  }
};

// Get tenant by phone number
export const getTenantByPhone = async (phone) => {
  try {
    const response = await api.get(`/tenants/phone/${phone}`);
    return response;
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const tenant = MOCK_TENANTS.find((t) => t.phone === phone);
    return { data: tenant || null };
  }
};

// Update tenant status
export const updateTenantStatus = async (id, status) => {
  try {
    const response = await api.patch(`/tenants/${id}/status`, { status });
    return response;
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const index = MOCK_TENANTS.findIndex((t) => t.id === id);
    if (index === -1) throw new Error("Tenant not found");
    MOCK_TENANTS[index].status = status;
    return { data: MOCK_TENANTS[index] };
  }
};

// ============================================================
// BULK OPERATIONS - with mock fallback for UI testing
// ============================================================

// Bulk import tenants
export const bulkImportTenants = async (tenants) => {
  try {
    const response = await api.post("/tenants/bulk", { tenants });
    return response;
  } catch (error) {
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
  }
};

// Export tenants
export const exportTenants = async () => {
  try {
    const response = await api.get("/tenants/export");
    return response;
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { data: MOCK_TENANTS };
  }
};

// ============================================================
// EXPORT
// ============================================================

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
  getTenantWaterBills,
  updateTenantStatus,
  getTenantStats,
  bulkImportTenants,
  exportTenants,
};

export default tenantsService;
