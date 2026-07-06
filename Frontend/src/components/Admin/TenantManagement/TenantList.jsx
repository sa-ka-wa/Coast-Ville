// components/Admin/TenantManagement/TenantList.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Badge,
  Modal,
  Form,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  getTenants,
  addTenant,
  updateTenant,
  deleteTenant,
} from "../../../services/tenants";
import {
  formatCurrency,
  getStatusColor,
  getStatusLabel,
} from "../../../utils/formatters";

const TenantList = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await getTenants();
      setTenants(response.data);
    } catch (error) {
      message.error("Failed to fetch tenants");
    } finally {
      setLoading(false);
    }
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
    Modal.confirm({
      title: "Delete Tenant",
      content: "Are you sure you want to delete this tenant?",
      onOk: async () => {
        await deleteTenant(id);
        message.success("Tenant deleted");
        fetchTenants();
      },
    });
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <div>
          <strong>{name}</strong>
          <br />
          <small>{record.phone}</small>
        </div>
      ),
    },
    {
      title: "House",
      dataIndex: "houseNo",
      key: "houseNo",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Rent",
      dataIndex: "monthlyRent",
      key: "monthlyRent",
      render: (rent) => formatCurrency(rent),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Badge color={getStatusColor(status)} text={getStatusLabel(status)} />
      ),
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      render: (balance) => formatCurrency(balance || 0),
    },
    {
      title: "Move In",
      dataIndex: "moveInDate",
      key: "moveInDate",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setEditingTenant(record);
              form.setFieldsValue(record);
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

  return (
    <Card
      title="Tenants"
      extra={
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
      }
    >
      <Table
        columns={columns}
        dataSource={tenants}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 800 }}
      />

      <Modal
        title={editingTenant ? "Edit Tenant" : "Add Tenant"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingTenant(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleAddEdit}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter tenant name" }]}
          >
            <Input placeholder="John Mwangi" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[{ required: true, message: "Please enter phone number" }]}
          >
            <Input placeholder="0712345678" />
          </Form.Item>

          <Form.Item
            name="houseNo"
            label="House Number"
            rules={[{ required: true, message: "Please enter house number" }]}
          >
            <Input placeholder="A03" />
          </Form.Item>

          <Form.Item
            name="monthlyRent"
            label="Monthly Rent (Ksh)"
            rules={[{ required: true, message: "Please enter monthly rent" }]}
          >
            <Input type="number" placeholder="15000" />
          </Form.Item>

          <Form.Item name="deposit" label="Deposit (Ksh)">
            <Input type="number" placeholder="15000" />
          </Form.Item>

          <Form.Item
            name="moveInDate"
            label="Move In Date"
            rules={[{ required: true }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="active">
            <select>
              <option value="active">Active</option>
              <option value="vacating">Vacating</option>
              <option value="vacated">Vacated</option>
            </select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingTenant ? "Update" : "Add"} Tenant
              </Button>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingTenant(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TenantList;
