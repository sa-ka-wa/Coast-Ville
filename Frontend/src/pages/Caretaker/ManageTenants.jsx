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
  Tabs,
  Descriptions,
  DatePicker,
  Upload,
  Progress,
  Alert,
  Switch,
  Divider,
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
  CalendarOutlined,
  ExportOutlined,
  ImportOutlined,
  FileTextOutlined,
  EyeOutlined,
  MessageOutlined,
  MailOutlined,
  WhatsAppOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  ApartmentOutlined,
  WalletOutlined,
} from "@ant-design/icons";
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

const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

const ManageTenants = () => {
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
  const [activeTab, setActiveTab] = useState("list");

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

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await getTenants();
      setTenants(response.data);
      setFilteredTenants(response.data);
      calculateStats(response.data);
    } catch (error) {
      message.error("Failed to fetch tenants");
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
      if (editingTenant) {
        await updateTenant(editingTenant.id, values);
        message.success("Tenant updated successfully");
      } else {
        await addTenant(values);
        message.success("Tenant added successfully");
      }
      setModalVisible(false);
      setEditingTenant(null);
      form.resetFields();
      fetchTenants();
    } catch (error) {
      message.error("Operation failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTenant(id);
      message.success("Tenant deleted successfully");
      fetchTenants();
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
          t.name.toLowerCase().includes(search) ||
          t.houseNo.toLowerCase().includes(search) ||
          t.phone.includes(search),
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
  }, [searchText, statusFilter]);

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
      render: (text) => (
        <Tag color="blue" style={{ fontWeight: 500 }}>
          {text}
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
          {formatCurrency(rent)}
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
              onClick={() => handleViewDetails(record)}
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

  return (
    <div>
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
              icon={<WhatsAppOutlined />}
              onClick={() => message.info("WhatsApp integration coming soon")}
            >
              Broadcast
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={() => message.info("Export feature coming soon")}
            >
              Export
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
                description="No tenants found. Add your first tenant!"
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
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddEdit}
          initialValues={{
            status: "active",
          }}
        >
          <Alert
            message="Tenant Information"
            description="Fill in the tenant details below. All fields marked with * are required."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

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
                name="houseNo"
                label="House Number"
                rules={[
                  { required: true, message: "Please enter house number" },
                ]}
              >
                <Input
                  prefix={<HomeOutlined />}
                  placeholder="A03"
                  size="large"
                />
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
              <Form.Item
                name="moveInDate"
                label="Move In Date"
                rules={[
                  { required: true, message: "Please select move in date" },
                ]}
              >
                <Input type="date" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true }]}
              >
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
                <Tag color="blue">{selectedTenant.houseNo}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                <a href={`tel:${selectedTenant.phone}`}>
                  {selectedTenant.phone}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="Monthly Rent">
                <span style={{ fontWeight: 600, color: "#1890ff" }}>
                  {formatCurrency(selectedTenant.monthlyRent)}
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
                {formatDate(selectedTenant.moveInDate)}
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
