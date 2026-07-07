// services/water.js - Connected to real API with mock fallbacks
import api from "./api";

// ============================================================
// REAL API CALLS (with mock fallbacks)
// ============================================================

// Submit a new water reading
export const submitWaterReading = async (readingData) => {
  try {
    // Transform frontend data to backend format
    const payload = {
      tenant_id: readingData.tenantId || readingData.tenant_id,
      previous_reading:
        readingData.previousReading || readingData.previous_reading,
      current_reading:
        readingData.currentReading || readingData.current_reading,
      rate: readingData.rate || 70,
      reading_date:
        readingData.readingDate ||
        readingData.reading_date ||
        new Date().toISOString().split("T")[0],
      notes: readingData.notes || "",
    };

    const response = await api.post("/water/readings", payload);
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for submitWaterReading, using mock:",
      error.message,
    );
    return submitWaterReadingMock(readingData);
  }
};

// Get water readings with filters
export const getWaterReadings = async (filters = {}) => {
  try {
    // Transform filters to backend format
    const params = {};
    if (filters.tenantId || filters.tenant_id) {
      params.tenant_id = filters.tenantId || filters.tenant_id;
    }
    if (filters.propertyId || filters.property_id) {
      params.property_id = filters.propertyId || filters.property_id;
    }
    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.startDate || filters.start_date) {
      params.start_date = filters.startDate || filters.start_date;
    }
    if (filters.endDate || filters.end_date) {
      params.end_date = filters.endDate || filters.end_date;
    }

    const response = await api.get("/water/readings", { params });

    // Transform backend data to frontend format
    const transformedData = response.data.map((item) => ({
      id: item.id,
      tenantId: item.tenant_id,
      tenantName: item.tenant_name || item.tenant?.name || "Unknown",
      houseNo: item.house_no || item.unit?.unit_number || "N/A",
      previousReading: item.previous_reading,
      currentReading: item.current_reading,
      unitsUsed: item.units_used,
      amount: item.amount,
      readingDate: item.reading_date,
      status: item.status,
      notes: item.notes,
    }));

    return { data: transformedData };
  } catch (error) {
    console.warn(
      "⚠️ API failed for getWaterReadings, using mock:",
      error.message,
    );
    return getWaterReadingsMock(filters);
  }
};

// Get water readings for a specific tenant (nested route)
export const getTenantWaterReadings = async (tenantId) => {
  try {
    const response = await api.get(`/tenants/${tenantId}/water/readings`);

    // Transform backend data to frontend format
    const transformedData = response.data.map((item) => ({
      id: item.id,
      tenantId: item.tenant_id,
      tenantName: item.tenant_name || "Unknown",
      houseNo: item.house_no || "N/A",
      previousReading: item.previous_reading,
      currentReading: item.current_reading,
      unitsUsed: item.units_used,
      amount: item.amount,
      readingDate: item.reading_date,
      status: item.status,
      notes: item.notes,
    }));

    return { data: transformedData };
  } catch (error) {
    console.warn(
      "⚠️ API failed for getTenantWaterReadings, using mock:",
      error.message,
    );
    return getWaterReadingsMock({ tenantId });
  }
};

// Generate a water bill from a reading
export const generateWaterBill = async (readingId, tenantId) => {
  try {
    const response = await api.post("/water/bills/generate", {
      reading_id: readingId,
      tenant_id: tenantId,
    });
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for generateWaterBill, using mock:",
      error.message,
    );
    return generateWaterBillMock(readingId, tenantId);
  }
};

