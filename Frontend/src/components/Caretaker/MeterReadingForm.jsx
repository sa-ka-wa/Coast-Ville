// components/Caretaker/MeterReadingForm.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  message,
  Table,
  DatePicker,
} from "antd";
import { submitWaterReading, getWaterReadings } from "../../services/water";
import { formatCurrency } from "../../utils/formatters";

const MeterReadingForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [readings, setReadings] = useState([]);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    fetchTenants();
    fetchReadings();
  }, []);

  const fetchTenants = async () => {
    // Fetch tenants list
  };

  const fetchReadings = async () => {
    // Fetch recent readings
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await submitWaterReading(values);
      message.success("Water reading submitted successfully");
      form.resetFields();
      fetchReadings();
    } catch (error) {
      message.error("Failed to submit reading");
    } finally {
      setLoading(false);
    }
  };

  const calculateUnits = (current, previous) => {
    return current - previous;
  };

  const calculateAmount = (units, rate) => {
    return units * rate;
  };

  const columns = [
    {
      title: "Tenant",
      dataIndex: "tenantName",
      key: "tenantName",
    },
    {
      title: "House",
      dataIndex: "houseNo",
      key: "houseNo",
    },
    {
      title: "Previous Reading",
      dataIndex: "previousReading",
      key: "previousReading",
    },
    {
      title: "Current Reading",
      dataIndex: "currentReading",
      key: "currentReading",
    },
    {
      title: "Units Used",
      dataIndex: "unitsUsed",
      key: "unitsUsed",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => formatCurrency(amount),
    },
    {
      title: "Date",
      dataIndex: "readingDate",
      key: "readingDate",
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <Card title="Submit Water Reading">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="tenantId"
            label="Select Tenant"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select tenant">
              <Select.Option value="1">John Mwangi - A03</Select.Option>
              <Select.Option value="2">Mary Wanjiku - B12</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="previousReading"
            label="Previous Reading"
            rules={[{ required: true }]}
          >
            <Input type="number" placeholder="2450" />
          </Form.Item>

          <Form.Item
            name="currentReading"
            label="Current Reading"
            rules={[{ required: true }]}
          >
            <Input type="number" placeholder="2478" />
          </Form.Item>

          <Form.Item
            name="readingDate"
            label="Reading Date"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading}>
            Submit Reading
          </Button>
        </Form>
      </Card>

      <Card title="Recent Readings" style={{ marginTop: 20 }}>
        <Table
          columns={columns}
          dataSource={readings}
          rowKey="id"
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
};

export default MeterReadingForm;
