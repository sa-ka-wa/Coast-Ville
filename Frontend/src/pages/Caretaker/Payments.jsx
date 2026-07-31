// src/pages/Caretaker/Payments.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Modal,
  Form,
  message,
  Select,
  Row,
  Col,
  Statistic,
  Tooltip,
  DatePicker,
  Badge,
  Empty,
  Descriptions,
  Divider,
  Alert,
  Tabs,
  Avatar,
  List,
  Typography,
  Steps,
  Result,
  Spin,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DollarOutlined,
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  DownloadOutlined,
  PrinterOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  WalletOutlined,
  MobileOutlined,
  BankOutlined,
  SafetyOutlined,
  WhatsAppOutlined,
  CopyOutlined,
  CheckOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  PieChartOutlined,
  SwapOutlined,
  RollbackOutlined,
  DropboxOutlined,
} from "@ant-design/icons";
import {
  getPayments,
  createPayment,
  parseMpesaMessage,
  matchPayment,
  confirmPayment,
  getPaymentStats,
  generateReceipt,
  sendReceipt,
  processPaymentAllocation,
  getPaymentAllocation,
  movePaymentToTenant,
  reversePayment,
} from "../../services/payments";
import { getTenants } from "../../services/tenants";
import { useProperty } from "../../context/PropertyContext";
import { formatCurrency, formatDate } from "../../utils/formatters";
import dayjs from "dayjs";

const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Text } = Typography;
const { Step } = Steps;

