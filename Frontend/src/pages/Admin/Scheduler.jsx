// src/pages/Admin/Scheduler.jsx
import React, { useState, useEffect } from "react";
import { Card, Button, Space, Alert, Statistic, Row, Col, message } from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import api from "../../services/api";

const Scheduler = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get("/scheduler/status");
      setStatus(response.data);
    } catch (error) {
      console.error("Error fetching scheduler status:", error);
    }
  };

  const runMonthlyTasks = async () => {
    setRunning(true);
    try {
      const response = await api.post("/scheduler/run-monthly");
      message.success(
        `✅ Monthly tasks completed! Rent: ${response.data.rent_generated}, Water: ${response.data.water_bills_generated}`,
      );
      fetchStatus();
    } catch (error) {
      console.error("Error running tasks:", error);
      message.error("Failed to run monthly tasks");
    } finally {
      setRunning(false);
    }
  };

  const checkOverdue = async () => {
    setLoading(true);
    try {
      const response = await api.get("/scheduler/check-overdue");
      message.success(
        `📱 Sent ${response.data.notified || 0} overdue reminders`,
      );
    } catch (error) {
      console.error("Error checking overdue:", error);
      message.error("Failed to check overdue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <CalendarOutlined style={{ color: "#1890ff" }} />
            <span>Task Scheduler</span>
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchStatus}>
            Refresh
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Current Date"
                value={status?.today || "Loading..."}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Month"
                value={status?.month || "Loading..."}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Status"
                value={
                  status?.is_first_of_month
                    ? "📅 First of Month"
                    : status?.is_after_5th
                      ? "📋 After 5th"
                      : "⏳ Normal"
                }
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 24 }}>
          <Alert
            message="Auto-tasks"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>
                  ✅ <strong>1st of month:</strong> Generate rent and water
                  bills automatically
                </li>
                <li>
                  ✅ <strong>After 5th:</strong> Send reminders to tenants who
                  haven't paid
                </li>
                <li>
                  ✅ <strong>Daily:</strong> Check overdue payments and send
                  notifications
                </li>
              </ul>
            }
            type="info"
            showIcon
          />
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
          <Button
            type="primary"
            size="large"
            onClick={runMonthlyTasks}
            loading={running}
          >
            🚀 Run Monthly Tasks Now
          </Button>
          <Button size="large" onClick={checkOverdue} loading={loading}>
            📱 Check Overdue Payments
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Scheduler;
