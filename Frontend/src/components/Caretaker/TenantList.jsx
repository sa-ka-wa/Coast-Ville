// components/Caretaker/TenantList.jsx
import React, { useState } from "react";
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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";

const TenantList = () => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Mock data
  const data = [
    {
      id: 1,
      name: "John Mwangi",
      house: "A03",
      phone: "0712345678",
      status: "Active",
      rent: 15000,
    },
    {
      id: 2,
      name: "Mary Wanjiku",
      house: "B12",
      phone: "0723456789",
      status: "Active",
      rent: 12000,
    },
    {
      id: 3,
      name: "Peter Ochieng",
      house: "C05",
      phone: "0734567890",
      status: "Active",
      rent: 18000,
    },
  ];

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <div>
          <div>
            <strong>{name}</strong>
          </div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>{record.phone}</div>
        </div>
      ),
    },
    {
      title: "House",
      dataIndex: "house",
      key: "house",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Rent",
      dataIndex: "rent",
      key: "rent",
      render: (rent) => `Ksh ${rent.toLocaleString()}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (text) => (
        <Tag color={text === "Active" ? "green" : "red"}>{text}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" />
          <Button icon={<DeleteOutlined />} size="small" danger />
        </Space>
      ),
    },
  ];

  const handleAddTenant = async (values) => {
    setLoading(true);
    try {
      message.success("Tenant added successfully!");
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error("Failed to add tenant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Tenant Management"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          Add Tenant
        </Button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search tenants..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        pagination={{ pageSize: 5 }}
      />

      <Modal
        title="Add New Tenant"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddTenant}>
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
            name="house"
            label="House Number"
            rules={[{ required: true, message: "Please enter house number" }]}
          >
            <Input placeholder="A03" />
          </Form.Item>

          <Form.Item
            name="rent"
            label="Monthly Rent (Ksh)"
            rules={[{ required: true, message: "Please enter monthly rent" }]}
          >
            <Input type="number" placeholder="15000" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Add Tenant
              </Button>
              <Button
                onClick={() => {
                  setModalVisible(false);
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
