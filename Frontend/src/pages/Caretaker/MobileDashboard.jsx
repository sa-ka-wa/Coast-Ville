// src/pages/Caretaker/MobileDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Input,
  Form,
  Select,
  message,
  Modal,
  Tabs,
  List,
  Tag,
  Badge,
  Avatar,
  Typography,
  Alert,
  Spin,
  Empty,
  Divider,
  Descriptions,
  DatePicker,
  Progress,
  Timeline,
  Collapse,
  Result,
} from "antd";
import {
  DashboardOutlined,
  HomeOutlined,
  UserOutlined,
  DollarOutlined,
  MobileOutlined,
  WhatsAppOutlined,
  CopyOutlined,
  CheckOutlined,
  ReloadOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  ScheduleOutlined,
  WalletOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  EyeOutlined,
  CloseOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  ClearOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useProperty } from "../../context/PropertyContext";
import { getTenants } from "../../services/tenants";
import { submitWaterReading, getWaterReadings } from "../../services/water";
import {
  parseMpesaMessage,
  matchPayment,
  confirmPayment,
  getPayments,
} from "../../services/payments";
import { formatCurrency, formatDate } from "../../utils/formatters";
import dayjs from "dayjs";

const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// M-Pesa Message History (stored in localStorage)
const MPESA_HISTORY_KEY = "mpesa_message_history";

