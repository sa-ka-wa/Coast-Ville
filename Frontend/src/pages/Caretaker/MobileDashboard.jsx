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
  DatePicker,
  Progress,
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
} from "@ant-design/icons";
import { useProperty } from "../../context/PropertyContext";
import { getTenants } from "../../services/tenants";
import { submitWaterReading, getWaterReadings } from "../../services/water";
import {
  parseMpesaMessage,
  matchPayment,
  confirmPayment,
} from "../../services/payments";
import { formatCurrency, formatDate } from "../../utils/formatters";
import dayjs from "dayjs";

const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const MobileDashboard = () => {
  const { activeProperty } = useProperty();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [readings, setReadings] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
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
  const [mpesaModalVisible, setMpesaModalVisible] = useState(false);
  const [mpesaMessage, setMpesaMessage] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [matchedTenants, setMatchedTenants] = useState([]);
  const [parsingLoading, setParsingLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const currentPropertyId = activeProperty?.id;

  useEffect(() => {
    if (currentPropertyId) {
      fetchData();
    }
  }, [currentPropertyId]);

  useEffect(() => {
    const total = readings.length;
    const totalUnits = readings.reduce((sum, r) => sum + (r.unitsUsed || 0), 0);
    const totalAmount = readings.reduce((sum, r) => sum + (r.amount || 0), 0);
    const today = new Date().toISOString().split("T")[0];
    const todayReadings = readings.filter(
      (r) => r.readingDate === today,
    ).length;
    setStats({ total, totalUnits, totalAmount, todayReadings });
  }, [readings]);

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

  const handleAddReading = () => {
    if (!currentTenant) {
      message.warning("Please select a tenant first");
      return;
    }

    form.validateFields().then((values) => {
      const previous = parseFloat(values.previousReading);
      const current = parseFloat(values.currentReading);
      const unitsUsed = current - previous;
      const rate = values.rate || 70;
      const amount = unitsUsed * rate;

      if (unitsUsed < 0) {
        message.error("Current reading must be greater than previous reading");
        return;
      }

      const newReading = {
        id: Date.now(),
        tenantId: currentTenant.id,
        tenantName: currentTenant.name,
        houseNo: currentTenant.houseNo,
        previousReading: previous,
        currentReading: current,
        unitsUsed: unitsUsed,
        rate: rate,
        amount: amount,
        readingDate: new Date().toISOString().split("T")[0],
        notes: values.notes || "",
        status: "pending",
      };

      setReadings([newReading, ...readings]);
      form.resetFields();
      setCurrentTenant(null);
      message.success(`✅ Reading added for ${currentTenant.name}`);
    });
  };

  const handleRemoveReading = (id) => {
    setReadings(readings.filter((r) => r.id !== id));
  };

  const handleSubmitAll = async () => {
    if (readings.length === 0) {
      message.warning("No readings to submit");
      return;
    }

    setSubmitting(true);
    try {
      const submitted = [];
      const errors = [];

      for (const reading of readings) {
        try {
          await submitWaterReading({
            tenantId: reading.tenantId,
            previousReading: reading.previousReading,
            currentReading: reading.currentReading,
            readingDate: reading.readingDate,
            notes: reading.notes || "Mobile entry",
          });
          submitted.push(reading.tenantName);
        } catch (error) {
          errors.push(`${reading.tenantName}: ${error.message}`);
        }
      }

      if (submitted.length > 0) {
        message.success(`✅ Submitted ${submitted.length} readings`);
      }
      if (errors.length > 0) {
        message.error(`❌ Failed: ${errors.join("; ")}`);
      }

      setReadings([]);
      fetchData();
    } catch (error) {
      console.error("Error submitting readings:", error);
      message.error("Failed to submit readings");
    } finally {
      setSubmitting(false);
    }
  };

  // M-Pesa Parser
  const handleParseMpesa = async () => {
    if (!mpesaMessage.trim()) {
      message.warning("Please paste the M-Pesa message");
      return;
    }

    setParsingLoading(true);
    try {
      const response = await parseMpesaMessage({ message: mpesaMessage });
      const data = response.data;
      setParsedData(data);

      if (data.amount) {
        message.success(
          `💰 Parsed amount: KSh ${data.amount.toLocaleString()}`,
        );
        // Auto-match tenant
        const matchResponse = await matchPayment({
          amount: data.amount,
          phone: data.phone,
        });
        const matches = matchResponse.data.matched_tenants || [];
        const propertyMatches = matches.filter(
          (t) => t.property_id === currentPropertyId,
        );
        setMatchedTenants(
          propertyMatches.length > 0 ? propertyMatches : matches,
        );
        setCurrentStep(2);
      } else {
        message.warning("Could not parse amount from message");
      }
    } catch (error) {
      console.error("Error parsing M-Pesa message:", error);
      message.error("Failed to parse M-Pesa message");
    } finally {
      setParsingLoading(false);
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
        notes: `M-Pesa payment from ${parsedData.sender || "Unknown"}`,
      };

      await confirmPayment(paymentData);
      message.success("✅ Payment confirmed successfully!");
      setMpesaModalVisible(false);
      setMpesaMessage("");
      setParsedData(null);
      setMatchedTenants([]);
      setCurrentStep(0);
      fetchData();
    } catch (error) {
      console.error("Error confirming payment:", error);
      message.error(
        error.response?.data?.message || "Failed to confirm payment",
      );
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
              value={stats.total}
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
              formatter={(value) => `KSh ${value.toLocaleString()}`}
              valueStyle={{ fontSize: 20, color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Tabs
        defaultActiveKey="readings"
        size="large"
        style={{ marginBottom: 16 }}
      >
        <TabPane
          tab={
            <span>
              <ScheduleOutlined />
              Readings
            </span>
          }
          key="readings"
        >
          {/* Quick Entry Form */}
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: "12px" }}>
            <Form form={form} layout="vertical">
              <Form.Item style={{ marginBottom: 8 }}>
                <Select
                  placeholder="Select Tenant"
                  style={{ width: "100%" }}
                  showSearch
                  optionFilterProp="children"
                  value={currentTenant?.id}
                  onChange={(value) => {
                    const tenant = tenants.find((t) => t.id === value);
                    setCurrentTenant(tenant);
                  }}
                  size="large"
                >
                  {tenants.map((tenant) => (
                    <Option key={tenant.id} value={tenant.id}>
                      {tenant.name} - {tenant.houseNo || "N/A"}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item style={{ marginBottom: 8 }}>
                    <Input
                      type="number"
                      placeholder="Previous"
                      size="large"
                      prefix={<HomeOutlined />}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item style={{ marginBottom: 8 }}>
                    <Input
                      type="number"
                      placeholder="Current"
                      size="large"
                      prefix={<HomeOutlined />}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddReading}
                size="large"
                block
              >
                Add Reading
              </Button>

              {currentTenant && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
                  📝 {currentTenant.name} ({currentTenant.houseNo || "N/A"})
                </div>
              )}
            </Form>
          </Card>

          {/* Readings Queue */}
          {readings.length > 0 && (
            <Card
              style={{ marginTop: 12, borderRadius: 12 }}
              bodyStyle={{ padding: "12px" }}
              title={
                <Space>
                  📋 Queue
                  <Tag color="blue">{readings.length}</Tag>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={handleSubmitAll}
                  loading={submitting}
                >
                  Submit All
                </Button>
              }
            >
              <List
                size="small"
                dataSource={readings.slice(0, 5)}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        icon={<DeleteOutlined />}
                        size="small"
                        danger
                        onClick={() => handleRemoveReading(item.id)}
                      />,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar size="small">{item.tenantName[0]}</Avatar>
                      }
                      title={item.tenantName}
                      description={`${item.unitsUsed} units • KSh ${item.amount.toLocaleString()}`}
                    />
                  </List.Item>
                )}
              />
              {readings.length > 5 && (
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    color: "#8c8c8c",
                  }}
                >
                  +{readings.length - 5} more readings
                </div>
              )}
            </Card>
          )}
        </TabPane>

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
          >
            <Alert
              message="Paste SMS Message"
              description="Copy and paste the M-Pesa SMS to auto-fill payment details"
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
            />

            <TextArea
              rows={3}
              placeholder="Paste M-Pesa SMS here..."
              value={mpesaMessage}
              onChange={(e) => setMpesaMessage(e.target.value)}
              style={{ marginBottom: 12 }}
            />

            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleParseMpesa}
              loading={parsingLoading}
              block
              size="large"
              disabled={!mpesaMessage.trim()}
            >
              Parse Message
            </Button>

            {parsedData && (
              <Card
                size="small"
                style={{ marginTop: 12, background: "#f6ffed" }}
              >
                <Row gutter={8}>
                  <Col span={12}>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>Amount</div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#52c41a",
                      }}
                    >
                      KSh {parsedData.amount?.toLocaleString()}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>Sender</div>
                    <div style={{ fontWeight: 600 }}>
                      {parsedData.sender || "Unknown"}
                    </div>
                  </Col>
                </Row>
                {matchedTenants.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Divider style={{ margin: "8px 0" }} />
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                      Matched Tenants:
                    </div>
                    {matchedTenants.slice(0, 3).map((tenant) => (
                      <div
                        key={tenant.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "4px 0",
                        }}
                      >
                        <span>
                          {tenant.name} ({tenant.house_no || "N/A"})
                        </span>
                        <Button
                          size="small"
                          type="primary"
                          loading={confirmLoading}
                          onClick={() => handleConfirmMpesaPayment(tenant.id)}
                        >
                          Confirm
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <HomeOutlined />
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

      {/* Floating Action Button for Refresh */}
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
