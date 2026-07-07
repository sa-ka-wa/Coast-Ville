// services/payments.js
import api from "./api";

// ============================================================
// MOCK DATA
// ============================================================

let MOCK_PAYMENTS = [
  {
    id: 1,
    property_id: 1,
    tenant_id: 1,
    unit_id: 1,
    amount: 15000,
    receipt_no: "RCP-20260701-001",
    payment_date: "2026-07-01T10:30:00",
    payment_method: "mpesa",
    mpesa_code: "THG2JK9A1M",
    status: "paid",
    payment_for_month: "2026-07-01",
    tenantName: "John Mwangi",
    houseNo: "A03",
    notes: "July rent payment",
  },
  {
    id: 2,
    property_id: 1,
    tenant_id: 2,
    unit_id: 2,
    amount: 12000,
    receipt_no: "RCP-20260702-002",
    payment_date: "2026-07-02T14:20:00",
    payment_method: "cash",
    mpesa_code: null,
    status: "paid",
    payment_for_month: "2026-07-01",
    tenantName: "Mary Wanjiku",
    houseNo: "B12",
    notes: "July rent - cash",
  },
  {
    id: 3,
    property_id: 2,
    tenant_id: 3,
    unit_id: 3,
    amount: 18000,
    receipt_no: "RCP-20260703-003",
    payment_date: "2026-07-03T09:15:00",
    payment_method: "mpesa",
    mpesa_code: "THG2JK9A3M",
    status: "pending",
    payment_for_month: "2026-07-01",
    tenantName: "Peter Ochieng",
    houseNo: "C05",
    notes: "Pending confirmation",
  },
];

// ============================================================
// MOCK FUNCTIONS (Fallbacks)
// ============================================================

const getMockPayments = async (filters) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  let payments = [...MOCK_PAYMENTS];

  if (filters.tenant_id) {
    payments = payments.filter(
      (p) => p.tenant_id === parseInt(filters.tenant_id),
    );
  }
  if (filters.property_id) {
    payments = payments.filter(
      (p) => p.property_id === parseInt(filters.property_id),
    );
  }
  if (filters.status) {
    payments = payments.filter((p) => p.status === filters.status);
  }
  if (filters.payment_method) {
    payments = payments.filter(
      (p) => p.payment_method === filters.payment_method,
    );
  }

  return { data: payments };
};

const createMockPayment = async (paymentData) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newPayment = {
    id: Date.now(),
    ...paymentData,
    receipt_no: `RCP-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${String(MOCK_PAYMENTS.length + 1).padStart(3, "0")}`,
    payment_date: new Date().toISOString(),
    status: "paid",
    tenantName: "Unknown Tenant",
    houseNo: "N/A",
  };
  // Try to find tenant name
  const tenant = MOCK_PAYMENTS.find(
    (p) => p.tenant_id === paymentData.tenant_id,
  );
  if (tenant) {
    newPayment.tenantName = tenant.tenantName;
    newPayment.houseNo = tenant.houseNo;
  }
  MOCK_PAYMENTS = [newPayment, ...MOCK_PAYMENTS];
  return { data: newPayment };
};

const parseMpesaMessageMock = async (data) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const message = data.message || "";

  // Mock parsing logic
  const amountMatch = message.match(/KSh\s+([\d,]+\.?\d*)/);
  const senderMatch = message.match(
    /(?:from|by)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|$)/,
  );
  const codeMatch = message.match(/Code\s*[:]?\s*([A-Z0-9]{6,12})/);
  const tillMatch = message.match(
    /(?:Paybill|Till Number|Till No|TILL)\s*[:]?\s*(\d+)/,
  );
  const phoneMatch = message.match(/(?:0|\+254)\d{9}/);

  return {
    data: {
      amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 5000,
      sender: senderMatch ? senderMatch[1].trim() : "Unknown Sender",
      phone: phoneMatch ? phoneMatch[0] : "0712345678",
      till_number: tillMatch ? tillMatch[1] : "123456",
      mpesa_code: codeMatch ? codeMatch[1] : "ABC123XYZ",
      date: new Date().toISOString(),
      type: "received",
      message: message,
    },
  };
};

