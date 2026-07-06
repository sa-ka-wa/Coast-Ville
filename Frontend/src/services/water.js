// services/water.js - Mock version
import api from "./api";

// Mock water readings
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
  },
];

// Submit water reading
export const submitWaterReading = async (readingData) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const units = readingData.currentReading - readingData.previousReading;
  const rate = 70;
  const amount = units * rate;

  const newReading = {
    id: Date.now(),
    ...readingData,
    unitsUsed: units,
    amount: amount,
    readingDate: new Date().toISOString().split("T")[0],
  };

  MOCK_READINGS = [newReading, ...MOCK_READINGS];

  return { data: newReading };
};

// Get water readings for a tenant
export const getWaterReadings = async (tenantId) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const readings = MOCK_READINGS.filter((r) => r.tenantId === tenantId);
  return { data: readings };
};

// Generate water bill
export const generateWaterBill = async (tenantId, month) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const reading = MOCK_READINGS.find((r) => r.tenantId === tenantId);
  return {
    data: {
      tenantId,
      month,
      waterCharge: reading ? reading.amount : 0,
      garbageCharge: 300,
      total: reading ? reading.amount + 300 : 300,
      status: "pending",
    },
  };
};

// Get water bills
export const getWaterBills = async (filters = {}) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const bills = MOCK_READINGS.map((r) => ({
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
  return { data: bills };
};

// Get consumption history
export const getConsumptionHistory = async (tenantId) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const readings = MOCK_READINGS.filter((r) => r.tenantId === tenantId);
  return { data: readings };
};

// Get all water readings for a property
export const getPropertyWaterReadings = async (propertyId) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { data: MOCK_READINGS };
};

// Get water bill by ID
export const getWaterBill = async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const bill = MOCK_READINGS.find((r) => r.id === id);
  return { data: bill || null };
};

// Update water bill status
export const updateWaterBillStatus = async (id, status) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { data: { id, status, message: "Status updated" } };
};

// Get water billing summary
export const getWaterBillingSummary = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const total = MOCK_READINGS.reduce((sum, r) => sum + r.amount, 0);
  return {
    data: {
      totalReadings: MOCK_READINGS.length,
      totalAmount: total,
      pending: MOCK_READINGS.length,
      averageConsumption:
        MOCK_READINGS.reduce((sum, r) => sum + r.unitsUsed, 0) /
        MOCK_READINGS.length,
    },
  };
};

// Get pending water bills
export const getPendingWaterBills = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { data: MOCK_READINGS };
};

// Download water report
export const downloadWaterReport = async (filters = {}) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const blob = new Blob(["Mock water report"], { type: "application/pdf" });
  return { data: blob };
};

// Export all as default
const waterService = {
  submitWaterReading,
  getWaterReadings,
  generateWaterBill,
  getWaterBills,
  getConsumptionHistory,
  getPropertyWaterReadings,
  getWaterBill,
  updateWaterBillStatus,
  getWaterBillingSummary,
  getPendingWaterBills,
  downloadWaterReport,
};

export default waterService;
