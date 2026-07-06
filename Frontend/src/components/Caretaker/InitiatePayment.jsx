// components/Caretaker/InitiatePayment.jsx
import React, { useState } from "react";
import { Card, Form, Input, Button, Select, message, Alert } from "antd";
import { initiateSTKPush } from "../../services/payments";
import { formatCurrency } from "../../utils/formatters";

const InitiatePayment = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await initiateSTKPush({
        phone: values.phone,
        amount: values.amount,
        tenantId: values.tenantId,
        description: values.description || "Rent Payment",
      });

      setResult({
        success: true,
        message: `STK Push sent to ${values.phone}`,
        data: response.data,
      });

      message.success("STK Push initiated successfully");
      form.resetFields();
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.message || "Failed to initiate payment",
      });
      message.error("Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Initiate M-Pesa Payment (STK Push)">
      <Alert
        message="How it works"
        description="Send a payment request directly to the tenant's phone. They will receive an M-Pesa STK push to complete the payment."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="tenantId"
          label="Tenant"
          rules={[{ required: true, message: "Please select a tenant" }]}
        >
          <Select placeholder="Select tenant" size="large">
            <Select.Option value="1">
              John Mwangi - A03 (Ksh 15,000)
            </Select.Option>
            <Select.Option value="2">
              Mary Wanjiku - B12 (Ksh 12,000)
            </Select.Option>
            <Select.Option value="3">
              Peter Ochieng - C05 (Ksh 18,000)
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount (Ksh)"
          rules={[{ required: true, message: "Please enter amount" }]}
        >
          <Input type="number" placeholder="15000" size="large" prefix="Ksh" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Phone Number"
          rules={[
            { required: true, message: "Please enter phone number" },
            { pattern: /^0\d{9}$/, message: "Please enter valid phone number" },
          ]}
        >
          <Input placeholder="0712345678" size="large" />
        </Form.Item>

        <Form.Item name="description" label="Payment Description">
          <Input placeholder="Rent for July 2026" />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          size="large"
          block
        >
          Send STK Push
        </Button>
      </Form>

      {result && (
        <Alert
          message={result.success ? "✅ STK Push Sent" : "❌ Failed"}
          description={result.message}
          type={result.success ? "success" : "error"}
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default InitiatePayment;
