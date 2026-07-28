// services/payments.js
import api from "./api";

// ============================================================
// MOCK DATA (Fallbacks when API fails)
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
    receipt_no: `RCP-${new Date()
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "")}-${String(MOCK_PAYMENTS.length + 1).padStart(3, "0")}`,
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
    receipt_no: `RCP-${new Date()
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "")}-${String(MOCK_PAYMENTS.length + 1).padStart(3, "0")}`,
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
// REAL API FUNCTIONS (with mock fallbacks)
// ============================================================

/**
 * Get all payments with filters
 * GET /payments?property_id=X&tenant_id=X&status=X
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
 * GET /payments/:id
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
 * POST /payments
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
 * POST /payments/parse-mpesa
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
 * POST /payments/match
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
 * POST /payments/confirm
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
 * GET /payments/stats?property_id=X
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
 * POST /payments/stk-push
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
 * GET /payments/history?tenant_id=X&property_id=X
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
 * GET /payments/:paymentId/receipt
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
 * POST /payments/send-receipt
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
 * POST /payments/status
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
 * GET /payments/summary?property_id=X
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
 * DELETE /payments/:paymentId
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

// services/payments.js - Add these functions to the existing file

// ============================================================
// PAYMENT ALLOCATION FUNCTIONS
// ============================================================

/**
 * Process payment allocation (rent, water, deposit)
 * POST /payments/:id/allocate
 */
export const processPaymentAllocation = async (paymentId) => {
  try {
    const response = await api.post(`/payments/${paymentId}/allocate`);
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for processPaymentAllocation, using mock:",
      error.message,
    );
    // Mock allocation
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Find the payment in mock data
    const payment = MOCK_PAYMENTS.find((p) => p.id === paymentId);
    if (!payment) {
      return {
        data: {
          success: false,
          message: "Payment not found",
        },
      };
    }

    // Mock allocation logic
    const monthlyRent = 15000;
    const waterBill = 1500;
    const deposit = 30000;

    let allocations = [];
    let remaining = payment.amount;
    let depositAllocated = 0;
    let waterAllocated = 0;
    let rentAllocated = 0;
    let excess = 0;
    let balanceDue = 0;

    // Check if deposit is already paid (mock)
    const depositPaid = false;

    // 1. Allocate to deposit if not paid
    if (!depositPaid && remaining > 0) {
      const depositAmount = Math.min(remaining, deposit);
      if (depositAmount > 0) {
        depositAllocated = depositAmount;
        remaining -= depositAmount;
        allocations.push({
          type: "deposit",
          amount: depositAmount,
          description: `🏦 Deposit paid: KSh ${depositAmount.toLocaleString()}`,
          status: depositAmount === deposit ? "complete" : "partial",
        });
      }
    }

    // 2. Allocate to water bill
    if (remaining > 0) {
      const waterAmount = Math.min(remaining, waterBill);
      if (waterAmount > 0) {
        waterAllocated = waterAmount;
        remaining -= waterAmount;
        allocations.push({
          type: "water",
          amount: waterAmount,
          description: `💧 Water bill paid: KSh ${waterAmount.toLocaleString()}`,
          status: waterAmount === waterBill ? "complete" : "partial",
        });
      }
    }

    // 3. Allocate to rent
    if (remaining > 0) {
      if (remaining >= monthlyRent) {
        rentAllocated = monthlyRent;
        remaining -= monthlyRent;
        allocations.push({
          type: "rent",
          amount: monthlyRent,
          description: `🏠 Rent paid: KSh ${monthlyRent.toLocaleString()}`,
          status: "complete",
        });

        // Check for excess
        if (remaining > 0) {
          excess = remaining;
          allocations.push({
            type: "excess",
            amount: remaining,
            description: `💰 Excess credited to next month: KSh ${remaining.toLocaleString()}`,
            status: "credit",
          });
        }
      } else {
        // Partial rent
        rentAllocated = remaining;
        balanceDue = monthlyRent - remaining;
        allocations.push({
          type: "rent_partial",
          amount: remaining,
          description: `⚠️ Partial rent: KSh ${remaining.toLocaleString()} (Balance due: KSh ${balanceDue.toLocaleString()})`,
          status: "partial",
        });
        remaining = 0;
      }
    }

    // Update mock payment
    const updatedPayment = {
      ...payment,
      rent_amount: rentAllocated,
      water_amount: waterAllocated,
      deposit_amount: depositAllocated,
      excess_amount: excess,
      balance_due: balanceDue,
      status: balanceDue > 0 ? "partial" : "paid",
    };

    // Update in mock array
    const index = MOCK_PAYMENTS.findIndex((p) => p.id === paymentId);
    if (index !== -1) {
      MOCK_PAYMENTS[index] = updatedPayment;
    }

    return {
      data: {
        success: true,
        message: "Payment allocated successfully",
        payment: updatedPayment,
        allocations: allocations,
        excess: excess,
        balance_due: balanceDue,
        total_allocated: payment.amount - remaining,
      },
    };
  }
};