const MobileDashboard = () => {
  const { activeProperty } = useProperty();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [readings, setReadings] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [lastReading, setLastReading] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [recentReadings, setRecentReadings] = useState([]);
  const [stats, setStats] = useState({
    totalReadings: 0,
    totalUnits: 0,
    totalAmount: 0,
    todayReadings: 0,
  });

  // M-Pesa state
  const [mpesaMessage, setMpesaMessage] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [matchedTenants, setMatchedTenants] = useState([]);
  const [parsingLoading, setParsingLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [mpesaHistory, setMpesaHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Reading period check
  const [isReadingPeriod, setIsReadingPeriod] = useState(false);
  const [readingPeriodMessage, setReadingPeriodMessage] = useState("");

  const currentPropertyId = activeProperty?.id;

  // Load M-Pesa history from localStorage
  useEffect(() => {
    loadMpesaHistory();
  }, []);

  const loadMpesaHistory = () => {
    try {
      const saved = localStorage.getItem(MPESA_HISTORY_KEY);
      if (saved) {
        setMpesaHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading M-Pesa history:", error);
    }
  };

  const saveMpesaHistory = (message, parsed, tenant) => {
    try {
      const history = JSON.parse(
        localStorage.getItem(MPESA_HISTORY_KEY) || "[]",
      );
      const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        message: message,
        parsed: parsed,
        tenant: tenant,
        property: activeProperty?.name,
      };
      history.unshift(entry);
      // Keep only last 50 entries
      const trimmed = history.slice(0, 50);
      localStorage.setItem(MPESA_HISTORY_KEY, JSON.stringify(trimmed));
      setMpesaHistory(trimmed);
    } catch (error) {
      console.error("Error saving M-Pesa history:", error);
    }
  };

  const clearMpesaHistory = () => {
    localStorage.removeItem(MPESA_HISTORY_KEY);
    setMpesaHistory([]);
    message.success("History cleared");
  };

  const loadMessageFromHistory = (entry) => {
    setMpesaMessage(entry.message);
    setParsedData(entry.parsed);
    if (entry.tenant) {
      setSelectedTenantId(entry.tenant.id);
      setMatchedTenants([entry.tenant]);
    }
    message.success("Message loaded from history");
  };

  useEffect(() => {
    checkReadingPeriod();
    if (currentPropertyId) {
      fetchData();
    }
  }, [currentPropertyId]);

  useEffect(() => {
    // Update stats when readings change
    const total = readings.length;
    const totalUnits = readings.reduce((sum, r) => sum + (r.unitsUsed || 0), 0);
    const totalAmount = readings.reduce((sum, r) => sum + (r.amount || 0), 0);
    const today = new Date().toISOString().split("T")[0];
    const todayReadings = readings.filter(
      (r) => r.readingDate === today,
    ).length;
    setStats({ totalReadings: total, totalUnits, totalAmount, todayReadings });
  }, [readings]);

  const checkReadingPeriod = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();

    // Reading period: 25th - 30th of each month
    if (day >= 25 && day <= 30) {
      setIsReadingPeriod(true);
      const endDate = new Date(year, month, 30);
      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      setReadingPeriodMessage(
        `📅 ${daysLeft} days left to submit readings (25th-30th)`,
      );
    } else if (day === 31) {
      setIsReadingPeriod(true);
      setReadingPeriodMessage("📅 Last day to submit readings!");
    } else {
      setIsReadingPeriod(false);
      const startDate = new Date(year, month, 25);
      const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
      if (day < 25) {
        setReadingPeriodMessage(
          `⏳ Reading period starts in ${daysUntil} days (25th-30th)`,
        );
      } else {
        setReadingPeriodMessage(
          "📅 Reading period ended. Next readings start on the 25th",
        );
      }
    }
  };

  const fetchData = async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    try {
      const [tenantsRes, readingsRes] = await Promise.all([
        getTenants({ property_id: currentPropertyId }),
        getWaterReadings({ property_id: currentPropertyId }),
      ]);
      setTenants(tenantsRes.data || []);
      const readingsList = readingsRes.data || [];
      setReadings(readingsList);
      setRecentReadings(readingsList.slice(0, 10));
    } catch (error) {
      console.error("Error fetching data:", error);
      message.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLastReading = async (tenantId) => {
    try {
      const response = await getWaterReadings({ tenant_id: tenantId });
      const readingsList = response.data || [];
      if (readingsList.length > 0) {
        const sorted = [...readingsList].sort(
          (a, b) => new Date(b.readingDate) - new Date(a.readingDate),
        );
        const last = sorted[0];
        setLastReading(last);
        const previousValue = parseFloat(last.currentReading) || 0;
        form.setFieldsValue({ previousReading: previousValue });
        return previousValue;
      } else {
        setLastReading(null);
        form.setFieldsValue({ previousReading: 0 });
        return 0;
      }
    } catch (error) {
      console.error("Error fetching last reading:", error);
      setLastReading(null);
      form.setFieldsValue({ previousReading: 0 });
      return 0;
    }
  };

  const handleTenantSelect = (tenantId) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    setCurrentTenant(tenant);
    form.setFieldValue("tenantName", tenant?.name);
    form.setFieldsValue({ previousReading: 0, currentReading: undefined });
    if (tenantId) {
      fetchLastReading(tenantId);
    }
  };

  // Direct submit - no queue
  const handleSubmitReading = async () => {
    if (!currentTenant) {
      message.warning("Please select a tenant first");
      return;
    }

    // Check reading period
    if (!isReadingPeriod) {
      Modal.warning({
        title: "⏳ Reading Period Closed",
        content:
          "Water readings can only be submitted between the 25th and 30th of each month.",
        okText: "OK",
      });
      return;
    }

    try {
      const values = await form.validateFields();

      const previous = parseFloat(values.previousReading) || 0;
      const current = parseFloat(values.currentReading);

      if (isNaN(current) || current === undefined || current === null) {
        message.error("Please enter a valid current reading");
        return;
      }

      const unitsUsed = current - previous;
      const rate = parseFloat(values.rate) || 70;
      const amount = unitsUsed * rate;

      if (unitsUsed < 0) {
        message.error("Current reading must be greater than previous reading");
        return;
      }

      // Confirm submission
      const confirmContent = (
        <div>
          <p>
            <strong>Tenant:</strong> {currentTenant.name}
          </p>
          <p>
            <strong>House:</strong> {currentTenant.houseNo || "N/A"}
          </p>
          <p>
            <strong>Previous:</strong> {previous} → <strong>Current:</strong>{" "}
            {current}
          </p>
          <p>
            <strong>Units Used:</strong> {unitsUsed} units
          </p>
          <p>
            <strong>Amount:</strong> KSh {amount.toLocaleString()}
          </p>
        </div>
      );

      if (unitsUsed > 100) {
        Modal.confirm({
          title: "⚠️ High Consumption Detected",
          content: (
            <div>
              {confirmContent}
              <p style={{ color: "#ff4d4f", marginTop: 8 }}>
                ⚠️ This tenant is using {unitsUsed} units which is unusually
                high.
              </p>
            </div>
          ),
          okText: "Yes, Submit",
          cancelText: "Cancel",
          onOk: () =>
            submitReading(
              currentTenant,
              previous,
              current,
              unitsUsed,
              rate,
              amount,
              values,
            ),
        });
      } else {
        Modal.confirm({
          title: "Confirm Reading Submission",
          content: confirmContent,
          okText: "Submit",
          cancelText: "Cancel",
          onOk: () =>
            submitReading(
              currentTenant,
              previous,
              current,
              unitsUsed,
              rate,
              amount,
              values,
            ),
        });
      }
    } catch (error) {
      console.error("Form validation error:", error);
    }
  };

  const submitReading = async (
    tenant,
    previous,
    current,
    unitsUsed,
    rate,
    amount,
    values,
  ) => {
    setSubmitting(true);
    try {
      const readingData = {
        tenant_id: tenant.id,
        previous_reading: previous,
        current_reading: current,
        reading_date: new Date().toISOString().split("T")[0],
        rate: rate,
        notes: values.notes || `Units: ${unitsUsed}, Amount: ${amount}`,
      };

      const response = await submitWaterReading(readingData);

      if (response.data) {
        message.success(`✅ Reading submitted for ${tenant.name}`);
        form.resetFields();
        setCurrentTenant(null);
        setLastReading(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error submitting reading:", error);
      message.error(error.response?.data?.error || "Failed to submit reading");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // M-PESA PAYMENT PARSER
  // ============================================================

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
        // Auto-match tenant
        await handleMatchTenant(data);
        setCurrentStep(2);
      } else {
        message.warning(
          "Could not parse amount from message. Please check the format.",
        );
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
    try {
      // First try to match automatically
      const response = await matchPayment({
        amount: data.amount,
        phone: data.phone,
        sender: data.sender,
      });

      let matches = response.data.matched_tenants || [];

      // If no matches, show all tenants for manual selection
      if (matches.length === 0) {
        // Show all active tenants for manual selection
        matches = tenants
          .filter((t) => t.status === "active")
          .map((t) => ({
            ...t,
            match_score: 0,
            house_no: t.houseNo,
            balance: t.balance || 0,
          }));
      }

      // Filter by current property
      const propertyMatches = matches.filter(
        (t) => t.property_id === currentPropertyId,
      );

      setMatchedTenants(propertyMatches.length > 0 ? propertyMatches : matches);
      setCurrentStep(2);

      if (propertyMatches.length === 1) {
        message.success("✅ Tenant matched automatically!");
        setSelectedTenantId(propertyMatches[0].id);
      } else if (propertyMatches.length > 1) {
        message.info(
          `👥 ${propertyMatches.length} tenants matched, please select one`,
        );
      } else {
        message.info("👤 Please select a tenant from the list below");
      }
    } catch (error) {
      console.error("Error matching tenant:", error);
      // Show all tenants for manual selection
      const allTenants = tenants
        .filter((t) => t.status === "active")
        .map((t) => ({
          ...t,
          match_score: 0,
          house_no: t.houseNo,
          balance: t.balance || 0,
        }));
      setMatchedTenants(allTenants);
      setCurrentStep(2);
      message.info("👤 Please select a tenant from the list");
    }
  };

  const handleConfirmPayment = async (tenantId) => {
    if (!tenantId && !selectedTenantId) {
      message.warning("Please select a tenant");
      return;
    }

    const finalTenantId = tenantId || selectedTenantId;
    if (!finalTenantId) {
      message.warning("No tenant selected");
      return;
    }

    // Get the selected tenant details
    const selectedTenant = matchedTenants.find((t) => t.id === finalTenantId);
    if (!selectedTenant) {
      message.error("Selected tenant not found");
      return;
    }

    setConfirmLoading(true);
    try {
      const paymentData = {
        tenant_id: finalTenantId,
        amount: parsedData.amount,
        payment_method: "mpesa",
        mpesa_code:
          parsedData.mpesa_code ||
          parsedData.till_number ||
          `MPESA-${Date.now()}`,
        payment_for_month: dayjs().format("YYYY-MM-DD"),
        notes: `M-Pesa payment from ${parsedData.sender || "Unknown"}\n${mpesaMessage.substring(0, 500)}`,
      };

      const response = await confirmPayment(paymentData);

      // Save to history
      saveMpesaHistory(mpesaMessage, parsedData, selectedTenant);

      message.success(
        `✅ Payment of KSh ${parsedData.amount.toLocaleString()} confirmed for ${selectedTenant.name}!`,
      );
      setCurrentStep(3);

      // Reset after 3 seconds
      setTimeout(() => {
        setMpesaMessage("");
        setParsedData(null);
        setMatchedTenants([]);
        setSelectedTenantId(null);
        setCurrentStep(0);
        fetchData();
      }, 3000);
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

  if (!currentPropertyId) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
        <h2>Please select a property</h2>
        <p style={{ color: "#8c8c8c" }}>
          Use the property selector to get started
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 768, margin: "0 auto", padding: "16px" }}>
      {/* Reading Period Banner */}
      <Card
        style={{
          marginBottom: 16,
          background: isReadingPeriod ? "#f6ffed" : "#fffbe6",
          borderColor: isReadingPeriod ? "#b7eb8f" : "#ffe58f",
          borderRadius: 12,
        }}
        bodyStyle={{ padding: "12px 16px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isReadingPeriod ? (
            <CheckOutlined style={{ color: "#52c41a", fontSize: 18 }} />
          ) : (
            <ClockCircleOutlined style={{ color: "#faad14", fontSize: 18 }} />
          )}
          <Text strong>{readingPeriodMessage}</Text>
        </div>
      </Card>

      {/* Property Header */}
      <Card
        style={{
          marginBottom: 16,
          background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
          color: "white",
          borderRadius: 12,
        }}
        bodyStyle={{ padding: "16px" }}
      >
        <div>
          <h3 style={{ color: "white", margin: 0, fontSize: 18 }}>
            <HomeOutlined style={{ marginRight: 8 }} />
            {activeProperty?.name || "No Property Selected"}
          </h3>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
            {activeProperty?.address || ""}
            {activeProperty?.city ? ` • ${activeProperty.city}` : ""}
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: "12px" }}>
            <Statistic
              title="Today's Readings"
              value={stats.todayReadings}
              prefix={<ScheduleOutlined />}
              valueStyle={{ fontSize: 20, color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: "12px" }}>
            <Statistic
              title="Total Units"
              value={stats.totalUnits}
              suffix="units"
              valueStyle={{ fontSize: 20, color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: "12px" }}>
            <Statistic
              title="Total Readings"
              value={stats.totalReadings}
              prefix={<UserOutlined />}
              valueStyle={{ fontSize: 20, color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: "12px" }}>
            <Statistic
              title="Total Amount"
              value={stats.totalAmount}
              prefix={<DollarOutlined />}
              formatter={(value) => `KSh ${(value || 0).toLocaleString()}`}
              valueStyle={{ fontSize: 20, color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="readings"
        size="large"
        style={{ marginBottom: 16 }}
      >
        {/* Readings Tab */}
        <TabPane
          tab={
            <span>
              <ScheduleOutlined />
              Readings
            </span>
          }
          key="readings"
        >
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: "12px" }}>
            <Alert
              message={
                isReadingPeriod
                  ? "✅ Reading period is open (25th-30th)"
                  : "⏳ Reading period is closed (25th-30th only)"
              }
              type={isReadingPeriod ? "success" : "warning"}
              showIcon
              style={{ marginBottom: 12 }}
            />

            <Form form={form} layout="vertical">
              <Form.Item style={{ marginBottom: 8 }}>
                <Select
                  placeholder="Select Tenant"
                  style={{ width: "100%" }}
                  showSearch
                  optionFilterProp="children"
                  value={currentTenant?.id}
                  onChange={handleTenantSelect}
                  size="large"
                  loading={loading}
                >
                  {tenants.map((tenant) => (
                    <Option key={tenant.id} value={tenant.id}>
                      {tenant.name} - {tenant.houseNo || "N/A"}
                      {tenant.status === "vacated" && (
                        <Tag color="red" style={{ marginLeft: 8 }}>
                          Vacated
                        </Tag>
                      )}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {lastReading && (
                <Alert
                  message={`📖 Last: ${lastReading.currentReading || 0} (${formatDate(lastReading.readingDate)})`}
                  type="info"
                  showIcon
                  style={{ marginBottom: 8 }}
                />
              )}

              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item style={{ marginBottom: 8 }}>
                    <Input
                      type="number"
                      placeholder="Previous (auto)"
                      size="large"
                      prefix={<HistoryOutlined />}
                      disabled
                      value={form.getFieldValue("previousReading") || 0}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item style={{ marginBottom: 8 }}>
                    <Input
                      type="number"
                      placeholder="Current Reading"
                      size="large"
                      prefix={<HomeOutlined />}
                      disabled={!isReadingPeriod}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSubmitReading}
                loading={submitting}
                size="large"
                block
                disabled={!isReadingPeriod || !currentTenant}
              >
                {isReadingPeriod ? "Submit Reading" : "Reading Period Closed"}
              </Button>

              {!isReadingPeriod && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#8c8c8c",
                    textAlign: "center",
                  }}
                >
                  ⏳ Readings can only be submitted between 25th-30th of each
                  month
                </div>
              )}
            </Form>
          </Card>

          {/* Recent Readings */}
          <Card
            style={{ marginTop: 12, borderRadius: 12 }}
            bodyStyle={{ padding: "12px" }}
            title={
              <Space>
                <HistoryOutlined />
                Recent Readings
                <Tag color="blue">{recentReadings.length} records</Tag>
              </Space>
            }
          >
            {recentReadings.length === 0 ? (
              <Empty description="No readings found" />
            ) : (
              <List
                size="small"
                dataSource={recentReadings}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar size="small">
                          {item.tenantName?.[0] || "T"}
                        </Avatar>
                      }
                      title={item.tenantName || "Unknown"}
                      description={
                        <Space>
                          <Tag color="blue">{item.houseNo || "N/A"}</Tag>
                          <span>{item.unitsUsed || 0} units</span>
                          <span style={{ color: "#52c41a" }}>
                            KSh {(item.amount || 0).toLocaleString()}
                          </span>
                        </Space>
                      }
                    />
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                      {formatDate(item.readingDate)}
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </TabPane>

        {/* M-Pesa Tab */}
        <TabPane
          tab={
            <span>
              <MobileOutlined />
              M-Pesa
            </span>
          }
          key="mpesa"
        >
          <Card
            style={{ borderRadius: 12 }}
            bodyStyle={{ padding: "12px" }}
            title="📱 M-Pesa Payment"
            extra={
              <Button
                size="small"
                onClick={() => setShowHistory(!showHistory)}
                icon={<HistoryOutlined />}
              >
                History
              </Button>
            }
          >
            <Alert
              message="How it works"
              description={
                <div>
                  <p>1. Select a tenant from the dropdown (or auto-match)</p>
                  <p>2. Paste the M-Pesa SMS message</p>
                  <p>3. Click "Parse Message" to auto-fill details</p>
                  <p>4. Confirm the payment</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
            />

            {/* Step 1: Select Tenant */}
            <div style={{ marginBottom: 12 }}>
              <Select
                placeholder="Select a tenant (optional - auto-match works too)"
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="children"
                value={selectedTenantId}
                onChange={(value) => {
                  setSelectedTenantId(value);
                  const tenant = tenants.find((t) => t.id === value);
                  if (tenant) {
                    setMatchedTenants([
                      { ...tenant, match_score: 100, house_no: tenant.houseNo },
                    ]);
                  }
                }}
                size="large"
                allowClear
              >
                {tenants
                  .filter((t) => t.status === "active")
                  .map((tenant) => (
                    <Option key={tenant.id} value={tenant.id}>
                      {tenant.name} - {tenant.houseNo || "N/A"}
                    </Option>
                  ))}
              </Select>
            </div>

            {/* Step 2: Paste Message */}
            <TextArea
              rows={3}
              placeholder={`📋 Paste M-Pesa SMS here...

Example:
Confirmed. KSh 15,000 received from JOHN MWANGI on 1/7/2026 at 10:30 AM.
Paybill: 123456, Account: RENT-001. Code: THG2JK9A1M.`}
              value={mpesaMessage}
              onChange={(e) => setMpesaMessage(e.target.value)}
              style={{ marginBottom: 12, fontSize: 14 }}
            />

            <Row gutter={8}>
              <Col span={12}>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleParseMpesa}
                  loading={parsingLoading}
                  block
                  size="large"
                  disabled={!mpesaMessage.trim()}
                >
                  🔍 Parse Message
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  icon={<ClearOutlined />}
                  onClick={() => {
                    setMpesaMessage("");
                    setParsedData(null);
                    setMatchedTenants([]);
                    setSelectedTenantId(null);
                    setCurrentStep(0);
                  }}
                  block
                  size="large"
                  disabled={!mpesaMessage.trim() && !parsedData}
                >
                  Clear
                </Button>
              </Col>
            </Row>

            {/* Parsed Data */}
            {parsedData && (
              <Card
                size="small"
                style={{
                  marginTop: 12,
                  background: "#f6ffed",
                  borderColor: "#b7eb8f",
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#8c8c8c" }}>Amount</span>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#52c41a",
                      }}
                    >
                      KSh {parsedData.amount?.toLocaleString()}
                    </span>
                  </div>
                  <Divider style={{ margin: 4 }} />
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ color: "#8c8c8c" }}>Sender</span>
                    <span style={{ fontWeight: 500 }}>
                      {parsedData.sender || "Unknown"}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ color: "#8c8c8c" }}>M-Pesa Code</span>
                    <Tag color="blue">{parsedData.mpesa_code || "N/A"}</Tag>
                  </div>
                  {parsedData.till_number && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#8c8c8c" }}>Till Number</span>
                      <Tag color="purple">{parsedData.till_number}</Tag>
                    </div>
                  )}
                  {parsedData.phone && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#8c8c8c" }}>Phone</span>
                      <span>{parsedData.phone}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Matched Tenants */}
            {matchedTenants.length > 0 && parsedData && (
              <Card
                style={{ marginTop: 12 }}
                size="small"
                title="👥 Select Tenant to Confirm"
              >
                <List
                  size="small"
                  dataSource={matchedTenants}
                  renderItem={(tenant) => (
                    <List.Item
                      actions={[
                        <Button
                          type="primary"
                          size="small"
                          loading={
                            confirmLoading && selectedTenantId === tenant.id
                          }
                          onClick={() => {
                            setSelectedTenantId(tenant.id);
                            handleConfirmPayment(tenant.id);
                          }}
                          icon={<CheckOutlined />}
                        >
                          Confirm
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar size="small">{tenant.name?.[0]}</Avatar>
                        }
                        title={
                          <Space>
                            <strong>{tenant.name}</strong>
                            {tenant.match_score > 0 && (
                              <Tag color="green">
                                {tenant.match_score}% match
                              </Tag>
                            )}
                          </Space>
                        }
                        description={
                          <Space size={4}>
                            <span>🏠 {tenant.house_no || "N/A"}</span>
                            <span>|</span>
                            <span style={{ color: "#52c41a" }}>
                              💰 Balance: {formatCurrency(tenant.balance || 0)}
                            </span>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {parsedData && matchedTenants.length === 0 && !parsingLoading && (
              <Alert
                message="❌ No tenants found"
                description={
                  <div>
                    <p>Could not match this payment to any tenant.</p>
                    <p>
                      Select a tenant from the dropdown above and try again.
                    </p>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginTop: 12 }}
              />
            )}

            {currentStep === 3 && (
              <Result
                status="success"
                title="✅ Payment Confirmed!"
                subTitle={`Amount: ${formatCurrency(parsedData?.amount)} recorded for ${matchedTenants.find((t) => t.id === selectedTenantId)?.name}`}
                style={{ marginTop: 12 }}
              />
            )}

            {/* History */}
            {showHistory && (
              <Collapse style={{ marginTop: 12 }} defaultActiveKey={[]}>
                <Panel
                  header={
                    <Space>
                      <HistoryOutlined />
                      Message History ({mpesaHistory.length})
                      <Button
                        size="small"
                        danger
                        onClick={(e) => {
                          e.stopPropagation();
                          clearMpesaHistory();
                        }}
                      >
                        Clear All
                      </Button>
                    </Space>
                  }
                  key="history"
                >
                  {mpesaHistory.length === 0 ? (
                    <Empty description="No history yet" />
                  ) : (
                    <List
                      size="small"
                      dataSource={mpesaHistory}
                      renderItem={(entry) => (
                        <List.Item
                          actions={[
                            <Button
                              size="small"
                              onClick={() => loadMessageFromHistory(entry)}
                            >
                              Load
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            title={
                              <Space>
                                <span>
                                  {formatCurrency(entry.parsed?.amount)}
                                </span>
                                <Tag color="blue">
                                  {entry.tenant?.name || "Unknown"}
                                </Tag>
                                <span
                                  style={{ fontSize: 12, color: "#8c8c8c" }}
                                >
                                  {formatDate(entry.date)}
                                </span>
                              </Space>
                            }
                            description={
                              <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                                {entry.message?.substring(0, 100)}...
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Panel>
              </Collapse>
            )}
          </Card>
        </TabPane>

        {/* Recent Tab */}
        <TabPane
          tab={
            <span>
              <HistoryOutlined />
              Recent
            </span>
          }
          key="recent"
        >
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: "12px" }}>
            {recentReadings.length === 0 ? (
              <Empty description="No recent readings" />
            ) : (
              <List
                size="small"
                dataSource={recentReadings}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar size="small">
                          {item.tenantName?.[0] || "T"}
                        </Avatar>
                      }
                      title={item.tenantName || "Unknown"}
                      description={
                        <Space>
                          <Tag color="blue">{item.houseNo || "N/A"}</Tag>
                          <span>{item.unitsUsed || 0} units</span>
                          <span style={{ color: "#52c41a" }}>
                            KSh {(item.amount || 0).toLocaleString()}
                          </span>
                        </Space>
                      }
                    />
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                      {formatDate(item.readingDate)}
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </TabPane>
      </Tabs>

      {/* Floating Action Button */}
      <Button
        icon={<ReloadOutlined />}
        shape="circle"
        size="large"
        onClick={fetchData}
        loading={loading}
        style={{
          position: "fixed",
          bottom: 80,
          right: 16,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          backgroundColor: "#1890ff",
          color: "white",
          zIndex: 999,
        }}
      />
    </div>
  );
};

export default MobileDashboard;
