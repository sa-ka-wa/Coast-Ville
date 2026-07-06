// pages/Caretaker/CaretakerDashboard.jsx
import React from "react";
import { Layout, Row, Col, Card, Statistic } from "antd";
import {
  HomeOutlined,
  TeamOutlined,
  DollarOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import TenantList from "../../components/Caretaker/TenantList";
import MeterReadingForm from "../../components/Caretaker/MeterReadingForm";
import InitiatePayment from "../../components/Caretaker/InitiatePayment";
import ExpensesForm from "../../components/Caretaker/ExpensesForm";

const CaretakerDashboard = () => {
  return (
    <Layout style={{ padding: "24px", background: "#f0f2f5" }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Units"
              value={48}
              prefix={<HomeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Tenants"
              value={44}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Collections"
              value={45000}
              prefix={<DollarOutlined />}
              formatter={(value) => `Ksh ${value.toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Readings"
              value={12}
              prefix={<ScheduleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <InitiatePayment />
        </Col>
        <Col xs={24} lg={12}>
          <MeterReadingForm />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <ExpensesForm />
        </Col>
        <Col xs={24} lg={12}>
          <TenantList />
        </Col>
      </Row>
    </Layout>
  );
};

export default CaretakerDashboard;