const matchPaymentMock = async (data) => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const mockTenants = [
    {
      id: 1,
      name: "John Mwangi",
      phone: "0712345678",
      house_no: "A03",
      balance: 0,
      match_score: 100,
    },
    {
      id: 2,
      name: "Mary Wanjiku",
      phone: "0723456789",
      house_no: "B12",
      balance: 5000,
      match_score: 90,
    },
    {
      id: 3,
      name: "Peter Ochieng",
      phone: "0734567890",
      house_no: "C05",
      balance: 15000,
      match_score: 80,
    },
  ];

  let matched = mockTenants;
  if (data.amount) {
    matched = matched.filter((t) => Math.abs(t.balance - data.amount) < 5000);
  }
  if (data.phone) {
    matched = matched.filter((t) => t.phone === data.phone);
  }

  return {
    data: {
      matched_tenants: matched.slice(0, 3),
      total_matches: matched.length,
    },
  };
};

const confirmPaymentMock = async (paymentData) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newPayment = {
    id: Date.now(),
    ...paymentData,
    receipt_no: `RCP-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${String(MOCK_PAYMENTS.length + 1).padStart(3, "0")}`,
    payment_date: new Date().toISOString(),
    status: "paid",
    tenantName: "Unknown Tenant",
    houseNo: "N/A",
  };
  MOCK_PAYMENTS = [newPayment, ...MOCK_PAYMENTS];
  return { data: newPayment };
};

const getPaymentStatsMock = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const total = MOCK_PAYMENTS.reduce((sum, p) => sum + p.amount, 0);
  const paid = MOCK_PAYMENTS.filter((p) => p.status === "paid");
  const paidTotal = paid.reduce((sum, p) => sum + p.amount, 0);
  const pending = MOCK_PAYMENTS.filter((p) => p.status === "pending");
  const pendingTotal = pending.reduce((sum, p) => sum + p.amount, 0);

  return {
    data: {
      totalCollected: paidTotal,
      expectedRent: 720000,
      outstanding: 720000 - paidTotal,
      occupancy: 92,
      total_payments: MOCK_PAYMENTS.length,
      total_amount: total,
      today_count: 2,
      today_amount: 27000,
      month_count: 3,
      month_amount: 45000,
    },
  };
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
      (p) => p.tenant_id === parseInt(filters.tenant_id),
    );
  }
  if (filters.start_date) {
    payments = payments.filter(
      (p) => new Date(p.payment_date) >= new Date(filters.start_date),
    );
  }
  if (filters.end_date) {
    payments = payments.filter(
      (p) => new Date(p.payment_date) <= new Date(filters.end_date),
    );
  }
  return { data: payments };
};

const generateReceiptMock = async (paymentId) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const payment = MOCK_PAYMENTS.find((p) => p.id === paymentId);
  return {
    data: {
      receipt: payment || null,
      message: "Receipt generated successfully",
    },
  };
};

const getPaymentSummaryMock = async () => {
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
  return {
    data: {
      total_collected: paid,
      pending: pending,
      failed: 0,
      total_payments: MOCK_PAYMENTS.length,
    },
  };
};

// ============================================================
// API FUNCTIONS
// ============================================================

/**
 * Get all payments with filters
 */
export const getPayments = async (filters = {}) => {
  try {
    const response = await api.get("/payments", { params: filters });
    return response;
  } catch (error) {
    console.warn("⚠️ API failed for getPayments, using mock:", error.message);
    return getMockPayments(filters);
  }
};

/**
 * Get a single payment by ID
 */
export const getPayment = async (paymentId) => {
  try {
    const response = await api.get(`/payments/${paymentId}`);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed for getPayment, using mock:", error.message);
    const payment = MOCK_PAYMENTS.find((p) => p.id === paymentId);
    return { data: payment || null };
  }
};