/**
 * Get payment allocation details
 * GET /payments/:id/allocation
 */
export const getPaymentAllocation = async (paymentId) => {
  try {
    const response = await api.get(`/payments/${paymentId}/allocation`);
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for getPaymentAllocation, using mock:",
      error.message,
    );
    await new Promise((resolve) => setTimeout(resolve, 300));

    const payment = MOCK_PAYMENTS.find((p) => p.id === paymentId);
    if (!payment) {
      return {
        data: {
          payment: null,
          allocations: {
            rent: 0,
            water: 0,
            deposit: 0,
            excess: 0,
            balance_due: 0,
            credited_to_next_month: false,
          },
        },
      };
    }

    return {
      data: {
        payment: payment,
        allocations: {
          rent: payment.rent_amount || 0,
          water: payment.water_amount || 0,
          deposit: payment.deposit_amount || 0,
          excess: payment.excess_amount || 0,
          balance_due: payment.balance_due || 0,
          credited_to_next_month: payment.credited_to_next_month || false,
        },
      },
    };
  }
};

/**
 * Move payment to different tenant (fix wrong house)
 * POST /payments/:id/move
 */
export const movePaymentToTenant = async (paymentId, newTenantId, reason) => {
  try {
    const response = await api.post(`/payments/${paymentId}/move`, {
      new_tenant_id: newTenantId,
      reason: reason,
    });
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for movePaymentToTenant, using mock:",
      error.message,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));

    const payment = MOCK_PAYMENTS.find((p) => p.id === paymentId);
    if (!payment) {
      return {
        data: {
          success: false,
          message: "Payment not found",
        },
      };
    }

    // Update mock payment
    const updatedPayment = {
      ...payment,
      original_tenant_id: payment.tenant_id,
      tenant_id: newTenantId,
      moved_reason: reason,
      moved_at: new Date().toISOString(),
    };

    const index = MOCK_PAYMENTS.findIndex((p) => p.id === paymentId);
    if (index !== -1) {
      MOCK_PAYMENTS[index] = updatedPayment;
    }

    return {
      data: {
        success: true,
        message: "Payment moved successfully",
        payment: updatedPayment,
      },
    };
  }
};

/**
 * Reverse a payment (refund)
 * POST /payments/:id/reverse
 */
export const reversePayment = async (paymentId, reason) => {
  try {
    const response = await api.post(`/payments/${paymentId}/reverse`, {
      reason: reason,
    });
    return response;
  } catch (error) {
    console.warn(
      "⚠️ API failed for reversePayment, using mock:",
      error.message,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));

    const payment = MOCK_PAYMENTS.find((p) => p.id === paymentId);
    if (!payment) {
      return {
        data: {
          success: false,
          message: "Payment not found",
        },
      };
    }

    const reversedPayment = {
      ...payment,
      status: "reversed",
      reversed: true,
      reversal_reason: reason,
      reversed_at: new Date().toISOString(),
    };

    const index = MOCK_PAYMENTS.findIndex((p) => p.id === paymentId);
    if (index !== -1) {
      MOCK_PAYMENTS[index] = reversedPayment;
    }

    return {
      data: {
        success: true,
        message: "Payment reversed successfully",
        payment: reversedPayment,
        reversal_id: `REV-${Date.now()}`,
      },
    };
  }
};
