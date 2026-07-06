// components/Caretaker/ExpensesForm.jsx
import React, { useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Table,
  Select,
  DatePicker,
  Space,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";

const ExpensesForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const newExpense = {
        id: Date.now(),
        category: values.category,
        description: values.description,
        amount: values.amount,
        date: values.date
          ? values.date.format("YYYY-MM-DD")
          : new Date().toLocaleDateString(),
      };

      setExpenses([newExpense, ...expenses]);
      message.success("Expense recorded successfully!");
      form.resetFields();
    } catch (error) {
      message.error("Failed to record expense");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "Category", dataIndex: "category", key: "category" },
    { title: "Description", dataIndex: "description", key: "description" },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => `Ksh ${amount.toLocaleString()}`,
    },
    { title: "Date", dataIndex: "date", key: "date" },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          icon={<DeleteOutlined />}
          size="small"
          danger
          onClick={() => {
            setExpenses(expenses.filter((e) => e.id !== record.id));
            message.success("Expense deleted");
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <Card title="Record Expense">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: "Please select a category" }]}
          >
            <Select placeholder="Select category">
              <Select.Option value="Repairs">Repairs</Select.Option>
              <Select.Option value="Cleaning">Cleaning</Select.Option>
              <Select.Option value="Gardening">Gardening</Select.Option>
              <Select.Option value="Security">Security</Select.Option>
              <Select.Option value="Utilities">Utilities</Select.Option>
              <Select.Option value="Maintenance">Maintenance</Select.Option>
              <Select.Option value="Other">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please enter description" }]}
          >
            <Input.TextArea rows={3} placeholder="Describe the expense..." />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (Ksh)"
            rules={[{ required: true, message: "Please enter amount" }]}
          >
            <Input type="number" placeholder="5000" />
          </Form.Item>

          <Form.Item name="date" label="Date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Record Expense
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Recent Expenses" style={{ marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={expenses}
          rowKey="id"
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
};

export default ExpensesForm;
