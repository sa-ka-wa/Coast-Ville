// pages/Admin/Payments.jsx
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
  Tabs,
  Alert,
  Descriptions,
  Badge,
  Empty,
  DatePicker,
  Progress,
  Divider,
  Upload,
} from "antd";
import {
  DollarOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  WhatsAppOutlined,
  MailOutlined,
  PrinterOutlined,
  SendOutlined,
  HistoryOutlined,
  WalletOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import {
  getPaymentHistory,
  confirmPayment,
  initiateSTKPush,
  getPropertyStats,
  getPaymentSummary,
} from "../../services/payments";
import { getTenants } from "../../services/tenants";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "../../utils/formatters";
import PaymentParser from "../../components/Admin/PaymentManagement/PaymentParser";
import PaymentHistory from "../../components/Admin/PaymentManagement/PaymentHistory";

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const Payments = () => {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    late: 0,
  });
  const [summary, setSummary] = useState({
    totalCollected: 0,
    expectedRent: 0,
    outstanding: 0,
    occupancy: 0,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [activeTab, setActiveTab] = useState("parser");
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, tenantsRes, statsRes, summaryRes] = await Promise.all(
        [
          getPaymentHistory(),
          getTenants(),
          getPropertyStats(),
          getPaymentSummary(),
        ],
      );

      setPayments(paymentsRes.data || []);
      setTenants(tenantsRes.data || []);
      setStats(statsRes.data || { total: 0, paid: 0, pending: 0, late: 0 });
      setSummary(
        summaryRes.data || {
          totalCollected: 0,
          expectedRent: 0,
          outstanding: 0,
          occupancy: 0,
        },
      );
    } catch (error) {
      message.error("Failed to fetch payment data");
    } finally {
      setLoading(false);
    }
  };

  const handleSTKPush = async (values) => {
    try {
      await initiateSTKPush({
        phone: values.phone,
        amount: values.amount,
        tenantId: values.tenantId,
        description: values.description || "Rent Payment",
      });
      message.success("STK Push sent successfully");
      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error("Failed to send STK Push");
    }
  };

  const handleViewReceipt = (payment) => {
    setSelectedPayment(payment);
    setReceiptVisible(true);
  };

  const handleDownloadReceipt = (payment) => {
    message.success("Receipt downloaded successfully");
  };

  const handlePrintReceipt = (payment) => {
    window.print();
  };

  // Payment History Columns
  const paymentColumns = [
    {
      title: "Receipt No",
      dataIndex: "receiptNo",
      key: "receiptNo",
      render: (text) => (
        <Tag color="blue" style={{ fontWeight: 600 }}>
          {text}
        </Tag>
      ),
    },
    {
      title: "Tenant",
      key: "tenant",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.tenantName}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            House: {record.houseNo}
          </div>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>
          {formatCurrency(amount)}
        </span>
      ),
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
        <Badge
          color={
            status === "paid"
              ? "#52c41a"
              : status === "pending"
                ? "#faad14"
                : "#ff4d4f"
          }
          text={
            status === "paid"
              ? "Paid"
              : status === "pending"
                ? "Pending"
                : "Late"
          }
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View Receipt">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewReceipt(record)}
            />
          </Tooltip>
          <Tooltip title="Download">
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => handleDownloadReceipt(record)}
            />
          </Tooltip>
          <Tooltip title="Print">
            <Button
              icon={<PrinterOutlined />}
              size="small"
              onClick={() => handlePrintReceipt(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Receipt Modal
  const ReceiptModal = ({ visible, onClose, payment }) => {
    if (!payment) return null;

    return (
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: "#1890ff" }} />
            Payment Receipt
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={600}
        footer={
          <Space>
            <Button
              icon={<WhatsAppOutlined />}
              onClick={() => message.success("Sent via WhatsApp")}
            >
              Send WhatsApp
            </Button>
            <Button
              icon={<MailOutlined />}
              onClick={() => message.success("Sent via Email")}
            >
              Send Email
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadReceipt(payment)}
            >
              Download
            </Button>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </Space>
        }
      >
        <div id="receipt-content" style={{ padding: "20px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏠</div>
            <h2 style={{ margin: 0, color: "#1890ff" }}>RentManager</h2>
            <p style={{ color: "#8c8c8c", margin: 0 }}>
              Property Management System
            </p>
            <Divider />
            <h3 style={{ margin: 0 }}>PAYMENT RECEIPT</h3>
          </div>

          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Receipt Number">
              <Tag color="blue" style={{ fontWeight: 600 }}>
                {payment.receiptNo}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Date">
              {formatDateTime(payment.date)}
            </Descriptions.Item>
            <Descriptions.Item label="Tenant">
              <strong>{payment.tenantName}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="House Number">
              {payment.houseNo}
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              <span style={{ fontSize: 18, fontWeight: 700, color: "#1890ff" }}>
                {formatCurrency(payment.amount)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Payment Method">
              <Tag color={payment.method === "mpesa" ? "green" : "blue"}>
                {payment.method.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge
                color={payment.status === "paid" ? "#52c41a" : "#faad14"}
                text={payment.status === "paid" ? "✅ Paid" : "⏳ Pending"}
              />
            </Descriptions.Item>
            {payment.mpesaCode && (
              <Descriptions.Item label="M-Pesa Code">
                <Tag color="green">{payment.mpesaCode}</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider />

          <div style={{ textAlign: "center", fontSize: 12, color: "#8c8c8c" }}>
            <p>Thank you for your payment!</p>
            <p>This is a computer generated receipt. No signature required.</p>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div>
      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-primary">
            <Statistic
              title="Total Collected"
              value={summary.totalCollected}
              prefix={<WalletOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-success">
            <Statistic
              title="Expected Rent"
              value={summary.expectedRent}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-warning">
            <Statistic
              title="Outstanding"
              value={summary.outstanding}
              prefix={<ExclamationCircleOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-danger">
            <Statistic
              title="Occupancy"
              value={summary.occupancy}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Card
        title={
          <Space>
            <DollarOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              Payment Management
            </span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                setModalVisible(true);
              }}
            >
              Initiate Payment
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <DollarOutlined />
                Payment Parser
              </span>
            }
            key="parser"
          >
            <PaymentParser onPaymentConfirmed={fetchData} />
          </TabPane>

          <TabPane
            tab={
              <span>
                <HistoryOutlined />
                Payment History
              </span>
            }
            key="history"
          >
            <PaymentHistory />
          </TabPane>
        </Tabs>
      </Card>

      {/* Initiate STK Push Modal */}
      <Modal
        title={
          <Space>
            <SendOutlined style={{ color: "#1890ff" }} />
            Initiate STK Push Payment
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Alert
          message="How it works"
          description="Send a payment request directly to the tenant's phone. They will receive an M-Pesa STK push to complete the payment."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={form} layout="vertical" onFinish={handleSTKPush}>
          <Form.Item
            name="tenantId"
            label="Select Tenant"
            rules={[{ required: true, message: "Please select a tenant" }]}
          >
            <Select
              placeholder="Select tenant"
              showSearch
              optionFilterProp="children"
            >
              {tenants.map((tenant) => (
                <Select.Option key={tenant.id} value={tenant.id}>
                  {tenant.name} - {tenant.houseNo} (Ksh{" "}
                  {tenant.monthlyRent?.toLocaleString()})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (Ksh)"
            rules={[
              { required: true, message: "Please enter amount" },
              {
                type: "number",
                min: 1,
                message: "Amount must be greater than 0",
              },
            ]}
          >
            <Input
              type="number"
              placeholder="15000"
              prefix={<DollarOutlined />}
            />
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
            <Input placeholder="0712345678" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input placeholder="Rent payment - July 2026" />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Send STK Push
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        visible={receiptVisible}
        onClose={() => {
          setReceiptVisible(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
      />
    </div>
  );
};

export default Payments;
