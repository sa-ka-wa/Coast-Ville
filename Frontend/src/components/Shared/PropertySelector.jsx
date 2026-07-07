// components/Shared/PropertySelector.jsx
import React, { useState } from "react";
import {
  Select,
  Space,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  message,
  Tooltip,
} from "antd";
import {
  ApartmentOutlined,
  PlusOutlined,
  SwapOutlined,
  HomeOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useProperty } from "../../context/PropertyContext";
import { addProperty } from "../../services/properties";

const { Option } = Select;

const PropertySelector = () => {
  const {
    properties,
    activeProperty,
    switchProperty,
    addProperty: addPropertyToContext,
    fetchProperties, // Add this
  } = useProperty();
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handlePropertyChange = async (propertyId) => {
    const result = await switchProperty(propertyId);
    if (result.success) {
      message.success(`Switched to ${result.property.name}`);
    } else {
      message.error("Failed to switch property");
    }
  };

  const handleAddProperty = async (values) => {
    setLoading(true);
    try {
      const response = await addProperty(values);
      addPropertyToContext(response.data);
      message.success("Property added successfully!");
      setModalVisible(false);
      form.resetFields();
      await switchProperty(response.data.id);
    } catch (error) {
      message.error("Failed to add property");
    } finally {
      setLoading(false);
    }
  };

  if (!activeProperty) {
    return (
      <Button loading>
        <ApartmentOutlined /> Loading...
      </Button>
    );
  }

  return (
    <>
      <Space size="small">
        <Select
          value={activeProperty.id}
          onChange={handlePropertyChange}
          style={{ width: 220 }}
          placeholder="Select Property"
          popupMatchSelectWidth={300}
          suffixIcon={<ApartmentOutlined />}
        >
          {properties.map((property) => (
            <Option key={property.id} value={property.id}>
              <Space>
                <ApartmentOutlined />
                <span style={{ fontWeight: 500 }}>{property.name}</span>
                <Tag color="blue" style={{ fontSize: 10 }}>
                  {property.total_units || 0} units
                </Tag>
                {property.id === activeProperty.id && (
                  <Tag color="green" style={{ fontSize: 10 }}>
                    <CheckCircleOutlined /> Active
                  </Tag>
                )}
              </Space>
            </Option>
          ))}
        </Select>

        <Tooltip title="Add New Property">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
            size="small"
          />
        </Tooltip>

        <Tooltip title="Refresh Properties">
          <Button
            icon={<SwapOutlined />}
            size="small"
            onClick={() => {
              fetchProperties();
              message.success("Properties refreshed");
            }}
          />
        </Tooltip>
      </Space>

      {/* Add Property Modal */}
      <Modal
        title={
          <Space>
            <HomeOutlined style={{ color: "#1890ff" }} />
            Add New Property
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleAddProperty}>
          <Form.Item
            name="name"
            label="Property Name"
            rules={[{ required: true, message: "Please enter property name" }]}
          >
            <Input
              prefix={<ApartmentOutlined />}
              placeholder="e.g., Sunset Apartments"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
            rules={[{ required: true, message: "Please enter address" }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="123 Mombasa Road"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="city"
            label="City"
            rules={[{ required: true, message: "Please enter city" }]}
          >
            <Input placeholder="Nairobi" size="large" />
          </Form.Item>

          <Form.Item
            name="county"
            label="County"
            rules={[{ required: true, message: "Please enter county" }]}
          >
            <Input placeholder="Nairobi" size="large" />
          </Form.Item>

          <Form.Item name="owner_name" label="Property Owner">
            <Input placeholder="John Doe" size="large" />
          </Form.Item>

          <Form.Item name="owner_phone" label="Owner Phone">
            <Input placeholder="0712345678" size="large" />
          </Form.Item>

          <Form.Item name="owner_email" label="Owner Email">
            <Input type="email" placeholder="owner@example.com" size="large" />
          </Form.Item>

          <Form.Item name="total_units" label="Total Units">
            <Input type="number" placeholder="48" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                }}
                size="large"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
              >
                Add Property
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default PropertySelector;
