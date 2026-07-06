// services/payments.js - Mock version
import api from "./api";

// Mock payment data
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
  {
    id: 3,
    receiptNo: "THG2JK9A3M",
    tenantName: "Peter Ochieng",
    houseNo: "C05",
    amount: 18000,
    date: "2026-07-02",
    method: "cash",
    status: "pending",
    mpesaCode: null,
  },
  {
    id: 4,
    receiptNo: "THG2JK9A4M",
    tenantName: "Sarah Kimani",
    houseNo: "D08",
    amount: 10000,
    date: "2026-07-01",
    method: "mpesa",
    status: "paid",
    mpesaCode: "THG2JK9A4M",
  },
  {
    id: 5,
    receiptNo: "THG2JK9A5M",
    tenantName: "John Mwangi",
    houseNo: "A03",
    amount: 15000,
    date: "2026-06-04",
    method: "mpesa",
    status: "paid",
    mpesaCode: "THG2JK9A5M",
  },
];

// Parse M-Pesa SMS
export const parsePaymentSMS = (smsText) => {
  return api.post("/payments/parse", { smsText });
};

// Match tenant to payment
export const matchTenantToPayment = async (phone, amount) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock tenants
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

  return {
    data: {
      tenant: tenant || null,
    },
  };
};

// Confirm payment
export const confirmPayment = async (tenantId, paymentData) => {
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
    data: {
      message: "Payment confirmed successfully",
      payment: newPayment,
    },
  };
};

// Get payment history
export const getPaymentHistory = async (filters = {}) => {
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

  if (filters.status) {
    payments = payments.filter((p) => p.status === filters.status);
  }

  return { data: payments };
};

// Initiate STK Push
export const initiateSTKPush = async (data) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    data: {
      message: "STK Push initiated successfully",
      checkoutRequestID: `ws_CO_${Date.now()}`,
      responseCode: "0",
      responseDescription: "Success. Request accepted for processing",
    },
  };
};

// Generate receipt
export const generateReceipt = async (paymentId) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const payment = MOCK_PAYMENTS.find((p) => p.id === paymentId);
  return { data: payment || null };
};

// Get property stats
export const getPropertyStats = async () => {
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
};

// Get payment by receipt number
export const getPaymentByReceipt = async (receiptNo) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const payment = MOCK_PAYMENTS.find((p) => p.receiptNo === receiptNo);
  return { data: payment || null };
};

// Get payments by date range
export const getPaymentsByDateRange = async (startDate, endDate) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { data: MOCK_PAYMENTS };
};

// Get payment summary
export const getPaymentSummary = async () => {
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
      total,
      paid,
      pending,
      count: MOCK_PAYMENTS.length,
    },
  };
};

// Get outstanding payments
export const getOutstandingPayments = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const outstanding = MOCK_PAYMENTS.filter((p) => p.status === "pending");
  return { data: outstanding };
};

// Record manual payment
export const recordManualPayment = async (data) => {
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

// Download payment report
export const downloadPaymentReport = async (filters = {}) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock blob
  const blob = new Blob(["Mock PDF data"], { type: "application/pdf" });
  return { data: blob };
};

// Export all as default
const paymentsService = {
  parsePaymentSMS,
  matchTenantToPayment,
  confirmPayment,
  getPaymentHistory,
  initiateSTKPush,
  generateReceipt,
  getPropertyStats,
  getPaymentByReceipt,
  getPaymentsByDateRange,
  getPaymentSummary,
  getOutstandingPayments,
  recordManualPayment,
  downloadPaymentReport,
};

export default paymentsService;
