// pages/Admin/WaterBills.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Modal,
  Form,
  message,
  Select,
  Row,
  Col,
  Statistic,
  Tooltip,
  Popconfirm,
  DatePicker,
  Tabs,
  Progress,
  Empty,
  Badge,
  Descriptions,
  Alert,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  DollarOutlined,
  CalendarOutlined,
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  getWaterBills,
  submitWaterReading,
  getWaterReadings,
  generateWaterBill,
  getWaterBillingSummary,
} from "../../services/water";
import { getTenants } from "../../services/tenants";
import { formatCurrency, formatDate } from "../../utils/formatters";

const { Option } = Select;
const { TabPane } = Tabs;

const WaterBills = () => {
  const [loading, setLoading] = useState(false);
  const [readings, setReadings] = useState([]);
  const [bills, setBills] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [summary, setSummary] = useState({
    totalReadings: 0,
    totalAmount: 0,
    pending: 0,
    averageConsumption: 0,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("readings");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [readingsRes, billsRes, tenantsRes, summaryRes] = await Promise.all(
        [
          getWaterReadings(),
          getWaterBills(),
          getTenants(),
          getWaterBillingSummary(),
        ],
      );

      setReadings(readingsRes.data || []);
      setBills(billsRes.data || []);
      setTenants(tenantsRes.data || []);
      setSummary(
        summaryRes.data || {
          totalReadings: 0,
          totalAmount: 0,
          pending: 0,
          averageConsumption: 0,
        },
      );
    } catch (error) {
      message.error("Failed to fetch water data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReading = async (values) => {
    try {
      const tenant = tenants.find((t) => t.id === values.tenantId);
      if (!tenant) {
        message.error("Tenant not found");
        return;
      }

      const readingData = {
        tenantId: values.tenantId,
        tenantName: tenant.name,
        houseNo: tenant.houseNo,
        previousReading: values.previousReading,
        currentReading: values.currentReading,
        readingDate:
          values.readingDate?.format("YYYY-MM-DD") ||
          new Date().toISOString().split("T")[0],
      };

      await submitWaterReading(readingData);
      message.success("Water reading submitted successfully");
      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error("Failed to submit reading");
    }
  };

  const handleGenerateBill = async (readingId) => {
    try {
      await generateWaterBill(readingId);
      message.success("Water bill generated successfully");
      fetchData();
    } catch (error) {
      message.error("Failed to generate bill");
    }
  };

  // Reading Columns
  const readingColumns = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UserOutlined style={{ color: "#1890ff" }} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.tenantName}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              House: {record.houseNo}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Previous",
      dataIndex: "previousReading",
      key: "previousReading",
      render: (val) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: "Current",
      dataIndex: "currentReading",
      key: "currentReading",
      render: (val) => <Tag color="green">{val}</Tag>,
    },
    {
      title: "Units Used",
      dataIndex: "unitsUsed",
      key: "unitsUsed",
      render: (val) => (
        <span style={{ fontWeight: 600, color: "#faad14" }}>{val} units</span>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (val) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: "Date",
      dataIndex: "readingDate",
      key: "readingDate",
      render: (date) => formatDate(date),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Generate Bill">
            <Button
              type="primary"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => handleGenerateBill(record.id)}
            >
              Bill
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Bills Columns
  const billColumns = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.tenantName}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            House: {record.houseNo}
          </div>
        </div>
      ),
    },
    {
      title: "Water",
      dataIndex: "waterCharge",
      key: "waterCharge",
      render: (val) => formatCurrency(val),
    },
    {
      title: "Garbage",
      dataIndex: "garbageCharge",
      key: "garbageCharge",
      render: (val) => formatCurrency(val),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      render: (val) => (
        <span style={{ fontWeight: 700, color: "#1890ff" }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: "Month",
      dataIndex: "month",
      key: "month",
      render: (month) => <Tag color="purple">{month}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Badge
          color={status === "paid" ? "#52c41a" : "#faad14"}
          text={status === "paid" ? "Paid" : "Pending"}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button icon={<EyeOutlined />} size="small" />
          </Tooltip>
          {record.status === "pending" && (
            <Tooltip title="Mark as Paid">
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleMarkPaid(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const handleMarkPaid = async (id) => {
    try {
      await updateWaterBillStatus(id, "paid");
      message.success("Bill marked as paid");
      fetchData();
    } catch (error) {
      message.error("Failed to update bill");
    }
  };

  // Get monthly consumption data for charts
  const getMonthlyConsumption = () => {
    const monthlyData = {};
    readings.forEach((r) => {
      const month = r.readingDate?.substring(0, 7);
      if (month) {
        monthlyData[month] = (monthlyData[month] || 0) + (r.unitsUsed || 0);
      }
    });
    return Object.entries(monthlyData).map(([month, units]) => ({
      month,
      units,
    }));
  };

  const monthlyData = getMonthlyConsumption();

  return (
    <div>
      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-primary">
            <Statistic
              title="Total Readings"
              value={summary.totalReadings}
              prefix={<ScheduleOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-success">
            <Statistic
              title="Total Amount"
              value={summary.totalAmount}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-warning">
            <Statistic
              title="Pending Bills"
              value={summary.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-danger">
            <Statistic
              title="Avg Consumption"
              value={summary.averageConsumption}
              suffix="units"
              prefix={<ScheduleOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Monthly Consumption Chart */}
      {monthlyData.length > 0 && (
        <Card title="Monthly Water Consumption" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {monthlyData.map((item) => (
              <Col xs={24} sm={12} md={8} lg={6} key={item.month}>
                <Card size="small">
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                      {item.month}
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "#1890ff",
                      }}
                    >
                      {item.units}
                    </div>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>units</div>
                    <Progress
                      percent={Math.min((item.units / 100) * 100, 100)}
                      size="small"
                      status="active"
                    />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Main Content */}
      <Card
        title={
          <Space>
            <ScheduleOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              Water Management
            </span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => message.info("Export feature coming soon")}
            >
              Export
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                setModalVisible(true);
              }}
            >
              New Reading
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <ScheduleOutlined />
                Water Readings
              </span>
            }
            key="readings"
          >
            <Table
              columns={readingColumns}
              dataSource={readings}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total) => `Total ${total} readings`,
              }}
              locale={{
                emptyText: (
                  <Empty
                    description="No readings found. Submit your first reading!"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                Bills
              </span>
            }
            key="bills"
          >
            <Table
              columns={billColumns}
              dataSource={bills}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total) => `Total ${total} bills`,
              }}
              locale={{
                emptyText: (
                  <Empty
                    description="No bills generated yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Submit Reading Modal */}
      <Modal
        title={
          <Space>
            <ScheduleOutlined style={{ color: "#1890ff" }} />
            Submit Water Reading
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Alert
          message="How it works"
          description="Enter the previous and current meter readings. The system will automatically calculate units used and the amount."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={form} layout="vertical" onFinish={handleSubmitReading}>
          <Form.Item
            name="tenantId"
            label="Select Tenant"
            rules={[{ required: true, message: "Please select a tenant" }]}
          >
            <Select
              placeholder="Select tenant"
              showSearch
              optionFilterProp="children"
            >
              {tenants.map((tenant) => (
                <Option key={tenant.id} value={tenant.id}>
                  {tenant.name} - {tenant.houseNo}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="previousReading"
            label="Previous Reading"
            rules={[
              { required: true, message: "Please enter previous reading" },
            ]}
          >
            <Input
              type="number"
              placeholder="e.g., 2450"
              prefix={<ScheduleOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="currentReading"
            label="Current Reading"
            rules={[
              { required: true, message: "Please enter current reading" },
            ]}
          >
            <Input
              type="number"
              placeholder="e.g., 2478"
              prefix={<ScheduleOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="readingDate"
            label="Reading Date"
            rules={[{ required: true, message: "Please select reading date" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Submit Reading
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WaterBills;
