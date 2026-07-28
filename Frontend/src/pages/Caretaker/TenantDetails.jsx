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
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  DownloadOutlined,
  PrinterOutlined,
  WhatsAppOutlined,
  EyeOutlined,
  WalletOutlined,
  ScheduleOutlined,
  PercentageOutlined,
  HistoryOutlined,
  PieChartOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import {
  getTenant,
  getTenantPayments,
  getTenantWaterReadings,
  getTenantWaterBills,
  getTenantStats,
} from "../../services/tenants";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "../../utils/formatters";
import { getPaymentAllocation } from "../../services/payments";

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const TenantDetails = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [waterReadings, setWaterReadings] = useState([]);
  const [waterBills, setWaterBills] = useState([]);
  const [stats, setStats] = useState(null);
  const [paymentAllocations, setPaymentAllocations] = useState({});
  const [loadingAllocations, setLoadingAllocations] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);

  const [summary, setSummary] = useState({
    totalPaid: 0,
    expectedRent: 0,
    balance: 0,
    latePayments: 0,
    onTimePayments: 0,
    paymentRate: 0,
    totalDeposit: 0,
    totalRent: 0,
    totalWater: 0,
    totalExcess: 0,
    totalBalanceDue: 0,
  });

  useEffect(() => {
    fetchTenantData();
  }, [id]);

  const fetchTenantData = async () => {
    setLoading(true);
    try {
      const [tenantRes, paymentsRes, waterRes, waterBillsRes, statsRes] =
        await Promise.all([
          getTenant(id),
          getTenantPayments(id),
          getTenantWaterReadings(id),
          getTenantWaterBills(id),
          getTenantStats(id),
        ]);

      setTenant(tenantRes.data);
      const paymentsList = paymentsRes.data || [];
      setPayments(paymentsList);
      setWaterReadings(waterRes.data || []);
      setWaterBills(waterBillsRes.data || []);
      setStats(statsRes.data);

      await fetchAllocations(paymentsList);
      calculateSummary(paymentsList);
    } catch (error) {
      message.error("Failed to fetch tenant data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async (paymentsList) => {
    setLoadingAllocations(true);
    const allocations = {};
    for (const payment of paymentsList) {
      try {
        const response = await getPaymentAllocation(payment.id);
        allocations[payment.id] = response.data.allocations || {};
      } catch (error) {
        console.error(
          `Failed to get allocation for payment ${payment.id}:`,
          error,
        );
      }
    }
    setPaymentAllocations(allocations);
    setLoadingAllocations(false);
  };

  const calculateSummary = (paymentData) => {
    const totalPaid = paymentData.reduce((sum, p) => sum + p.amount, 0);
    const expectedRent = tenant?.monthlyRent || 0;
    const balance = expectedRent - totalPaid;

    const latePayments = paymentData.filter((p) => {
      const day = new Date(p.payment_date).getDate();
      return day > 5;
    }).length;

    const onTimePayments = paymentData.length - latePayments;
    const paymentRate =
      paymentData.length > 0 ? (onTimePayments / paymentData.length) * 100 : 0;

    let totalDeposit = 0;
    let totalRent = 0;
    let totalWater = 0;
    let totalExcess = 0;
    let totalBalanceDue = 0;

    paymentData.forEach((p) => {
      const alloc = paymentAllocations[p.id] || {};
      totalDeposit += alloc.deposit || 0;
      totalRent += alloc.rent || 0;
      totalWater += alloc.water || 0;
      totalExcess += alloc.excess || 0;
      totalBalanceDue += alloc.balance_due || 0;
    });

    setSummary({
      totalPaid,
      expectedRent,
      balance,
      latePayments,
      onTimePayments,
      paymentRate,
      totalDeposit,
      totalRent,
      totalWater,
      totalExcess,
      totalBalanceDue,
    });
  };

  const getPaymentStatus = (payment) => {
    const day = new Date(payment.payment_date).getDate();
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

  // Payment Columns with Allocation Breakdown
  const paymentColumns = [
    {
      title: "Date",
      dataIndex: "payment_date",
      key: "payment_date",
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.payment_date) - new Date(b.payment_date),
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
      title: "Allocation",
      key: "allocation",
      render: (_, record) => {
        const alloc = paymentAllocations[record.id] || {};
        const hasAllocation =
          alloc.rent > 0 || alloc.water > 0 || alloc.deposit > 0;

        if (!hasAllocation) {
          return <Tag color="default">Pending</Tag>;
        }

        return (
          <Space size={4} wrap>
            {alloc.rent > 0 && (
              <Tag color="blue" style={{ margin: 2 }}>
                🏠 {formatCurrency(alloc.rent)}
              </Tag>
            )}
            {alloc.water > 0 && (
              <Tag color="green" style={{ margin: 2 }}>
                💧 {formatCurrency(alloc.water)}
              </Tag>
            )}
            {alloc.deposit > 0 && (
              <Tag color="orange" style={{ margin: 2 }}>
                🏦 {formatCurrency(alloc.deposit)}
              </Tag>
            )}
            {alloc.excess > 0 && (
              <Tag color="cyan" style={{ margin: 2 }}>
                💰 +{formatCurrency(alloc.excess)}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Method",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method) => (
        <Tag color={getPaymentMethodColor(method)}>
          {method?.toUpperCase() || "N/A"}
        </Tag>
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
      dataIndex: "receipt_no",
      key: "receipt_no",
      render: (text) => <Tag color="blue">{text || "N/A"}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View Receipt">
            <Button icon={<EyeOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="View Allocation">
            <Button
              icon={<PieChartOutlined />}
              size="small"
              onClick={() => {
                const alloc = paymentAllocations[record.id] || {};
                Modal.info({
                  title: `Payment Allocation - ${record.receipt_no}`,
                  content: (
                    <div>
                      <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Total Amount">
                          <strong>{formatCurrency(record.amount)}</strong>
                        </Descriptions.Item>
                        {alloc.rent > 0 && (
                          <Descriptions.Item label="🏠 Rent">
                            {formatCurrency(alloc.rent)}
                          </Descriptions.Item>
                        )}
                        {alloc.water > 0 && (
                          <Descriptions.Item label="💧 Water">
                            {formatCurrency(alloc.water)}
                          </Descriptions.Item>
                        )}
                        {alloc.deposit > 0 && (
                          <Descriptions.Item label="🏦 Deposit">
                            {formatCurrency(alloc.deposit)}
                          </Descriptions.Item>
                        )}
                        {alloc.excess > 0 && (
                          <Descriptions.Item label="💰 Credit Next Month">
                            +{formatCurrency(alloc.excess)}
                          </Descriptions.Item>
                        )}
                        {alloc.balance_due > 0 && (
                          <Descriptions.Item label="⚠️ Balance Due">
                            {formatCurrency(alloc.balance_due)}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </div>
                  ),
                  width: 500,
                });
              }}
            />
          </Tooltip>
          <Tooltip title="Download">
            <Button icon={<DownloadOutlined />} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ============================================================
  // PAYMENT SUMMARY TABLE
  // ============================================================

  const getRowStatus = (row) => {
    const totalOwed = (row.rent || 0) + (row.water || 0);
    const totalPaid = row.total_paid || 0;
    const depositPaid = row.deposit > 0;

    if (totalPaid >= totalOwed && depositPaid) {
      return { color: "green", text: "✅ Paid", icon: <CheckCircleOutlined /> };
    } else if (totalPaid > 0 && totalPaid < totalOwed) {
      return {
        color: "orange",
        text: "⚠️ Partial",
        icon: <ExclamationCircleOutlined />,
      };
    } else if (totalPaid === 0) {
      return { color: "red", text: "❌ Unpaid", icon: <CloseCircleOutlined /> };
    } else if (depositPaid) {
      return {
        color: "blue",
        text: "💰 Deposit Only",
        icon: <WalletOutlined />,
      };
    } else {
      return {
        color: "default",
        text: "⏳ Pending",
        icon: <ClockCircleOutlined />,
      };
    }
  };

  const paymentSummaryData = () => {
    const monthlyData = {};

    payments.forEach((p) => {
      const month =
        p.payment_for_month ||
        (p.payment_date ? p.payment_date.substring(0, 7) : "unknown");

      if (!monthlyData[month]) {
        monthlyData[month] = {
          month: month,
          rent: 0,
          water: 0,
          deposit: 0,
          excess: 0,
          balance_due: 0,
          total_paid: 0,
          payment_count: 0,
          receipts: [],
        };
      }

      monthlyData[month].rent += p.rent_amount || 0;
      monthlyData[month].water += p.water_amount || 0;
      monthlyData[month].deposit += p.deposit_amount || 0;
      monthlyData[month].excess += p.excess_amount || 0;
      monthlyData[month].balance_due += p.balance_due || 0;
      monthlyData[month].total_paid += p.amount;
      monthlyData[month].payment_count += 1;
      monthlyData[month].receipts.push(p.receipt_no);
    });

    const sortedData = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({
        ...row,
        monthDisplay:
          row.month !== "unknown"
            ? new Date(row.month + "-01").toLocaleString("default", {
                month: "long",
                year: "numeric",
              })
            : "Unknown",
        status: getRowStatus(row),
      }));

    return sortedData;
  };

  const summaryTotals = () => {
    const data = paymentSummaryData();
    return data.reduce(
      (acc, row) => {
        acc.rent += row.rent || 0;
        acc.water += row.water || 0;
        acc.deposit += row.deposit || 0;
        acc.excess += row.excess || 0;
        acc.balance_due += row.balance_due || 0;
        acc.total_paid += row.total_paid || 0;
        return acc;
      },
      {
        rent: 0,
        water: 0,
        deposit: 0,
        excess: 0,
        balance_due: 0,
        total_paid: 0,
      },
    );
  };

  const summaryColumns = [
    {
      title: "Month",
      dataIndex: "monthDisplay",
      key: "month",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{text}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            {record.payment_count} payment{record.payment_count > 1 ? "s" : ""}
          </div>
        </div>
      ),
      sorter: (a, b) => a.month.localeCompare(b.month),
    },
    {
      title: "🏠 Rent",
      dataIndex: "rent",
      key: "rent",
      render: (value) => (
        <span style={{ color: "#1890ff", fontWeight: 500 }}>
          {formatCurrency(value || 0)}
        </span>
      ),
      sorter: (a, b) => (a.rent || 0) - (b.rent || 0),
    },
    {
      title: "💧 Water",
      dataIndex: "water",
      key: "water",
      render: (value) => (
        <span style={{ color: "#52c41a", fontWeight: 500 }}>
          {formatCurrency(value || 0)}
        </span>
      ),
      sorter: (a, b) => (a.water || 0) - (b.water || 0),
    },
    {
      title: "🏦 Deposit",
      dataIndex: "deposit",
      key: "deposit",
      render: (value) => (
        <span style={{ color: "#faad14", fontWeight: 500 }}>
          {formatCurrency(value || 0)}
        </span>
      ),
      sorter: (a, b) => (a.deposit || 0) - (b.deposit || 0),
    },
    {
      title: "💰 Excess",
      dataIndex: "excess",
      key: "excess",
      render: (value) => (
        <span style={{ color: "#52c41a", fontWeight: 500 }}>
          {value > 0 ? `+${formatCurrency(value)}` : "-"}
        </span>
      ),
      sorter: (a, b) => (a.excess || 0) - (b.excess || 0),
    },
    {
      title: "⚠️ Balance Due",
      dataIndex: "balance_due",
      key: "balance_due",
      render: (value) => (
        <span
          style={{ color: value > 0 ? "#ff4d4f" : "#52c41a", fontWeight: 500 }}
        >
          {formatCurrency(value || 0)}
        </span>
      ),
      sorter: (a, b) => (a.balance_due || 0) - (b.balance_due || 0),
    },
    {
      title: "💰 Total Paid",
      dataIndex: "total_paid",
      key: "total_paid",
      render: (value) => (
        <span style={{ color: "#1890ff", fontWeight: 600 }}>
          {formatCurrency(value || 0)}
        </span>
      ),
      sorter: (a, b) => (a.total_paid || 0) - (b.total_paid || 0),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Tag color={record.status.color} icon={record.status.icon}>
          {record.status.text}
        </Tag>
      ),
    },
  ];

  const totals = summaryTotals();

  // Water Reading Columns
  const waterColumns = [
    {
      title: "Date",
      dataIndex: "reading_date",
      key: "reading_date",
      render: (date) => formatDate(date),
    },
    {
      title: "Previous",
      dataIndex: "previous_reading",
      key: "previous_reading",
      render: (val) => <Tag color="blue">{val || 0}</Tag>,
    },
    {
      title: "Current",
      dataIndex: "current_reading",
      key: "current_reading",
      render: (val) => <Tag color="green">{val || 0}</Tag>,
    },
    {
      title: "Units Used",
      dataIndex: "units_used",
      key: "units_used",
      render: (val) => (
        <span style={{ fontWeight: 600 }}>{val || 0} units</span>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => formatCurrency(amount || 0),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Badge
          color={status === "paid" ? "green" : "orange"}
          text={status === "paid" ? "Paid" : "Pending"}
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
              title="Monthly Rent"
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

      {/* Allocation Breakdown Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderColor: "#1890ff" }}>
            <Statistic
              title="🏠 Rent Paid"
              value={summary.totalRent}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderColor: "#52c41a" }}>
            <Statistic
              title="💧 Water Paid"
              value={summary.totalWater}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderColor: "#faad14" }}>
            <Statistic
              title="🏦 Deposit Paid"
              value={summary.totalDeposit}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            style={{ borderColor: "#52c41a", background: "#f6ffed" }}
          >
            <Statistic
              title="💰 Excess Credit"
              value={summary.totalExcess}
              formatter={(value) => `+${formatCurrency(value)}`}
              valueStyle={{ color: "#52c41a" }}
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
          {/* Tab 1: Payment History */}
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

          {/* Tab 2: Payment Summary */}
          <TabPane
            tab={
              <span>
                <PieChartOutlined />
                Payment Summary
              </span>
            }
            key="summary"
          >
            <Card
              title={
                <Space>
                  <DollarOutlined style={{ color: "#1890ff" }} />
                  <span>Payment Summary</span>
                  <Tag color="blue">{paymentSummaryData().length} months</Tag>
                  <Tag color="green">{tenant.name}</Tag>
                </Space>
              }
              extra={
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchTenantData}
                  loading={loading}
                />
              }
            >
              <Alert
                message="📊 Payment Summary by Month"
                description={`Shows rent, water, deposit, excess, and balance due for each month. Total paid: ${formatCurrency(totals.total_paid)}`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              {/* Summary Cards */}
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card size="small" style={{ background: "#f6ffed" }}>
                    <Statistic
                      title="💰 Total Paid"
                      value={totals.total_paid}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: "#52c41a" }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: "#e6f7ff" }}>
                    <Statistic
                      title="🏠 Rent Paid"
                      value={totals.rent}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: "#1890ff" }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: "#fff7e6" }}>
                    <Statistic
                      title="🏦 Deposit Paid"
                      value={totals.deposit}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: "#faad14" }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: "#fff2f0" }}>
                    <Statistic
                      title="⚠️ Balance Due"
                      value={totals.balance_due}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: "#ff4d4f" }}
                    />
                  </Card>
                </Col>
              </Row>

              <Table
                columns={summaryColumns}
                dataSource={paymentSummaryData()}
                rowKey="month"
                pagination={false}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: "#fafafa" }}>
                      <Table.Summary.Cell index={0}>
                        <strong>TOTALS</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <strong style={{ color: "#1890ff" }}>
                          {formatCurrency(totals.rent)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <strong style={{ color: "#52c41a" }}>
                          {formatCurrency(totals.water)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        <strong style={{ color: "#faad14" }}>
                          {formatCurrency(totals.deposit)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <strong style={{ color: "#52c41a" }}>
                          {formatCurrency(totals.excess)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        <strong style={{ color: "#ff4d4f" }}>
                          {formatCurrency(totals.balance_due)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6}>
                        <strong style={{ color: "#1890ff" }}>
                          {formatCurrency(totals.total_paid)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7}>
                        <strong>---</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />

              {/* Deposit Status */}
              <Divider orientation="left">Deposit Status</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Alert
                    message={
                      tenant?.deposit_paid
                        ? "✅ Deposit Paid"
                        : "⏳ Deposit Not Paid"
                    }
                    description={
                      tenant?.deposit_paid_amount
                        ? `Amount paid: ${formatCurrency(tenant.deposit_paid_amount)}`
                        : "Deposit has not been paid yet"
                    }
                    type={tenant?.deposit_paid ? "success" : "warning"}
                    showIcon
                  />
                </Col>
                <Col span={12}>
                  <Alert
                    message="💰 Payment Summary"
                    description={`Total rent expected: ${formatCurrency(tenant?.monthlyRent || 0)} per month`}
                    type="info"
                    showIcon
                  />
                </Col>
              </Row>
            </Card>
          </TabPane>

          {/* Tab 3: Water Readings */}
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

          {/* Tab 4: Statement */}
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
                    <Descriptions.Item label="Rent Paid">
                      {formatCurrency(summary.totalRent)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Water Paid">
                      {formatCurrency(summary.totalWater)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Deposit Paid">
                      {formatCurrency(summary.totalDeposit)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Excess Credit">
                      {formatCurrency(summary.totalExcess)}
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
