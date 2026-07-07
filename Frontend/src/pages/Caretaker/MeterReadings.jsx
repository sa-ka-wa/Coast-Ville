// pages/Caretaker/MeterReadings.jsx - Connected to Real API
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
  Badge,
  Empty,
  Descriptions,
  Progress,
  Divider,
  Alert,
  Avatar,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  DollarOutlined,
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
  getTenantWaterReadings,
  getWaterBills,
  generateWaterBill,
} from "../../services/water";
import { getTenants } from "../../services/tenants";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { useProperty } from "../../context/PropertyContext";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

const MeterReadings = () => {
  const { activeProperty } = useProperty();
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
  const [generatingBill, setGeneratingBill] = useState(false);

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

  // Get current property ID
  const currentPropertyId = activeProperty?.id;

  useEffect(() => {
    if (currentPropertyId) {
      fetchData();
    } else {
      // Show message if no property selected
      setReadings([]);
      setFilteredReadings([]);
      setMonthlyData([]);
      setStats({
        totalReadings: 0,
        totalUnits: 0,
        totalAmount: 0,
        averageConsumption: 0,
        pendingBills: 0,
      });
    }
  }, [currentPropertyId]);

  const fetchData = async () => {
    if (!currentPropertyId) {
      message.warning("Please select a property first");
      return;
    }

    setLoading(true);
    try {
      // Fetch tenants for the current property
      const tenantsRes = await getTenants({ property_id: currentPropertyId });
      const tenantsList = tenantsRes.data || [];
      setTenants(tenantsList);

      // Fetch water readings with property filter
      const readingsRes = await getWaterReadings({
        property_id: currentPropertyId,
      });
      const readingsList = readingsRes.data || [];
      setReadings(readingsList);
      setFilteredReadings(readingsList);
      calculateStats(readingsList);

      // Fetch consumption history
      const historyRes = await getConsumptionHistory();
      setMonthlyData(historyRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
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
      console.error("Error submitting reading:", error);
      message.error(error.response?.data?.error || "Failed to submit reading");
    }
  };

  const handleDelete = async (id) => {
    try {
      // Since we don't have a delete endpoint yet, use mock
      // In production: await deleteWaterReading(id);
      const updatedReadings = readings.filter((r) => r.id !== id);
      setReadings(updatedReadings);
      setFilteredReadings(updatedReadings);
      calculateStats(updatedReadings);
      message.success("Reading deleted successfully");
    } catch (error) {
      message.error("Failed to delete reading");
    }
  };

  const handleGenerateBill = async (readingId) => {
    setGeneratingBill(true);
    try {
      const response = await generateWaterBill(readingId);
      message.success("Water bill generated successfully!");
      fetchData();
      setDetailVisible(false);
    } catch (error) {
      console.error("Error generating bill:", error);
      message.error(error.response?.data?.message || "Failed to generate bill");
    } finally {
      setGeneratingBill(false);
    }
  };

  const handleFilter = () => {
    let filtered = [...readings];

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.tenantName || "").toLowerCase().includes(search) ||
          (r.houseNo || "").toLowerCase().includes(search),
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
  }, [searchText, tenantFilter, readings]);

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
            <div style={{ fontWeight: 500 }}>{record.tenantName || "N/A"}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              <HomeOutlined style={{ marginRight: 4 }} />
              {record.houseNo || "N/A"}
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
          <Tag color="blue">{record.previousReading || 0}</Tag>
          <span>→</span>
          <Tag color="green">{record.currentReading || 0}</Tag>
        </Space>
      ),
    },
    {
      title: "Units Used",
      dataIndex: "unitsUsed",
      key: "unitsUsed",
      render: (units) => {
        const status = getConsumptionStatus(units || 0);
        return (
          <Space>
            <Tag color={status.color} icon={status.icon}>
              {units || 0} units
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
          {formatCurrency(amount || 0)}
        </span>
      ),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
    },
    {
      title: "Date",
      dataIndex: "readingDate",
      key: "readingDate",
      render: (date) => (date ? formatDate(date) : "N/A"),
      sorter: (a, b) => {
        if (!a.readingDate) return 1;
        if (!b.readingDate) return -1;
        return new Date(a.readingDate) - new Date(b.readingDate);
      },
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
      width: 160,
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
                    ? dayjs(record.readingDate)
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

  // Show message if no property selected
  if (!currentPropertyId) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💧</div>
        <h2>Please select a property</h2>
        <p style={{ color: "#8c8c8c" }}>
          Use the property selector in the navbar to view water readings for a
          specific property.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Property Header - Like ManageTenants */}
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
            {activeProperty?.name || "No Property Selected"}
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
            {activeProperty?.name && (
              <Tag color="green">{activeProperty.name}</Tag>
            )}
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
                {tenant.name} - {tenant.houseNo || "N/A"}
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
                  {tenant.name} - {tenant.houseNo || "N/A"}
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
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const previous = getFieldValue("previousReading");
                  if (value && previous && value <= previous) {
                    return Promise.reject(
                      new Error(
                        "Current reading must be greater than previous",
                      ),
                    );
                  }
                  return Promise.resolve();
                },
              }),
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
            {selectedReading?.status !== "billed" && (
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                loading={generatingBill}
                onClick={() => handleGenerateBill(selectedReading?.id)}
              >
                Generate Bill
              </Button>
            )}
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              Print
            </Button>
            <Button
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
                      {selectedReading.tenantName || "N/A"}
                    </div>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                      <HomeOutlined style={{ marginRight: 4 }} />
                      {selectedReading.houseNo || "N/A"}
                    </div>
                  </div>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Previous Reading">
                <Tag color="blue" style={{ fontSize: 14 }}>
                  {selectedReading.previousReading || 0}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Current Reading">
                <Tag color="green" style={{ fontSize: 14 }}>
                  {selectedReading.currentReading || 0}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Units Used">
                <div>
                  <Tag
                    color={
                      getConsumptionStatus(selectedReading.unitsUsed || 0).color
                    }
                    style={{ fontSize: 14, fontWeight: 600 }}
                  >
                    {selectedReading.unitsUsed || 0} units
                  </Tag>
                  <div style={{ marginTop: 4 }}>
                    Status:{" "}
                    {getConsumptionStatus(selectedReading.unitsUsed || 0).text}
                  </div>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <span
                  style={{ fontSize: 18, fontWeight: 700, color: "#1890ff" }}
                >
                  {formatCurrency(selectedReading.amount || 0)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {selectedReading.readingDate
                  ? formatDate(selectedReading.readingDate)
                  : "N/A"}
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
                      ? dayjs(selectedReading.readingDate)
                      : null,
                  });
                  setModalVisible(true);
                }}
              >
                Edit Reading
              </Button>
              {selectedReading.status !== "billed" && (
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  block
                  loading={generatingBill}
                  onClick={() => handleGenerateBill(selectedReading.id)}
                >
                  Generate Bill
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MeterReadings;
