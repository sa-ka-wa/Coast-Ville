// src/pages/Admin/Reports.jsx
import React, { useState, useEffect } from "react";
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Alert,
  Spin,
  Table,
  Tag,
  Button,
  DatePicker,
  Select,
  Empty,
  Tabs,
} from "antd";
import {
  HomeOutlined,
  TeamOutlined,
  DollarOutlined,
  FileTextOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  CalendarOutlined,
  DropboxOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useProperty } from "../../context/PropertyContext";
import { getAllMonthlyStatements } from "../../services/reports";
import { formatCurrency } from "../../utils/formatters";
import dayjs from "dayjs";

const { TabPane } = Tabs;
const { Option } = Select;
const { Content } = Layout;

const Reports = () => {
  const { activeProperty } = useProperty();
  const [loading, setLoading] = useState(false);
  const [statements, setStatements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("monthly");

  const currentPropertyId = activeProperty?.id;
  const currentPropertyName = activeProperty?.name;

  useEffect(() => {
    if (currentPropertyId) {
      fetchStatements();
    }
  }, [currentPropertyId, selectedMonth, selectedYear]);

  const fetchStatements = async () => {
    if (!currentPropertyId) {
      // Use mock data when no property is selected
      setStatements([]);
      setSummary(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getAllMonthlyStatements(
        currentPropertyId,
        selectedYear,
        selectedMonth,
      );
      setStatements(response.data.statements || []);
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Error fetching statements:", error);
      setError(error.message || "Failed to load statements");
      setStatements([]);
      setSummary(null);
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

  const columns = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_, record) => (
        <Space>
          <HomeOutlined />
          <strong>{record.tenant?.name || "Unknown"}</strong>
          <Tag color="blue">House {record.tenant?.houseNo || "N/A"}</Tag>
        </Space>
      ),
    },
    {
      title: "Rent Due",
      dataIndex: "rent_due",
      key: "rent_due",
      render: (value) => formatCurrency(value || 0),
      sorter: (a, b) => (a.rent_due || 0) - (b.rent_due || 0),
    },
    {
      title: "Water Due",
      dataIndex: "water_due",
      key: "water_due",
      render: (value) => formatCurrency(value || 0),
      sorter: (a, b) => (a.water_due || 0) - (b.water_due || 0),
    },
    {
      title: "Total Due",
      dataIndex: "total_due",
      key: "total_due",
      render: (value) => <strong>{formatCurrency(value || 0)}</strong>,
      sorter: (a, b) => (a.total_due || 0) - (b.total_due || 0),
    },
    {
      title: "Paid",
      dataIndex: "total_paid",
      key: "total_paid",
      render: (value) => (
        <span style={{ color: "#52c41a" }}>{formatCurrency(value || 0)}</span>
      ),
      sorter: (a, b) => (a.total_paid || 0) - (b.total_paid || 0),
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      render: (value) => (
        <span
          style={{
            color: (value || 0) > 0 ? "#ff4d4f" : "#52c41a",
            fontWeight: "bold",
          }}
        >
          {formatCurrency(value || 0)}
        </span>
      ),
      sorter: (a, b) => (a.balance || 0) - (b.balance || 0),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
  ];

  return (
    <Layout
      style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}
    >
      {/* Property Header - Same as AdminDashboard */}
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
            {currentPropertyName || "No Property Selected"}
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

      {/* Reports Header */}
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: "#1890ff" }} />
            <span>Reports & Statements</span>
            {activeProperty?.name && (
              <Tag color="blue">{activeProperty.name}</Tag>
            )}
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
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={fetchStatements}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        {!currentPropertyId ? (
          <Alert
            message="No Property Selected"
            description="Please select a property from the dropdown to view reports."
            type="info"
            showIcon
          />
        ) : loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>Loading statements...</p>
          </div>
        ) : error ? (
          <Alert
            message="Error Loading Statements"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" type="primary" onClick={fetchStatements}>
                Retry
              </Button>
            }
          />
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane
              tab={
                <span>
                  <FileTextOutlined />
                  Monthly Statements
                </span>
              }
              key="monthly"
            >
              {/* Summary Cards */}
              {summary && (
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="Total Tenants"
                        value={summary.total_tenants || 0}
                        prefix={<TeamOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="Total Collected"
                        value={summary.total_collected || 0}
                        formatter={(value) => formatCurrency(value)}
                        valueStyle={{ color: "#52c41a" }}
                        prefix={<WalletOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="Total Due"
                        value={summary.total_due || 0}
                        formatter={(value) => formatCurrency(value)}
                        valueStyle={{ color: "#1890ff" }}
                        prefix={<DollarOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="Total Balance"
                        value={summary.total_balance || 0}
                        formatter={(value) => formatCurrency(value)}
                        valueStyle={{
                          color:
                            (summary.total_balance || 0) > 0
                              ? "#ff4d4f"
                              : "#52c41a",
                        }}
                      />
                    </Card>
                  </Col>
                </Row>
              )}

              {/* Table */}
              {statements.length === 0 ? (
                <Empty
                  description={`No statements found for ${dayjs()
                    .month(selectedMonth - 1)
                    .year(selectedYear)
                    .format("MMMM YYYY")}`}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button type="primary" onClick={fetchStatements}>
                    Refresh
                  </Button>
                </Empty>
              ) : (
                <Table
                  columns={columns}
                  dataSource={statements}
                  rowKey={(record) => record.tenant?.id || Math.random()}
                  pagination={{ pageSize: 10 }}
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ background: "#fafafa" }}>
                        <Table.Summary.Cell index={0}>
                          <strong>TOTALS</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          <strong style={{ color: "#1890ff" }}>
                            {formatCurrency(summary?.total_rent_due || 0)}
                          </strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2}>
                          <strong style={{ color: "#52c41a" }}>
                            {formatCurrency(summary?.total_water_due || 0)}
                          </strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>
                          <strong>
                            {formatCurrency(summary?.total_due || 0)}
                          </strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4}>
                          <strong style={{ color: "#52c41a" }}>
                            {formatCurrency(summary?.total_collected || 0)}
                          </strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5}>
                          <strong
                            style={{
                              color:
                                (summary?.total_balance || 0) > 0
                                  ? "#ff4d4f"
                                  : "#52c41a",
                            }}
                          >
                            {formatCurrency(summary?.total_balance || 0)}
                          </strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6}>-</Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              )}
            </TabPane>

            <TabPane
              tab={
                <span>
                  <DollarOutlined />
                  Payment Summary
                </span>
              }
              key="payment"
            >
              <Card>
                <Alert
                  message="Payment Summary Coming Soon"
                  description="Detailed payment summary reports will be available here."
                  type="info"
                  showIcon
                />
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <BarChartOutlined
                    style={{ fontSize: 48, color: "#d9d9d9" }}
                  />
                  <p style={{ marginTop: 16, color: "#8c8c8c" }}>
                    Payment summary charts and analytics
                  </p>
                </div>
              </Card>
            </TabPane>

            <TabPane
              tab={
                <span>
                  <DropboxOutlined />
                  Water Bills
                </span>
              }
              key="water"
            >
              <Card>
                <Alert
                  message="Water Bill Reports Coming Soon"
                  description="Water bill summary and analytics will be available here."
                  type="info"
                  showIcon
                />
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <DropboxOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
                  <p style={{ marginTop: 16, color: "#8c8c8c" }}>
                    Water bill reports and trends
                  </p>
                </div>
              </Card>
            </TabPane>
          </Tabs>
        )}
      </Card>
    </Layout>
  );
};

export default Reports;
