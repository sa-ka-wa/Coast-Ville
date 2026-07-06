// utils/formatters.js

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "Ksh 0";
  return `Ksh ${Number(amount).toLocaleString()}`;
};

export const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return "N/A";
  // Format: 0712 345 678
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
};

export const getStatusColor = (status) => {
  const colors = {
    paid: "green",
    pending: "orange",
    late: "red",
    partial: "yellow",
    active: "blue",
    vacating: "purple",
    vacated: "gray",
    completed: "green",
    cancelled: "red",
    overdue: "red",
  };
  return colors[status?.toLowerCase()] || "default";
};

export const getStatusLabel = (status) => {
  const labels = {
    paid: "✅ Paid",
    pending: "⏳ Pending",
    late: "🔴 Late",
    partial: "🟡 Partial",
    active: "🟢 Active",
    vacating: "🔄 Vacating",
    vacated: "⚫ Vacated",
    completed: "✅ Completed",
    cancelled: "❌ Cancelled",
    overdue: "🔴 Overdue",
  };
  return labels[status?.toLowerCase()] || status || "Unknown";
};

export const getStatusBadge = (status) => {
  const badges = {
    paid: { color: "success", text: "Paid" },
    pending: { color: "warning", text: "Pending" },
    late: { color: "error", text: "Late" },
    partial: { color: "warning", text: "Partial" },
    active: { color: "processing", text: "Active" },
    vacating: { color: "warning", text: "Vacating" },
    vacated: { color: "default", text: "Vacated" },
    completed: { color: "success", text: "Completed" },
    cancelled: { color: "error", text: "Cancelled" },
    overdue: { color: "error", text: "Overdue" },
  };
  return (
    badges[status?.toLowerCase()] || {
      color: "default",
      text: status || "Unknown",
    }
  );
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export const capitalizeFirst = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const getInitials = (name) => {
  if (!name) return "";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const calculateDaysUntil = (date) => {
  if (!date) return null;
  const target = new Date(date);
  const now = new Date();
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const formatRelativeTime = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  const now = new Date();
  const diffTime = now - d;
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
};

// Export all as default as well
const formatters = {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhoneNumber,
  getStatusColor,
  getStatusLabel,
  getStatusBadge,
  truncateText,
  capitalizeFirst,
  getInitials,
  calculateDaysUntil,
  formatRelativeTime,
};

export default formatters;
