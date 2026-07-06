// utils/mpesaParser.js

export const parseMpesaSMS = (smsText) => {
  // Patterns for M-Pesa SMS
  const patterns = {
    receipt: /(?:Confirmation|Confirmed)\.?\s*([A-Z0-9]{10,12})/i,
    amount: /Ksh\s*([\d,]+\.?\d*)/i,
    name: /received from\s+(.+?)\s+\d{10,12}/i,
    phone: /(\d{10,12})(?!.*\d{10,12})/,
    date: /(\d{1,2}\.\d{1,2}\.\d{2,4})/,
  };

  const data = {};

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = smsText.match(pattern);
    if (match) {
      data[key] = match[1].trim();
    }
  }

  // Clean amount
  if (data.amount) {
    data.amount = parseFloat(data.amount.replace(/,/g, ""));
  }

  // Clean phone (ensure it starts with 0)
  if (data.phone) {
    data.phone = data.phone.replace(/^254/, "0");
  }

  return data;
};

export const formatReceipt = (payment, tenant) => {
  return `
🏠 ${tenant.propertyName || "PROPERTY"}
📋 RENT RECEIPT

Receipt No: ${payment.receiptNo}
Date: ${new Date(payment.date).toLocaleDateString("en-KE")}
Tenant: ${tenant.name}
House: ${tenant.houseNo}

Rent: Ksh ${tenant.monthlyRent.toLocaleString()}
${payment.waterAmount ? `Water: Ksh ${payment.waterAmount.toLocaleString()}` : ""}
${payment.garbageAmount ? `Garbage: Ksh ${payment.garbageAmount.toLocaleString()}` : ""}
${payment.extraCharges ? `Extra: Ksh ${payment.extraCharges.toLocaleString()}` : ""}
${"-".repeat(30)}
Total: Ksh ${payment.amount.toLocaleString()}

Amount Paid: Ksh ${payment.amount.toLocaleString()}
Balance: Ksh ${payment.balance.toLocaleString()}

📱 M-Pesa: ${payment.mpesaCode}
Status: ✅ PAID

Next Rent Due: ${new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })}

Thank you for your payment! 🏡
  `;
};