const Payments = () => {
  const { activeProperty } = useProperty();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState({
    totalCollected: 0,
    expectedRent: 0,
    outstanding: 0,
    occupancy: 0,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("manual");

  // Match modal state
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchedTenants, setMatchedTenants] = useState([]);

  // Allocation state
  const [allocationModalVisible, setAllocationModalVisible] = useState(false);
  const [selectedPaymentAllocation, setSelectedPaymentAllocation] =
    useState(null);
  const [allocationLoading, setAllocationLoading] = useState(false);

  // Move payment state
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);

  // Reverse payment state
  const [reverseModalVisible, setReverseModalVisible] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseReason, setReverseReason] = useState("");

  // M-Pesa parsing state
  const [mpesaMessage, setMpesaMessage] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [parsingLoading, setParsingLoading] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Get current property ID
  const currentPropertyId = activeProperty?.id;

  useEffect(() => {
    if (currentPropertyId) {
      fetchData();
    } else {
      setPayments([]);
      setFilteredPayments([]);
      setTenants([]);
      setStats({
        totalCollected: 0,
        expectedRent: 0,
        outstanding: 0,
        occupancy: 0,
      });
    }
  }, [currentPropertyId]);

  const fetchData = async () => {
    if (!currentPropertyId) {
      message.warning("Please select a property first");
      return;
    }

    setLoading(true);
    try {
      const tenantsRes = await getTenants({ property_id: currentPropertyId });
      const tenantsList = tenantsRes.data || [];
      setTenants(tenantsList);

      const paymentsRes = await getPayments({ property_id: currentPropertyId });
      const paymentsList = paymentsRes.data || [];
      setPayments(paymentsList);
      setFilteredPayments(paymentsList);

      const statsRes = await getPaymentStats({
        property_id: currentPropertyId,
      });
      setStats(statsRes.data || {});
    } catch (error) {
      console.error("Error fetching data:", error);
      message.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    let filtered = [...payments];

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.tenantName || "").toLowerCase().includes(search) ||
          (p.receipt_no || "").toLowerCase().includes(search) ||
          (p.mpesa_code || "").toLowerCase().includes(search) ||
          (p.account_reference || "").toLowerCase().includes(search),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (methodFilter !== "all") {
      filtered = filtered.filter((p) => p.payment_method === methodFilter);
    }

    setFilteredPayments(filtered);
  };

  const clearFilters = () => {
    setSearchText("");
    setStatusFilter("all");
    setMethodFilter("all");
    setFilteredPayments(payments);
  };

  useEffect(() => {
    handleSearch();
  }, [searchText, statusFilter, methodFilter, payments]);

  // Manual Payment
  const handleManualPayment = async (values) => {
    try {
      const paymentData = {
        property_id: currentPropertyId,
        tenant_id: values.tenant_id,
        unit_id: values.unit_id,
        amount: values.amount,
        payment_method: values.payment_method,
        payment_for_month: values.payment_for_month
          ? values.payment_for_month.format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD"),
        notes: values.notes,
      };

      const response = await createPayment(paymentData);
      message.success("✅ Payment recorded successfully!");

      if (values.send_receipt) {
        try {
          await sendReceipt({
            payment_id: response.data.payment.id,
            method: "whatsapp",
          });
          message.success("📱 Receipt sent via WhatsApp!");
        } catch (e) {
          console.warn("Receipt send failed:", e);
        }
      }

      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      console.error("Error recording payment:", error);
      message.error(
        error.response?.data?.message || "Failed to record payment",
      );
    }
  };

  // M-Pesa Payment
  const handleParseMpesa = async () => {
    if (!mpesaMessage.trim()) {
      message.warning("Please paste the M-Pesa message");
      return;
    }

    setParsingLoading(true);
    setCurrentStep(1);
    try {
      const response = await parseMpesaMessage({ message: mpesaMessage });
      const data = response.data;
      setParsedData(data);

      if (data.amount) {
        message.success(
          `💰 Parsed amount: KSh ${data.amount.toLocaleString()}`,
        );
        await handleMatchTenant(data);
        setCurrentStep(2);
      } else {
        message.warning("Could not parse amount from message");
        setCurrentStep(0);
      }
    } catch (error) {
      console.error("Error parsing M-Pesa message:", error);
      message.error("Failed to parse M-Pesa message");
      setCurrentStep(0);
    } finally {
      setParsingLoading(false);
    }
  };

  const handleMatchTenant = async (data) => {
    setMatchingLoading(true);
    try {
      const response = await matchPayment({
        amount: data.amount,
        phone: data.phone,
        sender: data.sender,
      });
      const matches = response.data.candidates || [];

      const propertyMatches = matches.filter(
        (tenant) => tenant.property_id === currentPropertyId,
      );

      setMatchedTenants(propertyMatches.length > 0 ? propertyMatches : matches);

      if (propertyMatches.length === 1) {
        message.success("✅ Tenant matched automatically!");
        setTimeout(() => {
          handleConfirmMpesaPayment(propertyMatches[0].id);
        }, 1000);
      } else if (propertyMatches.length > 1) {
        message.info("👥 Multiple tenants matched, please select one");
      } else {
        message.warning("❌ No tenant matched in this property");
      }
    } catch (error) {
      console.error("Error matching tenant:", error);
      message.error("Failed to match tenant");
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleConfirmMpesaPayment = async (tenantId) => {
    if (!tenantId && matchedTenants.length !== 1) {
      message.warning("Please select a tenant");
      return;
    }

    const selectedTenantId = tenantId || matchedTenants[0]?.id;
    if (!selectedTenantId) {
      message.warning("No tenant selected");
      return;
    }

    setConfirmLoading(true);
    try {
      const paymentData = {
        tenant_id: selectedTenantId,
        amount: parsedData.amount,
        payment_method: "mpesa",
        mpesa_code: parsedData.mpesa_code || parsedData.till_number,
        payment_for_month: dayjs().format("YYYY-MM-DD"),
        phone: parsedData.phone,
        notes: `M-Pesa payment from ${parsedData.sender || "Unknown"}\n${mpesaMessage.substring(0, 500)}`,
      };

      const response = await confirmPayment(paymentData);

      try {
        await sendReceipt({
          payment_id: response.data.payment.id,
          method: "whatsapp",
        });
        message.success("📱 Receipt sent via WhatsApp!");
      } catch (receiptError) {
        console.warn("Receipt sending failed:", receiptError);
      }

      message.success("✅ Payment confirmed successfully!");
      setCurrentStep(3);

      setTimeout(() => {
        setModalVisible(false);
        setMpesaMessage("");
        setParsedData(null);
        setMatchedTenants([]);
        setCurrentStep(0);
        form.resetFields();
        fetchData();
      }, 2000);
    } catch (error) {
      console.error("Error confirming payment:", error);
      message.error(
        error.response?.data?.message || "Failed to confirm payment",
      );
      setCurrentStep(0);
    } finally {
      setConfirmLoading(false);
    }
  };

  // Match Payment from Table
  const handleMatchPayment = async (payment) => {
    try {
      setSelectedPayment(payment);
      setMatchLoading(true);

      const response = await matchPayment({
        amount: payment.amount,
        phone: payment.phone_number,
        house_no: payment.account_reference,
        property_id: currentPropertyId,
      });

      const candidates = response.data.candidates || [];

      if (candidates.length === 0) {
        Modal.info({
          title: "🔍 No Automatic Match Found",
          content: (
            <div>
              <p>No tenants were automatically matched to this payment.</p>
              <p style={{ marginTop: 8 }}>
                <strong>Payment Details:</strong>
              </p>
              <p>Amount: {formatCurrency(payment.amount)}</p>
              <p>House: {payment.account_reference || "N/A"}</p>
              <p>Phone: {payment.phone_number || "N/A"}</p>
              <p style={{ marginTop: 8, color: "#faad14" }}>
                Please select a tenant manually from the list.
              </p>
            </div>
          ),
          okText: "Show All Tenants",
          onOk: () => {
            setMatchedTenants(tenants.map((t) => ({ ...t, match_score: 0 })));
            setMatchModalVisible(true);
          },
        });
        setMatchLoading(false);
        return;
      }

      setMatchedTenants(candidates);
      setMatchModalVisible(true);
      setMatchLoading(false);
    } catch (error) {
      console.error("Error matching payment:", error);
      message.error("Failed to search for matching tenants");
      setMatchLoading(false);
    }
  };

  const handleConfirmMatch = async (paymentId, tenantId) => {
    setMatchLoading(true);
    try {
      await confirmPayment({
        payment_id: paymentId,
        tenant_id: tenantId,
      });

      message.success("✅ Payment matched successfully!");
      setMatchModalVisible(false);
      setMatchedTenants([]);
      setSelectedPayment(null);
      fetchData();
    } catch (error) {
      console.error("Error matching payment:", error);
      message.error("Failed to match payment");
    } finally {
      setMatchLoading(false);
    }
  };

  // Payment Allocation Handlers
  const handleAllocatePayment = async (paymentId) => {
    setAllocationLoading(true);
    try {
      const response = await processPaymentAllocation(paymentId);
      if (response.data.success) {
        message.success("✅ Payment allocated successfully!");
        fetchData();
        // Show allocation details
        await handleViewAllocation(paymentId);
      } else {
        message.error(response.data.message || "Failed to allocate payment");
      }
    } catch (error) {
      console.error("Error allocating payment:", error);
      message.error("Failed to allocate payment");
    } finally {
      setAllocationLoading(false);
    }
  };

  const handleViewAllocation = async (paymentId) => {
    try {
      const response = await getPaymentAllocation(paymentId);
      setSelectedPaymentAllocation(response.data);
      setAllocationModalVisible(true);
    } catch (error) {
      console.error("Error getting allocation:", error);
      message.error("Failed to get allocation details");
    }
  };

  // Move Payment Handler
  const handleMovePayment = async (paymentId, newTenantId, reason) => {
    setMoveLoading(true);
    try {
      const response = await movePaymentToTenant(
        paymentId,
        newTenantId,
        reason,
      );
      if (response.data.success) {
        message.success("✅ Payment moved successfully!");
        setMoveModalVisible(false);
        fetchData();
      } else {
        message.error(response.data.message || "Failed to move payment");
      }
    } catch (error) {
      console.error("Error moving payment:", error);
      message.error("Failed to move payment");
    } finally {
      setMoveLoading(false);
    }
  };

  // Reverse Payment Handler
  const handleReversePayment = async (paymentId) => {
    setReverseLoading(true);
    try {
      const response = await reversePayment(paymentId, reverseReason);
      if (response.data.success) {
        message.success("✅ Payment reversed successfully!");
        setReverseModalVisible(false);
        setReverseReason("");
        fetchData();
      } else {
        message.error(response.data.message || "Failed to reverse payment");
      }
    } catch (error) {
      console.error("Error reversing payment:", error);
      message.error("Failed to reverse payment");
    } finally {
      setReverseLoading(false);
    }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const response = await generateReceipt(paymentId);
      setSelectedPayment(response.data.receipt || response.data);
      setDetailVisible(true);
    } catch (error) {
      console.error("Error generating receipt:", error);
      message.error("Failed to generate receipt");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return (
          <Badge
            status="success"
            text={
              <span style={{ color: "#52c41a", fontWeight: 500 }}>
                <CheckCircleOutlined /> Confirmed
              </span>
            }
          />
        );
      case "pending":
        return (
          <Badge
            status="warning"
            text={
              <span style={{ color: "#faad14", fontWeight: 500 }}>
                <ClockCircleOutlined /> Pending Match
              </span>
            }
          />
        );
      case "failed":
        return (
          <Badge
            status="error"
            text={
              <span style={{ color: "#ff4d4f", fontWeight: 500 }}>
                <ExclamationCircleOutlined /> Failed
              </span>
            }
          />
        );
      default:
        return <Badge status="default" text="Unknown" />;
    }
  };

  const columns = [
    {
      title: "Receipt",
      dataIndex: "receipt_no",
      key: "receipt_no",
      render: (text) => <Tag color="blue">{text || "N/A"}</Tag>,
    },
    {
      title: "Tenant / House",
      key: "tenant",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar
            size="small"
            style={{
              backgroundColor: record.status === "paid" ? "#52c41a" : "#faad14",
            }}
          >
            {record.tenantName ? record.tenantName[0].toUpperCase() : "?"}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.tenantName || "⚠️ Unmatched"}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              <HomeOutlined style={{ marginRight: 4 }} />
              House: {record.account_reference || record.houseNo || "N/A"}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>
          {formatCurrency(amount)}
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Method",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method) => {
        const icons = {
          mpesa: <MobileOutlined />,
          cash: <WalletOutlined />,
          bank: <BankOutlined />,
          cheque: <FileTextOutlined />,
        };
        return (
          <Tag icon={icons[method] || <SafetyOutlined />}>
            {method ? method.toUpperCase() : "N/A"}
          </Tag>
        );
      },
    },
    {
      title: "Reference",
      dataIndex: "mpesa_code",
      key: "mpesa_code",
      render: (text) => text || "N/A",
    },
    {
      title: "Phone",
      dataIndex: "phone_number",
      key: "phone_number",
      render: (text) => text || "N/A",
    },
    {
      title: "Date",
      dataIndex: "payment_date",
      key: "payment_date",
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.payment_date) - new Date(b.payment_date),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusBadge(status),
      sorter: (a, b) => {
        const order = { paid: 1, pending: 2, failed: 3 };
        return order[a.status] - order[b.status];
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 280,
      render: (_, record) => (
        <Space wrap>
          {record.status === "pending" ? (
            <>
              <Tooltip title="Match to Tenant">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => handleMatchPayment(record)}
                >
                  Match
                </Button>
              </Tooltip>
              <Tooltip title="Allocate Payment">
                <Button
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => handleAllocatePayment(record.id)}
                  loading={allocationLoading}
                />
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="View Receipt">
                <Button
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => handleViewReceipt(record.id)}
                />
              </Tooltip>
              <Tooltip title="View Allocation">
                <Button
                  icon={<PieChartOutlined />}
                  size="small"
                  onClick={() => handleViewAllocation(record.id)}
                />
              </Tooltip>
              <Tooltip title="Allocate Payment">
                <Button
                  type="primary"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => handleAllocatePayment(record.id)}
                  loading={allocationLoading}
                />
              </Tooltip>
              <Tooltip title="Move to Different Tenant">
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => {
                    setSelectedPayment(record);
                    setMoveModalVisible(true);
                  }}
                />
              </Tooltip>
              <Tooltip title="Send Receipt">
                <Button
                  icon={<WhatsAppOutlined />}
                  size="small"
                  onClick={() =>
                    sendReceipt({ payment_id: record.id, method: "whatsapp" })
                  }
                />
              </Tooltip>
              <Tooltip title="Reverse/Refund">
                <Button
                  danger
                  size="small"
                  icon={<RollbackOutlined />}
                  onClick={() => {
                    setSelectedPayment(record);
                    setReverseModalVisible(true);
                  }}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  // Show message if no property selected
  if (!currentPropertyId) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
        <h2>Please select a property</h2>
        <p style={{ color: "#8c8c8c" }}>
          Use the property selector in the navbar to view payments for a
          specific property.
        </p>
      </div>
    );
  }

  // Show loading state
  if (loading && payments.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading payments...</p>
      </div>
    );
  }

  // Calculate payment stats
  const totalPayments = payments.length;
  const confirmedCount = payments.filter((p) => p.status === "paid").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const failedCount = payments.filter((p) => p.status === "failed").length;

  return (
    <div>
      {/* Property Header */}
      <Card
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
          color: "white",
        }}
      >
        <div>
          <h2 style={{ color: "white", margin: 0 }}>
            <HomeOutlined style={{ marginRight: 8 }} />
            {activeProperty?.name || "No Property Selected"}
          </h2>
          <div style={{ color: "rgba(255,255,255,0.8)" }}>
            {activeProperty?.address || ""}{" "}
            {activeProperty?.city ? `• ${activeProperty.city}` : ""}
            {activeProperty?.total_units
              ? ` • ${activeProperty.total_units} units`
              : ""}
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-primary">
            <Statistic
              title="Total Collected"
              value={stats.totalCollected || 0}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-success">
            <Statistic
              title="Expected Rent"
              value={stats.expectedRent || 0}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-warning">
            <Statistic
              title="Outstanding"
              value={stats.outstanding || 0}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-danger">
            <Statistic
              title="Occupancy"
              value={stats.occupancy || 0}
              suffix="%"
              prefix={<HomeOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Payment Status Summary */}
      <Card style={{ marginBottom: 16, background: "#fafafa" }}>
        <Row gutter={16}>
          <Col xs={24} sm={6}>
            <Statistic
              title="📊 Total Payments"
              value={totalPayments}
              prefix={<DollarOutlined />}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title="✅ Confirmed (Auto-Matched)"
              value={confirmedCount}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title="⏳ Pending (Need Match)"
              value={pendingCount}
              valueStyle={{ color: "#faad14" }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title="❌ Failed"
              value={failedCount}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Payment Table */}
      <Card
        title={
          <Space>
            <DollarOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>Payments</span>
            <Tag color="blue">{filteredPayments.length} records</Tag>
            {activeProperty?.name && (
              <Tag color="green">{activeProperty.name}</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                setMpesaMessage("");
                setParsedData(null);
                setMatchedTenants([]);
                setCurrentStep(0);
                setModalVisible(true);
              }}
            >
              New Payment
            </Button>
          </Space>
        }
      >
        {/* Filters */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Input
            placeholder="Search by tenant, house, receipt..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            placeholder="Filter by status"
          >
            <Option value="all">All Status</Option>
            <Option value="paid">✅ Confirmed</Option>
            <Option value="pending">⏳ Pending</Option>
            <Option value="failed">❌ Failed</Option>
          </Select>
          <Select
            value={methodFilter}
            onChange={setMethodFilter}
            style={{ width: 150 }}
            placeholder="Filter by method"
          >
            <Option value="all">All Methods</Option>
            <Option value="mpesa">📱 M-Pesa</Option>
            <Option value="cash">💵 Cash</Option>
            <Option value="bank">🏦 Bank</Option>
            <Option value="cheque">📄 Cheque</Option>
          </Select>
          {(searchText || statusFilter !== "all" || methodFilter !== "all") && (
            <Button onClick={clearFilters}>Clear Filters</Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredPayments}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} payments`,
            pageSizeOptions: ["10", "20", "50"],
          }}
          scroll={{ x: 1300 }}
          locale={{
            emptyText: (
              <Empty
                description="No payments found for this property"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      {/* New Payment Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            New Payment
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setMpesaMessage("");
          setParsedData(null);
          setMatchedTenants([]);
          setCurrentStep(0);
        }}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <Alert
          message={`Adding payment to: ${activeProperty?.name || "Selected Property"}`}
          description="Select a tenant and enter payment details."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <WalletOutlined />
                💵 Manual Entry
              </span>
            }
            key="manual"
          >
            <Form form={form} layout="vertical" onFinish={handleManualPayment}>
              <Form.Item
                name="tenant_id"
                label="Select Tenant"
                rules={[{ required: true, message: "Please select a tenant" }]}
              >
                <Select
                  placeholder="Search and select tenant"
                  showSearch
                  optionFilterProp="children"
                  size="large"
                >
                  {tenants.map((tenant) => (
                    <Option key={tenant.id} value={tenant.id}>
                      {tenant.name} - {tenant.houseNo || "N/A"}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="amount"
                    label="Amount (KSh)"
                    rules={[
                      { required: true, message: "Please enter amount" },
                      {
                        type: "number",
                        min: 1,
                        message: "Amount must be greater than 0",
                      },
                    ]}
                  >
                    <Input
                      type="number"
                      prefix={<DollarOutlined />}
                      placeholder="e.g., 15000"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="payment_method"
                    label="Payment Method"
                    rules={[
                      { required: true, message: "Please select method" },
                    ]}
                  >
                    <Select placeholder="Select payment method" size="large">
                      <Option value="cash">💵 Cash</Option>
                      <Option value="mpesa">📱 M-Pesa</Option>
                      <Option value="bank">🏦 Bank Transfer</Option>
                      <Option value="cheque">📄 Cheque</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="payment_for_month"
                    label="Payment For Month"
                    initialValue={dayjs()}
                  >
                    <DatePicker
                      picker="month"
                      style={{ width: "100%" }}
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="unit_id" label="Unit (Optional)">
                    <Select placeholder="Select unit" size="large" allowClear>
                      {activeProperty?.units?.map((unit) => (
                        <Option key={unit.id} value={unit.id}>
                          {unit.unit_number} - {unit.unit_type || "Unit"}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="notes" label="Notes">
                <TextArea
                  rows={3}
                  placeholder="Additional notes (optional)..."
                />
              </Form.Item>

              <Form.Item name="send_receipt" valuePropName="checked">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" style={{ width: 16, height: 16 }} />
                  <span>Send receipt via WhatsApp after recording</span>
                </div>
              </Form.Item>

              <Form.Item>
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button
                    onClick={() => {
                      setModalVisible(false);
                      form.resetFields();
                    }}
                    size="large"
                  >
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit" size="large">
                    💰 Record Payment
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </TabPane>
          <TabPane
            tab={
              <span>
                <MobileOutlined />
                📱 M-Pesa (Copy/Paste)
              </span>
            }
            key="mpesa"
          >
            <Alert
              message="📱 M-Pesa Payment - Copy & Paste"
              description="Copy the M-Pesa SMS from your phone and paste it below. The system will automatically parse the payment and match it to a tenant."
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Steps
              current={currentStep}
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Step title="Paste SMS" icon={<CopyOutlined />} />
              <Step title="Parse" icon={<SearchOutlined />} />
              <Step title="Match Tenant" icon={<UserOutlined />} />
              <Step title="Confirm" icon={<CheckOutlined />} />
            </Steps>

            <div style={{ marginBottom: 16 }}>
              <TextArea
                rows={4}
                placeholder={`📋 Paste M-Pesa SMS message here...

Example:
Confirmed. KSh 15,000 received from JOHN MWANGI on 1/7/2026 at 10:30 AM.
Paybill: 123456, Account: 101. Code: THG2JK9A1M.`}
                value={mpesaMessage}
                onChange={(e) => setMpesaMessage(e.target.value)}
                style={{ fontSize: 14 }}
                disabled={currentStep === 3}
              />
              <div style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleParseMpesa}
                  loading={parsingLoading}
                  disabled={!mpesaMessage.trim() || currentStep === 3}
                  size="large"
                >
                  🔍 Parse Message
                </Button>
                <Button
                  style={{ marginLeft: 8 }}
                  icon={<WhatsAppOutlined />}
                  onClick={() => {
                    window.open("https://web.whatsapp.com", "_blank");
                  }}
                >
                  Open WhatsApp Web
                </Button>
                <Button
                  style={{ marginLeft: 8 }}
                  onClick={() => {
                    setMpesaMessage("");
                    setParsedData(null);
                    setMatchedTenants([]);
                    setCurrentStep(0);
                  }}
                  disabled={currentStep === 3}
                >
                  Clear
                </Button>
              </div>
            </div>

            {parsedData && currentStep >= 1 && currentStep < 3 && (
              <Card
                size="small"
                style={{
                  marginBottom: 16,
                  background: "#f6ffed",
                  borderColor: "#b7eb8f",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>Amount</div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "#52c41a",
                      }}
                    >
                      {formatCurrency(parsedData.amount)}
                    </div>
                  </div>
                  <Divider type="vertical" style={{ height: 40 }} />
                  <div>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>Sender</div>
                    <div style={{ fontWeight: 600 }}>
                      {parsedData.sender || "Unknown"}
                    </div>
                  </div>
                  <Divider type="vertical" style={{ height: 40 }} />
                  <div>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                      M-Pesa Code
                    </div>
                    <Tag color="blue" style={{ fontSize: 14 }}>
                      {parsedData.mpesa_code || "N/A"}
                    </Tag>
                  </div>
                  {parsedData.till_number && (
                    <>
                      <Divider type="vertical" style={{ height: 40 }} />
                      <div>
                        <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                          Till Number
                        </div>
                        <Tag color="purple">{parsedData.till_number}</Tag>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {matchedTenants.length > 0 && currentStep === 2 && (
              <Card
                title={
                  <Space>
                    <UserOutlined />
                    Matched Tenants ({matchedTenants.length})
                  </Space>
                }
                size="small"
                style={{ marginBottom: 16 }}
              >
                <List
                  dataSource={matchedTenants}
                  renderItem={(tenant) => (
                    <List.Item
                      actions={[
                        <Button
                          type="primary"
                          size="small"
                          loading={confirmLoading}
                          onClick={() => handleConfirmMpesaPayment(tenant.id)}
                          icon={<CheckOutlined />}
                        >
                          Confirm
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar style={{ backgroundColor: "#1890ff" }}>
                            {tenant.name?.[0] || "?"}
                          </Avatar>
                        }
                        title={<strong>{tenant.name || "Unknown"}</strong>}
                        description={
                          <Space>
                            <span>🏠 House: {tenant.house_no || "N/A"}</span>
                            <span>|</span>
                            <span>
                              💰 Balance: {formatCurrency(tenant.balance || 0)}
                            </span>
                            {tenant.match_score > 0 && <span>|</span>}
                            {tenant.match_score > 0 && (
                              <span>🎯 Match: {tenant.match_score}%</span>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {parsedData &&
              matchedTenants.length === 0 &&
              currentStep === 2 &&
              !matchingLoading && (
                <Alert
                  message="❌ No tenant matched"
                  description="Could not automatically match this payment to a tenant in this property. Try manual entry instead."
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

            {currentStep === 3 && (
              <Result
                status="success"
                title="✅ Payment Confirmed!"
                subTitle={`Amount: ${formatCurrency(parsedData?.amount)} has been recorded successfully.`}
                extra={[
                  <Button
                    type="primary"
                    key="done"
                    onClick={() => {
                      setModalVisible(false);
                      setMpesaMessage("");
                      setParsedData(null);
                      setMatchedTenants([]);
                      setCurrentStep(0);
                      fetchData();
                    }}
                  >
                    Done
                  </Button>,
                  <Button
                    key="receipt"
                    icon={<WhatsAppOutlined />}
                    style={{
                      backgroundColor: "#25D366",
                      color: "white",
                      border: "none",
                    }}
                    onClick={() => {
                      message.info("Receipt will be sent to tenant's WhatsApp");
                    }}
                  >
                    Send Receipt
                  </Button>,
                ]}
              />
            )}
          </TabPane>
          // pages/Caretaker/Payments.jsx - Add this new TabPane inside the Tabs
          component
          <TabPane
            tab={
              <span>
                <BankOutlined />
                💳 Paybill
              </span>
            }
            key="paybill"
          >
            <Alert
              message="💳 Paybill Payment"
              description="Enter the account reference and amount to process a Paybill payment. Format: ACCOUNT_PREFIX#HOUSE_NO (e.g., 40766915#101)"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Card style={{ background: "#fafafa" }}>
              <Form
                onFinish={async (values) => {
                  try {
                    setLoading(true);
                    const response = await api.post("/payments/paybill", {
                      account_reference: values.account_reference,
                      amount: values.amount,
                      phone_number: values.phone_number || "254708374149",
                      mpesa_code:
                        values.mpesa_code ||
                        "PAYBILL" + Date.now().toString().slice(-6),
                    });

                    if (response.data.success) {
                      message.success(
                        "✅ Paybill payment processed successfully!",
                      );
                      setModalVisible(false);
                      fetchData();
                    } else {
                      message.error(response.data.error || "Payment failed");
                    }
                  } catch (error) {
                    console.error("Paybill payment error:", error);
                    message.error("Failed to process paybill payment");
                  } finally {
                    setLoading(false);
                  }
                }}
                layout="vertical"
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="account_reference"
                      label="Account Reference"
                      rules={[
                        {
                          required: true,
                          message: "Please enter account reference",
                        },
                        {
                          pattern: /^[A-Za-z0-9]+#[A-Za-z0-9]+$/,
                          message:
                            "Format: ACCOUNT_PREFIX#HOUSE_NO (e.g., 40766915#101)",
                        },
                      ]}
                      tooltip="Format: ACCOUNT_PREFIX#HOUSE_NO (e.g., 40766915#101)"
                    >
                      <Input
                        placeholder="e.g., 40766915#101"
                        size="large"
                        prefix={<HomeOutlined />}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="amount"
                      label="Amount (KSh)"
                      rules={[
                        { required: true, message: "Please enter amount" },
                        {
                          type: "number",
                          min: 1,
                          message: "Amount must be greater than 0",
                        },
                      ]}
                    >
                      <Input
                        type="number"
                        placeholder="e.g., 15000"
                        size="large"
                        prefix={<DollarOutlined />}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="phone_number"
                      label="Phone Number (Optional)"
                      tooltip="Phone number of the person making payment"
                    >
                      <Input
                        placeholder="e.g., 254708374149"
                        size="large"
                        prefix={<MobileOutlined />}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="mpesa_code"
                      label="M-Pesa Code (Optional)"
                      tooltip="M-Pesa transaction code"
                    >
                      <Input
                        placeholder="e.g., TEST123456"
                        size="large"
                        prefix={<CheckOutlined />}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      loading={loading}
                      icon={<BankOutlined />}
                    >
                      Process Paybill Payment
                    </Button>
                    <Button
                      size="large"
                      onClick={() => {
                        // Auto-fill with example data for testing
                        form.setFieldsValue({
                          account_reference: "40766915#101",
                          amount: 15000,
                          phone_number: "254708374149",
                          mpesa_code: "TEST" + Date.now().toString().slice(-6),
                        });
                      }}
                    >
                      Fill Test Data
                    </Button>
                  </Space>
                </Form.Item>

                <Divider />

                <Alert
                  message="📋 Paybill Format Guide"
                  description={
                    <div>
                      <p>
                        <strong>Format:</strong>{" "}
                        <code>ACCOUNT_PREFIX#HOUSE_NO</code>
                      </p>
                      <p>
                        <strong>Example:</strong> <code>40766915#101</code>
                      </p>
                      <ul style={{ marginTop: 8 }}>
                        <li>
                          <strong>40766915</strong> = Account prefix (last 8
                          digits of owner's phone)
                        </li>
                        <li>
                          <strong>101</strong> = House number
                        </li>
                      </ul>
                      <p style={{ marginTop: 8, color: "#52c41a" }}>
                        ✅ Payment will be automatically allocated to the
                        tenant's account
                      </p>
                    </div>
                  }
                  type="info"
                  showIcon
                />
              </Form>
            </Card>
          </TabPane>
        </Tabs>
      </Modal>

      {/* Match Tenant Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined style={{ color: "#1890ff" }} />
            Match Payment to Tenant
          </Space>
        }
        open={matchModalVisible}
        onCancel={() => {
          setMatchModalVisible(false);
          setMatchedTenants([]);
          setSelectedPayment(null);
        }}
        footer={null}
        width={700}
      >
        {selectedPayment && (
          <>
            <Alert
              message="⏳ Unmatched Payment"
              description={
                <div style={{ marginTop: 8 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <p>
                        <strong>Amount:</strong>{" "}
                        {formatCurrency(selectedPayment.amount)}
                      </p>
                      <p>
                        <strong>House Number:</strong>{" "}
                        {selectedPayment.account_reference || "N/A"}
                      </p>
                    </Col>
                    <Col span={12}>
                      <p>
                        <strong>Phone:</strong>{" "}
                        {selectedPayment.phone_number || "N/A"}
                      </p>
                      <p>
                        <strong>M-Pesa Code:</strong>{" "}
                        {selectedPayment.mpesa_code || "N/A"}
                      </p>
                    </Col>
                  </Row>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Divider>Select Tenant</Divider>

            {matchedTenants.length === 0 ? (
              <Empty description="No matching tenants found">
                <Button
                  type="primary"
                  onClick={() => {
                    setMatchedTenants(
                      tenants.map((t) => ({ ...t, match_score: 0 })),
                    );
                  }}
                >
                  Show All Tenants
                </Button>
              </Empty>
            ) : (
              <List
                dataSource={matchedTenants}
                renderItem={(tenant) => (
                  <List.Item
                    actions={[
                      <Button
                        type="primary"
                        size="small"
                        loading={matchLoading}
                        onClick={() =>
                          handleConfirmMatch(selectedPayment.id, tenant.id)
                        }
                        icon={<CheckOutlined />}
                      >
                        Match
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar style={{ backgroundColor: "#1890ff" }}>
                          {tenant.name?.[0] || "?"}
                        </Avatar>
                      }
                      title={
                        <Space>
                          <strong>{tenant.name || "Unknown"}</strong>
                          {tenant.match_score > 0 && (
                            <Tag color="blue">{tenant.match_score}% match</Tag>
                          )}
                          {tenant.status === "active" ? (
                            <Tag color="green">Active</Tag>
                          ) : (
                            <Tag color="red">Inactive</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <span>
                            🏠 House:{" "}
                            {tenant.houseNo || tenant.house_no || "N/A"}
                          </span>
                          <span>📱 Phone: {tenant.phone || "N/A"}</span>
                          <span style={{ color: "#52c41a" }}>
                            Balance: {formatCurrency(tenant.balance || 0)}
                          </span>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}

            <Divider />

            <div style={{ textAlign: "center" }}>
              <Button onClick={() => setMatchModalVisible(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Allocation Modal */}
      <Modal
        title={
          <Space>
            <PieChartOutlined style={{ color: "#1890ff" }} />
            Payment Allocation Details
          </Space>
        }
        open={allocationModalVisible}
        onCancel={() => {
          setAllocationModalVisible(false);
          setSelectedPaymentAllocation(null);
        }}
        footer={
          <Button onClick={() => setAllocationModalVisible(false)}>
            Close
          </Button>
        }
        width={700}
      >
        {selectedPaymentAllocation && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Payment ID">
                  {selectedPaymentAllocation.payment?.id}
                </Descriptions.Item>
                <Descriptions.Item label="Tenant">
                  {selectedPaymentAllocation.payment?.tenantName}
                </Descriptions.Item>
                <Descriptions.Item label="Amount">
                  <strong style={{ color: "#1890ff" }}>
                    {formatCurrency(selectedPaymentAllocation.payment?.amount)}
                  </strong>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Badge
                    color={
                      selectedPaymentAllocation.payment?.status === "paid"
                        ? "#52c41a"
                        : "#faad14"
                    }
                    text={selectedPaymentAllocation.payment?.status}
                  />
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Divider>Allocation Breakdown</Divider>

            <Row gutter={[16, 16]}>
              {selectedPaymentAllocation.allocations?.rent > 0 && (
                <Col span={12}>
                  <Card size="small" style={{ borderColor: "#1890ff" }}>
                    <Statistic
                      title="🏠 Rent"
                      value={selectedPaymentAllocation.allocations.rent}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: "#1890ff" }}
                    />
                  </Card>
                </Col>
              )}

              {selectedPaymentAllocation.allocations?.water > 0 && (
                <Col span={12}>
                  <Card size="small" style={{ borderColor: "#52c41a" }}>
                    <Statistic
                      title="💧 Water"
                      value={selectedPaymentAllocation.allocations.water}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: "#52c41a" }}
                    />
                  </Card>
                </Col>
              )}

              {selectedPaymentAllocation.allocations?.deposit > 0 && (
                <Col span={12}>
                  <Card size="small" style={{ borderColor: "#faad14" }}>
                    <Statistic
                      title="🏦 Deposit"
                      value={selectedPaymentAllocation.allocations.deposit}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: "#faad14" }}
                    />
                  </Card>
                </Col>
              )}

              {selectedPaymentAllocation.allocations?.excess > 0 && (
                <Col span={12}>
                  <Card
                    size="small"
                    style={{
                      borderColor: "#52c41a",
                      background: "#f6ffed",
                    }}
                  >
                    <Statistic
                      title="💰 Credit Next Month"
                      value={selectedPaymentAllocation.allocations.excess}
                      formatter={(value) => `+${formatCurrency(value)}`}
                      valueStyle={{ color: "#52c41a" }}
                    />
                  </Card>
                </Col>
              )}

              {selectedPaymentAllocation.allocations?.balance_due > 0 && (
                <Col span={12}>
                  <Card
                    size="small"
                    style={{
                      borderColor: "#ff4d4f",
                      background: "#fff2f0",
                    }}
                  >
                    <Statistic
                      title="⚠️ Balance Due"
                      value={selectedPaymentAllocation.allocations.balance_due}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: "#ff4d4f" }}
                    />
                  </Card>
                </Col>
              )}
            </Row>

            {selectedPaymentAllocation.allocations?.credited_to_next_month && (
              <Alert
                message="💰 Credit Applied to Next Month"
                description="This payment has excess that will be applied to next month's rent automatically."
                type="success"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        )}
      </Modal>

      {/* Move Payment Modal */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: "#1890ff" }} />
            Move Payment to Different Tenant
          </Space>
        }
        open={moveModalVisible}
        onCancel={() => {
          setMoveModalVisible(false);
          setSelectedPayment(null);
        }}
        footer={null}
        width={600}
      >
        {selectedPayment && (
          <>
            <Alert
              message="🏠 Move Payment to Correct Tenant"
              description={`Payment of ${formatCurrency(selectedPayment.amount)} is currently assigned to ${selectedPayment.tenantName} (House ${selectedPayment.houseNo})`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form
              onFinish={(values) =>
                handleMovePayment(
                  selectedPayment.id,
                  values.tenant_id,
                  values.reason,
                )
              }
            >
              <Form.Item
                name="tenant_id"
                label="Select Correct Tenant"
                rules={[{ required: true, message: "Please select a tenant" }]}
              >
                <Select
                  placeholder="Search correct tenant"
                  showSearch
                  optionFilterProp="children"
                  size="large"
                >
                  {tenants
                    .filter((t) => t.id !== selectedPayment.tenant_id)
                    .map((tenant) => (
                      <Option key={tenant.id} value={tenant.id}>
                        {tenant.name} - House {tenant.houseNo}
                      </Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="reason"
                label="Reason"
                initialValue="wrong_house"
              >
                <Select placeholder="Select reason" size="large">
                  <Option value="wrong_house">
                    Wrong house number entered
                  </Option>
                  <Option value="tenant_moved">
                    Tenant moved to different house
                  </Option>
                  <Option value="mistake">Caretaker error</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <Button onClick={() => setMoveModalVisible(false)}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={moveLoading}>
                  Move Payment
                </Button>
              </div>
            </Form>
          </>
        )}
      </Modal>

      {/* Reverse Payment Modal */}
      <Modal
        title={
          <Space>
            <RollbackOutlined style={{ color: "#ff4d4f" }} />
            Reverse/Refund Payment
          </Space>
        }
        open={reverseModalVisible}
        onCancel={() => {
          setReverseModalVisible(false);
          setSelectedPayment(null);
          setReverseReason("");
        }}
        footer={null}
        width={600}
      >
        {selectedPayment && (
          <>
            <Alert
              message="⚠️ Payment Reversal"
              description={
                <div>
                  <p style={{ color: "#ff4d4f" }}>
                    This action will reverse the payment and refund the tenant's
                    balance.
                  </p>
                  <Divider />
                  <Row gutter={16}>
                    <Col span={12}>
                      <p>
                        <strong>Amount:</strong>{" "}
                        {formatCurrency(selectedPayment.amount)}
                      </p>
                      <p>
                        <strong>Tenant:</strong> {selectedPayment.tenantName}
                      </p>
                    </Col>
                    <Col span={12}>
                      <p>
                        <strong>House:</strong> {selectedPayment.houseNo}
                      </p>
                      <p>
                        <strong>Receipt:</strong> {selectedPayment.receipt_no}
                      </p>
                    </Col>
                  </Row>
                </div>
              }
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Divider>Reversal Reason</Divider>

            <Form onFinish={() => handleReversePayment(selectedPayment.id)}>
              <Form.Item
                name="reason"
                label="Reason for Reversal"
                rules={[{ required: true, message: "Please select a reason" }]}
              >
                <Select
                  placeholder="Select reason for reversal"
                  onChange={(value) => setReverseReason(value)}
                  size="large"
                >
                  <Option value="wrong_tenant">
                    Wrong tenant/house number
                  </Option>
                  <Option value="wrong_amount">Wrong amount paid</Option>
                  <Option value="duplicate">Duplicate payment</Option>
                  <Option value="tenant_request">
                    Tenant requested refund
                  </Option>
                  <Option value="system_error">System error</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>

              <Form.Item name="notes" label="Additional Notes">
                <TextArea
                  rows={3}
                  placeholder="Enter additional details about the reversal..."
                />
              </Form.Item>

              <Divider />

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <Button onClick={() => setReverseModalVisible(false)}>
                  Cancel
                </Button>
                <Button
                  danger
                  type="primary"
                  htmlType="submit"
                  loading={reverseLoading}
                  icon={<RollbackOutlined />}
                >
                  Confirm Reversal
                </Button>
              </div>
            </Form>
          </>
        )}
      </Modal>

      {/* Receipt Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: "#1890ff" }} />
            Payment Receipt
          </Space>
        }
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedPayment(null);
        }}
        footer={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              Print
            </Button>
            <Button icon={<DownloadOutlined />}>Download PDF</Button>
            <Button
              icon={<WhatsAppOutlined />}
              style={{
                backgroundColor: "#25D366",
                color: "white",
                border: "none",
              }}
              onClick={() => {
                if (selectedPayment?.id) {
                  sendReceipt({
                    payment_id: selectedPayment.id,
                    method: "whatsapp",
                  });
                }
              }}
            >
              Send via WhatsApp
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setDetailVisible(false);
                setSelectedPayment(null);
              }}
            >
              Close
            </Button>
          </Space>
        }
        width={600}
      >
        {selectedPayment && (
          <div id="receipt-content">
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1890ff" }}>
                PAYMENT RECEIPT
              </div>
              <div style={{ fontSize: 14, color: "#8c8c8c" }}>
                {selectedPayment.receipt_no}
              </div>
            </div>

            <Descriptions bordered column={1}>
              <Descriptions.Item label="Receipt Number">
                <Tag color="blue" style={{ fontWeight: 600 }}>
                  {selectedPayment.receipt_no}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tenant">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar style={{ backgroundColor: "#1890ff" }}>
                    {(selectedPayment.tenantName || "U")[0].toUpperCase()}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {selectedPayment.tenantName || "N/A"}
                    </div>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                      <HomeOutlined style={{ marginRight: 4 }} />
                      {selectedPayment.houseNo || "N/A"}
                    </div>
                  </div>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <span
                  style={{ fontSize: 20, fontWeight: 700, color: "#52c41a" }}
                >
                  {formatCurrency(selectedPayment.amount)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                <Tag icon={<MobileOutlined />}>
                  {selectedPayment.payment_method?.toUpperCase() || "N/A"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Reference">
                {selectedPayment.mpesa_code || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Date">
                {formatDate(selectedPayment.payment_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Payment For">
                {selectedPayment.payment_for_month
                  ? formatDate(selectedPayment.payment_for_month)
                  : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {getStatusBadge(selectedPayment.status)}
              </Descriptions.Item>
              {selectedPayment.notes && (
                <Descriptions.Item label="Notes">
                  {selectedPayment.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <div
              style={{ textAlign: "center", color: "#8c8c8c", fontSize: 12 }}
            >
              This is a system-generated receipt. Thank you for your payment!
              <br />
              {new Date().toLocaleDateString()}{" "}
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Payments;
