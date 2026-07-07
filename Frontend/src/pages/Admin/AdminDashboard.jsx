// src/pages/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { Layout, Row, Col, Card, Statistic, Space, Alert, Spin } from "antd";
import {
  HomeOutlined,
  TeamOutlined,
  DollarOutlined,
  ExperimentOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import PaymentParser from "../../components/Admin/PaymentManagement/PaymentParser";
import PaymentHistory from "../../components/Admin/PaymentManagement/PaymentHistory";
import TenantList from "../../components/Admin/TenantManagement/TenantList";
import { getPropertyStats } from "../../services/properties";
import { useProperty } from "../../context/PropertyContext";
import { formatCurrency } from "../../utils/formatters";

const AdminDashboard = () => {
  const { activeProperty } = useProperty();
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
  const [error, setError] = useState(null);

  const currentPropertyId = activeProperty?.id;
  const currentPropertyName = activeProperty?.name;

  useEffect(() => {
    if (currentPropertyId) {
      fetchStats();
    } else {
      // Use mock data when no property is selected
      setStats({
        totalUnits: 48,
        occupied: 44,
        vacant: 4,
        expectedRent: 720000,
        collected: 650000,
        balance: 70000,
        waterPending: 12,
      });
      setLoading(false);
    }
  }, [currentPropertyId]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPropertyStats(currentPropertyId);
      setStats(response.data || {});
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setError("Failed to load dashboard statistics");
      // Use mock data as fallback
      setStats({
        totalUnits: 48,
        occupied: 44,
        vacant: 4,
        expectedRent: 720000,
        collected: 650000,
        balance: 70000,
        waterPending: 12,
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate occupancy percentage
  const occupancyRate =
    stats.totalUnits > 0
      ? Math.round((stats.occupied / stats.totalUnits) * 100)
      : 0;

  return (
    <Layout
      style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}
    >
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

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

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
              <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
                Occupancy: {occupancyRate}%
              </div>
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
              prefix={<WalletOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "#52c41a" }}
            />
            <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
              <ArrowUpOutlined style={{ color: "#52c41a" }} />
              {stats.totalUnits > 0
                ? Math.round((stats.collected / stats.expectedRent) * 100)
                : 0}
              % collection rate
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
              <ScheduleOutlined style={{ marginRight: 4 }} />
              {stats.waterPending || 0} water bills pending
            </div>
          </Card>
        </Col>
      </Row>

      {/* M-Pesa Payment Parser */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <PaymentParser
            onPaymentConfirmed={fetchStats}
            propertyId={currentPropertyId}
          />
        </Col>
      </Row>

      {/* Payment History */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <PaymentHistory />
        </Col>
      </Row>

      {/* Tenant List */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <TenantList />
        </Col>
      </Row>
    </Layout>
  );
};

export default AdminDashboard;
