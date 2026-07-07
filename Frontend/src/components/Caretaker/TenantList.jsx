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
  Spin,
  Badge,
  Avatar,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  HomeOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
// FIXED: Correct path is ../../services/tenants (go up 2 levels from components/Caretaker)
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
  getInitials,
} from "../../utils/formatters";

const TenantList = () => {
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await getTenants();
      console.log("📊 Tenants from API:", response.data);
      setTenants(response.data);
      setFilteredTenants(response.data);
    } catch (error) {
      message.error("Failed to fetch tenants");
      console.error("Error fetching tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchText) {
      const filtered = tenants.filter(
        (tenant) =>
          tenant.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          tenant.houseNo?.toLowerCase().includes(searchText.toLowerCase()) ||
          tenant.phone?.includes(searchText),
      );
      setFilteredTenants(filtered);
    } else {
      setFilteredTenants(tenants);
    }
  }, [searchText, tenants]);

  const handleAddEdit = async (values) => {
    setLoading(true);
    try {
      const tenantData = {
        property_id: parseInt(values.property_id) || 1,
        name: values.name,
        phone: values.phone,
        email: values.email || "",
        monthly_rent: parseFloat(values.monthlyRent),
        deposit: parseFloat(values.deposit) || 0,
        move_in_date:
          values.moveInDate || new Date().toISOString().split("T")[0],
        status: values.status || "active",
      };

      if (editingTenant) {
        await updateTenant(editingTenant.id, tenantData);
        message.success("Tenant updated successfully!");
      } else {
        await addTenant(tenantData);
        message.success("Tenant added successfully!");
      }
      setModalVisible(false);
      setEditingTenant(null);
      form.resetFields();
      fetchTenants();
    } catch (error) {
      message.error(error.message || "Operation failed");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: "Delete Tenant",
      content: "Are you sure you want to delete this tenant?",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await deleteTenant(id);
          message.success("Tenant deleted successfully!");
          fetchTenants();
        } catch (error) {
          message.error("Failed to delete tenant");
        }
      },
    });
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
            {getInitials(record.name)}
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
      render: (text) => <Tag color="blue">{text || "N/A"}</Tag>,
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
      title: "Move In",
      dataIndex: "moveInDate",
      key: "moveInDate",
      width: 120,
      render: (date) => formatDate(date),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => (
        <Badge color={getStatusColor(status)} text={getStatusLabel(status)} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setEditingTenant(record);
              form.setFieldsValue({
                name: record.name,
                phone: record.phone,
                email: record.email,
                houseNo: record.houseNo,
                property_id: record.property_id,
                monthlyRent: record.monthlyRent,
                deposit: record.deposit,
                moveInDate: record.moveInDate,
                status: record.status,
              });
              setModalVisible(true);
            }}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingTenant(null);
    form.resetFields();
  };

  if (loading && tenants.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Loading tenants...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <HomeOutlined style={{ color: "#1890ff" }} />
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            Tenant Management
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
      <div
        style={{ marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap" }}
      >
        <Input
          placeholder="Search by name, house or phone..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 350 }}
          allowClear
        />
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
        scroll={{ x: 900 }}
        locale={{
          emptyText: loading ? <Spin /> : "No tenants found",
        }}
      />

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
        onCancel={handleModalCancel}
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
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter tenant name" }]}
          >
            <Input placeholder="John Mwangi" size="large" />
          </Form.Item>

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
            <Input placeholder="0712345678" size="large" />
          </Form.Item>

          <Form.Item name="email" label="Email">
            <Input placeholder="john@example.com" size="large" type="email" />
          </Form.Item>

          <Form.Item name="houseNo" label="House Number">
            <Input placeholder="A03" size="large" />
          </Form.Item>

          <Form.Item
            name="property_id"
            label="Property ID"
            rules={[{ required: true, message: "Please enter property ID" }]}
          >
            <Input type="number" placeholder="1" size="large" />
          </Form.Item>

          <Form.Item
            name="monthlyRent"
            label="Monthly Rent (Ksh)"
            rules={[{ required: true, message: "Please enter monthly rent" }]}
          >
            <Input type="number" placeholder="15000" size="large" />
          </Form.Item>

          <Form.Item name="deposit" label="Deposit (Ksh)">
            <Input type="number" placeholder="15000" size="large" />
          </Form.Item>

          <Form.Item name="moveInDate" label="Move In Date">
            <Input type="date" size="large" />
          </Form.Item>

          <Form.Item name="status" label="Status">
            <select
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #d9d9d9",
                fontSize: "16px",
              }}
            >
              <option value="active">Active</option>
              <option value="vacating">Vacating</option>
              <option value="vacated">Vacated</option>
            </select>
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={handleModalCancel} size="large">
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
              >
                {editingTenant ? "Update" : "Add"} Tenant
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TenantList;
