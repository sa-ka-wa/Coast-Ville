// src/services/statements.js
import api from "./api";

/**
 * Get monthly statement for a specific tenant
 */
export const getMonthlyStatement = async (tenantId, year, month) => {
  try {
    const response = await api.get(`/tenants/${tenantId}/monthly-statement`, {
      params: { year, month },
    });
    return response;
  } catch (error) {
    console.error("Error fetching monthly statement:", error);
    throw error;
  }
};

/**
 * Get monthly statements for all tenants
 */
export const getAllMonthlyStatements = async (propertyId, year, month) => {
  try {
    const response = await api.get("/tenants/monthly-statements", {
      params: { property_id: propertyId, year, month },
    });
    return response;
  } catch (error) {
    console.error("Error fetching all monthly statements:", error);
    throw error;
  }
};

/**
 * Get monthly payment summary for a tenant
 */
export const getMonthlyPaymentSummary = async (tenantId, year, month) => {
  try {
    const response = await api.get("/payments/monthly-summary", {
      params: { tenant_id: tenantId, year, month },
    });
    return response;
  } catch (error) {
    console.error("Error fetching monthly payment summary:", error);
    throw error;
  }
};
