// services/payments.js
import api from "./api";

// Real API calls (will use backend when available)
export const getPayments = async (filters = {}) => {
  try {
    const response = await api.get("/payments", { params: filters });
    return response;
  } catch (error) {
    console.warn("Using mock data for payments:", error);
    return getMockPayments(filters);
  }
};

export const createPayment = async (data) => {
  try {
    const response = await api.post("/payments", data);
    return response;
  } catch (error) {
    console.warn("Using mock data for create payment:", error);
    return createMockPayment(data);
  }
};

export const initiateSTKPush = async (data) => {
  try {
    const response = await api.post("/payments/stk-push", data);
    return response;
  } catch (error) {
    console.warn("Using mock data for STK Push:", error);
    return mockSTKPush(data);
  }
};

export const getPaymentHistory = async (filters = {}) => {
  try {
    const response = await api.get("/payments/history", { params: filters });
    return response;
  } catch (error) {
    console.warn("Using mock data for payment history:", error);
    return getMockPaymentHistory(filters);
  }
};

// Mock data fallbacks
let MOCK_PAYMENTS = [
  {
    id: 1,
    receiptNo: "THG2JK9A1M",
    tenantName: "John Mwangi",
    houseNo: "A03",
    amount: 15000,
    date: "2026-07-04",
    method: "mpesa",
    status: "paid",
    mpesaCode: "THG2JK9A1M",
  },
  {
    id: 2,
    receiptNo: "THG2JK9A2M",
    tenantName: "Mary Wanjiku",
    houseNo: "B12",
    amount: 12000,
    date: "2026-07-03",
    method: "mpesa",
    status: "paid",
    mpesaCode: "THG2JK9A2M",
  },
];

const getMockPayments = async (filters) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  let payments = [...MOCK_PAYMENTS];
  if (filters.search) {
    const search = filters.search.toLowerCase();
    payments = payments.filter(
      (p) =>
        p.tenantName.toLowerCase().includes(search) ||
        p.houseNo.toLowerCase().includes(search),
    );
  }
  return { data: payments };
};

const createMockPayment = async (data) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newPayment = {
    id: Date.now(),
    receiptNo: `RCP-${Date.now()}`,
    ...data,
    date: new Date().toISOString().split("T")[0],
    status: "paid",
  };
  MOCK_PAYMENTS = [newPayment, ...MOCK_PAYMENTS];
  return { data: newPayment };
};

const mockSTKPush = async (data) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return {
    data: {
      message: "STK Push initiated successfully (mock)",
      checkoutRequestID: `ws_CO_${Date.now()}`,
      responseCode: "0",
      responseDescription: "Success. Request accepted for processing",
    },
  };
};

const getMockPaymentHistory = async (filters) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  let payments = [...MOCK_PAYMENTS];
  if (filters.tenant_id) {
    payments = payments.filter(
      (p) => p.tenantId === parseInt(filters.tenant_id),
    );
  }
  return { data: payments };
};

// Keep other exports as is...
export const matchTenantToPayment = async (phone, amount) => {
  try {
    const response = await api.post("/payments/match", { phone, amount });
    return response;
  } catch (error) {
    // Mock fallback
    await new Promise((resolve) => setTimeout(resolve, 500));
    const mockTenants = [
      {
        id: 1,
        name: "John Mwangi",
        houseNo: "A03",
        phone: "0712345678",
        monthlyRent: 15000,
        balance: 0,
      },
      {
        id: 2,
        name: "Mary Wanjiku",
        houseNo: "B12",
        phone: "0723456789",
        monthlyRent: 12000,
        balance: 0,
      },
    ];
    const tenant = mockTenants.find((t) => t.phone === phone);
    return { data: { tenant: tenant || null } };
  }
};

export const confirmPayment = async (tenantId, paymentData) => {
  try {
    const response = await api.post("/payments/confirm", {
      tenantId,
      paymentData,
    });
    return response;
  } catch (error) {
    // Mock fallback
    await new Promise((resolve) => setTimeout(resolve, 800));
    const newPayment = {
      id: Date.now(),
      receiptNo: paymentData.receipt || `RCP-${Date.now()}`,
      tenantName: "John Mwangi",
      houseNo: "A03",
      amount: paymentData.amount,
      date: new Date().toISOString().split("T")[0],
      method: "mpesa",
      status: "paid",
      mpesaCode: paymentData.receipt,
    };
    MOCK_PAYMENTS = [newPayment, ...MOCK_PAYMENTS];
    return {
      data: { message: "Payment confirmed successfully", payment: newPayment },
    };
  }
};

export const sendReceipt = async (data) => {
  try {
    const response = await api.post("/payments/send-receipt", data);
    return response;
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { data: { message: "Receipt sent successfully (mock)" } };
  }
};

export const getPropertyStats = async () => {
  try {
    const response = await api.get("/payments/stats");
    return response;
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      data: {
        totalUnits: 48,
        occupied: 44,
        vacant: 4,
        expectedRent: 720000,
        collected: 650000,
        balance: 70000,
        waterPending: 12,
      },
    };
  }
};

export const getPaymentSummary = async () => {
  try {
    const response = await api.get("/payments/summary");
    return response;
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const total = MOCK_PAYMENTS.reduce((sum, p) => sum + p.amount, 0);
    const paid = MOCK_PAYMENTS.filter((p) => p.status === "paid").reduce(
      (sum, p) => sum + p.amount,
      0,
    );
    const pending = MOCK_PAYMENTS.filter((p) => p.status === "pending").reduce(
      (sum, p) => sum + p.amount,
      0,
    );
    return { data: { total, paid, pending, count: MOCK_PAYMENTS.length } };
  }
};

export default {
  getPayments,
  createPayment,
  initiateSTKPush,
  getPaymentHistory,
  matchTenantToPayment,
  confirmPayment,
  sendReceipt,
  getPropertyStats,
  getPaymentSummary,
};