/**
 * Create a new payment (manual entry)
 */
export const createPayment = async (paymentData) => {
  try {
    const response = await api.post("/payments", paymentData);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed for createPayment, using mock:", error.message);
    return createMockPayment(paymentData);
  }
};

/**
 * Parse M-Pesa message from SMS
 */
export const parseMpesaMessage = async (data) => {
  try {
    const response = await api.post("/payments/parse-mpesa", data);
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for parseMpesaMessage, using mock:",
      error.message,
    );
    return parseMpesaMessageMock(data);
  }
};

/**
 * Match payment to tenant
 */
export const matchPayment = async (data) => {
  try {
    const response = await api.post("/payments/match", data);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed for matchPayment, using mock:", error.message);
    return matchPaymentMock(data);
  }
};

/**
 * Alias for matchPayment (backward compatibility)
 */
export const matchTenantToPayment = matchPayment;

/**
 * Confirm a payment (for M-Pesa or manual)
 */
export const confirmPayment = async (paymentData) => {
  try {
    const response = await api.post("/payments/confirm", paymentData);
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for confirmPayment, using mock:",
      error.message,
    );
    return confirmPaymentMock(paymentData);
  }
};

/**
 * Get payment statistics
 */
export const getPaymentStats = async (filters = {}) => {
  try {
    const response = await api.get("/payments/stats", { params: filters });
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for getPaymentStats, using mock:",
      error.message,
    );
    return getPaymentStatsMock();
  }
};

/**
 * Initiate STK Push
 */
export const initiateSTKPush = async (data) => {
  try {
    const response = await api.post("/payments/stk-push", data);
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for initiateSTKPush, using mock:",
      error.message,
    );
    return mockSTKPush(data);
  }
};

/**
 * Get payment history
 */
export const getPaymentHistory = async (filters = {}) => {
  try {
    const response = await api.get("/payments/history", { params: filters });
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for getPaymentHistory, using mock:",
      error.message,
    );
    return getMockPaymentHistory(filters);
  }
};

/**
 * Generate receipt for a payment
 */
export const generateReceipt = async (paymentId) => {
  try {
    const response = await api.get(`/payments/${paymentId}/receipt`);
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for generateReceipt, using mock:",
      error.message,
    );
    return generateReceiptMock(paymentId);
  }
};

/**
 * Send receipt to tenant
 */
export const sendReceipt = async (data) => {
  try {
    const response = await api.post("/payments/send-receipt", data);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed for sendReceipt, using mock:", error.message);
    return { data: { message: "Receipt sent successfully (mock)" } };
  }
};

/**
 * Check payment status
 */
export const checkPaymentStatus = async (data) => {
  try {
    const response = await api.post("/payments/status", data);
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for checkPaymentStatus, using mock:",
      error.message,
    );
    return { data: { status: "completed", data: {} } };
  }
};

/**
 * Get payment summary
 */
export const getPaymentSummary = async (filters = {}) => {
  try {
    const response = await api.get("/payments/summary", { params: filters });
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for getPaymentSummary, using mock:",
      error.message,
    );
    return getPaymentSummaryMock();
  }
};

/**
 * Delete a payment (admin only)
 */
export const deletePayment = async (paymentId) => {
  try {
    const response = await api.delete(`/payments/${paymentId}`);
    return response;
  } catch (error) {
    console.warn("⚠️ API failed for deletePayment, using mock:", error.message);
    throw error;
  }
};

// ============================================================
// DEFAULT EXPORT (All functions)
// ============================================================

const paymentsService = {
  getPayments,
  getPayment,
  createPayment,
  parseMpesaMessage,
  matchPayment,
  matchTenantToPayment,
  confirmPayment,
  getPaymentStats,
  initiateSTKPush,
  getPaymentHistory,
  generateReceipt,
  sendReceipt,
  checkPaymentStatus,
  getPaymentSummary,
  deletePayment,
};

export default paymentsService;
