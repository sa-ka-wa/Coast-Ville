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
  Spin,
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
  EyeOutlined,
  HistoryOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import {
  getWaterBills,
  submitWaterReading,
  getWaterReadings,
  getLatestWaterReading,
  generateWaterBill,
  getWaterBillingSummary,
  updateWaterBillStatus,
} from "../../services/water";
import { getTenants } from "../../services/tenants";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { useSearchParams, useNavigate } from "react-router-dom";

const { Option } = Select;
const { TabPane } = Tabs;

const WaterBills = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tenantIdParam = searchParams.get("tenant_id");
  const propertyIdParam = searchParams.get("property_id");

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
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [previousReading, setPreviousReading] = useState(null);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  // State for reading history modal
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyTenantId, setHistoryTenantId] = useState(null);
  const [historyReadings, setHistoryReadings] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tenantIdParam, propertyIdParam]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const readingFilters = {};
      const billFilters = {};

      if (tenantIdParam) {
        readingFilters.tenant_id = tenantIdParam;
        billFilters.tenant_id = tenantIdParam;
      }
      if (propertyIdParam) {
        readingFilters.property_id = propertyIdParam;
        billFilters.property_id = propertyIdParam;
      }

      // Fetch tenants first
      const tenantsRes = await getTenants(
        propertyIdParam ? { property_id: propertyIdParam } : {},
      );
      setTenants(tenantsRes.data || []);

      if (tenantIdParam) {
        const tenant = tenantsRes.data.find(
          (t) => t.id === parseInt(tenantIdParam),
        );
        setSelectedTenant(tenant);
      }

      const [readingsRes, billsRes, summaryRes] = await Promise.all([
        getWaterReadings(readingFilters),
        getWaterBills(billFilters),
        getWaterBillingSummary(
          propertyIdParam ? { property_id: propertyIdParam } : {},
        ),
      ]);

      setReadings(readingsRes.data || []);
      setBills(billsRes.data || []);
      setSummary(
        summaryRes.data || {
          totalReadings: 0,
          totalAmount: 0,
          pending: 0,
          averageConsumption: 0,
        },
      );

      if (tenantIdParam && tenantsRes.data.length > 0) {
        const tenant = tenantsRes.data.find(
          (t) => t.id === parseInt(tenantIdParam),
        );
        if (tenant) {
          message.info(`Showing water readings for ${tenant.name}`);
        }
      }
    } catch (error) {
      console.error("Error fetching water data:", error);
      message.error("Failed to fetch water data");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch previous reading for a tenant - FIXED
  const fetchPreviousReading = async (tenantId) => {
    if (!tenantId) {
      setPreviousReading(null);
      return;
    }

    setLoadingPrevious(true);
    try {
      console.log(`📡 Fetching latest reading for tenant ${tenantId}...`);

      // Use the dedicated function to get the latest reading
      const response = await getLatestWaterReading(tenantId);
      const data = response.data || [];

      console.log(`📊 Found ${data.length} readings for tenant ${tenantId}`);

      if (data.length > 0) {
        // Get the first (most recent) reading
        const lastReading = data[0];
        // Get the current reading value (it becomes the previous for the next reading)
        const previousVal =
          lastReading.currentReading || lastReading.current_reading || 0;

        setPreviousReading(previousVal);

        // Auto-fill the previous reading in the form
        form.setFieldsValue({
          previousReading: previousVal,
        });

        message.success(`Previous reading loaded: ${previousVal}`);
        console.log(`✅ Previous reading set to: ${previousVal}`);
      } else {
        setPreviousReading(0);
        form.setFieldsValue({
          previousReading: 0,
        });
        message.info("No previous reading found. Starting from 0.");
        console.log(`ℹ️ No previous reading found for tenant ${tenantId}`);
      }
    } catch (error) {
      console.error("Error fetching previous reading:", error);
      setPreviousReading(0);
      form.setFieldsValue({
        previousReading: 0,
      });
      message.warning("Could not fetch previous reading. Starting from 0.");
    } finally {
      setLoadingPrevious(false);
    }
  };

  // ✅ Handle tenant selection in form - auto-fetch previous reading
  const handleTenantSelect = (value) => {
    form.setFieldsValue({ tenantId: value });
    // Clear previous reading while loading
    setPreviousReading(null);
    // Fetch the previous reading
    fetchPreviousReading(value);
  };

  // ✅ Fetch reading history for a tenant
  const fetchReadingHistory = async (tenantId) => {
    setHistoryLoading(true);
    try {
      const response = await getWaterReadings({ tenant_id: tenantId });
      setHistoryReadings(response.data || []);
      setHistoryTenantId(tenantId);
      setHistoryModalVisible(true);
    } catch (error) {
      console.error("Error fetching reading history:", error);
      message.error("Failed to fetch reading history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmitReading = async (values) => {
    try {
      const tenant = tenants.find((t) => t.id === values.tenantId);
      if (!tenant) {
        message.error("Tenant not found");
        return;
      }

      // Validate that current reading is greater than previous
      if (
        parseFloat(values.currentReading) <= parseFloat(values.previousReading)
      ) {
        message.error("Current reading must be greater than previous reading");
        return;
      }

      const readingData = {
        tenant_id: values.tenantId,
        previous_reading: parseFloat(values.previousReading),
        current_reading: parseFloat(values.currentReading),
        reading_date:
          values.readingDate?.format("YYYY-MM-DD") ||
          new Date().toISOString().split("T")[0],
        rate: 70,
        notes: values.notes || "",
      };

      await submitWaterReading(readingData);
      message.success("Water reading submitted successfully");
      setModalVisible(false);
      form.resetFields();
      setPreviousReading(null);
      fetchData();
    } catch (error) {
      console.error("Error submitting reading:", error);
      message.error(error.response?.data?.error || "Failed to submit reading");
    }
  };

  const handleGenerateBill = async (readingId) => {
    try {
      await generateWaterBill(readingId);
      message.success("Water bill generated successfully");
      fetchData();
    } catch (error) {
      console.error("Error generating bill:", error);
      message.error("Failed to generate bill");
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await updateWaterBillStatus(id, "paid");
      message.success("Bill marked as paid");
      fetchData();
    } catch (error) {
      console.error("Error marking bill as paid:", error);
      message.error("Failed to update bill");
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
            <div style={{ fontWeight: 500 }}>
              {record.tenant_name || record.tenantName}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              House: {record.house_no || record.houseNo}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Previous",
      dataIndex: "previousReading",
      key: "previousReading",
      render: (val) => <Tag color="blue">{val || 0}</Tag>,
    },
    {
      title: "Current",
      dataIndex: "currentReading",
      key: "currentReading",
      render: (val) => <Tag color="green">{val || 0}</Tag>,
    },
    {
      title: "Units Used",
      dataIndex: "unitsUsed",
      key: "unitsUsed",
      render: (val) => (
        <span style={{ fontWeight: 600, color: "#faad14" }}>
          {val || 0} units
        </span>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (val) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>
          {formatCurrency(val || 0)}
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
      render: (_, record) => (
        <Space>
          <Tooltip title="View History">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() =>
                fetchReadingHistory(record.tenant_id || record.tenantId)
              }
            />
          </Tooltip>
          {record.status !== "billed" && (
            <Tooltip title="Generate Bill">
              <Button
                type="primary"
                size="small"
                icon={<FileTextOutlined />}
                onClick={() => handleGenerateBill(record.id)}
              >
                Generate Bill
              </Button>
            </Tooltip>
          )}
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
          <div style={{ fontWeight: 500 }}>
            {record.tenant_name || record.tenantName}
          </div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            House: {record.house_no || record.houseNo}
          </div>
        </div>
      ),
    },
    {
      title: "Water",
      dataIndex: "waterCharge",
      key: "waterCharge",
      render: (val) => formatCurrency(val || 0),
    },
    {
      title: "Garbage",
      dataIndex: "garbageCharge",
      key: "garbageCharge",
      render: (val) => formatCurrency(val || 0),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      render: (val) => (
        <span style={{ fontWeight: 700, color: "#1890ff" }}>
          {formatCurrency(val || 0)}
        </span>
      ),
    },
    {
      title: "Month",
      dataIndex: "month",
      key: "month",
      render: (month) => (
        <Tag color="purple">{month ? formatDate(month) : "N/A"}</Tag>
      ),
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
          <Tooltip title="View Tenant History">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() =>
                fetchReadingHistory(record.tenant_id || record.tenantId)
              }
            />
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

  // Get monthly consumption data for charts
  const getMonthlyConsumption = () => {
    const monthlyData = {};
    readings.forEach((r) => {
      const date = r.readingDate || r.reading_date;
      const month = date?.substring(0, 7);
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

  // History Modal Columns
  const historyColumns = [
    {
      title: "Date",
      dataIndex: "readingDate",
      key: "readingDate",
      render: (date) => (date ? formatDate(date) : "N/A"),
      sorter: (a, b) =>
        new Date(a.readingDate || a.reading_date) -
        new Date(b.readingDate || b.reading_date),
      defaultSortOrder: "descend",
    },
    {
      title: "Previous",
      dataIndex: "previousReading",
      key: "previousReading",
      render: (val) => val || 0,
    },
    {
      title: "Current",
      dataIndex: "currentReading",
      key: "currentReading",
      render: (val) => val || 0,
    },
    {
      title: "Units Used",
      dataIndex: "unitsUsed",
      key: "unitsUsed",
      render: (val) => <Tag color="blue">{val || 0}</Tag>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (val) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>
          {formatCurrency(val || 0)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "billed" ? "green" : "orange"}>
          {status || "pending"}
        </Tag>
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
              value={summary.totalReadings || readings.length}
              prefix={<ScheduleOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-success">
            <Statistic
              title="Total Amount"
              value={summary.totalAmount || 0}
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
              value={summary.pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-danger">
            <Statistic
              title="Avg Consumption"
              value={summary.averageConsumption || 0}
              suffix="units"
              prefix={<LineChartOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tenant Filter Info */}
      {tenantIdParam && selectedTenant && (
        <Alert
          message={`Showing readings for ${selectedTenant.name}`}
          description={`House: ${selectedTenant.houseNo || selectedTenant.unit_number || "N/A"} • Property: ${selectedTenant.property?.name || "Current Property"}`}
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          action={
            <Button
              size="small"
              type="primary"
              onClick={() => navigate("/admin/water")}
            >
              View All
            </Button>
          }
        />
      )}

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
            {tenantIdParam && (
              <Tag
                color="blue"
                closable
                onClose={() => navigate("/admin/water")}
              >
                Filtered by Tenant
              </Tag>
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
                form.resetFields();
                setPreviousReading(null);
                if (tenantIdParam) {
                  const tenantId = parseInt(tenantIdParam);
                  form.setFieldsValue({ tenantId: tenantId });
                  // ✅ Fetch previous reading when opening modal with tenant
                  fetchPreviousReading(tenantId);
                }
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
                {tenantIdParam && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {readings.length}
                  </Tag>
                )}
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
                    description={
                      tenantIdParam
                        ? `No readings found for this tenant. Click "New Reading" to add one.`
                        : "No readings found. Submit your first reading!"
                    }
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
                {tenantIdParam && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {bills.length}
                  </Tag>
                )}
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
                    description={
                      tenantIdParam
                        ? `No bills found for this tenant.`
                        : "No bills generated yet"
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Submit Reading Modal with Auto Previous Reading */}
      <Modal
        title={
          <Space>
            <ScheduleOutlined style={{ color: "#1890ff" }} />
            Submit Water Reading
            {tenantIdParam && selectedTenant && (
              <Tag color="blue">{selectedTenant.name}</Tag>
            )}
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setPreviousReading(null);
        }}
        footer={null}
        width={550}
        destroyOnClose
      >
        <Alert
          message="How it works"
          description="Enter the previous and current meter readings. The system will automatically calculate units used and the amount."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {loadingPrevious ? (
          <Alert
            message="Loading previous reading..."
            type="info"
            showIcon
            icon={<Spin size="small" />}
            style={{ marginBottom: 16 }}
          />
        ) : previousReading !== null ? (
          <Alert
            message={`Previous Reading: ${previousReading}`}
            description="The last recorded reading will be used as the previous reading."
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            message="No previous reading found"
            description="Start from 0 or enter manually."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

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
              disabled={!!tenantIdParam}
              onChange={handleTenantSelect}
            >
              {tenants.map((tenant) => (
                <Option key={tenant.id} value={tenant.id}>
                  {tenant.name} -{" "}
                  {tenant.houseNo || tenant.unit_number || "N/A"}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="previousReading"
            label="Previous Reading"
            rules={[
              { required: true, message: "Please enter previous reading" },
              {
                validator: (_, value) => {
                  if (value < 0) {
                    return Promise.reject(
                      new Error("Previous reading cannot be negative"),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              type="number"
              placeholder="e.g., 2450"
              prefix={<ScheduleOutlined />}
              disabled={loadingPrevious}
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
                  if (
                    value &&
                    previous &&
                    parseFloat(value) <= parseFloat(previous)
                  ) {
                    return Promise.reject(
                      new Error(
                        "Current reading must be greater than previous reading!",
                      ),
                    );
                  }
                  if (value < 0) {
                    return Promise.reject(
                      new Error("Current reading cannot be negative"),
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
            />
          </Form.Item>

          <Form.Item
            name="readingDate"
            label="Reading Date"
            rules={[{ required: true, message: "Please select reading date" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea
              rows={2}
              placeholder="Any notes about this reading"
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setPreviousReading(null);
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

      {/* Reading History Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined style={{ color: "#1890ff" }} />
            Reading History
            {historyTenantId && (
              <Tag color="blue">
                {tenants.find((t) => t.id === historyTenantId)?.name ||
                  "Tenant"}
              </Tag>
            )}
          </Space>
        }
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setHistoryReadings([]);
        }}
        width={900}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => {
              setHistoryModalVisible(false);
              setHistoryReadings([]);
            }}
          >
            Close
          </Button>,
        ]}
      >
        <Spin spinning={historyLoading}>
          {historyReadings.length === 0 ? (
            <Empty
              description="No reading history found for this tenant"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              columns={historyColumns}
              dataSource={historyReadings}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total) => `Total ${total} readings`,
              }}
              scroll={{ x: 800 }}
            />
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default WaterBills;
