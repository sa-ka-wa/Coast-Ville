// pages/Caretaker/ManageTenants.jsx
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
  Avatar,
  Badge,
  Empty,
  Descriptions,
  Divider,
  Spin,
  Alert,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  DollarOutlined,
  TeamOutlined,
  ApartmentOutlined,
  WalletOutlined,
  WhatsAppOutlined,
  MailOutlined,
  EyeOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom"; // ← ADD THIS IMPORT
import {
  getTenants,
  addTenant,
  updateTenant,
  deleteTenant,
} from "../../services/tenants";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
} from "../../utils/formatters";
import { useProperty } from "../../context/PropertyContext";
import { getUnits, updateUnitStatus } from "../../services/units";

const { Option } = Select;
const { TextArea } = Input;

const ManageTenants = ({ propertyId, propertyName }) => {
  const navigate = useNavigate(); // ← ADD THIS

  console.log(
    "🔍🔍🔍 ManageTenants PROPS - propertyId:",
    propertyId,
    "propertyName:",
    propertyName,
  );
  const { activeProperty } = useProperty();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form] = Form.useForm();

  // State for units
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    vacating: 0,
    vacated: 0,
    totalRent: 0,
    collected: 0,
    outstanding: 0,
  });

  // Use the prop if provided, otherwise use context
  const currentPropertyId = propertyId || activeProperty?.id;
  const currentPropertyName = propertyName || activeProperty?.name;

  console.log(
    "🔄 ManageTenants - Current Property ID:",
    currentPropertyId,
    "Name:",
    currentPropertyName,
  );

  // Fetch tenants when property ID changes
  useEffect(() => {
    if (currentPropertyId) {
      fetchTenants(currentPropertyId);
      fetchUnits();
    } else {
      setTenants([]);
      setFilteredTenants([]);
      setUnits([]);
      setStats({
        total: 0,
        active: 0,
        vacating: 0,
        vacated: 0,
        totalRent: 0,
        collected: 0,
        outstanding: 0,
      });
    }
  }, [currentPropertyId]);

  // Fetch units
  const fetchUnits = async () => {
    setLoadingUnits(true);
    try {
      const response = await getUnits({ property_id: currentPropertyId });
      const availableUnits = response.data.filter(
        (u) =>
          u.status === "available" ||
          (editingTenant && u.id === editingTenant.unit_id),
      );
      setUnits(availableUnits);
    } catch (error) {
      message.error("Failed to fetch units");
      console.error("Error fetching units:", error);
    } finally {
      setLoadingUnits(false);
    }
  };

  const fetchTenants = async (id) => {
    setLoading(true);
    try {
      const filters = {};
      if (id) {
        filters.property_id = id;
      }
      console.log("📡 Fetching tenants with filters:", filters);
      const response = await getTenants(filters);
      console.log("✅ Tenants received:", response.data.length);
      setTenants(response.data);
      setFilteredTenants(response.data);
      calculateStats(response.data);
    } catch (error) {
      message.error("Failed to fetch tenants");
      console.error("Error fetching tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const active = data.filter((t) => t.status === "active");
    const vacating = data.filter((t) => t.status === "vacating");
    const vacated = data.filter((t) => t.status === "vacated");

    const totalRent = data.reduce((sum, t) => sum + (t.monthlyRent || 0), 0);
    const collected = data.reduce((sum, t) => sum + (t.collected || 0), 0);
    const outstanding = data.reduce((sum, t) => sum + (t.balance || 0), 0);

    setStats({
      total: data.length,
      active: active.length,
      vacating: vacating.length,
      vacated: vacated.length,
      totalRent,
      collected,
      outstanding,
    });
  };

  const handleAddEdit = async (values) => {
    try {
      const tenantData = {
        ...values,
        property_id: currentPropertyId,
      };

      if (editingTenant) {
        await updateTenant(editingTenant.id, tenantData);
        message.success("Tenant updated successfully");
      } else {
        await addTenant(tenantData);
        message.success("Tenant added successfully");
      }
      setModalVisible(false);
      setEditingTenant(null);
      form.resetFields();
      fetchTenants(currentPropertyId);
      fetchUnits();
    } catch (error) {
      message.error("Operation failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTenant(id);
      message.success("Tenant deleted successfully");
      fetchTenants(currentPropertyId);
      fetchUnits();
    } catch (error) {
      message.error("Failed to delete tenant");
    }
  };

  const handleSearch = () => {
    let filtered = [...tenants];

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name?.toLowerCase().includes(search) ||
          t.houseNo?.toLowerCase().includes(search) ||
          t.phone?.includes(search),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    setFilteredTenants(filtered);
  };

  const clearFilters = () => {
    setSearchText("");
    setStatusFilter("all");
    setFilteredTenants(tenants);
  };

  useEffect(() => {
    handleSearch();
  }, [searchText, statusFilter, tenants]);

  const handleSendMessage = (tenant) => {
    message.success(`Opening chat with ${tenant.name}`);
  };

  const handleViewDetails = (tenant) => {
    setSelectedTenant(tenant);
    setDetailVisible(true);
  };

  const columns = [
    {
      title: "Tenant",
      key: "tenant",
      width: 220,
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar
            style={{
              backgroundColor:
                record.status === "active" ? "#52c41a" : "#faad14",
            }}
            size="large"
          >
            {record.name ? record.name.charAt(0).toUpperCase() : "U"}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              <PhoneOutlined style={{ marginRight: 4 }} />
              {record.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "House",
      dataIndex: "houseNo",
      key: "houseNo",
      width: 100,
      render: (text, record) => (
        <Tag color="blue" style={{ fontWeight: 500 }}>
          {text || record.unit?.unit_number || "N/A"}
        </Tag>
      ),
    },
    {
      title: "Rent",
      dataIndex: "monthlyRent",
      key: "monthlyRent",
      width: 120,
      render: (rent) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>
          {formatCurrency(rent || 0)}
        </span>
      ),
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      width: 120,
      render: (balance) => (
        <span
          style={{
            fontWeight: 600,
            color: balance > 0 ? "#ff4d4f" : "#52c41a",
          }}
        >
          {formatCurrency(balance || 0)}
        </span>
      ),
    },
    {
      title: "Move In",
      dataIndex: "moveInDate",
      key: "moveInDate",
      width: 120,
      render: (date) => (date ? formatDate(date) : "N/A"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status) => (
        <Badge color={getStatusColor(status)} text={getStatusLabel(status)} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => navigate(`/caretaker/tenants/${record.id}`)} // ← UPDATED
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                setEditingTenant(record);
                form.setFieldsValue(record);
                setModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Message">
            <Button
              icon={<MessageOutlined />}
              size="small"
              onClick={() => handleSendMessage(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete Tenant"
              description="Are you sure you want to delete this tenant?"
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

  // Show loading if no property is selected
  if (!currentPropertyId) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
        <h2>Please select a property</h2>
        <p style={{ color: "#8c8c8c" }}>
          Use the property selector in the navbar to view tenants for a specific
          property.
        </p>
      </div>
    );
  }

  // Show loading state while fetching
  if (loading && tenants.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading tenants...</p>
      </div>
    );
  }

  return (
    <div>
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

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-primary">
            <Statistic
              title="Total Tenants"
              value={stats.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-success">
            <Statistic
              title="Active"
              value={stats.active}
              prefix={<HomeOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-warning">
            <Statistic
              title="Total Rent"
              value={stats.totalRent}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-danger">
            <Statistic
              title="Outstanding"
              value={stats.outstanding}
              prefix={<WalletOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table */}
      <Card
        title={
          <Space>
            <UserOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              Manage Tenants
            </span>
            <Tag color="blue">{filteredTenants.length} tenants</Tag>
            {currentPropertyName && (
              <Tag color="green">{currentPropertyName}</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchTenants(currentPropertyId)}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTenant(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              Add Tenant
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
            placeholder="Search by name, house or phone..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder="Filter by status"
          >
            <Option value="all">All Status</Option>
            <Option value="active">Active</Option>
            <Option value="vacating">Vacating</Option>
            <Option value="vacated">Vacated</Option>
          </Select>
          {(searchText || statusFilter !== "all") && (
            <Button onClick={clearFilters}>Clear Filters</Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredTenants}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} tenants`,
            pageSizeOptions: ["10", "20", "50"],
          }}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: (
              <Empty
                description="No tenants found for this property"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      {/* Add/Edit Tenant Modal */}
      <Modal
        title={
          <Space>
            {editingTenant ? (
              <>
                <EditOutlined />
                Edit Tenant
              </>
            ) : (
              <>
                <PlusOutlined />
                Add New Tenant
              </>
            )}
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingTenant(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Alert
          message="Tenant Information"
          description={`Adding tenant to: ${currentPropertyName || "Selected Property"}`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddEdit}
          initialValues={{
            status: "active",
            property_id: currentPropertyId,
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="name"
                label="Full Name"
                rules={[
                  { required: true, message: "Please enter tenant name" },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="John Mwangi"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[
                  { required: true, message: "Please enter phone number" },
                  {
                    pattern: /^0\d{9}$/,
                    message: "Enter valid phone (e.g., 0712345678)",
                  },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="0712345678"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit_id"
                label="Unit / House Number"
                rules={[{ required: true, message: "Please select a unit" }]}
                tooltip="Select the unit/house number for this tenant"
              >
                <Select
                  placeholder="Select unit"
                  size="large"
                  loading={loadingUnits}
                  showSearch
                  optionFilterProp="children"
                  notFoundContent={
                    loadingUnits ? <Spin size="small" /> : "No available units"
                  }
                >
                  {units.map((unit) => (
                    <Option key={unit.id} value={unit.id}>
                      <Space>
                        <HomeOutlined />
                        <span style={{ fontWeight: 500 }}>
                          {unit.unit_number}
                        </span>
                        <Tag
                          color={
                            unit.status === "available" ? "green" : "orange"
                          }
                        >
                          {unit.status}
                        </Tag>
                        {unit.unit_type && (
                          <Tag color="blue">{unit.unit_type}</Tag>
                        )}
                        {unit.monthly_rent && (
                          <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                            Ksh {unit.monthly_rent.toLocaleString()}
                          </span>
                        )}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="monthlyRent"
                label="Monthly Rent (Ksh)"
                rules={[
                  { required: true, message: "Please enter monthly rent" },
                ]}
              >
                <Input
                  prefix={<DollarOutlined />}
                  type="number"
                  placeholder="15000"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deposit" label="Deposit (Ksh)">
                <Input
                  prefix={<DollarOutlined />}
                  type="number"
                  placeholder="15000"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="moveInDate" label="Move In Date">
                <Input type="date" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Select size="large">
                  <Option value="active">Active</Option>
                  <Option value="vacating">Vacating</Option>
                  <Option value="vacated">Vacated</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingTenant(null);
                  form.resetFields();
                }}
                size="large"
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" size="large">
                {editingTenant ? "Update Tenant" : "Add Tenant"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Tenant Details Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined style={{ color: "#1890ff" }} />
            Tenant Details
          </Space>
        }
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedTenant(null);
        }}
        footer={
          <Space>
            <Button
              icon={<WhatsAppOutlined />}
              onClick={() => handleSendMessage(selectedTenant)}
            >
              WhatsApp
            </Button>
            <Button
              icon={<MailOutlined />}
              onClick={() => message.info("Email feature coming soon")}
            >
              Email
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setDetailVisible(false);
                setSelectedTenant(null);
              }}
            >
              Close
            </Button>
          </Space>
        }
        width={600}
      >
        {selectedTenant && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <Avatar
                size={80}
                style={{
                  backgroundColor:
                    selectedTenant.status === "active" ? "#52c41a" : "#faad14",
                  fontSize: 32,
                }}
              >
                {selectedTenant.name
                  ? selectedTenant.name.charAt(0).toUpperCase()
                  : "U"}
              </Avatar>
              <h2 style={{ marginTop: 8 }}>{selectedTenant.name}</h2>
              <Badge
                color={getStatusColor(selectedTenant.status)}
                text={getStatusLabel(selectedTenant.status)}
              />
            </div>

            <Descriptions bordered column={1}>
              <Descriptions.Item label="House Number">
                <Tag color="blue">
                  {selectedTenant.houseNo ||
                    selectedTenant.unit?.unit_number ||
                    "N/A"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                <a href={`tel:${selectedTenant.phone}`}>
                  {selectedTenant.phone || "N/A"}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="Monthly Rent">
                <span style={{ fontWeight: 600, color: "#1890ff" }}>
                  {formatCurrency(selectedTenant.monthlyRent || 0)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Deposit">
                {formatCurrency(selectedTenant.deposit || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="Balance">
                <span
                  style={{
                    fontWeight: 600,
                    color: selectedTenant.balance > 0 ? "#ff4d4f" : "#52c41a",
                  }}
                >
                  {formatCurrency(selectedTenant.balance || 0)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Move In Date">
                {selectedTenant.moveInDate
                  ? formatDate(selectedTenant.moveInDate)
                  : "N/A"}
              </Descriptions.Item>
              {selectedTenant.moveOutDate && (
                <Descriptions.Item label="Move Out Date">
                  {formatDate(selectedTenant.moveOutDate)}
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
                  setEditingTenant(selectedTenant);
                  form.setFieldsValue(selectedTenant);
                  setModalVisible(true);
                }}
              >
                Edit Tenant
              </Button>
              <Button
                icon={<MessageOutlined />}
                block
                onClick={() => handleSendMessage(selectedTenant)}
              >
                Send Message
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageTenants;
