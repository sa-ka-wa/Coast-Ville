// src/components/Caretaker/QuickWaterReadings.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Form,
  message,
  Select,
  Row,
  Col,
  Alert,
  Typography,
  Tag,
  Statistic,
} from "antd";
import {
  PlusOutlined,
  SaveOutlined,
  DeleteOutlined,
  ReloadOutlined,
  HomeOutlined,
  UserOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useProperty } from "../../context/PropertyContext";
import { getTenants } from "../../services/tenants";
import { submitWaterReading } from "../../services/water";

const { Option } = Select;
const { Text } = Typography;

const QuickWaterReadings = () => {
  const { activeProperty } = useProperty();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [readings, setReadings] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    totalUnits: 0,
    totalAmount: 0,
  });

  const currentPropertyId = activeProperty?.id;

  useEffect(() => {
    if (currentPropertyId) {
      fetchTenants();
    }
  }, [currentPropertyId]);

  useEffect(() => {
    // Update stats when readings change
    const total = readings.length;
    const totalUnits = readings.reduce((sum, r) => sum + (r.unitsUsed || 0), 0);
    const totalAmount = readings.reduce((sum, r) => sum + (r.amount || 0), 0);
    setStats({ total, totalUnits, totalAmount });
  }, [readings]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await getTenants({ property_id: currentPropertyId });
      setTenants(response.data || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      message.error("Failed to fetch tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReading = () => {
    if (!currentTenant) {
      message.warning("Please select a tenant first");
      return;
    }

    form.validateFields().then((values) => {
      const previous = parseFloat(values.previousReading);
      const current = parseFloat(values.currentReading);
      const unitsUsed = current - previous;
      const rate = values.rate || 70;
      const amount = unitsUsed * rate;

      if (unitsUsed < 0) {
        message.error("Current reading must be greater than previous reading");
        return;
      }

      const newReading = {
        id: Date.now(),
        tenantId: currentTenant.id,
        tenantName: currentTenant.name,
        houseNo: currentTenant.houseNo,
        previousReading: previous,
        currentReading: current,
        unitsUsed: unitsUsed,
        rate: rate,
        amount: amount,
        readingDate:
          values.readingDate || new Date().toISOString().split("T")[0],
        notes: values.notes || "",
        status: "pending",
      };

      setReadings([...readings, newReading]);
      form.resetFields();
      setCurrentTenant(null);
      message.success(`✅ Reading added for ${currentTenant.name}`);
    });
  };

  const handleRemoveReading = (id) => {
    setReadings(readings.filter((r) => r.id !== id));
  };

  const handleSubmitAll = async () => {
    if (readings.length === 0) {
      message.warning("No readings to submit");
      return;
    }

    setSubmitting(true);
    try {
      const submitted = [];
      const errors = [];

      for (const reading of readings) {
        try {
          const response = await submitWaterReading({
            tenantId: reading.tenantId,
            previousReading: reading.previousReading,
            currentReading: reading.currentReading,
            readingDate: reading.readingDate,
            notes: reading.notes || "Quick entry - Caretaker",
          });
          submitted.push(reading.tenantName);
        } catch (error) {
          errors.push(`${reading.tenantName}: ${error.message}`);
        }
      }

      if (submitted.length > 0) {
        message.success(
          `✅ Submitted ${submitted.length} readings for: ${submitted.join(", ")}`,
        );
      }
      if (errors.length > 0) {
        message.error(`❌ Failed: ${errors.join("; ")}`);
      }

      setReadings([]);
      setStats({ total: 0, totalUnits: 0, totalAmount: 0 });
      fetchTenants();
    } catch (error) {
      console.error("Error submitting readings:", error);
      message.error("Failed to submit readings");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_, record) => (
        <Space>
          <UserOutlined style={{ color: "#1890ff" }} />
          <strong>{record.tenantName}</strong>
          <Tag color="blue">{record.houseNo || "N/A"}</Tag>
        </Space>
      ),
    },
    {
      title: "Previous",
      dataIndex: "previousReading",
      render: (val) => <Tag color="default">{val || 0}</Tag>,
    },
    {
      title: "Current",
      dataIndex: "currentReading",
      render: (val) => <Tag color="green">{val || 0}</Tag>,
    },
    {
      title: "Units Used",
      dataIndex: "unitsUsed",
      render: (val) => <Tag color="orange">{val || 0}</Tag>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      render: (val) => (
        <span style={{ fontWeight: 600, color: "#52c41a" }}>
          KSh {(val || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          icon={<DeleteOutlined />}
          size="small"
          danger
          onClick={() => handleRemoveReading(record.id)}
        />
      ),
    },
  ];

  if (!currentPropertyId) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Please select a property to enter readings</p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Readings Added"
              value={stats.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Units"
              value={stats.totalUnits}
              suffix="units"
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Amount"
              value={stats.totalAmount}
              prefix={<DollarOutlined />}
              formatter={(value) => `KSh ${value.toLocaleString()}`}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Entry Form */}
      <Card title="📊 Record Water Readings" style={{ marginBottom: 24 }}>
        <Alert
          message="How it works"
          description={
            <div>
              <p>1. Select a tenant from the dropdown</p>
              <p>2. Enter the previous and current meter readings</p>
              <p>3. Click "Add Reading" to add to the queue</p>
              <p>4. Submit all readings at once when done</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={form} layout="inline" style={{ width: "100%" }}>
          <Form.Item style={{ flex: 1 }}>
            <Select
              placeholder="Select Tenant"
              style={{ width: "100%" }}
              showSearch
              optionFilterProp="children"
              value={currentTenant?.id}
              onChange={(value) => {
                const tenant = tenants.find((t) => t.id === value);
                setCurrentTenant(tenant);
                form.setFieldValue("tenantName", tenant?.name);
              }}
              size="large"
            >
              {tenants.map((tenant) => (
                <Option key={tenant.id} value={tenant.id}>
                  {tenant.name} - {tenant.houseNo || "N/A"}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Input
              type="number"
              placeholder="Previous"
              size="large"
              prefix={<HomeOutlined />}
              style={{ width: 130 }}
            />
          </Form.Item>

          <Form.Item>
            <Input
              type="number"
              placeholder="Current"
              size="large"
              prefix={<HomeOutlined />}
              style={{ width: 130 }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddReading}
              size="large"
            >
              Add
            </Button>
          </Form.Item>
        </Form>

        {currentTenant && (
          <div style={{ marginTop: 8, color: "#8c8c8c" }}>
            📝 Adding reading for: <strong>{currentTenant.name}</strong>
            (House: {currentTenant.houseNo || "N/A"})
          </div>
        )}
      </Card>

      {/* Readings Queue */}
      <Card
        title={
          <Space>
            📋 Readings Queue
            <Tag color="blue">{readings.length} readings</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchTenants}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmitAll}
              loading={submitting}
              disabled={readings.length === 0}
              size="large"
            >
              Submit All ({readings.length})
            </Button>
          </Space>
        }
      >
        {readings.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#8c8c8c" }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <p>No readings added yet.</p>
            <p style={{ fontSize: 14 }}>
              Select a tenant and enter their meter readings above.
            </p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={readings}
            rowKey="id"
            pagination={false}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <strong>TOTAL</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} />
                  <Table.Summary.Cell index={2} />
                  <Table.Summary.Cell index={3}>
                    <strong>{stats.totalUnits} units</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <strong style={{ color: "#52c41a", fontSize: 16 }}>
                      KSh {stats.totalAmount.toLocaleString()}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default QuickWaterReadings;
