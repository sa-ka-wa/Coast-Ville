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
  Spin,
} from "antd";
import {
  PlusOutlined,
  SaveOutlined,
  DeleteOutlined,
  ReloadOutlined,
  HomeOutlined,
  UserOutlined,
  DollarOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useProperty } from "../../context/PropertyContext";
import { getTenants } from "../../services/tenants";
import { submitWaterReading, getWaterReadings } from "../../services/water";
import { formatDate } from "../../utils/formatters";

const { Option } = Select;
const { Text } = Typography;

const QuickWaterReadings = () => {
  const { activeProperty } = useProperty();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [readings, setReadings] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [lastReading, setLastReading] = useState(null);
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

  const fetchLastReading = async (tenantId) => {
    try {
      // Fetch the most recent reading for this tenant
      const response = await getWaterReadings({
        tenant_id: tenantId,
      });

      const readingsList = response.data || [];
      if (readingsList.length > 0) {
        // Sort by date descending and get the latest
        const sorted = [...readingsList].sort(
          (a, b) => new Date(b.readingDate) - new Date(a.readingDate),
        );
        const last = sorted[0];
        setLastReading(last);
        // Auto-populate previous reading with last month's current reading
        const previousValue = parseFloat(last.currentReading) || 0;
        form.setFieldsValue({
          previousReading: previousValue,
        });
        return previousValue;
      } else {
        setLastReading(null);
        form.setFieldsValue({
          previousReading: 0,
        });
        return 0;
      }
    } catch (error) {
      console.error("Error fetching last reading:", error);
      setLastReading(null);
      form.setFieldsValue({
        previousReading: 0,
      });
      return 0;
    }
  };

  const handleTenantSelect = (tenantId) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    setCurrentTenant(tenant);
    form.setFieldValue("tenantName", tenant?.name);
    // Reset form values
    form.setFieldsValue({
      previousReading: 0,
      currentReading: undefined,
    });
    // Fetch last reading and auto-populate previous
    if (tenantId) {
      fetchLastReading(tenantId);
    }
  };

  const handleAddReading = () => {
    if (!currentTenant) {
      message.warning("Please select a tenant first");
      return;
    }

    form
      .validateFields()
      .then((values) => {
        // Parse values as floats, default to 0
        const previous = parseFloat(values.previousReading) || 0;
        const current = parseFloat(values.currentReading);

        // Validate current reading
        if (isNaN(current) || current === undefined || current === null) {
          message.error("Please enter a valid current reading");
          return;
        }

        const unitsUsed = current - previous;
        const rate = parseFloat(values.rate) || 70;
        const amount = unitsUsed * rate;

        if (unitsUsed < 0) {
          message.error(
            "Current reading must be greater than previous reading",
          );
          return;
        }

        if (unitsUsed > 100) {
          message.warning(
            "⚠️ High consumption detected: " + unitsUsed + " units",
          );
        }

        const newReading = {
          id: Date.now(),
          tenantId: currentTenant.id,
          tenantName: currentTenant.name,
          houseNo: currentTenant.houseNo || "N/A",
          previousReading: previous,
          currentReading: current,
          unitsUsed: Math.round(unitsUsed * 100) / 100, // Round to 2 decimal places
          rate: rate,
          amount: Math.round(amount * 100) / 100,
          readingDate: new Date().toISOString().split("T")[0],
          notes: values.notes || "",
          status: "pending",
        };

        setReadings([...readings, newReading]);
        form.resetFields();
        setCurrentTenant(null);
        setLastReading(null);
        message.success(`✅ Reading added for ${currentTenant.name}`);
      })
      .catch((error) => {
        console.error("Form validation error:", error);
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
          <strong>{record.tenantName || "Unknown"}</strong>
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
      render: (val) => {
        const units = parseFloat(val) || 0;
        const color = units > 40 ? "red" : units > 25 ? "orange" : "green";
        return <Tag color={color}>{units}</Tag>;
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      render: (val) => (
        <span style={{ fontWeight: 600, color: "#52c41a" }}>
          KSh {(parseFloat(val) || 0).toLocaleString()}
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
              formatter={(value) => `KSh ${(value || 0).toLocaleString()}`}
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
              <p>
                2. Previous reading is auto-filled from last month's current
                reading
              </p>
              <p>3. Enter the current meter reading</p>
              <p>4. Click "Add Reading" to add to the queue</p>
              <p>5. Submit all readings at once when done</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={form} layout="vertical" style={{ width: "100%" }}>
          <Form.Item style={{ marginBottom: 8 }}>
            <Select
              placeholder="Select Tenant"
              style={{ width: "100%" }}
              showSearch
              optionFilterProp="children"
              value={currentTenant?.id}
              onChange={handleTenantSelect}
              size="large"
            >
              {tenants.map((tenant) => (
                <Option key={tenant.id} value={tenant.id}>
                  {tenant.name} - {tenant.houseNo || "N/A"}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {lastReading && (
            <Alert
              message={`📖 Last reading: ${lastReading.currentReading || 0} (${formatDate(lastReading.readingDate)})`}
              type="info"
              showIcon
              style={{ marginBottom: 8 }}
            />
          )}

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item style={{ marginBottom: 8 }}>
                <Input
                  type="number"
                  placeholder="Previous (auto-filled)"
                  size="large"
                  prefix={<HistoryOutlined />}
                  disabled
                  value={form.getFieldValue("previousReading") || 0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item style={{ marginBottom: 8 }}>
                <Input
                  type="number"
                  placeholder="Current Reading"
                  size="large"
                  prefix={<HomeOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddReading}
            size="large"
            block
          >
            Add Reading
          </Button>

          {currentTenant && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
              📝 {currentTenant.name} ({currentTenant.houseNo || "N/A"})
            </div>
          )}
        </Form>
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
                    <strong>{stats.totalUnits || 0} units</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <strong style={{ color: "#52c41a", fontSize: 16 }}>
                      KSh {(stats.totalAmount || 0).toLocaleString()}
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