// Get water bills with filters
export const getWaterBills = async (filters = {}) => {
  try {
    const params = {};
    if (filters.tenantId || filters.tenant_id) {
      params.tenant_id = filters.tenantId || filters.tenant_id;
    }
    if (filters.propertyId || filters.property_id) {
      params.property_id = filters.propertyId || filters.property_id;
    }
    if (filters.status) {
      params.status = filters.status;
    }

    const response = await api.get("/water/bills", { params });

    // Transform backend data to frontend format
    const transformedData = response.data.map((item) => ({
      id: item.id,
      tenantId: item.tenant_id,
      tenantName: item.tenant_name || item.tenant?.name || "Unknown",
      houseNo: item.house_no || item.unit?.unit_number || "N/A",
      waterCharge: item.water_charge,
      garbageCharge: item.garbage_charge,
      total: item.total,
      month: item.month,
      status: item.status,
      dueDate: item.due_date,
    }));

    return { data: transformedData };
  } catch (error) {
    console.warn("⚠️ API failed for getWaterBills, using mock:", error.message);
    return getWaterBillsMock(filters);
  }
};

// Get water bills for a specific tenant (nested route)
export const getTenantWaterBills = async (tenantId) => {
  try {
    const response = await api.get(`/tenants/${tenantId}/water/bills`);

    const transformedData = response.data.map((item) => ({
      id: item.id,
      tenantId: item.tenant_id,
      tenantName: item.tenant_name || "Unknown",
      houseNo: item.house_no || "N/A",
      waterCharge: item.water_charge,
      garbageCharge: item.garbage_charge,
      total: item.total,
      month: item.month,
      status: item.status,
      dueDate: item.due_date,
    }));

    return { data: transformedData };
  } catch (error) {
    console.warn(
      "⚠️ API failed for getTenantWaterBills, using mock:",
      error.message,
    );
    return getWaterBillsMock({ tenantId });
  }
};

// Get consumption history for a tenant
export const getConsumptionHistory = async (tenantId) => {
  try {
    const response = await api.get("/water/consumption/history", {
      params: { tenant_id: tenantId },
    });
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for getConsumptionHistory, using mock:",
      error.message,
    );
    return getConsumptionHistoryMock(tenantId);
  }
};

// Get water billing summary
export const getWaterBillingSummary = async (propertyId = null) => {
  try {
    const params = {};
    if (propertyId) {
      params.property_id = propertyId;
    }
    const response = await api.get("/water/summary", { params });
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for getWaterBillingSummary, using mock:",
      error.message,
    );
    return getWaterBillingSummaryMock();
  }
};

// Get a single water bill by ID
export const getWaterBill = async (id) => {
  try {
    const response = await api.get(`/water/bills/${id}`);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed for getWaterBill, using mock:", error.message);
    return getWaterBillMock(id);
  }
};

// Update water bill status
export const updateWaterBillStatus = async (id, status) => {
  try {
    const response = await api.patch(`/water/bills/${id}/status`, { status });
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for updateWaterBillStatus, using mock:",
      error.message,
    );
    return updateWaterBillStatusMock(id, status);
  }
};

// Get pending water bills
export const getPendingWaterBills = async () => {
  return getWaterBills({ status: "pending" });
};

// Get all water readings for a property
export const getPropertyWaterReadings = async (propertyId) => {
  return getWaterReadings({ property_id: propertyId });
};

// Download water report
export const downloadWaterReport = async (filters = {}) => {
  try {
    const response = await api.get("/water/reports", {
      params: filters,
      responseType: "blob",
    });
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for downloadWaterReport, using mock:",
      error.message,
    );
    // Mock download
    await new Promise((resolve) => setTimeout(resolve, 500));
    const blob = new Blob(["Water report data"], { type: "application/pdf" });
    return { data: blob };
  }
};

// ============================================================
// MOCK FUNCTIONS (Fallbacks)
// ============================================================

let MOCK_READINGS = [
  {
    id: 1,
    tenantId: 1,
    tenantName: "John Mwangi",
    houseNo: "A03",
    previousReading: 2450,
    currentReading: 2478,
    unitsUsed: 28,
    amount: 1960,
    readingDate: "2026-07-01",
    status: "pending",
  },
  {
    id: 2,
    tenantId: 2,
    tenantName: "Mary Wanjiku",
    houseNo: "B12",
    previousReading: 1890,
    currentReading: 1915,
    unitsUsed: 25,
    amount: 1750,
    readingDate: "2026-07-01",
    status: "pending",
  },
];

