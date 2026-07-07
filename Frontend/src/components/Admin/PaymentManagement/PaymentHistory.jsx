// src/components/Admin/PaymentManagement/PaymentHistory.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  message,
  Badge,
  Avatar,
  Tooltip,
  Empty,
  Spin,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  DownloadOutlined,
  HomeOutlined,
  DollarOutlined,
  FilterOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { getPayments, generateReceipt } from "../../../services/payments";
import { useProperty } from "../../../context/PropertyContext";
import { formatCurrency, formatDate } from "../../../utils/formatters";

const { Option } = Select;

const PaymentHistory = () => {
  const { activeProperty } = useProperty();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const currentPropertyId = activeProperty?.id;

  useEffect(() => {
    if (currentPropertyId) {
      fetchPayments();
    } else {
      setPayments([]);
      setFilteredPayments([]);
    }
  }, [currentPropertyId]);

  const fetchPayments = async () => {
    if (!currentPropertyId) return;

    setLoading(true);
    try {
      const response = await getPayments({ property_id: currentPropertyId });
      setPayments(response.data || []);
      setFilteredPayments(response.data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      message.error("Failed to fetch payment history");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    let filtered = [...payments];

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.tenantName || "").toLowerCase().includes(search) ||
          (p.receipt_no || "").toLowerCase().includes(search) ||
          (p.mpesa_code || "").toLowerCase().includes(search),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (methodFilter !== "all") {
      filtered = filtered.filter((p) => p.payment_method === methodFilter);
    }

    setFilteredPayments(filtered);
  };

  const clearFilters = () => {
    setSearchText("");
    setStatusFilter("all");
    setMethodFilter("all");
    setFilteredPayments(payments);
  };

  useEffect(() => {
    handleSearch();
  }, [searchText, statusFilter, methodFilter, payments]);

  const handleViewReceipt = async (paymentId) => {
    try {
      const response = await generateReceipt(paymentId);
      const receipt = response.data.receipt || response.data;
      message.success(`Receipt ${receipt.receipt_no} generated`);
    } catch (error) {
      console.error("Error generating receipt:", error);
      message.error("Failed to generate receipt");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "green";
      case "pending":
        return "orange";
      case "failed":
        return "red";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "paid":
        return "Paid";
      case "pending":
        return "Pending";
      case "failed":
        return "Failed";
      default:
        return status || "N/A";
    }
  };

  const columns = [
    {
      title: "Receipt",
      dataIndex: "receipt_no",
      key: "receipt_no",
      render: (text) => <Tag color="blue">{text || "N/A"}</Tag>,
    },
    {
      title: "Tenant",
      key: "tenant",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar size="small" style={{ backgroundColor: "#1890ff" }}>
            {(record.tenantName || "U")[0].toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.tenantName || "N/A"}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              <HomeOutlined style={{ marginRight: 4 }} />
              {record.houseNo || "N/A"}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => (
        <span style={{ fontWeight: 600, color: "#52c41a" }}>
          {formatCurrency(amount || 0)}
        </span>
      ),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
    },
    {
      title: "Method",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method) => {
        const methodLabels = {
          mpesa: "📱 M-Pesa",
          cash: "💵 Cash",
          bank: "🏦 Bank",
          cheque: "📄 Cheque",
        };
        return methodLabels[method] || method || "N/A";
      },
    },
    {
      title: "Reference",
      dataIndex: "mpesa_code",
      key: "mpesa_code",
      render: (text) => text || "N/A",
    },
    {
      title: "Date",
      dataIndex: "payment_date",
      key: "payment_date",
      render: (date) => (date ? formatDate(date) : "N/A"),
      sorter: (a, b) => {
        if (!a.payment_date) return 1;
        if (!b.payment_date) return -1;
        return new Date(a.payment_date) - new Date(b.payment_date);
      },
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
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Receipt">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewReceipt(record.id)}
            />
          </Tooltip>
          <Tooltip title="Download">
            <Button icon={<DownloadOutlined />} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (!currentPropertyId) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p style={{ color: "#8c8c8c" }}>
            Please select a property to view payment history
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <DollarOutlined style={{ color: "#1890ff" }} />
          <span>Payment History</span>
          <Tag color="blue">{filteredPayments.length} records</Tag>
          {activeProperty?.name && (
            <Tag color="green">{activeProperty.name}</Tag>
          )}
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchPayments}
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Input
          placeholder="Search by tenant, receipt or reference..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
          placeholder="Filter by status"
        >
          <Option value="all">All Status</Option>
          <Option value="paid">Paid</Option>
          <Option value="pending">Pending</Option>
          <Option value="failed">Failed</Option>
        </Select>
        <Select
          value={methodFilter}
          onChange={setMethodFilter}
          style={{ width: 150 }}
          placeholder="Filter by method"
        >
          <Option value="all">All Methods</Option>
          <Option value="mpesa">📱 M-Pesa</Option>
          <Option value="cash">💵 Cash</Option>
          <Option value="bank">🏦 Bank</Option>
          <Option value="cheque">📄 Cheque</Option>
        </Select>
        <Space>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={handleSearch}
          >
            Filter
          </Button>
          <Button icon={<ClearOutlined />} onClick={clearFilters}>
            Clear
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredPayments}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Total ${total} payments`,
          pageSizeOptions: ["10", "20", "50"],
        }}
        scroll={{ x: 1000 }}
        locale={{
          emptyText: (
            <Empty
              description="No payments found for this property"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />
    </Card>
  );
};

export default PaymentHistory;
