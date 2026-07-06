// pages/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { Layout, Row, Col, Card, Statistic, Space } from "antd";
import {
  HomeOutlined,
  TeamOutlined,
  DollarOutlined,
  ExperimentOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import PaymentParser from "../../components/Admin/PaymentManagement/PaymentParser";
import PaymentHistory from "../../components/Admin/PaymentManagement/PaymentHistory";
import TenantList from "../../components/Admin/TenantManagement/TenantList";
import { getPropertyStats } from "../../services/payments";
import { formatCurrency } from "../../utils/formatters";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUnits: 0,
    occupied: 0,
    vacant: 0,
    expectedRent: 0,
    collected: 0,
    balance: 0,
    waterPending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getPropertyStats();
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ padding: "24px", background: "#f0f2f5" }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Total Units"
              value={stats.totalUnits}
              prefix={<HomeOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: "#52c41a" }}>
                Occupied: {stats.occupied}
              </span>
              <span style={{ color: "#ff4d4f", marginLeft: 8 }}>
                Vacant: {stats.vacant}
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Expected Rent"
              value={stats.expectedRent}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Collected"
              value={stats.collected}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#52c41a" }}
            />
            <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
              <ArrowUpOutlined style={{ color: "#52c41a" }} /> 12% increase
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Balance"
              value={stats.balance}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: stats.balance > 0 ? "#ff4d4f" : "#52c41a" }}
            />
            <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
              {stats.waterPending} water bills pending
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <PaymentParser onPaymentConfirmed={fetchStats} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <PaymentHistory />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <TenantList />
        </Col>
      </Row>
    </Layout>
  );
};

export default AdminDashboard;
