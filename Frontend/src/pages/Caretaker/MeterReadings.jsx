// pages/Caretaker/MeterReadings.jsx
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
  Badge,
  Empty,
  Descriptions,
  Progress,
  Divider,
  Alert,
  Timeline,
  Avatar,
  List,
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
  PrinterOutlined,
  FilterOutlined,
  ClearOutlined,
  BarChartOutlined,
  LineChartOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  submitWaterReading,
  getWaterReadings,
  getConsumptionHistory,
} from "../../services/water";
import { getTenants } from "../../services/tenants";
import { formatCurrency, formatDate } from "../../utils/formatters";

const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

const MeterReadings = () => {
  const [loading, setLoading] = useState(false);
  const [readings, setReadings] = useState([]);
  const [filteredReadings, setFilteredReadings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [selectedReading, setSelectedReading] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("readings");

  // Stats
  const [stats, setStats] = useState({
    totalReadings: 0,
    totalUnits: 0,
    totalAmount: 0,
    averageConsumption: 0,
    pendingBills: 0,
  });

  // Consumption trends
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [readingsRes, tenantsRes, historyRes] = await Promise.all([
        getWaterReadings(),
        getTenants(),
        getConsumptionHistory(),
      ]);

      setReadings(readingsRes.data || []);
      setFilteredReadings(readingsRes.data || []);
      setTenants(tenantsRes.data || []);
      setMonthlyData(historyRes.data || []);
      calculateStats(readingsRes.data || []);
    } catch (error) {
      message.error("Failed to fetch water readings");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const totalUnits = data.reduce((sum, r) => sum + (r.unitsUsed || 0), 0);
    const totalAmount = data.reduce((sum, r) => sum + (r.amount || 0), 0);
    const avgConsumption = data.length > 0 ? totalUnits / data.length : 0;

    setStats({
      totalReadings: data.length,
      totalUnits,
      totalAmount,
      averageConsumption: avgConsumption,
      pendingBills: data.filter((r) => r.status === "pending").length,
    });
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
        readingDate: values.readingDate
          ? values.readingDate.format("YYYY-MM-DD")
          : new Date().toISOString().split("T")[0],
        notes: values.notes,
      };

      const response = await submitWaterReading(readingData);
      message.success("Water reading submitted successfully");
      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error("Failed to submit reading");
    }
  };

  const handleDelete = async (id) => {
    try {
      // In production, call API to delete
      const updatedReadings = readings.filter((r) => r.id !== id);
      setReadings(updatedReadings);
      setFilteredReadings(updatedReadings);
      calculateStats(updatedReadings);
      message.success("Reading deleted successfully");
    } catch (error) {
      message.error("Failed to delete reading");
    }
  };

  const handleFilter = () => {
    let filtered = [...readings];

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.tenantName.toLowerCase().includes(search) ||
          r.houseNo.toLowerCase().includes(search),
      );
    }

    if (tenantFilter !== "all") {
      filtered = filtered.filter((r) => r.tenantId === parseInt(tenantFilter));
    }

    setFilteredReadings(filtered);
  };

  const clearFilters = () => {
    setSearchText("");
    setTenantFilter("all");
    setFilteredReadings(readings);
  };

  useEffect(() => {
    handleFilter();
  }, [searchText, tenantFilter]);

  const getConsumptionStatus = (units) => {
    if (units <= 20)
      return { color: "green", text: "Low", icon: <CheckCircleOutlined /> };
    if (units <= 40)
      return { color: "orange", text: "Medium", icon: <ClockCircleOutlined /> };
    return { color: "red", text: "High", icon: <ExclamationCircleOutlined /> };
  };

  const columns = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar
            style={{
              backgroundColor: "#1890ff",
              verticalAlign: "middle",
            }}
            size="small"
          >
            {record.tenantName
              ? record.tenantName.charAt(0).toUpperCase()
              : "T"}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.tenantName}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              <HomeOutlined style={{ marginRight: 4 }} />
              {record.houseNo}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Readings",
      key: "readings",
      render: (_, record) => (
        <Space>
          <Tag color="blue">{record.previousReading}</Tag>
          <span>→</span>
          <Tag color="green">{record.currentReading}</Tag>
        </Space>
      ),
    },
    {
      title: "Units Used",
      dataIndex: "unitsUsed",
      key: "unitsUsed",
      render: (units) => {
        const status = getConsumptionStatus(units);
        return (
          <Space>
            <Tag color={status.color} icon={status.icon}>
              {units} units
            </Tag>
            <span style={{ fontSize: 12, color: "#8c8c8c" }}>
              {status.text}
            </span>
          </Space>
        );
      },
      sorter: (a, b) => (a.unitsUsed || 0) - (b.unitsUsed || 0),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>
          {formatCurrency(amount)}
        </span>
      ),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
    },
    {
      title: "Date",
      dataIndex: "readingDate",
      key: "readingDate",
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.readingDate) - new Date(b.readingDate),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Badge
          color={status === "billed" ? "#52c41a" : "#faad14"}
          text={status === "billed" ? "Billed" : "Pending"}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedReading(record);
                setDetailVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                setEditingReading(record);
                form.setFieldsValue({
                  ...record,
                  readingDate: record.readingDate
                    ? require("dayjs")(record.readingDate)
                    : null,
                });
                setModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete Reading"
              description="Are you sure you want to delete this reading?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-primary">
            <Statistic
              title="Total Readings"
              value={stats.totalReadings}
              prefix={<ScheduleOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-success">
            <Statistic
              title="Total Units"
              value={stats.totalUnits}
              suffix="units"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-warning">
            <Statistic
              title="Total Amount"
              value={stats.totalAmount}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-danger">
            <Statistic
              title="Avg Consumption"
              value={stats.averageConsumption}
              suffix="units"
              prefix={<LineChartOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Monthly Consumption Trend */}
      {monthlyData.length > 0 && (
        <Card title="Monthly Consumption Trend" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {monthlyData.slice(0, 6).map((item) => (
              <Col xs={24} sm={12} md={8} lg={4} key={item.month}>
                <Card size="small">
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                      {item.month}
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#1890ff",
                      }}
                    >
                      {item.units}
                    </div>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>units</div>
                    <Progress
                      percent={Math.min((item.units / 50) * 100, 100)}
                      size="small"
                      strokeColor={
                        item.units <= 20
                          ? "#52c41a"
                          : item.units <= 40
                            ? "#faad14"
                            : "#ff4d4f"
                      }
                    />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Main Table */}
      <Card
        title={
          <Space>
            <ScheduleOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              Meter Readings
            </span>
            <Tag color="blue">{filteredReadings.length} records</Tag>
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
                setEditingReading(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              New Reading
            </Button>
          </Space>
        }
      >
        {/* Filters */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Input
            placeholder="Search by tenant or house..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            value={tenantFilter}
            onChange={setTenantFilter}
            style={{ width: 200 }}
            placeholder="Filter by tenant"
          >
            <Option value="all">All Tenants</Option>
            {tenants.map((tenant) => (
              <Option key={tenant.id} value={tenant.id}>
                {tenant.name} - {tenant.houseNo}
              </Option>
            ))}
          </Select>
          <Space>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              onClick={handleFilter}
            >
              Filter
            </Button>
            <Button icon={<ClearOutlined />} onClick={clearFilters}>
              Clear
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredReadings}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} readings`,
            pageSizeOptions: ["10", "20", "50"],
          }}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <Empty
                description="No readings found. Submit your first meter reading!"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      {/* Submit Reading Modal */}
      <Modal
        title={
          <Space>
            {editingReading ? (
              <>
                <EditOutlined />
                Edit Reading
              </>
            ) : (
              <>
                <PlusOutlined />
                Submit Meter Reading
              </>
            )}
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingReading(null);
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
              size="large"
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
              size="large"
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
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="readingDate"
            label="Reading Date"
            rules={[{ required: true, message: "Please select reading date" }]}
          >
            <DatePicker style={{ width: "100%" }} size="large" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Additional notes..." />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingReading(null);
                  form.resetFields();
                }}
                size="large"
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" size="large">
                {editingReading ? "Update" : "Submit"} Reading
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reading Details Modal */}
      <Modal
        title={
          <Space>
            <ScheduleOutlined style={{ color: "#1890ff" }} />
            Reading Details
          </Space>
        }
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedReading(null);
        }}
        footer={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              Print
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setDetailVisible(false);
                setSelectedReading(null);
              }}
            >
              Close
            </Button>
          </Space>
        }
        width={600}
      >
        {selectedReading && (
          <div>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Tenant">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar style={{ backgroundColor: "#1890ff" }}>
                    {selectedReading.tenantName
                      ? selectedReading.tenantName.charAt(0).toUpperCase()
                      : "T"}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {selectedReading.tenantName}
                    </div>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                      <HomeOutlined style={{ marginRight: 4 }} />
                      {selectedReading.houseNo}
                    </div>
                  </div>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Previous Reading">
                <Tag color="blue" style={{ fontSize: 14 }}>
                  {selectedReading.previousReading}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Current Reading">
                <Tag color="green" style={{ fontSize: 14 }}>
                  {selectedReading.currentReading}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Units Used">
                <div>
                  <Tag
                    color={
                      getConsumptionStatus(selectedReading.unitsUsed).color
                    }
                    style={{ fontSize: 14, fontWeight: 600 }}
                  >
                    {selectedReading.unitsUsed} units
                  </Tag>
                  <div style={{ marginTop: 4 }}>
                    Status:{" "}
                    {getConsumptionStatus(selectedReading.unitsUsed).text}
                  </div>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <span
                  style={{ fontSize: 18, fontWeight: 700, color: "#1890ff" }}
                >
                  {formatCurrency(selectedReading.amount)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {formatDate(selectedReading.readingDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge
                  color={
                    selectedReading.status === "billed" ? "#52c41a" : "#faad14"
                  }
                  text={
                    selectedReading.status === "billed" ? "Billed" : "Pending"
                  }
                />
              </Descriptions.Item>
              {selectedReading.notes && (
                <Descriptions.Item label="Notes">
                  {selectedReading.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <div style={{ display: "flex", gap: 16 }}>
              <Button
                icon={<EditOutlined />}
                block
                onClick={() => {
                  setDetailVisible(false);
                  setEditingReading(selectedReading);
                  form.setFieldsValue({
                    ...selectedReading,
                    readingDate: selectedReading.readingDate
                      ? require("dayjs")(selectedReading.readingDate)
                      : null,
                  });
                  setModalVisible(true);
                }}
              >
                Edit Reading
              </Button>
              <Button
                icon={<FileTextOutlined />}
                block
                onClick={() => message.info("Generate bill coming soon")}
              >
                Generate Bill
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MeterReadings;
