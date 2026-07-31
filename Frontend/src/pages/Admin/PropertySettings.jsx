// pages/Admin/PropertySettings.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Tabs,
  InputNumber,
  Switch,
  Divider,
  Row,
  Col,
  Space,
  Alert,
  Descriptions,
  Tag,
  Select,
  Upload,
  Statistic,
} from "antd";
import {
  DollarOutlined,
  BankOutlined,
  PhoneOutlined,
  SettingOutlined,
  SaveOutlined,
  HomeOutlined,
  UserOutlined,
  MailOutlined,
  EnvironmentOutlined,
  SafetyOutlined,
  UploadOutlined,
  MobileOutlined,
} from "@ant-design/icons";
import { useProperty } from "../../context/PropertyContext";
import { updateProperty } from "../../services/properties";

const { Option } = Select;

const PropertySettings = () => {
  const { activeProperty, refreshProperties } = useProperty();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("billing");

  useEffect(() => {
    if (activeProperty) {
      form.setFieldsValue({
        name: activeProperty.name,
        address: activeProperty.address,
        city: activeProperty.city,
        county: activeProperty.county,
        owner_name: activeProperty.owner_name,
        owner_phone: activeProperty.owner_phone,
        owner_email: activeProperty.owner_email,
        water_rate: activeProperty.water_rate || 70,
        garbage_fee: activeProperty.garbage_fee || 300,
        late_fee_percentage: activeProperty.late_fee_percentage || 5,
        // ✅ M-Pesa Paybill fields
        mpesa_paybill: activeProperty.mpesa_paybill || "247247",
        mpesa_account_prefix: activeProperty.mpesa_account_prefix || "",
        payment_phone_number: activeProperty.payment_phone_number,
        payment_account_name: activeProperty.payment_account_name,
        bank_name: activeProperty.bank_name,
        bank_account_number: activeProperty.bank_account_number,
        bank_branch: activeProperty.bank_branch,
        manager_name: activeProperty.manager_name,
        manager_phone: activeProperty.manager_phone,
        manager_email: activeProperty.manager_email,
        office_hours: activeProperty.office_hours,
        emergency_contact: activeProperty.emergency_contact,
        has_security: activeProperty.has_security,
        has_water: activeProperty.has_water,
        has_electricity: activeProperty.has_electricity,
        parking_spaces: activeProperty.parking_spaces || 0,
        amenities: activeProperty.amenities,
      });
    }
  }, [activeProperty, form]);

  const handleSubmit = async (values) => {
    if (!activeProperty) {
      message.error("No property selected");
      return;
    }

    setLoading(true);
    try {
      await updateProperty(activeProperty.id, values);
      message.success("Property settings updated successfully!");
      refreshProperties();
    } catch (error) {
      console.error("Update error:", error);
      message.error("Failed to update property settings");
    } finally {
      setLoading(false);
    }
  };

  if (!activeProperty) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
        <h2>Please select a property</h2>
        <p style={{ color: "#8c8c8c" }}>
          Use the property selector in the navbar to configure settings for a
          specific property.
        </p>
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
        <Row align="middle" justify="space-between">
          <Col>
            <h2 style={{ color: "white", margin: 0 }}>
              <HomeOutlined style={{ marginRight: 8 }} />
              {activeProperty.name}
            </h2>
            <div style={{ color: "rgba(255,255,255,0.8)" }}>
              <EnvironmentOutlined style={{ marginRight: 4 }} />
              {activeProperty.address}
              {activeProperty.city && `, ${activeProperty.city}`}
              {activeProperty.county && `, ${activeProperty.county}`}
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
              <Tag color="blue">ID: {activeProperty.id}</Tag>
              <Tag color={activeProperty.status === "active" ? "green" : "red"}>
                {activeProperty.status}
              </Tag>
              {activeProperty.total_units && (
                <Tag color="cyan">{activeProperty.total_units} units</Tag>
              )}
            </div>
          </Col>
          <Col>
            <Button
              type="primary"
              ghost
              icon={<SaveOutlined />}
              onClick={() => form.submit()}
              loading={loading}
            >
              Save Changes
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Settings Form */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* Tab 1: Billing Settings */}
          <Tabs.TabPane
            tab={
              <span>
                <DollarOutlined /> Billing
              </span>
            }
            key="billing"
          >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Alert
                message="Billing Settings"
                description="Configure water rates, garbage fees, and late payment charges for this property."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="water_rate"
                    label="Water Rate (per unit)"
                    rules={[
                      { required: true, message: "Please enter water rate" },
                    ]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      step={5}
                      prefix="KSh"
                      placeholder="70"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="garbage_fee"
                    label="Monthly Garbage Fee"
                    rules={[
                      { required: true, message: "Please enter garbage fee" },
                    ]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      step={50}
                      prefix="KSh"
                      placeholder="300"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="late_fee_percentage"
                    label="Late Fee Percentage"
                    rules={[
                      { required: true, message: "Please enter late fee" },
                    ]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      max={100}
                      step={1}
                      suffix="%"
                      placeholder="5"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>Current Rates</Divider>

              <Row gutter={16}>
                <Col span={8}>
                  <Card size="small">
                    <Statistic
                      title="Water Rate"
                      value={form.getFieldValue("water_rate") || 70}
                      prefix="KSh"
                      suffix="/unit"
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <Statistic
                      title="Garbage Fee"
                      value={form.getFieldValue("garbage_fee") || 300}
                      prefix="KSh"
                      suffix="/month"
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <Statistic
                      title="Late Fee"
                      value={form.getFieldValue("late_fee_percentage") || 5}
                      suffix="%"
                    />
                  </Card>
                </Col>
              </Row>
            </Form>
          </Tabs.TabPane>

          {/* Tab 2: Payment Instructions - UPDATED with M-Pesa Paybill */}
          <Tabs.TabPane
            tab={
              <span>
                <BankOutlined /> Payment
              </span>
            }
            key="payment"
          >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Alert
                message="Payment Instructions"
                description="Configure how tenants should pay for this property."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              {/* ✅ NEW: M-Pesa Paybill Section */}
              <Divider orientation="left">
                <MobileOutlined /> M-Pesa Paybill
              </Divider>

              <Alert
                message="📱 M-Pesa Paybill Configuration"
                description="Configure the Paybill number and account prefix for this property. Tenants will use: Paybill#Account (e.g., 247247#40766915#101)"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="mpesa_paybill"
                    label="Paybill Number"
                    tooltip="The Paybill number for this property (e.g., 247247)"
                    rules={[
                      {
                        required: true,
                        message: "Please enter Paybill number",
                      },
                    ]}
                  >
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder="e.g., 247247"
                      size="large"
                      defaultValue="247247"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="mpesa_account_prefix"
                    label="Account Prefix"
                    tooltip="Last 8 digits of the owner's phone number (e.g., 40766915)"
                    rules={[
                      {
                        required: true,
                        message: "Please enter account prefix",
                      },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="e.g., 40766915"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col xs={24}>
                  <div
                    style={{
                      background: "#f6ffed",
                      padding: "12px 16px",
                      borderRadius: 8,
                      border: "1px solid #b7eb8f",
                    }}
                  >
                    <strong>📱 Example Format:</strong>
                    <div style={{ marginTop: 8 }}>
                      Paybill: <Tag color="blue">247247</Tag>
                      Account:{" "}
                      <Tag color="green">
                        {form.getFieldValue("mpesa_account_prefix") ||
                          "40766915"}
                        #101
                      </Tag>
                    </div>
                    <div style={{ marginTop: 4, color: "#666", fontSize: 13 }}>
                      Where{" "}
                      <strong>
                        {form.getFieldValue("mpesa_account_prefix") ||
                          "40766915"}
                      </strong>{" "}
                      is the account prefix and <strong>101</strong> is the
                      house number
                    </div>
                  </div>
                </Col>
              </Row>

              <Divider orientation="left">M-Pesa / Paybill</Divider>

              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="payment_phone_number"
                    label="Paybill/Till Number"
                    tooltip="The paybill or till number for this property"
                  >
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder="e.g., 123456"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="payment_account_name"
                    label="Account Name"
                    tooltip="The account name to use when paying"
                  >
                    <Input placeholder="e.g., Sunset Apartments" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Bank Transfer</Divider>

              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item name="bank_name" label="Bank Name">
                    <Input placeholder="e.g., Equity Bank" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="bank_branch" label="Bank Branch">
                    <Input placeholder="e.g., Westlands Branch" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="bank_account_number" label="Account Number">
                    <Input placeholder="e.g., 1234567890" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>Payment Summary</Divider>

              <Card>
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Paybill Number">
                    {form.getFieldValue("mpesa_paybill") || "Not configured"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Account Prefix">
                    {form.getFieldValue("mpesa_account_prefix") ||
                      "Not configured"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Example Account">
                    {form.getFieldValue("mpesa_account_prefix") ? (
                      <Tag color="green">
                        {form.getFieldValue("mpesa_account_prefix")}#101
                      </Tag>
                    ) : (
                      "Not configured"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Paybill/Till">
                    {form.getFieldValue("payment_phone_number") ||
                      "Not configured"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Account Name">
                    {form.getFieldValue("payment_account_name") ||
                      "Not configured"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Bank">
                    {form.getFieldValue("bank_name") || "Not configured"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Bank Account">
                    {form.getFieldValue("bank_account_number") ||
                      "Not configured"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Form>
          </Tabs.TabPane>

          {/* Tab 3: Property Manager */}
          <Tabs.TabPane
            tab={
              <span>
                <UserOutlined /> Manager
              </span>
            }
            key="manager"
          >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Alert
                message="Property Manager Details"
                description="Configure contact information for the property manager."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item name="manager_name" label="Manager Name">
                    <Input placeholder="e.g., John Doe" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="manager_phone" label="Manager Phone">
                    <Input placeholder="e.g., 0712345678" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="manager_email" label="Manager Email">
                    <Input
                      placeholder="e.g., manager@example.com"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="office_hours" label="Office Hours">
                    <Input placeholder="e.g., Mon-Fri 8am-5pm" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="emergency_contact" label="Emergency Contact">
                    <Input placeholder="e.g., 0712345678" size="large" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Tabs.TabPane>

          {/* Tab 4: Property Features */}
          <Tabs.TabPane
            tab={
              <span>
                <SafetyOutlined /> Features
              </span>
            }
            key="features"
          >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Alert
                message="Property Features"
                description="Configure amenities and features available at this property."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Row gutter={24}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="has_security"
                    label="Security"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="has_water"
                    label="Water Supply"
                    valuePropName="checked"
                  >
                    <Switch defaultChecked />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="has_electricity"
                    label="Electricity"
                    valuePropName="checked"
                  >
                    <Switch defaultChecked />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="parking_spaces" label="Parking Spaces">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="amenities"
                    label="Amenities"
                    tooltip="Comma-separated list of amenities"
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="e.g., Swimming Pool, Gym, Playground, Clubhouse"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>Current Features</Divider>

              <Row gutter={16}>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title="Security"
                      value={
                        form.getFieldValue("has_security") ? "✅ Yes" : "❌ No"
                      }
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title="Water Supply"
                      value={
                        form.getFieldValue("has_water") ? "✅ Yes" : "❌ No"
                      }
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title="Electricity"
                      value={
                        form.getFieldValue("has_electricity")
                          ? "✅ Yes"
                          : "❌ No"
                      }
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title="Parking Spaces"
                      value={form.getFieldValue("parking_spaces") || 0}
                    />
                  </Card>
                </Col>
              </Row>

              {form.getFieldValue("amenities") && (
                <div style={{ marginTop: 16 }}>
                  <strong>Amenities:</strong>
                  <div style={{ marginTop: 8 }}>
                    {form
                      .getFieldValue("amenities")
                      .split(",")
                      .map((item, index) => (
                        <Tag key={index} color="blue" style={{ margin: 4 }}>
                          {item.trim()}
                        </Tag>
                      ))}
                  </div>
                </div>
              )}
            </Form>
          </Tabs.TabPane>
        </Tabs>

        {/* Save Button at Bottom */}
        <div style={{ marginTop: 24, textAlign: "right" }}>
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={loading}
          >
            Save All Settings
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PropertySettings;
