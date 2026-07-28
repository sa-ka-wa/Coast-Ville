// src/components/TenantPaymentSummary.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Divider,
  Alert,
  Tooltip,
} from "antd";
import {
  DollarOutlined,
  ReloadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  HomeOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { formatCurrency, formatDate } from "../utils/formatters";

const TenantPaymentSummary = ({ tenant, payments, onRefresh, loading }) => {
  const [summaryData, setSummaryData] = useState([]);
  const [totals, setTotals] = useState({
    rent: 0,
    water: 0,
    deposit: 0,
    excess: 0,
    balance_due: 0,
    total_paid: 0,
  });

  useEffect(() => {
    if (payments && payments.length > 0) {
      buildSummaryData();
    }
  }, [payments]);

  const buildSummaryData = () => {
    // Group payments by month
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

    // Convert to array and sort by month
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

    setSummaryData(sortedData);

    // Calculate totals
    const totalRow = sortedData.reduce(
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

    setTotals(totalRow);
  };

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

  const columns = [
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

  return (
    <Card
      title={
        <Space>
          <DollarOutlined style={{ color: "#1890ff" }} />
          <span>Payment Summary</span>
          <Tag color="blue">{summaryData.length} months</Tag>
          {tenant && <Tag color="green">{tenant.name}</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
          />
          <Button icon={<DownloadOutlined />}>Export</Button>
        </Space>
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
        columns={columns}
        dataSource={summaryData}
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
              tenant?.deposit_paid ? "✅ Deposit Paid" : "⏳ Deposit Not Paid"
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
            description={`Total rent expected: ${formatCurrency(tenant?.monthly_rent || 0)} per month`}
            type="info"
            showIcon
          />
        </Col>
      </Row>
    </Card>
  );
};

export default TenantPaymentSummary;