const submitWaterReadingMock = async (readingData) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const units = readingData.currentReading - readingData.previousReading;
  const rate = 70;
  const amount = units * rate;
  const newReading = {
    id: Date.now(),
    tenantId: readingData.tenantId || readingData.tenant_id,
    previousReading:
      readingData.previousReading || readingData.previous_reading,
    currentReading: readingData.currentReading || readingData.current_reading,
    unitsUsed: units,
    amount: amount,
    readingDate: new Date().toISOString().split("T")[0],
    status: "pending",
    tenantName: "Unknown",
    houseNo: "N/A",
  };
  MOCK_READINGS = [newReading, ...MOCK_READINGS];
  return { data: newReading };
};

const getWaterReadingsMock = async (filters) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  let readings = [...MOCK_READINGS];
  if (filters.tenantId || filters.tenant_id) {
    const id = filters.tenantId || filters.tenant_id;
    readings = readings.filter((r) => r.tenantId === parseInt(id));
  }
  return { data: readings };
};

const generateWaterBillMock = async (readingId, tenantId) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const reading = MOCK_READINGS.find((r) => r.id === readingId);
  return {
    data: {
      id: Date.now(),
      tenantId: tenantId,
      waterCharge: reading ? reading.amount : 0,
      garbageCharge: 300,
      total: reading ? reading.amount + 300 : 300,
      month: new Date().toISOString().substring(0, 7),
      status: "pending",
    },
  };
};

const getWaterBillsMock = async (filters) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  let bills = MOCK_READINGS.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    houseNo: r.houseNo,
    waterCharge: r.amount,
    garbageCharge: 300,
    total: r.amount + 300,
    month: r.readingDate.substring(0, 7),
    status: "pending",
  }));
  if (filters.tenantId || filters.tenant_id) {
    const id = filters.tenantId || filters.tenant_id;
    bills = bills.filter((b) => b.tenantId === parseInt(id));
  }
  return { data: bills };
};

const getConsumptionHistoryMock = async (tenantId) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const readings = MOCK_READINGS.filter(
    (r) => r.tenantId === parseInt(tenantId),
  );
  // Group by month
  const monthlyData = {};
  readings.forEach((r) => {
    const month = r.readingDate.substring(0, 7);
    monthlyData[month] = (monthlyData[month] || 0) + r.unitsUsed;
  });
  const result = Object.entries(monthlyData).map(([month, units]) => ({
    month,
    units,
  }));
  return { data: result };
};

const getWaterBillingSummaryMock = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const total = MOCK_READINGS.reduce((sum, r) => sum + r.amount, 0);
  const totalUnits = MOCK_READINGS.reduce((sum, r) => sum + r.unitsUsed, 0);
  return {
    data: {
      totalReadings: MOCK_READINGS.length,
      totalAmount: total,
      pending: MOCK_READINGS.length,
      averageConsumption:
        MOCK_READINGS.length > 0 ? totalUnits / MOCK_READINGS.length : 0,
    },
  };
};

const getWaterBillMock = async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const bill = MOCK_READINGS.find((r) => r.id === id);
  return { data: bill || null };
};

const updateWaterBillStatusMock = async (id, status) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { data: { id, status, message: "Status updated (mock)" } };
};

// ============================================================
// EXPORT
// ============================================================

const waterService = {
  submitWaterReading,
  getWaterReadings,
  getTenantWaterReadings,
  generateWaterBill,
  getWaterBills,
  getTenantWaterBills,
  getConsumptionHistory,
  getPropertyWaterReadings,
  getWaterBill,
  updateWaterBillStatus,
  getWaterBillingSummary,
  getPendingWaterBills,
  downloadWaterReport,
};

export default waterService;
