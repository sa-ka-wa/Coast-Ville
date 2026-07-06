// components/Admin/PaymentManagement/PaymentHistory.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Space,
  Input,
  DatePicker,
  Button,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { getPaymentHistory } from "../../../services/payments";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "../../../utils/formatters";

const { RangePicker } = DatePicker;

const PaymentHistory = () => {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await getPaymentHistory(filters);
      setPayments(response.data);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Receipt No",
      dataIndex: "receiptNo",
      key: "receiptNo",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Tenant",
      key: "tenant",
      render: (_, record) => (
        <div>
          <div>{record.tenantName}</div>
          <small>{record.houseNo}</small>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => formatCurrency(amount),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
    },
    {
      title: "Method",
      dataIndex: "method",
      key: "method",
      render: (method) => (
        <Tag color={method === "mpesa" ? "green" : "blue"}>
          {method.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View Receipt">
            <Button icon={<EyeOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="Download">
            <Button icon={<DownloadOutlined />} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Payment History"
      extra={
        <Space>
          <Input
            placeholder="Search tenant..."
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <RangePicker
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
          />
          <Button type="primary" onClick={() => fetchPayments()}>
            Filter
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={payments}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Total ${total} payments`,
        }}
        scroll={{ x: 800 }}
      />
    </Card>
  );
};

export default PaymentHistory;
