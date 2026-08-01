// src/pages/Admin/MonthlyBilling.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Select,
  DatePicker,
  message,
  Modal,
  Tag,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Popconfirm,
  Alert,
  Divider,
  Badge,
  Typography,
  Descriptions,
  Spin,
  Empty,
  App,
  Form,
  InputNumber,
  Input,
  Checkbox,
  Radio,
} from "antd";
import {
  FileTextOutlined,
  SendOutlined,
  PrinterOutlined,
  DownloadOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
  FilePdfOutlined,
  WhatsAppOutlined,
  MailOutlined,
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined,
  ForwardOutlined,
  UserAddOutlined,
  CalculatorOutlined,
  UserDeleteOutlined,
  PercentageOutlined,
  WalletOutlined,
  InfoCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useProperty } from "../../context/PropertyContext";
import { getTenants } from "../../services/tenants";
import { getWaterReadings, getWaterBills } from "../../services/water";
import { getPayments } from "../../services/payments";
import { formatCurrency, formatDate } from "../../utils/formatters";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { Option } = Select;

const MonthlyBillingContent = () => {
  const navigate = useNavigate();
  const { message: appMessage, modal: appModal } = App.useApp();
  const { activeProperty } = useProperty();
  const [loading, setLoading] = useState(false);
  const [billingMonth, setBillingMonth] = useState(dayjs());
  const [tenants, setTenants] = useState([]);
  const [bills, setBills] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [closingMonth, setClosingMonth] = useState(false);
  const [generatingRent, setGeneratingRent] = useState(false);

  // State for generating bill for specific tenant
  const [generateBillModalVisible, setGenerateBillModalVisible] =
    useState(false);
  const [selectedTenantForBill, setSelectedTenantForBill] = useState(null);
  const [billForm] = Form.useForm();
  const [generatingSpecificBill, setGeneratingSpecificBill] = useState(false);

  // State for closing month for specific tenant
  const [closeTenantModalVisible, setCloseTenantModalVisible] = useState(false);
  const [selectedTenantForClose, setSelectedTenantForClose] = useState(null);
  const [closeTenantForm] = Form.useForm();
  const [closingTenant, setClosingTenant] = useState(false);

  // State for adding rent to specific tenant
  const [addRentModalVisible, setAddRentModalVisible] = useState(false);
  const [selectedTenantForRent, setSelectedTenantForRent] = useState(null);
  const [rentForm] = Form.useForm();
  const [addingRent, setAddingRent] = useState(false);
  const [calculatedRent, setCalculatedRent] = useState(0);
  const [prorationDetails, setProrationDetails] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    collectionRate: 0,
  });

  const currentPropertyId = activeProperty?.id;

  // Check if month closing is allowed (25th to 5th)
  const isMonthClosingAllowed = () => {
    const today = dayjs();
    const day = today.date();
    return day >= 25 || day <= 5;
  };

  // Get closing period message
  const getClosingPeriodMessage = () => {
    const today = dayjs();
    const day = today.date();
    if (day >= 25 && day <= 31) {
      return `📅 You are in the closing period (${today.format("DD MMM")} - ${today.endOf("month").format("DD MMM")})`;
    } else if (day >= 1 && day <= 5) {
      return `📅 You are in the closing period (${today.startOf("month").format("DD MMM")} - ${today.format("DD MMM")})`;
    } else {
      return `⏰ Month closing is only allowed between 25th - 5th. Current date: ${today.format("DD MMM YYYY")}`;
    }
  };

  // Get next closing date
  const getNextClosingDate = () => {
    const today = dayjs();
    const day = today.date();
    if (day < 25) {
      return today.date(25).format("DD MMM YYYY");
    } else if (day > 5 && day < 25) {
      return today.add(1, "month").date(25).format("DD MMM YYYY");
    }
    return null;
  };

  useEffect(() => {
    if (currentPropertyId) {
      fetchData();
    }
  }, [currentPropertyId, billingMonth]);

  // ✅ Handle click on "No Reading" - Navigate to water readings
  const handleNoReadingClick = (tenant) => {
    navigate(
      `/admin/water?tenant_id=${tenant.id}&property_id=${currentPropertyId}`,
    );
  };

  // ✅ Handle click on "Pending" - Navigate to water readings
  const handlePendingClick = (tenant) => {
    navigate(
      `/admin/water?tenant_id=${tenant.id}&property_id=${currentPropertyId}`,
    );
  };

  const fetchData = async () => {
    if (!currentPropertyId) {
      appMessage.warning("Please select a property first");
      return;
    }

    setLoading(true);
    try {
      const tenantsRes = await getTenants({ property_id: currentPropertyId });
      const tenantsList = tenantsRes.data || [];
      setTenants(tenantsList);

      const year = billingMonth.year();
      const month = billingMonth.month() + 1;

      // ✅ Fetch water readings for the current month
      const readingsRes = await getWaterReadings({
        property_id: currentPropertyId,
        start_date: billingMonth.startOf("month").format("YYYY-MM-DD"),
        end_date: billingMonth.endOf("month").format("YYYY-MM-DD"),
      });
      const readings = readingsRes.data || [];

      // ✅ Fetch water bills for the property
      const billsRes = await getWaterBills({
        property_id: currentPropertyId,
      });
      const billsList = billsRes.data || [];

      // ✅ Fetch payments
      const paymentsRes = await getPayments({
        property_id: currentPropertyId,
      });
      const allPayments = paymentsRes.data || [];

      const monthStart = billingMonth.startOf("month");
      const monthEnd = billingMonth.endOf("month");

      // Filter payments for the current month
      const payments = allPayments.filter((p) => {
        const paymentDate = p.payment_date ? dayjs(p.payment_date) : null;
        if (!paymentDate) return false;
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });

      const billingData = tenantsList.map((tenant) => {
        const tenantId = tenant.id;

        // ✅ Get readings for this tenant in the current month
        const tenantReadings = readings.filter(
          (r) => (r.tenantId || r.tenant_id) === tenantId,
        );

        // ✅ Get bills for this tenant
        const tenantBills = billsList.filter((b) => {
          const bTenantId = b.tenantId || b.tenant_id;
          if (bTenantId !== tenantId) return false;
          const billMonth = b.month ? dayjs(b.month) : null;
          if (!billMonth) return false;
          return (
            billMonth.month() === billingMonth.month() &&
            billMonth.year() === billingMonth.year()
          );
        });

        // ✅ Get payments for this tenant in the current month
        const tenantPayments = payments.filter((p) => {
          const pTenantId = p.tenantId || p.tenant_id;
          return pTenantId === tenantId;
        });

        // ✅ Calculate water due from bills
        const totalWater = tenantBills.reduce(
          (sum, b) => sum + (b.total || b.waterCharge || 0),
          0,
        );

        // ✅ Calculate total paid
        const totalPaid = tenantPayments.reduce(
          (sum, p) => sum + (p.amount || 0),
          0,
        );

        // ✅ Get rent due
        const rentDue = tenant.monthly_rent || 0;

        // ✅ Determine water reading status
        const hasReading = tenantReadings.length > 0;
        const hasPendingReading = tenantReadings.some(
          (r) => r.status === "pending",
        );
        const hasBilledReading = tenantReadings.some(
          (r) => r.status === "billed",
        );

        let waterStatus = "no_reading";
        if (hasReading && hasPendingReading) {
          waterStatus = "pending";
        } else if (hasReading && hasBilledReading) {
          waterStatus = "billed";
        } else if (hasReading) {
          waterStatus = "has_reading";
        } else {
          waterStatus = "no_reading";
        }

        // ✅ Check if there's a bill
        const hasBill = tenantBills.length > 0;

        return {
          ...tenant,
          readings: tenantReadings,
          bills: tenantBills,
          payments: tenantPayments,
          water_due: totalWater,
          rent_due: rentDue,
          total_due: totalWater + rentDue,
          total_paid: totalPaid,
          balance: totalWater + rentDue - totalPaid,
          water_status: waterStatus,
          has_reading: hasReading,
          has_bill: hasBill,
          reading_count: tenantReadings.length,
          status:
            totalPaid >= totalWater + rentDue
              ? "paid"
              : totalPaid > 0
                ? "partial"
                : "unpaid",
        };
      });

      // Sort by status (unpaid first)
      const sortedData = billingData.sort((a, b) => {
        const statusOrder = { unpaid: 0, partial: 1, paid: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setBills(sortedData);

      // Calculate stats
      const totalTenants = sortedData.length;
      const totalBilled = sortedData.reduce((sum, t) => sum + t.total_due, 0);
      const totalPaidAmount = sortedData.reduce(
        (sum, t) => sum + t.total_paid,
        0,
      );
      const totalOutstanding = totalBilled - totalPaidAmount;
      const collectionRate =
        totalBilled > 0 ? (totalPaidAmount / totalBilled) * 100 : 0;

      setStats({
        totalTenants,
        totalBilled,
        totalPaid: totalPaidAmount,
        totalOutstanding,
        collectionRate,
      });
    } catch (error) {
      console.error("Error fetching billing data:", error);
      appMessage.error("Failed to fetch billing data");
    } finally {
      setLoading(false);
    }
  };

  // Handle adding rent for specific tenant
  const handleAddRent = () => {
    setAddRentModalVisible(true);
    rentForm.resetFields();
    setSelectedTenantForRent(null);
    setCalculatedRent(0);
    setProrationDetails(null);
  };

  // Calculate prorated rent based on move-in date
  const calculateProratedRent = (tenantId, moveInDate, rentAmount) => {
    if (!moveInDate || !rentAmount) return { amount: 0, details: null };

    const moveInDay = dayjs(moveInDate);
    const daysInMonth = billingMonth.daysInMonth();

    if (
      moveInDay.month() === billingMonth.month() &&
      moveInDay.year() === billingMonth.year()
    ) {
      const daysRemaining = daysInMonth - moveInDay.date() + 1;
      const proratedAmount = (rentAmount / daysInMonth) * daysRemaining;
      return {
        amount: Math.round(proratedAmount),
        details: {
          daysInMonth,
          daysRemaining,
          moveInDate: moveInDay.format("DD/MM/YYYY"),
          proratedAmount: Math.round(proratedAmount),
          fullAmount: rentAmount,
        },
      };
    }
    return { amount: rentAmount, details: null };
  };

  // Handle rent form changes for calculation
  const handleRentFormChange = (changedValues, allValues) => {
    const { tenant_id, move_in_date, custom_rent, rent_type } = allValues;

    if (tenant_id) {
      const tenant = tenants.find((t) => t.id === tenant_id);
      if (tenant) {
        let baseRent = custom_rent || tenant.monthly_rent || 0;

        if (move_in_date && rent_type === "prorated") {
          const result = calculateProratedRent(
            tenant_id,
            move_in_date,
            baseRent,
          );
          setCalculatedRent(result.amount);
          setProrationDetails(result.details);
        } else {
          setCalculatedRent(baseRent);
          setProrationDetails(null);
        }
      }
    }
  };

  // Submit adding rent for specific tenant
  const handleAddRentSubmit = async (values) => {
    setAddingRent(true);
    try {
      const {
        tenant_id,
        rent_amount,
        water_amount,
        notes,
        move_in_date,
        rent_type,
        custom_rent,
        payment_status,
        payment_method,
      } = values;

      const tenant = tenants.find((t) => t.id === tenant_id);
      if (!tenant) {
        appMessage.error("Tenant not found");
        return;
      }

      let finalRentAmount =
        rent_amount || custom_rent || tenant.monthly_rent || 0;

      if (move_in_date && rent_type === "prorated") {
        const result = calculateProratedRent(
          tenant_id,
          move_in_date,
          finalRentAmount,
        );
        finalRentAmount = result.amount;
      }

      const paymentData = {
        property_id: currentPropertyId,
        tenant_id: tenant_id,
        unit_id: tenant.unit_id,
        amount: finalRentAmount + (water_amount || 0),
        payment_method: payment_method || "cash",
        status: payment_status || "pending",
        payment_type: "rent",
        payment_for_month: billingMonth.startOf("month").format("YYYY-MM-DD"),
        notes:
          notes ||
          `Rent for ${billingMonth.format("MMMM YYYY")}${move_in_date ? ` (Move-in: ${formatDate(move_in_date)})` : ""}${rent_type === "prorated" ? " (Prorated)" : ""}`,
        rent_amount: finalRentAmount,
        water_amount: water_amount || 0,
      };

      const response = await api.post("/payments", paymentData);

      if (response.data) {
        appMessage.success(
          `✅ Rent added for ${tenant.name}: Ksh ${formatCurrency(finalRentAmount + (water_amount || 0))}` +
            (rent_type === "prorated" ? " (Prorated)" : ""),
        );
        setAddRentModalVisible(false);
        rentForm.resetFields();
        setSelectedTenantForRent(null);
        setCalculatedRent(0);
        setProrationDetails(null);
        await fetchData();
      }
    } catch (error) {
      console.error("Error adding rent:", error);
      appMessage.error(error.response?.data?.message || "Failed to add rent");
    } finally {
      setAddingRent(false);
    }
  };

  // Handle tenant selection in rent form
  const handleRentTenantSelect = (tenantId) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      setSelectedTenantForRent(tenant);
      const defaultRent = tenant.monthly_rent || 0;
      rentForm.setFieldsValue({
        custom_rent: defaultRent,
        rent_amount: defaultRent,
        water_amount: 0,
        rent_type: "full",
      });
      setCalculatedRent(defaultRent);
      setProrationDetails(null);
    }
  };

  const handleGenerateSpecificBill = () => {
    setGenerateBillModalVisible(true);
    billForm.resetFields();
    setSelectedTenantForBill(null);
  };

  const handleCloseTenantMonth = () => {
    setCloseTenantModalVisible(true);
    closeTenantForm.resetFields();
    setSelectedTenantForClose(null);
  };

  const handleGenerateSpecificBillSubmit = async (values) => {
    setGeneratingSpecificBill(true);
    try {
      const { tenant_id, rent_amount, water_amount, notes, move_in_date } =
        values;

      const tenant = tenants.find((t) => t.id === tenant_id);
      if (!tenant) {
        appMessage.error("Tenant not found");
        return;
      }

      let finalRentAmount = rent_amount || tenant.monthly_rent || 0;
      let moveInDate = move_in_date || tenant.move_in_date;

      if (moveInDate) {
        const moveInDay = dayjs(moveInDate);
        if (
          moveInDay.month() === billingMonth.month() &&
          moveInDay.year() === billingMonth.year()
        ) {
          const daysInMonth = billingMonth.daysInMonth();
          const daysRemaining = daysInMonth - moveInDay.date() + 1;
          finalRentAmount = (finalRentAmount / daysInMonth) * daysRemaining;
          finalRentAmount = Math.round(finalRentAmount);
        }
      }

      const paymentData = {
        property_id: currentPropertyId,
        tenant_id: tenant_id,
        unit_id: tenant.unit_id,
        amount: finalRentAmount + (water_amount || 0),
        payment_method: "cash",
        status: "pending",
        payment_type: "rent",
        payment_for_month: billingMonth.startOf("month").format("YYYY-MM-DD"),
        notes:
          notes ||
          `Manual bill for ${billingMonth.format("MMMM YYYY")}${moveInDate ? ` (Prorated from ${formatDate(moveInDate)})` : ""}`,
        rent_amount: finalRentAmount,
        water_amount: water_amount || 0,
      };

      const response = await api.post("/payments", paymentData);

      if (response.data) {
        appMessage.success(
          `✅ Bill generated for ${tenant.name}: Ksh ${formatCurrency(finalRentAmount + (water_amount || 0))}`,
        );
        setGenerateBillModalVisible(false);
        billForm.resetFields();
        await fetchData();
      }
    } catch (error) {
      console.error("Error generating specific bill:", error);
      appMessage.error(
        error.response?.data?.message || "Failed to generate bill",
      );
    } finally {
      setGeneratingSpecificBill(false);
    }
  };

  const handleCloseTenantMonthSubmit = async (values) => {
    setClosingTenant(true);
    try {
      const { tenant_id, carry_forward_balance, notes } = values;

      const tenant = tenants.find((t) => t.id === tenant_id);
      if (!tenant) {
        appMessage.error("Tenant not found");
        return;
      }

      const currentYear = billingMonth.year();
      const currentMonth = billingMonth.month() + 1;
      const nextMonth = billingMonth.add(1, "month");
      const nextYear = nextMonth.year();
      const nextMonthNum = nextMonth.month() + 1;

      const closeResponse = await api.post("/billing/close-tenant-month", {
        tenant_id: tenant_id,
        year: currentYear,
        month: currentMonth,
        carry_forward_balance: carry_forward_balance !== false,
        notes:
          notes ||
          `Month closed for ${tenant.name} on ${dayjs().format("YYYY-MM-DD")}`,
      });

      if (closeResponse.data.error) {
        throw new Error(closeResponse.data.error);
      }

      appMessage.success(
        `✅ Month ${billingMonth.format("MMMM YYYY")} closed for ${tenant.name}`,
      );

      const rentResponse = await api.post("/scheduler/generate-tenant-rent", {
        tenant_id: tenant_id,
        year: nextYear,
        month: nextMonthNum,
      });

      const rentResult = rentResponse.data;

      appMessage.success(
        `✅ ${tenant.name} moved to ${nextMonth.format("MMMM YYYY")}. ` +
          `Generated rent: Ksh ${formatCurrency(rentResult.amount || 0)}`,
      );

      setCloseTenantModalVisible(false);
      closeTenantForm.resetFields();
      setSelectedTenantForClose(null);
      await fetchData();
    } catch (error) {
      console.error("Error closing tenant month:", error);
      appMessage.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to close tenant month",
      );
    } finally {
      setClosingTenant(false);
    }
  };

  const handleTenantSelect = (tenantId) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      setSelectedTenantForBill(tenant);
      billForm.setFieldsValue({
        rent_amount: tenant.monthly_rent || 0,
        water_amount: 0,
      });
    }
  };

  const handleCloseTenantSelect = (tenantId) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      setSelectedTenantForClose(tenant);
      const tenantBill = bills.find((b) => b.id === tenant.id);
      closeTenantForm.setFieldsValue({
        carry_forward_balance: true,
        notes: `Closing month for ${tenant.name} - Balance: ${formatCurrency(tenantBill?.balance || 0)}`,
      });
    }
  };

  const handleGenerateBills = async () => {
    setGenerating(true);
    try {
      const year = billingMonth.year();
      const month = billingMonth.month() + 1;

      const response = await api.post("/scheduler/generate-water-bills", {
        year,
        month,
        property_id: currentPropertyId,
      });

      const result = response.data;
      appMessage.success(
        `✅ Bills generated: ${result.generated || 0} water bills for ${billingMonth.format("MMMM YYYY")}`,
      );
      await fetchData();
    } catch (error) {
      console.error("Error generating bills:", error);
      appMessage.error(
        error.response?.data?.error || "Failed to generate bills",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateRent = async () => {
    setGeneratingRent(true);
    try {
      const year = billingMonth.year();
      const month = billingMonth.month() + 1;

      const response = await api.post("/scheduler/generate-rent", {
        year,
        month,
      });

      const result = response.data;
      appMessage.success(
        `✅ Rent generated: ${result.generated || 0} rent entries for ${billingMonth.format("MMMM YYYY")}`,
      );
      await fetchData();
    } catch (error) {
      console.error("Error generating rent:", error);
      appMessage.error(
        error.response?.data?.error || "Failed to generate rent",
      );
    } finally {
      setGeneratingRent(false);
    }
  };

  // Calendar-sensitive month closing
  const handleCloseMonth = () => {
    // Check if month closing is allowed
    if (!isMonthClosingAllowed()) {
      const nextDate = getNextClosingDate();
      appModal.warning({
        title: "Month Closing Not Allowed",
        content: (
          <div>
            <p>
              <InfoCircleOutlined
                style={{ color: "#faad14", marginRight: 8 }}
              />
              <strong>
                Month closing is only allowed between the 25th and 5th of each
                month.
              </strong>
            </p>
            <p style={{ marginTop: 12 }}>
              Current date: <strong>{dayjs().format("DD MMM YYYY")}</strong>
            </p>
            {nextDate && (
              <p>
                Next closing period starts on: <strong>{nextDate}</strong>
              </p>
            )}
            <p style={{ marginTop: 12, color: "#8c8c8c" }}>
              This ensures proper month-end reconciliation and rent generation.
            </p>
          </div>
        ),
        okText: "Got it",
      });
      return;
    }

    appModal.confirm({
      title: "Close Month & Move to Next",
      content: (
        <div>
          <p>
            This will close <strong>{billingMonth.format("MMMM YYYY")}</strong>{" "}
            and move to{" "}
            <strong>{billingMonth.add(1, "month").format("MMMM YYYY")}</strong>.
          </p>
          <p style={{ color: "#faad14" }}>
            ⚠️ This action cannot be undone. All balances will be carried
            forward to the next month.
          </p>
          <p style={{ color: "#52c41a" }}>
            ✅ Rent for the next month will be automatically generated.
          </p>
          <p style={{ color: "#1890ff" }}>
            📅 You are in the closing window (25th - 5th). This is the
            recommended time to close the month.
          </p>
          <p>Make sure all bills have been generated and sent.</p>
        </div>
      ),
      okText: "Close Month",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        setClosingMonth(true);
        try {
          const currentYear = billingMonth.year();
          const currentMonth = billingMonth.month() + 1;
          const nextMonth = billingMonth.add(1, "month");
          const nextYear = nextMonth.year();
          const nextMonthNum = nextMonth.month() + 1;

          const closeResponse = await api.post("/billing/close-month", {
            year: currentYear,
            month: currentMonth,
          });

          if (closeResponse.data.error) {
            throw new Error(closeResponse.data.error);
          }

          appMessage.success(
            `✅ Month ${billingMonth.format("MMMM YYYY")} closed successfully!`,
          );

          const rentResponse = await api.post("/scheduler/generate-rent", {
            year: nextYear,
            month: nextMonthNum,
          });

          const rentResult = rentResponse.data;
          setBillingMonth(nextMonth);

          appMessage.success(
            `✅ Moved to ${nextMonth.format("MMMM YYYY")}. ` +
              `Generated ${rentResult.generated || 0} rent entries.`,
          );

          await fetchData();
        } catch (error) {
          console.error("Error closing month:", error);
          appMessage.error(
            error.response?.data?.error ||
              error.message ||
              "Failed to close month",
          );
        } finally {
          setClosingMonth(false);
        }
      },
    });
  };

  const handleSendAllReceipts = async () => {
    const unpaidTenants = bills.filter((t) => t.status !== "paid");
    if (unpaidTenants.length > 0) {
      appModal.confirm({
        title: "Send Receipts",
        content: (
          <div>
            <p>
              You are about to send receipts to <strong>{bills.length}</strong>{" "}
              tenants.
            </p>
            <p style={{ color: "#ff4d4f" }}>
              ⚠️ {unpaidTenants.length} tenants have outstanding balances.
            </p>
            <p>Do you want to continue?</p>
          </div>
        ),
        okText: "Send All",
        cancelText: "Cancel",
        onOk: async () => {
          setSendingAll(true);
          try {
            let successCount = 0;
            let errorCount = 0;

            for (const tenant of bills) {
              try {
                await api.post("/sms/receipt", {
                  tenant_id: tenant.id,
                  month: billingMonth.format("YYYY-MM"),
                });
                successCount++;
              } catch (e) {
                errorCount++;
                console.error(`Failed to send to ${tenant.name}:`, e);
              }
            }

            appMessage.success(
              `✅ Receipts sent to ${successCount} tenants! ${errorCount > 0 ? `(${errorCount} failed)` : ""}`,
            );
          } catch (error) {
            console.error("Error sending receipts:", error);
            appMessage.error(
              error.response?.data?.error || "Failed to send receipts",
            );
          } finally {
            setSendingAll(false);
          }
        },
      });
    } else {
      appMessage.info("All tenants have paid. No receipts to send.");
    }
  };

  const handleViewDetails = (tenant) => {
    setSelectedTenant(tenant);
    setModalVisible(true);
  };

  const handleSendReceipt = async (tenant) => {
    try {
      const response = await api.post("/sms/receipt", {
        tenant_id: tenant.id,
        month: billingMonth.format("YYYY-MM"),
      });

      if (response.data.success || response.data.status === "success") {
        appMessage.success(`✅ Receipt sent to ${tenant.name}`);
      } else {
        appMessage.error(`Failed to send receipt to ${tenant.name}`);
      }
    } catch (error) {
      console.error("Error sending receipt:", error);
      appMessage.error(error.response?.data?.error || "Failed to send receipt");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return {
          color: "#52c41a",
          icon: <CheckCircleOutlined />,
          label: "Paid",
        };
      case "partial":
        return {
          color: "#faad14",
          icon: <ClockCircleOutlined />,
          label: "Partial",
        };
      default:
        return {
          color: "#ff4d4f",
          icon: <ExclamationCircleOutlined />,
          label: "Unpaid",
        };
    }
  };

  // ✅ Get water status display and click handler
  const getWaterStatusDisplay = (record) => {
    const { water_status, id } = record;

    if (water_status === "no_reading") {
      return {
        tag: (
          <Tag
            color="orange"
            style={{ cursor: "pointer" }}
            onClick={() => handleNoReadingClick(record)}
          >
            ⏳ No Reading
          </Tag>
        ),
        clickable: true,
      };
    } else if (water_status === "pending") {
      return {
        tag: (
          <Tag
            color="gold"
            style={{ cursor: "pointer" }}
            onClick={() => handlePendingClick(record)}
          >
            ⏳ Pending
          </Tag>
        ),
        clickable: true,
      };
    } else if (water_status === "billed" || water_status === "has_reading") {
      return {
        tag: <Tag color="green">✅ Read</Tag>,
        clickable: false,
      };
    }
    return {
      tag: <Tag color="default">Unknown</Tag>,
      clickable: false,
    };
  };

  const columns = [
    {
      title: "Tenant",
      key: "tenant",
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            House {record.houseNo || record.unit_number || "N/A"} •{" "}
            {record.phone || "No phone"}
          </div>
        </div>
      ),
    },
    {
      title: "Water Status",
      key: "water_status",
      width: 140,
      render: (_, record) => {
        const { tag } = getWaterStatusDisplay(record);
        return tag;
      },
    },
    {
      title: "Rent Due",
      dataIndex: "rent_due",
      key: "rent_due",
      align: "right",
      render: (val) => (
        <span style={{ fontWeight: 500 }}>{formatCurrency(val)}</span>
      ),
    },
    {
      title: "Water Due",
      dataIndex: "water_due",
      key: "water_due",
      align: "right",
      render: (val, record) => {
        if (record.water_status === "no_reading") {
          return <Tag color="orange">⏳ No Reading</Tag>;
        } else if (record.water_status === "pending") {
          return <Tag color="gold">⏳ Pending</Tag>;
        } else {
          return <span style={{ fontWeight: 500 }}>{formatCurrency(val)}</span>;
        }
      },
    },
    {
      title: "Total Due",
      dataIndex: "total_due",
      key: "total_due",
      align: "right",
      render: (val) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: "Paid",
      dataIndex: "total_paid",
      key: "total_paid",
      align: "right",
      render: (val) => (
        <span style={{ color: "#52c41a" }}>{formatCurrency(val)}</span>
      ),
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      align: "right",
      render: (val) => (
        <span
          style={{
            fontWeight: 600,
            color: val > 0 ? "#ff4d4f" : "#52c41a",
          }}
        >
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (status) => {
        const s = getStatusColor(status);
        return (
          <Tag color={s.color} icon={s.icon}>
            {s.label}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Send Receipt">
            <Button
              size="small"
              icon={<WhatsAppOutlined />}
              style={{ color: "#25D366" }}
              onClick={() => handleSendReceipt(record)}
            />
          </Tooltip>
          {(record.water_status === "no_reading" ||
            record.water_status === "pending") && (
            <Tooltip title="Add Water Reading">
              <Button
                size="small"
                icon={<EyeOutlined />}
                style={{ color: "#1890ff" }}
                onClick={() => handleNoReadingClick(record)}
              >
                Add Reading
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (!currentPropertyId) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h2>Please select a property</h2>
        <p style={{ color: "#8c8c8c" }}>
          Use the property selector to view monthly billing.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <Card
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
          color: "white",
        }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <h2 style={{ color: "white", margin: 0 }}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              Monthly Billing
            </h2>
            <div style={{ color: "rgba(255,255,255,0.8)" }}>
              {activeProperty?.name} • {billingMonth.format("MMMM YYYY")}
            </div>
          </Col>
          <Col>
            <Space>
              <DatePicker
                picker="month"
                value={billingMonth}
                onChange={setBillingMonth}
                style={{ background: "rgba(255,255,255,0.2)", border: "none" }}
                suffixIcon={<CalendarOutlined style={{ color: "white" }} />}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchData}
                loading={loading}
                ghost
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-primary">
            <Statistic
              title="Total Tenants"
              value={stats.totalTenants}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-warning">
            <Statistic
              title="Total Billed"
              value={stats.totalBilled}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-success">
            <Statistic
              title="Total Collected"
              value={stats.totalPaid}
              prefix={<CheckCircleOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-danger">
            <Statistic
              title="Outstanding"
              value={stats.totalOutstanding}
              prefix={<ExclamationCircleOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Collection Rate */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} md={8}>
            <Statistic
              title="Collection Rate"
              value={stats.collectionRate}
              suffix="%"
              prefix={<DollarOutlined />}
              valueStyle={{
                color: stats.collectionRate > 80 ? "#52c41a" : "#faad14",
                fontSize: 28,
              }}
            />
          </Col>
          <Col xs={24} md={16}>
            <Progress
              percent={Math.round(stats.collectionRate)}
              strokeColor={{
                "0%": "#ff4d4f",
                "50%": "#faad14",
                "100%": "#52c41a",
              }}
              status={stats.collectionRate > 80 ? "success" : "active"}
              format={(percent) => `${percent}% Collected`}
            />
          </Col>
        </Row>
      </Card>

      {/* Action Buttons */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap size="middle">
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            onClick={handleGenerateBills}
            loading={generating}
            size="large"
          >
            Generate Bills
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={handleGenerateRent}
            loading={generatingRent}
            size="large"
          >
            Generate Rent
          </Button>
          <Button
            icon={<WalletOutlined />}
            onClick={handleAddRent}
            size="large"
            style={{ background: "#52c41a", color: "white", border: "none" }}
          >
            Add Rent for Tenant
          </Button>
          <Button
            icon={<UserAddOutlined />}
            onClick={handleGenerateSpecificBill}
            size="large"
            style={{ background: "#faad14", color: "white", border: "none" }}
          >
            Generate Bill for Tenant
          </Button>
          <Button
            icon={<UserDeleteOutlined />}
            onClick={handleCloseTenantMonth}
            size="large"
            style={{ background: "#ff7a45", color: "white", border: "none" }}
          >
            Close Month for Tenant
          </Button>
          <Button
            icon={<SendOutlined />}
            onClick={handleSendAllReceipts}
            loading={sendingAll}
            size="large"
            style={{ background: "#25D366", color: "white", border: "none" }}
          >
            Send All Receipts
          </Button>
          <Button
            icon={<DownloadOutlined />}
            size="large"
            onClick={() => appMessage.info("Export feature coming soon")}
          >
            Export Report
          </Button>
          <Tooltip title={getClosingPeriodMessage()}>
            <Button
              danger
              icon={<ForwardOutlined />}
              onClick={handleCloseMonth}
              loading={closingMonth}
              size="large"
              style={{
                opacity: isMonthClosingAllowed() ? 1 : 0.6,
                borderColor: isMonthClosingAllowed() ? undefined : "#ff4d4f",
              }}
            >
              Close Month & Move to Next
              {!isMonthClosingAllowed() && (
                <Tag color="orange" style={{ marginLeft: 8 }}>
                  ⏰ Restricted
                </Tag>
              )}
            </Button>
          </Tooltip>
        </Space>
        <Divider type="vertical" style={{ height: 40 }} />
        <Space>
          <Badge color="green" text="Paid" />
          <Badge color="orange" text="Partial" />
          <Badge color="red" text="Unpaid" />
          <Badge color="gold" text="Pending Reading" />
          {!isMonthClosingAllowed() && (
            <Badge color="orange" text="⏰ Month Closing Restricted" />
          )}
        </Space>
      </Card>

      {/* Bills Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={bills}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} tenants`,
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty
                description="No billing data for this month"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <strong>TOTAL</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>{formatCurrency(stats.totalBilled)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <strong>{formatCurrency(stats.totalPaid)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <strong
                    style={{
                      color: stats.totalOutstanding > 0 ? "#ff4d4f" : "#52c41a",
                    }}
                  >
                    {formatCurrency(stats.totalOutstanding)}
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} />
                <Table.Summary.Cell index={5} />
                <Table.Summary.Cell index={6} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      {/* Tenant Details Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: "#1890ff" }} />
            {selectedTenant?.name} - Monthly Statement
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedTenant(null);
        }}
        width={700}
        footer={
          <Space>
            <Button
              icon={<WhatsAppOutlined />}
              style={{
                backgroundColor: "#25D366",
                color: "white",
                border: "none",
              }}
              onClick={() => handleSendReceipt(selectedTenant)}
            >
              Send Receipt
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              Print
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setModalVisible(false);
                setSelectedTenant(null);
              }}
            >
              Close
            </Button>
          </Space>
        }
      >
        {selectedTenant && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Tenant">
                <strong>{selectedTenant.name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="House">
                {selectedTenant.houseNo || selectedTenant.unit_number || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {selectedTenant.phone || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedTenant.status).color}>
                  {getStatusColor(selectedTenant.status).label}
                </Tag>
                {selectedTenant.water_status === "no_reading" && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    ⏳ No Reading
                  </Tag>
                )}
                {selectedTenant.water_status === "pending" && (
                  <Tag color="gold" style={{ marginLeft: 8 }}>
                    ⏳ Pending
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Rent Due" span={2}>
                <span style={{ fontSize: 16 }}>
                  {formatCurrency(selectedTenant.rent_due)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Water Due" span={2}>
                <span style={{ fontSize: 16 }}>
                  {selectedTenant.water_status === "no_reading" ? (
                    <Tag color="orange">⏳ No Reading</Tag>
                  ) : selectedTenant.water_status === "pending" ? (
                    <Tag color="gold">⏳ Pending</Tag>
                  ) : (
                    formatCurrency(selectedTenant.water_due)
                  )}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Total Due" span={2}>
                <span
                  style={{ fontSize: 18, fontWeight: 700, color: "#1890ff" }}
                >
                  {formatCurrency(selectedTenant.total_due)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Total Paid" span={2}>
                <span style={{ fontSize: 16, color: "#52c41a" }}>
                  {formatCurrency(selectedTenant.total_paid)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Balance" span={2}>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: selectedTenant.balance > 0 ? "#ff4d4f" : "#52c41a",
                  }}
                >
                  {formatCurrency(selectedTenant.balance)}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider>Water Readings</Divider>

            {selectedTenant.readings && selectedTenant.readings.length > 0 ? (
              <Table
                dataSource={selectedTenant.readings}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Date",
                    dataIndex: "readingDate",
                    render: (date) => (date ? formatDate(date) : "N/A"),
                  },
                  {
                    title: "Previous",
                    dataIndex: "previousReading",
                    render: (val) => val || "N/A",
                  },
                  {
                    title: "Current",
                    dataIndex: "currentReading",
                    render: (val) => val || "N/A",
                  },
                  {
                    title: "Units Used",
                    dataIndex: "unitsUsed",
                    render: (val) => val || "N/A",
                  },
                  {
                    title: "Amount",
                    dataIndex: "amount",
                    render: (val) => (val ? formatCurrency(val) : "N/A"),
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    render: (status) => (
                      <Tag color={status === "billed" ? "green" : "orange"}>
                        {status || "pending"}
                      </Tag>
                    ),
                  },
                ]}
              />
            ) : (
              <Empty
                description={
                  <span>
                    No readings for this month
                    <br />
                    <Tag
                      color="orange"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleNoReadingClick(selectedTenant)}
                    >
                      ⏳ Click here to add reading
                    </Tag>
                  </span>
                }
              />
            )}
          </div>
        )}
      </Modal>

      {/* Add Rent for Tenant Modal */}
      <Modal
        title={
          <Space>
            <WalletOutlined style={{ color: "#52c41a" }} />
            Add Rent for Tenant
          </Space>
        }
        open={addRentModalVisible}
        onCancel={() => {
          setAddRentModalVisible(false);
          setSelectedTenantForRent(null);
          rentForm.resetFields();
          setCalculatedRent(0);
          setProrationDetails(null);
        }}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Alert
          message="Add Rent for Tenant"
          description={
            <div>
              <p>Add rent for a specific tenant. This is useful for:</p>
              <ul style={{ marginBottom: 0 }}>
                <li>✅ Mid-month move-ins (prorated rent)</li>
                <li>✅ Manual rent adjustments</li>
                <li>✅ Adding missing rent entries</li>
              </ul>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={rentForm}
          layout="vertical"
          onFinish={handleAddRentSubmit}
          onValuesChange={handleRentFormChange}
          initialValues={{
            water_amount: 0,
            rent_type: "full",
            payment_status: "pending",
            payment_method: "cash",
          }}
        >
          <Form.Item
            name="tenant_id"
            label="Select Tenant"
            rules={[{ required: true, message: "Please select a tenant" }]}
          >
            <Select
              placeholder="Search and select tenant"
              size="large"
              showSearch
              optionFilterProp="children"
              onChange={handleRentTenantSelect}
              notFoundContent="No tenants found"
            >
              {tenants
                .filter((t) => t.status === "active")
                .map((tenant) => {
                  const tenantBill = bills.find((b) => b.id === tenant.id);
                  return (
                    <Option key={tenant.id} value={tenant.id}>
                      <Space>
                        <span style={{ fontWeight: 500 }}>{tenant.name}</span>
                        <Tag color="blue">
                          {tenant.houseNo || tenant.unit_number || "N/A"}
                        </Tag>
                        <Tag color="green">
                          Rent: {formatCurrency(tenant.monthly_rent || 0)}
                        </Tag>
                        {tenantBill && (
                          <Tag color={tenantBill.balance > 0 ? "red" : "green"}>
                            Balance: {formatCurrency(tenantBill.balance || 0)}
                          </Tag>
                        )}
                      </Space>
                    </Option>
                  );
                })}
            </Select>
          </Form.Item>

          {selectedTenantForRent && (
            <>
              <Alert
                message="Tenant Details"
                description={
                  <div>
                    <Row gutter={16}>
                      <Col span={12}>
                        <p>
                          <strong>Name:</strong> {selectedTenantForRent.name}
                        </p>
                        <p>
                          <strong>House:</strong>{" "}
                          {selectedTenantForRent.houseNo ||
                            selectedTenantForRent.unit_number ||
                            "N/A"}
                        </p>
                      </Col>
                      <Col span={12}>
                        <p>
                          <strong>Monthly Rent:</strong>{" "}
                          {formatCurrency(
                            selectedTenantForRent.monthly_rent || 0,
                          )}
                        </p>
                        <p>
                          <strong>Phone:</strong>{" "}
                          {selectedTenantForRent.phone || "N/A"}
                        </p>
                      </Col>
                    </Row>
                    {selectedTenantForRent.move_in_date && (
                      <p>
                        <strong>Move In Date:</strong>{" "}
                        {formatDate(selectedTenantForRent.move_in_date)}
                      </p>
                    )}
                  </div>
                }
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="rent_type"
                    label="Rent Type"
                    rules={[{ required: true }]}
                  >
                    <Radio.Group size="large" buttonStyle="solid">
                      <Radio.Button value="full">Full Rent</Radio.Button>
                      <Radio.Button value="prorated">Prorated</Radio.Button>
                      <Radio.Button value="custom">Custom Amount</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="move_in_date"
                    label="Move In Date (for prorated)"
                    tooltip="Set the move-in date to calculate prorated rent"
                  >
                    <Input type="date" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="custom_rent"
                    label="Custom Rent Amount (Ksh)"
                    tooltip="Enter custom rent amount or leave empty to use tenant's monthly rent"
                  >
                    <InputNumber
                      prefix={<DollarOutlined />}
                      placeholder="Auto from tenant"
                      size="large"
                      style={{ width: "100%" }}
                      min={0}
                      step={100}
                      formatter={(value) =>
                        value
                          ? `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          : ""
                      }
                      parser={(value) =>
                        value ? parseFloat(value.replace(/[^0-9.]/g, "")) : 0
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="water_amount" label="Water Amount (Ksh)">
                    <InputNumber
                      prefix={<DollarOutlined />}
                      placeholder="0"
                      size="large"
                      style={{ width: "100%" }}
                      min={0}
                      step={100}
                      formatter={(value) =>
                        value
                          ? `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          : ""
                      }
                      parser={(value) =>
                        value ? parseFloat(value.replace(/[^0-9.]/g, "")) : 0
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>

              {prorationDetails && (
                <div
                  style={{
                    background: "#f6ffed",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 16,
                    border: "1px solid #b7eb8f",
                  }}
                >
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text strong style={{ color: "#52c41a" }}>
                      <PercentageOutlined /> Proration Details:
                    </Text>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Text>
                          Full Rent:{" "}
                          {formatCurrency(prorationDetails.fullAmount)}
                        </Text>
                      </Col>
                      <Col span={12}>
                        <Text>
                          Days in Month: {prorationDetails.daysInMonth}
                        </Text>
                      </Col>
                      <Col span={12}>
                        <Text>Move-in Date: {prorationDetails.moveInDate}</Text>
                      </Col>
                      <Col span={12}>
                        <Text>
                          Days Remaining: {prorationDetails.daysRemaining}
                        </Text>
                      </Col>
                      <Col span={24}>
                        <Text strong style={{ color: "#1890ff", fontSize: 16 }}>
                          Calculated Rent:{" "}
                          {formatCurrency(prorationDetails.proratedAmount)}
                        </Text>
                      </Col>
                    </Row>
                  </Space>
                </div>
              )}

              <div
                style={{
                  background: "#f0f5ff",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  border: "1px solid #adc6ff",
                }}
              >
                <Space>
                  <CalculatorOutlined
                    style={{ color: "#1890ff", fontSize: 18 }}
                  />
                  <Text strong>Total Amount:</Text>
                  <Text
                    style={{ fontSize: 18, fontWeight: 700, color: "#1890ff" }}
                  >
                    {formatCurrency(
                      calculatedRent +
                        (rentForm.getFieldValue("water_amount") || 0),
                    )}
                  </Text>
                  {rentForm.getFieldValue("rent_type") === "prorated" && (
                    <Tag color="orange">Prorated</Tag>
                  )}
                </Space>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="payment_status" label="Payment Status">
                    <Select size="large">
                      <Option value="pending">Pending</Option>
                      <Option value="paid">Paid</Option>
                      <Option value="partial">Partial</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="payment_method" label="Payment Method">
                    <Select size="large">
                      <Option value="system">System Generated</Option>
                      <Option value="cash">Cash</Option>
                      <Option value="mpesa">M-Pesa</Option>
                      <Option value="bank">Bank Transfer</Option>
                      <Option value="cheque">Cheque</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="notes" label="Notes">
                <Input.TextArea
                  rows={2}
                  placeholder="E.g., Prorated rent for mid-month move-in, Manual adjustment, etc."
                />
              </Form.Item>
            </>
          )}

          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setAddRentModalVisible(false);
                  setSelectedTenantForRent(null);
                  rentForm.resetFields();
                  setCalculatedRent(0);
                  setProrationDetails(null);
                }}
                size="large"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={addingRent}
                icon={<WalletOutlined />}
                style={{ background: "#52c41a", borderColor: "#52c41a" }}
                disabled={!selectedTenantForRent}
              >
                Add Rent
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Generate Bill for Specific Tenant Modal */}
      <Modal
        title={
          <Space>
            <UserAddOutlined style={{ color: "#faad14" }} />
            Generate Bill for Tenant
          </Space>
        }
        open={generateBillModalVisible}
        onCancel={() => {
          setGenerateBillModalVisible(false);
          setSelectedTenantForBill(null);
          billForm.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Alert
          message="Generate Bill for Specific Tenant"
          description="Use this to generate a bill for a tenant who moved in mid-month or needs a manual bill."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={billForm}
          layout="vertical"
          onFinish={handleGenerateSpecificBillSubmit}
          initialValues={{
            water_amount: 0,
          }}
        >
          <Form.Item
            name="tenant_id"
            label="Select Tenant"
            rules={[{ required: true, message: "Please select a tenant" }]}
          >
            <Select
              placeholder="Search and select tenant"
              size="large"
              showSearch
              optionFilterProp="children"
              onChange={handleTenantSelect}
              notFoundContent="No tenants found"
            >
              {tenants
                .filter((t) => t.status === "active")
                .map((tenant) => (
                  <Option key={tenant.id} value={tenant.id}>
                    <Space>
                      <span style={{ fontWeight: 500 }}>{tenant.name}</span>
                      <Tag color="blue">
                        {tenant.houseNo || tenant.unit_number || "N/A"}
                      </Tag>
                      <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                        Ksh {formatCurrency(tenant.monthly_rent || 0)}
                      </span>
                    </Space>
                  </Option>
                ))}
            </Select>
          </Form.Item>

          {selectedTenantForBill && (
            <>
              <Alert
                message="Tenant Details"
                description={
                  <div>
                    <p>
                      <strong>Name:</strong> {selectedTenantForBill.name}
                    </p>
                    <p>
                      <strong>House:</strong>{" "}
                      {selectedTenantForBill.houseNo ||
                        selectedTenantForBill.unit_number ||
                        "N/A"}
                    </p>
                    <p>
                      <strong>Monthly Rent:</strong>{" "}
                      {formatCurrency(selectedTenantForBill.monthly_rent || 0)}
                    </p>
                    {selectedTenantForBill.move_in_date && (
                      <p>
                        <strong>Move In Date:</strong>{" "}
                        {formatDate(selectedTenantForBill.move_in_date)}
                      </p>
                    )}
                  </div>
                }
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form.Item
                name="move_in_date"
                label="Move In Date (if different from above)"
                tooltip="Set the actual move-in date for prorated rent calculation"
              >
                <Input type="date" size="large" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="rent_amount"
                    label="Rent Amount (Ksh)"
                    tooltip="Leave empty to use tenant's monthly rent"
                  >
                    <InputNumber
                      prefix={<DollarOutlined />}
                      placeholder="Auto from tenant"
                      size="large"
                      style={{ width: "100%" }}
                      min={0}
                      step={100}
                      formatter={(value) =>
                        value
                          ? `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          : ""
                      }
                      parser={(value) =>
                        value ? parseFloat(value.replace(/[^0-9.]/g, "")) : 0
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="water_amount" label="Water Amount (Ksh)">
                    <InputNumber
                      prefix={<DollarOutlined />}
                      placeholder="0"
                      size="large"
                      style={{ width: "100%" }}
                      min={0}
                      step={100}
                      formatter={(value) =>
                        value
                          ? `Ksh ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          : ""
                      }
                      parser={(value) =>
                        value ? parseFloat(value.replace(/[^0-9.]/g, "")) : 0
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="notes" label="Notes">
                <Input.TextArea
                  rows={2}
                  placeholder="E.g., Prorated rent for mid-month move-in"
                />
              </Form.Item>

              <div
                style={{
                  background: "#f0f5ff",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  border: "1px solid #adc6ff",
                }}
              >
                <Space>
                  <CalculatorOutlined
                    style={{ color: "#1890ff", fontSize: 18 }}
                  />
                  <Text strong>Summary:</Text>
                  <Text>
                    {selectedTenantForBill &&
                    billForm.getFieldValue("rent_amount")
                      ? `Rent: ${formatCurrency(billForm.getFieldValue("rent_amount"))}`
                      : selectedTenantForBill
                        ? `Rent: ${formatCurrency(selectedTenantForBill.monthly_rent || 0)}`
                        : "Select a tenant to see summary"}
                    {billForm.getFieldValue("water_amount") > 0 &&
                      ` + Water: ${formatCurrency(billForm.getFieldValue("water_amount"))}`}
                    {selectedTenantForBill &&
                      billForm.getFieldValue("move_in_date") && (
                        <Tag color="orange" style={{ marginLeft: 8 }}>
                          Prorated
                        </Tag>
                      )}
                  </Text>
                </Space>
              </div>
            </>
          )}

          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setGenerateBillModalVisible(false);
                  setSelectedTenantForBill(null);
                  billForm.resetFields();
                }}
                size="large"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={generatingSpecificBill}
                icon={<FileTextOutlined />}
              >
                Generate Bill
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Close Month for Specific Tenant Modal */}
      <Modal
        title={
          <Space>
            <UserDeleteOutlined style={{ color: "#ff7a45" }} />
            Close Month for Tenant
          </Space>
        }
        open={closeTenantModalVisible}
        onCancel={() => {
          setCloseTenantModalVisible(false);
          setSelectedTenantForClose(null);
          closeTenantForm.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Alert
          message="Close Month for Specific Tenant"
          description={
            <div>
              <p>
                This will close the current month for a specific tenant and move
                them to the next month.
              </p>
              <p style={{ color: "#faad14" }}>
                ⚠️ This action cannot be undone. The tenant's balance will be
                carried forward.
              </p>
              <p style={{ color: "#52c41a" }}>
                ✅ Rent for the next month will be automatically generated for
                this tenant.
              </p>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={closeTenantForm}
          layout="vertical"
          onFinish={handleCloseTenantMonthSubmit}
          initialValues={{
            carry_forward_balance: true,
          }}
        >
          <Form.Item
            name="tenant_id"
            label="Select Tenant"
            rules={[{ required: true, message: "Please select a tenant" }]}
          >
            <Select
              placeholder="Search and select tenant"
              size="large"
              showSearch
              optionFilterProp="children"
              onChange={handleCloseTenantSelect}
              notFoundContent="No tenants found"
            >
              {tenants
                .filter((t) => t.status === "active")
                .map((tenant) => {
                  const tenantBill = bills.find((b) => b.id === tenant.id);
                  return (
                    <Option key={tenant.id} value={tenant.id}>
                      <Space>
                        <span style={{ fontWeight: 500 }}>{tenant.name}</span>
                        <Tag color="blue">
                          {tenant.houseNo || tenant.unit_number || "N/A"}
                        </Tag>
                        <Tag color={tenantBill?.balance > 0 ? "red" : "green"}>
                          Balance: {formatCurrency(tenantBill?.balance || 0)}
                        </Tag>
                      </Space>
                    </Option>
                  );
                })}
            </Select>
          </Form.Item>

          {selectedTenantForClose && (
            <>
              <Alert
                message="Tenant Summary"
                description={
                  <div>
                    <p>
                      <strong>Name:</strong> {selectedTenantForClose.name}
                    </p>
                    <p>
                      <strong>House:</strong>{" "}
                      {selectedTenantForClose.houseNo ||
                        selectedTenantForClose.unit_number ||
                        "N/A"}
                    </p>
                    <p>
                      <strong>Current Balance:</strong>{" "}
                      {formatCurrency(selectedTenantForClose.balance || 0)}
                    </p>
                    <p>
                      <strong>Monthly Rent:</strong>{" "}
                      {formatCurrency(selectedTenantForClose.monthly_rent || 0)}
                    </p>
                    <p>
                      <strong>Current Month:</strong>{" "}
                      {billingMonth.format("MMMM YYYY")}
                    </p>
                    <p>
                      <strong>Next Month:</strong>{" "}
                      {billingMonth.add(1, "month").format("MMMM YYYY")}
                    </p>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form.Item name="carry_forward_balance" valuePropName="checked">
                <Checkbox>Carry forward balance to next month</Checkbox>
              </Form.Item>

              <Form.Item name="notes" label="Notes">
                <Input.TextArea
                  rows={3}
                  placeholder="E.g., Tenant moving out, special arrangement, etc."
                />
              </Form.Item>

              <div
                style={{
                  background: "#fff1f0",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  border: "1px solid #ffa39e",
                }}
              >
                <Space>
                  <ExclamationCircleOutlined
                    style={{ color: "#ff4d4f", fontSize: 18 }}
                  />
                  <Text strong style={{ color: "#ff4d4f" }}>
                    Warning:
                  </Text>
                  <Text>
                    This will close {selectedTenantForClose.name}'s month and
                    generate rent for{" "}
                    {billingMonth.add(1, "month").format("MMMM YYYY")}.
                  </Text>
                </Space>
              </div>
            </>
          )}

          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setCloseTenantModalVisible(false);
                  setSelectedTenantForClose(null);
                  closeTenantForm.resetFields();
                }}
                size="large"
              >
                Cancel
              </Button>
              <Button
                danger
                htmlType="submit"
                size="large"
                loading={closingTenant}
                icon={<ForwardOutlined />}
                disabled={!selectedTenantForClose}
              >
                Close Month for Tenant
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const MonthlyBilling = () => {
  return (
    <App>
      <MonthlyBillingContent />
    </App>
  );
};

export default MonthlyBilling;
