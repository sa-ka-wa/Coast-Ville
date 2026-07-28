// src/components/MonthlyStatement.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Statistic,
  Row,
  Col,
  Spin,
  Alert,
  Descriptions,
  Divider,
  Space,
  Button,
  Select,
  DatePicker,
  Tabs,
  Badge,
  Tooltip,
  Empty,
} from "antd";
import {
  DollarOutlined,
  HomeOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  PrinterOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  getMonthlyStatement,
  getAllMonthlyStatements,
} from "../services/statements";
import { formatCurrency, formatDate } from "../utils/formatters";
import dayjs from "dayjs";

const { Option } = Select;
const { TabPane } = Tabs;

const MonthlyStatement = ({ tenantId, propertyId, year, month, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [statement, setStatement] = useState(null);
  const [allStatements, setAllStatements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [viewMode, setViewMode] = useState("single"); // single, all
  const [selectedTenant, setSelectedTenant] = useState(tenantId);
  const [selectedMonth, setSelectedMonth] = useState(
    month || dayjs().month() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(year || dayjs().year());

  useEffect(() => {
    if (viewMode === "single" && selectedTenant) {
      fetchSingleStatement();
    } else if (viewMode === "all") {
      fetchAllStatements();
    }
  }, [selectedTenant, selectedMonth, selectedYear, viewMode, propertyId]);

  const fetchSingleStatement = async () => {
    setLoading(true);
    try {
      const response = await getMonthlyStatement(
        selectedTenant,
        selectedYear,
        selectedMonth,
      );
      setStatement(response.data);
    } catch (error) {
      console.error("Error fetching statement:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStatements = async () => {
    setLoading(true);
    try {
      const response = await getAllMonthlyStatements(
        propertyId,
        selectedYear,
        selectedMonth,
      );
      setAllStatements(response.data.statements || []);
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Error fetching all statements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status) => {
    switch (status) {
      case "paid":
        return (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            ✅ Paid
          </Tag>
        );
      case "partial":
        return (
          <Tag color="orange" icon={<ExclamationCircleOutlined />}>
            ⚠️ Partial
          </Tag>
        );
      case "unpaid":
        return (
          <Tag color="red" icon={<CloseCircleOutlined />}>
            ❌ Unpaid
          </Tag>
        );
      default:
        return <Tag color="default">Unknown</Tag>;
    }
  };

  // Columns for all tenants table
  const columns = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_, record) => (
        <Space>
          <HomeOutlined />
          <strong>{record.tenant.name}</strong>
          <Tag color="blue">House {record.tenant.houseNo}</Tag>
        </Space>
      ),
    },
    {
      title: "Rent Due",
      dataIndex: "rent_due",
      key: "rent_due",
      render: (value) => formatCurrency(value),
      sorter: (a, b) => a.rent_due - b.rent_due,
    },
    {
      title: "Water Due",
      dataIndex: "water_due",
      key: "water_due",
      render: (value) => formatCurrency(value),
      sorter: (a, b) => a.water_due - b.water_due,
    },
    {
      title: "Total Due",
      dataIndex: "total_due",
      key: "total_due",
      render: (value) => <strong>{formatCurrency(value)}</strong>,
      sorter: (a, b) => a.total_due - b.total_due,
    },
    {
      title: "Paid",
      dataIndex: "total_paid",
      key: "total_paid",
      render: (value) => (
        <span style={{ color: "#52c41a" }}>{formatCurrency(value)}</span>
      ),
      sorter: (a, b) => a.total_paid - b.total_paid,
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      render: (value) => (
        <span
          style={{
            color: value > 0 ? "#ff4d4f" : "#52c41a",
            fontWeight: "bold",
          }}
        >
          {formatCurrency(value)}
        </span>
      ),
      sorter: (a, b) => a.balance - b.balance,
    },
    {
      title: "Credit",
      dataIndex: "credit_amount",
      key: "credit_amount",
      render: (value) =>
        value > 0 ? <Tag color="green">+{formatCurrency(value)}</Tag> : "-",
      sorter: (a, b) => a.credit_amount - b.credit_amount,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Payments",
      dataIndex: "payment_count",
      key: "payment_count",
      render: (count) => <Tag color="blue">{count}</Tag>,
    },
  ];

  // Single Statement View
  const renderSingleStatement = () => {
    if (!statement) return <Empty description="No statement found" />;

    const {
      tenant,
      month,
      rent_due,
      water_due,
      total_due,
      total_paid,
      balance,
      status,
    } = statement;
    const isPaid = balance <= 0;

    return (
      <div>
        {/* Header */}
        <Card style={{ marginBottom: 16, background: "#fafafa" }}>
          <Row gutter={16} align="middle">
            <Col flex={1}>
              <Space>
                <HomeOutlined style={{ fontSize: 24, color: "#1890ff" }} />
                <div>
                  <h3 style={{ margin: 0 }}>{tenant.name}</h3>
                  <div style={{ color: "#8c8c8c" }}>
                    House {tenant.houseNo} • {month}
                  </div>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                {getStatusTag(status)}
                <Button icon={<DownloadOutlined />}>Export</Button>
                <Button icon={<PrinterOutlined />}>Print</Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Rent Due"
                value={rent_due}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Water Due"
                value={water_due}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Paid"
                value={total_paid}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ borderColor: isPaid ? "#52c41a" : "#ff4d4f" }}>
              <Statistic
                title="Balance"
                value={balance}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ color: isPaid ? "#52c41a" : "#ff4d4f" }}
              />
              <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
                {isPaid ? "✅ Paid in full" : "⚠️ Outstanding balance"}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Credit Alert */}
        {statement.total_excess > 0 && (
          <Alert
            message={`💰 Credit Balance: ${formatCurrency(statement.total_excess)}`}
            description="This amount will be applied to next month's rent automatically."
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Payment Details */}
        {statement.payments && statement.payments.length > 0 && (
          <Card title="📋 Payment History" size="small">
            <Table
              dataSource={statement.payments}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: "Date",
                  dataIndex: "payment_date",
                  render: (date) => formatDate(date),
                },
                { title: "Receipt", dataIndex: "receipt_no" },
                {
                  title: "Amount",
                  dataIndex: "amount",
                  render: (value) => formatCurrency(value),
                },
                {
                  title: "Method",
                  dataIndex: "payment_method",
                  render: (method) => method?.toUpperCase(),
                },
                {
                  title: "Rent",
                  dataIndex: "rent_amount",
                  render: (value) => formatCurrency(value),
                },
                {
                  title: "Water",
                  dataIndex: "water_amount",
                  render: (value) => formatCurrency(value),
                },
                {
                  title: "Deposit",
                  dataIndex: "deposit_amount",
                  render: (value) => formatCurrency(value),
                },
                {
                  title: "Excess",
                  dataIndex: "excess_amount",
                  render: (value) =>
                    value > 0 ? `+${formatCurrency(value)}` : "-",
                },
              ]}
            />
          </Card>
        )}

        {/* Water Bills */}
        {statement.water_bills && statement.water_bills.length > 0 && (
          <Card title="💧 Water Bills" size="small" style={{ marginTop: 16 }}>
            <Table
              dataSource={statement.water_bills}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: "Month",
                  dataIndex: "month",
                  render: (date) => formatDate(date),
                },
                {
                  title: "Water Charge",
                  dataIndex: "waterCharge",
                  render: (value) => formatCurrency(value),
                },
                {
                  title: "Garbage",
                  dataIndex: "garbageCharge",
                  render: (value) => formatCurrency(value),
                },
                {
                  title: "Total",
                  dataIndex: "total",
                  render: (value) => <strong>{formatCurrency(value)}</strong>,
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (status) => (
                    <Tag color={status === "paid" ? "green" : "orange"}>
                      {status}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>
        )}
      </div>
    );
  };

  // All Statements View
  const renderAllStatements = () => {
    return (
      <div>
        {/* Summary Cards */}
        {summary && (
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Tenants"
                  value={summary.total_tenants}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Collected"
                  value={summary.total_collected}
                  formatter={(value) => formatCurrency(value)}
                  valueStyle={{ color: "#52c41a" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Due"
                  value={summary.total_due}
                  formatter={(value) => formatCurrency(value)}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Balance"
                  value={summary.total_balance}
                  formatter={(value) => formatCurrency(value)}
                  valueStyle={{
                    color: summary.total_balance > 0 ? "#ff4d4f" : "#52c41a",
                  }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Table */}
        <Table
          columns={columns}
          dataSource={allStatements}
          rowKey={(record) => record.tenant.id}
          pagination={{ pageSize: 10 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: "#fafafa" }}>
                <Table.Summary.Cell index={0}>
                  <strong>TOTALS</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong>{formatCurrency(summary?.total_due || 0)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <strong>-</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <strong>{formatCurrency(summary?.total_due || 0)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <strong style={{ color: "#52c41a" }}>
                    {formatCurrency(summary?.total_collected || 0)}
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  <strong
                    style={{
                      color: summary?.total_balance > 0 ? "#ff4d4f" : "#52c41a",
                    }}
                  >
                    {formatCurrency(summary?.total_balance || 0)}
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6}>-</Table.Summary.Cell>
                <Table.Summary.Cell index={7}>-</Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>
    );
  };

  return (
    <Card
      title={
        <Space>
          <FileTextOutlined style={{ color: "#1890ff" }} />
          <span>Monthly Statement</span>
          <Tag color="blue">
            {dayjs()
              .month(selectedMonth - 1)
              .year(selectedYear)
              .format("MMMM YYYY")}
          </Tag>
        </Space>
      }
      extra={
        <Space>
          <DatePicker
            picker="month"
            value={dayjs()
              .year(selectedYear)
              .month(selectedMonth - 1)}
            onChange={(date) => {
              if (date) {
                setSelectedMonth(date.month() + 1);
                setSelectedYear(date.year());
              }
            }}
          />
          <Select
            value={viewMode}
            onChange={setViewMode}
            style={{ width: 120 }}
          >
            <Option value="single">Single Tenant</Option>
            <Option value="all">All Tenants</Option>
          </Select>
          {viewMode === "single" && (
            <Select
              value={selectedTenant}
              onChange={setSelectedTenant}
              style={{ width: 180 }}
              placeholder="Select tenant"
              showSearch
              optionFilterProp="children"
            >
              {/* Populate with tenants from props */}
            </Select>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh || fetchSingleStatement}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      }
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Loading statement...</p>
        </div>
      ) : viewMode === "single" ? (
        renderSingleStatement()
      ) : (
        renderAllStatements()
      )}
    </Card>
  );
};

export default MonthlyStatement;
