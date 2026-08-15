// src/utils/whatsapp.js
import api from "../services/api";

/**
 * Generate a wa.me link for a payment receipt
 * @param {number} paymentId - The payment ID
 * @returns {Promise<string>} - The wa.me link
 */
export const getPaymentReceiptLink = async (paymentId) => {
  try {
    const response = await api.get(`/payments/${paymentId}/whatsapp-link`);
    return response.data.link;
  } catch (error) {
    console.error("Error generating payment receipt link:", error);
    throw error;
  }
};

/**
 * Open WhatsApp with a pre‑filled message
 * @param {string} link - The wa.me link
 * @param {boolean} newTab - Whether to open in a new tab (default true)
 */
export const openWhatsAppLink = (link, newTab = true) => {
  if (!link) {
    console.error("No link provided");
    return;
  }
  if (newTab) {
    window.open(link, "_blank");
  } else {
    window.location.href = link;
  }
};

/**
 * Open WhatsApp with a payment receipt
 * @param {number} paymentId
 */
export const openPaymentReceipt = async (paymentId) => {
  try {
    const link = await getPaymentReceiptLink(paymentId);
    openWhatsAppLink(link);
    return { success: true, link };
  } catch (error) {
    console.error("Failed to open payment receipt:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate a wa.me link for a custom message
 * @param {string} phone - Phone number (international format, no leading 0 or +)
 * @param {string} message - The message text
 * @returns {string} - The wa.me link
 */
export const generateCustomWhatsAppLink = (phone, message) => {
  // Clean phone number
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "254" + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith("254")) {
    cleanPhone = "254" + cleanPhone;
  }
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

/**
 * Open WhatsApp with a custom message
 * @param {string} phone
 * @param {string} message
 */
export const openCustomWhatsApp = (phone, message) => {
  const link = generateCustomWhatsAppLink(phone, message);
  openWhatsAppLink(link);
};

/**
 * Generate a water bill notification link
 * @param {object} reading - Water reading object with tenant, unit, amount, etc.
 * @param {string} reading.tenant.phone
 * @param {string} reading.tenant.name
 * @param {string} reading.unit.unit_number
 * @param {number} reading.units_used
 * @param {number} reading.amount
 * @param {string} reading.reading_date
 * @returns {string|null} - wa.me link or null if no phone
 */
export const generateWaterBillLink = (reading) => {
  const phone = reading.tenant?.phone || reading.phone;
  if (!phone) return null;

  const lines = [];
  lines.push("💧 WATER BILL");
  lines.push("");
  lines.push(`Dear ${reading.tenant?.name || "Tenant"},`);
  lines.push("");
  lines.push(`🏠 House: ${reading.unit?.unit_number || "N/A"}`);
  lines.push(`📊 Units Used: ${reading.units_used || 0} units`);
  lines.push(`💰 Amount Due: KSh ${(reading.amount || 0).toLocaleString()}`);
  lines.push(`📅 Reading Date: ${reading.reading_date || "N/A"}`);
  lines.push("");
  lines.push("Please make payment by the 5th of next month.");
  lines.push("");
  lines.push("📱 M-Pesa Paybill: 247247");
  lines.push(`Account: ${reading.unit?.unit_number || "N/A"}`);
  lines.push("");
  lines.push("Thank you!");
  lines.push("RentManager System");

  const message = lines.join("\n");
  return generateCustomWhatsAppLink(phone, message);
};

/**
 * Open WhatsApp with a water bill
 * @param {object} reading
 */
export const openWaterBill = (reading) => {
  const link = generateWaterBillLink(reading);
  if (link) {
    openWhatsAppLink(link);
    return { success: true, link };
  }
  return { success: false, error: "No phone number" };
};

/**
 * Generate a rent reminder link
 * @param {object} tenant - Tenant object with phone, name, unit, etc.
 * @param {number} amount - Rent amount
 * @param {string} dueDate - Due date (e.g., "1st September 2026")
 * @returns {string|null} - wa.me link or null if no phone
 */
export const generateRentReminderLink = (tenant, amount, dueDate) => {
  if (!tenant.phone) return null;

  const lines = [];
  lines.push("🔔 RENT REMINDER");
  lines.push("");
  lines.push(`Dear ${tenant.name},`);
  lines.push("");
  lines.push("This is a reminder that your rent payment is due.");
  lines.push("");
  lines.push(`🏠 House: ${tenant.unit?.unit_number || "N/A"}`);
  lines.push(`💰 Amount: KSh ${(amount || 0).toLocaleString()}`);
  lines.push(`📅 Due Date: ${dueDate || "1st of the month"}`);
  lines.push("");
  lines.push("Please make payment to avoid late fees.");
  lines.push("");
  lines.push("📱 M-Pesa Paybill: 247247");
  lines.push(`Account: ${tenant.unit?.unit_number || "N/A"}`);
  lines.push("");
  lines.push("Thank you!");
  lines.push("RentManager System");

  const message = lines.join("\n");
  return generateCustomWhatsAppLink(tenant.phone, message);
};

/**
 * Open WhatsApp with a rent reminder
 * @param {object} tenant
 * @param {number} amount
 * @param {string} dueDate
 */
export const openRentReminder = (tenant, amount, dueDate) => {
  const link = generateRentReminderLink(tenant, amount, dueDate);
  if (link) {
    openWhatsAppLink(link);
    return { success: true, link };
  }
  return { success: false, error: "No phone number" };
};

export default {
  getPaymentReceiptLink,
  openWhatsAppLink,
  openPaymentReceipt,
  generateCustomWhatsAppLink,
  openCustomWhatsApp,
  generateWaterBillLink,
  openWaterBill,
  generateRentReminderLink,
  openRentReminder,
};
