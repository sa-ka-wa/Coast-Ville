// pages/Caretaker/TenantDetails.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Descriptions,
  Badge,
  Timeline,
  Divider,
  Progress,
  Tabs,
  Alert,
  Spin,
  Tooltip,
  DatePicker,
  Select,
  Modal,
  message,
  Avatar,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  DownloadOutlined,
  PrinterOutlined,
  WhatsAppOutlined,
  MailOutlined,
  EyeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  ScheduleOutlined,
  PercentageOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTenant,
  getTenantPayments,
  getTenantWaterReadings,
  getTenantStats,
} from "../../services/tenants";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "../../utils/formatters";

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const TenantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [waterReadings, setWaterReadings] = useState([]);
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState({
    totalPaid: 0,
    expectedRent: 0,
    balance: 0,
    latePayments: 0,
    onTimePayments: 0,
    paymentRate: 0,
  });
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);

  useEffect(() => {
    fetchTenantData();
  }, [id]);

  const fetchTenantData = async () => {
    setLoading(true);
    try {
      const [tenantRes, paymentsRes, waterRes, statsRes] = await Promise.all([
        getTenant(id),
        getTenantPayments(id),
        getTenantWaterReadings(id),
        getTenantStats(id),
      ]);

      setTenant(tenantRes.data);
      setPayments(paymentsRes.data || []);
      setWaterReadings(waterRes.data || []);
      setStats(statsRes.data);
      calculateSummary(paymentsRes.data || []);
    } catch (error) {
      message.error("Failed to fetch tenant data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (paymentData) => {
    const totalPaid = paymentData.reduce((sum, p) => sum + p.amount, 0);
    const expectedRent = tenant?.monthlyRent || 0;
    const balance = expectedRent - totalPaid;

    // Calculate late payments (payment date > 5th of month)
    const latePayments = paymentData.filter((p) => {
      const day = new Date(p.date).getDate();
      return day > 5;
    }).length;

    const onTimePayments = paymentData.length - latePayments;
    const paymentRate =
      paymentData.length > 0 ? (onTimePayments / paymentData.length) * 100 : 0;

    setSummary({
      totalPaid,
      expectedRent,
      balance,
      latePayments,
      onTimePayments,
      paymentRate,
    });
  };

  const getPaymentStatus = (payment) => {
    const day = new Date(payment.date).getDate();
    if (day <= 5)
      return { color: "green", text: "On Time", icon: <CheckCircleOutlined /> };
    if (day <= 15)
      return { color: "orange", text: "Late", icon: <ClockCircleOutlined /> };
    return {
      color: "red",
      text: "Very Late",
      icon: <ExclamationCircleOutlined />,
    };
  };

  const getPaymentMethodColor = (method) => {
    const colors = {
      mpesa: "green",
      cash: "blue",
      bank: "purple",
      cheque: "orange",
    };
    return colors[method] || "default";
  };

  // Payment Columns
  const paymentColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
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
      dataIndex: "method",
      key: "method",
      render: (method) => (
        <Tag color={getPaymentMethodColor(method)}>{method.toUpperCase()}</Tag>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const status = getPaymentStatus(record);
        return <Badge color={status.color} text={status.text} />;
      },
    },
    {
      title: "Receipt",
      dataIndex: "receiptNo",
      key: "receiptNo",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View Receipt">
            <Button icon={<EyeOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="Download">
            <Button icon={<DownloadOutlined />} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Water Reading Columns
  const waterColumns = [
    {
      title: "Date",
      dataIndex: "readingDate",
      key: "readingDate",
      render: (date) => formatDate(date),
    },
    {
      title: "Previous",
      dataIndex: "previousReading",
      key: "previousReading",
      render: (val) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: "Current",
      dataIndex: "currentReading",
      key: "currentReading",
      render: (val) => <Tag color="green">{val}</Tag>,
    },
    {
      title: "Units Used",
      dataIndex: "unitsUsed",
      key: "unitsUsed",
      render: (val) => <span style={{ fontWeight: 600 }}>{val} units</span>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => formatCurrency(amount),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Badge
          color={status === "billed" ? "green" : "orange"}
          text={status === "billed" ? "Billed" : "Pending"}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading tenant details...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <Card>
        <Alert
          message="Tenant Not Found"
          description="The tenant you're looking for doesn't exist."
          type="error"
          showIcon
        />
      </Card>
    );
  }

  return (
    <div>
      {/* Tenant Header */}
      <Card
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
          color: "white",
        }}
      >
        <Row align="middle" gutter={16}>
          <Col>
            <Avatar
              size={80}
              style={{
                backgroundColor:
                  tenant.status === "active" ? "#52c41a" : "#faad14",
                fontSize: 32,
                border: "2px solid white",
              }}
            >
              {tenant.name ? tenant.name.charAt(0).toUpperCase() : "U"}
            </Avatar>
          </Col>
          <Col flex={1}>
            <h2 style={{ color: "white", margin: 0 }}>{tenant.name}</h2>
            <div style={{ color: "rgba(255,255,255,0.9)", marginTop: 4 }}>
              <Space>
                <HomeOutlined /> House: {tenant.houseNo || "N/A"}
                <PhoneOutlined /> {tenant.phone || "N/A"}
                <Badge
                  color={getStatusColor(tenant.status)}
                  text={tenant.status ? tenant.status.toUpperCase() : "UNKNOWN"}
                  style={{ color: "white" }}
                />
              </Space>
            </div>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<WhatsAppOutlined />}
                style={{
                  backgroundColor: "#25D366",
                  color: "white",
                  border: "none",
                }}
              >
                WhatsApp
              </Button>
              <Button
                icon={<PrinterOutlined />}
                style={{ color: "white", borderColor: "white" }}
              >
                Print Report
              </Button>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                style={{ backgroundColor: "#52c41a", border: "none" }}
              >
                Generate Statement
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Paid"
              value={summary.totalPaid}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Expected Rent"
              value={summary.expectedRent}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Balance"
              value={summary.balance}
              prefix={<WalletOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{
                color: summary.balance > 0 ? "#ff4d4f" : "#52c41a",
              }}
            />
            <div style={{ marginTop: 8 }}>
              {summary.balance > 0 ? (
                <Tag color="red" icon={<ExclamationCircleOutlined />}>
                  Overdue
                </Tag>
              ) : (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Paid Up
                </Tag>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Payment Rate"
              value={summary.paymentRate}
              suffix="%"
              prefix={<PercentageOutlined />}
              valueStyle={{
                color:
                  summary.paymentRate >= 80
                    ? "#52c41a"
                    : summary.paymentRate >= 60
                      ? "#faad14"
                      : "#ff4d4f",
              }}
            />
            <Progress
              percent={summary.paymentRate}
              status={summary.paymentRate >= 80 ? "success" : "active"}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Payment Performance */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="Payment Performance">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, color: "#52c41a" }}>
                    {summary.onTimePayments}
                  </div>
                  <div style={{ color: "#8c8c8c" }}>On-Time Payments</div>
                  <Tag color="green">✅ On Time</Tag>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, color: "#faad14" }}>
                    {summary.latePayments}
                  </div>
                  <div style={{ color: "#8c8c8c" }}>Late Payments</div>
                  <Tag color="orange">⏰ Late</Tag>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={12}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, color: "#8c8c8c" }}>
                    {summary.paymentRate >= 80
                      ? "✅ Good standing"
                      : summary.paymentRate >= 60
                        ? "⚠️ Needs improvement"
                        : "❌ Poor standing"}
                  </div>
                  <Progress
                    percent={summary.paymentRate}
                    strokeColor={
                      summary.paymentRate >= 80
                        ? "#52c41a"
                        : summary.paymentRate >= 60
                          ? "#faad14"
                          : "#ff4d4f"
                    }
                    style={{ marginTop: 8 }}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Tabs Section */}
      <Card>
        <Tabs defaultActiveKey="payments">
          <TabPane
            tab={
              <span>
                <HistoryOutlined />
                Payment History
              </span>
            }
            key="payments"
          >
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Select
                  value={paymentFilter}
                  onChange={setPaymentFilter}
                  style={{ width: 150 }}
                  placeholder="Filter by status"
                >
                  <Option value="all">All Payments</Option>
                  <Option value="on-time">On Time</Option>
                  <Option value="late">Late</Option>
                  <Option value="very-late">Very Late</Option>
                </Select>
                <RangePicker onChange={setDateRange} />
                <Button type="primary">Apply Filters</Button>
                <Button icon={<DownloadOutlined />}>Export</Button>
              </Space>
            </div>
            <Table
              columns={paymentColumns}
              dataSource={payments}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total) => `Total ${total} payments`,
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <ScheduleOutlined />
                Water Readings
              </span>
            }
            key="water"
          >
            <Table
              columns={waterColumns}
              dataSource={waterReadings}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total) => `Total ${total} readings`,
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                Statement
              </span>
            }
            key="statement"
          >
            <div style={{ padding: "20px" }}>
              <Alert
                message="Full Statement"
                description="View complete tenant statement including all transactions, balances, and history."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Tenant Name">
                      {tenant.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="House">
                      {tenant.houseNo || "N/A"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Monthly Rent">
                      {formatCurrency(tenant.monthlyRent || 0)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Total Paid">
                      {formatCurrency(summary.totalPaid)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Balance">
                      <span
                        style={{
                          color: summary.balance > 0 ? "#ff4d4f" : "#52c41a",
                        }}
                      >
                        {formatCurrency(summary.balance)}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Payment Rate">
                      {summary.paymentRate}%
                    </Descriptions.Item>
                    <Descriptions.Item label="Late Payments">
                      {summary.latePayments}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Badge
                        color={getStatusColor(tenant.status)}
                        text={
                          tenant.status
                            ? tenant.status.toUpperCase()
                            : "UNKNOWN"
                        }
                      />
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>

              <Divider />

              <div
                style={{ display: "flex", gap: 16, justifyContent: "center" }}
              >
                <Button icon={<DownloadOutlined />} size="large">
                  Download Statement
                </Button>
                <Button icon={<PrinterOutlined />} size="large">
                  Print Statement
                </Button>
                <Button
                  icon={<WhatsAppOutlined />}
                  size="large"
                  style={{
                    backgroundColor: "#25D366",
                    color: "white",
                    border: "none",
                  }}
                >
                  Send Statement
                </Button>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default TenantDetails;
