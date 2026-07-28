// src/components/MonthlyTrends.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Statistic,
  Row,
  Col,
  Select,
  Spin,
  Alert,
  Tabs,
  Tag,
  Space,
  Tooltip,
} from "antd";
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  DropboxOutlined,
  HomeOutlined,
  WalletOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../utils/formatters";
import api from "../services/api";

const { TabPane } = Tabs;
const { Option } = Select;

const MonthlyTrends = ({ tenantId, propertyId }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [months, setMonths] = useState(12);
  const [summary, setSummary] = useState({});
  const [activeTab, setActiveTab] = useState("payment");

  useEffect(() => {
    fetchData();
  }, [tenantId, propertyId, months]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "/trends/combined?months=" + months;
      if (tenantId) url += `&tenant_id=${tenantId}`;
      if (propertyId) url += `&property_id=${propertyId}`;

      const response = await api.get(url);
      if (response.data.success) {
        setData(response.data.data || []);
        calculateSummary(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching trends:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (trendData) => {
    const total = trendData.reduce(
      (acc, item) => {
        const payments = item.payments || {};
        const waterBills = item.water_bills || {};
        const consumption = item.consumption || {};

        acc.total_paid += payments.total_paid || 0;
        acc.total_rent += payments.total_rent || 0;
        acc.total_water += payments.total_water || 0;
        acc.total_deposit += payments.total_deposit || 0;
        acc.total_bills += waterBills.total_bill || 0;
        acc.total_units += consumption.total_units || 0;
        acc.months += 1;
        return acc;
      },
      {
        total_paid: 0,
        total_rent: 0,
        total_water: 0,
        total_deposit: 0,
        total_bills: 0,
        total_units: 0,
        months: 0,
      },
    );

    setSummary({
      ...total,
      avg_payment: total.months > 0 ? total.total_paid / total.months : 0,
      avg_bill: total.months > 0 ? total.total_bills / total.months : 0,
      avg_units: total.months > 0 ? total.total_units / total.months : 0,
    });
  };

  const columns = [
    {
      title: "Month",
      dataIndex: "month_name",
      key: "month",
      sorter: (a, b) => a.month.localeCompare(b.month),
    },
    {
      title: "💰 Total Paid",
      dataIndex: ["payments", "total_paid"],
      key: "total_paid",
      render: (val) => formatCurrency(val || 0),
      sorter: (a, b) =>
        (a.payments?.total_paid || 0) - (b.payments?.total_paid || 0),
    },
    {
      title: "🏠 Rent",
      dataIndex: ["payments", "total_rent"],
      key: "rent",
      render: (val) => formatCurrency(val || 0),
    },
    {
      title: "💧 Water",
      dataIndex: ["payments", "total_water"],
      key: "water",
      render: (val) => formatCurrency(val || 0),
    },
    {
      title: "🏦 Deposit",
      dataIndex: ["payments", "total_deposit"],
      key: "deposit",
      render: (val) => formatCurrency(val || 0),
    },
    {
      title: "📊 Units",
      dataIndex: ["consumption", "total_units"],
      key: "units",
      render: (val) => (val || 0).toFixed(1),
    },
  ];

  const renderPaymentChart = () => {
    const chartData = data.map((item) => ({
      month: item.month_name,
      rent: item.payments?.total_rent || 0,
      water: item.payments?.total_water || 0,
      deposit: item.payments?.total_deposit || 0,
      total: item.payments?.total_paid || 0,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <RechartsTooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
          <Bar dataKey="rent" fill="#1890ff" name="Rent" />
          <Bar dataKey="water" fill="#52c41a" name="Water" />
          <Bar dataKey="deposit" fill="#faad14" name="Deposit" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderWaterChart = () => {
    const chartData = data.map((item) => ({
      month: item.month_name,
      bill: item.water_bills?.total_bill || 0,
      units: item.consumption?.total_units || 0,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <RechartsTooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="bill"
            stroke="#52c41a"
            name="Water Bill"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="units"
            stroke="#1890ff"
            name="Units Used"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Spin size="large" />
        <p>Loading trends...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Paid"
              value={summary.total_paid}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Monthly Payment"
              value={summary.avg_payment}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Units Used"
              value={summary.total_units}
              suffix="units"
              prefix={<DropboxOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Water Bills"
              value={summary.total_bills}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Controls */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <span>Show:</span>
          <Select value={months} onChange={setMonths} style={{ width: 100 }}>
            <Option value={6}>6 months</Option>
            <Option value={12}>12 months</Option>
            <Option value={24}>24 months</Option>
          </Select>
          <span>months</span>
        </Space>
      </div>

      {/* Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="📊 Payment Trends" key="payment">
            {renderPaymentChart()}
            <div style={{ marginTop: 16 }}>
              <Alert
                message="Payment Breakdown"
                description="Shows monthly rent, water, and deposit payments"
                type="info"
                showIcon
              />
            </div>
          </TabPane>

          <TabPane tab="💧 Water Trends" key="water">
            {renderWaterChart()}
            <div style={{ marginTop: 16 }}>
              <Alert
                message="Water Usage vs Bills"
                description="Shows monthly water bills compared to units used"
                type="info"
                showIcon
              />
            </div>
          </TabPane>

          <TabPane tab="📋 Detailed Data" key="data">
            <Table
              columns={columns}
              dataSource={data}
              rowKey="month"
              pagination={false}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: "#fafafa" }}>
                    <Table.Summary.Cell index={0}>
                      <strong>TOTALS</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong>{formatCurrency(summary.total_paid)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <strong>{formatCurrency(summary.total_rent)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>
                      <strong>{formatCurrency(summary.total_water)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4}>
                      <strong>{formatCurrency(summary.total_deposit)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5}>
                      <strong>{summary.total_units.toFixed(1)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default MonthlyTrends;
