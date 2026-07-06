// pages/Caretaker/Expenses.jsx
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
  Popconfirm,
  DatePicker,
  Tabs,
  Badge,
  Empty,
  Descriptions,
  Progress,
  Divider,
  Upload,
  Alert,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  DollarOutlined,
  CalendarOutlined,
  HomeOutlined,
  FileTextOutlined,
  DownloadOutlined,
  PrinterOutlined,
  FilterOutlined,
  ClearOutlined,
  BarChartOutlined,
  PieChartOutlined,
  ShopOutlined,
  ToolOutlined,
  TeamOutlined,
  SecurityScanOutlined,
  EnvironmentOutlined,
  FileDoneOutlined,
} from "@ant-design/icons";
import { formatCurrency, formatDate } from "../../utils/formatters";

const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

// Mock expense categories with icons
const CATEGORIES = [
  { value: "repairs", label: "Repairs", icon: <ToolOutlined />, color: "blue" },
  {
    value: "cleaning",
    label: "Cleaning",
    icon: <EnvironmentOutlined />,
    color: "green",
  },
  {
    value: "gardening",
    label: "Gardening",
    icon: <HomeOutlined />,
    color: "green",
  },
  {
    value: "security",
    label: "Security",
    icon: <SecurityScanOutlined />,
    color: "red",
  },
  {
    value: "utilities",
    label: "Utilities",
    icon: <DollarOutlined />,
    color: "orange",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    icon: <ToolOutlined />,
    color: "purple",
  },
  {
    value: "salaries",
    label: "Salaries",
    icon: <TeamOutlined />,
    color: "cyan",
  },
  {
    value: "supplies",
    label: "Supplies",
    icon: <ShopOutlined />,
    color: "magenta",
  },
  {
    value: "other",
    label: "Other",
    icon: <FileTextOutlined />,
    color: "default",
  },
];

const Expenses = () => {
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("list");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    categories: {},
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // Mock data - in production, fetch from API
      const mockExpenses = [
        {
          id: 1,
          category: "repairs",
          description: "Fixed leaking pipe in Block A",
          amount: 3500,
          date: "2026-07-05",
          receipt: "RCP-001",
          status: "approved",
          notes: "Plumber was called",
        },
        {
          id: 2,
          category: "cleaning",
          description: "Monthly cleaning supplies",
          amount: 2500,
          date: "2026-07-03",
          receipt: "RCP-002",
          status: "pending",
          notes: "Bought from supermarket",
        },
        {
          id: 3,
          category: "gardening",
          description: "Grass cutting and landscaping",
          amount: 4500,
          date: "2026-07-01",
          receipt: "RCP-003",
          status: "approved",
          notes: "Gardener came for 2 days",
        },
        {
          id: 4,
          category: "utilities",
          description: "Electricity bill - July",
          amount: 12000,
          date: "2026-06-28",
          receipt: "RCP-004",
          status: "approved",
          notes: "KPLC bill",
        },
        {
          id: 5,
          category: "security",
          description: "Security guard salaries",
          amount: 28000,
          date: "2026-06-25",
          receipt: "RCP-005",
          status: "approved",
          notes: "3 guards",
        },
        {
          id: 6,
          category: "repairs",
          description: "Replaced broken window in B07",
          amount: 6000,
          date: "2026-06-20",
          receipt: "RCP-006",
          status: "pending",
          notes: "Glass supplier",
        },
        {
          id: 7,
          category: "maintenance",
          description: "Monthly generator service",
          amount: 8500,
          date: "2026-06-15",
          receipt: "RCP-007",
          status: "approved",
          notes: "Generator mechanic",
        },
        {
          id: 8,
          category: "salaries",
          description: "Caretaker salary - June",
          amount: 35000,
          date: "2026-06-30",
          receipt: "RCP-008",
          status: "approved",
          notes: "Monthly salary",
        },
      ];

      setExpenses(mockExpenses);
      setFilteredExpenses(mockExpenses);
      calculateStats(mockExpenses);
    } catch (error) {
      message.error("Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const thisMonthTotal = data
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const lastMonthTotal = data
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const categories = {};
    data.forEach((e) => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });

    setStats({
      total: data.reduce((sum, e) => sum + e.amount, 0),
      thisMonth: thisMonthTotal,
      lastMonth: lastMonthTotal,
      categories,
    });
  };

  const handleAddEdit = async (values) => {
    try {
      const newExpense = {
        id: editingExpense ? editingExpense.id : Date.now(),
        ...values,
        date: values.date
          ? values.date.format("YYYY-MM-DD")
          : new Date().toISOString().split("T")[0],
        status: "pending",
        receipt: `RCP-${String(Date.now()).slice(-6)}`,
      };

      let updatedExpenses;
      if (editingExpense) {
        updatedExpenses = expenses.map((e) =>
          e.id === editingExpense.id ? { ...e, ...newExpense } : e,
        );
        message.success("Expense updated successfully");
      } else {
        updatedExpenses = [newExpense, ...expenses];
        message.success("Expense recorded successfully");
      }

      setExpenses(updatedExpenses);
      setFilteredExpenses(updatedExpenses);
      calculateStats(updatedExpenses);
      setModalVisible(false);
      setEditingExpense(null);
      form.resetFields();
    } catch (error) {
      message.error("Failed to save expense");
    }
  };

  const handleDelete = async (id) => {
    try {
      const updatedExpenses = expenses.filter((e) => e.id !== id);
      setExpenses(updatedExpenses);
      setFilteredExpenses(updatedExpenses);
      calculateStats(updatedExpenses);
      message.success("Expense deleted successfully");
    } catch (error) {
      message.error("Failed to delete expense");
    }
  };

  const handleFilter = () => {
    let filtered = [...expenses];

    // Search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.description.toLowerCase().includes(search) ||
          e.category.toLowerCase().includes(search) ||
          e.receipt.toLowerCase().includes(search),
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((e) => e.category === categoryFilter);
    }

    // Date range filter
    if (dateRange) {
      const [start, end] = dateRange;
      filtered = filtered.filter((e) => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      });
    }

    setFilteredExpenses(filtered);
  };

  const clearFilters = () => {
    setSearchText("");
    setCategoryFilter("all");
    setDateRange(null);
    setFilteredExpenses(expenses);
  };

  const getCategoryIcon = (category) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat ? cat.icon : <FileTextOutlined />;
  };

  const getCategoryColor = (category) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat ? cat.color : "default";
  };

  const getCategoryLabel = (category) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat ? cat.label : category;
  };

  const columns = [
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            {record.receipt} • {formatDate(record.date)}
          </div>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (category) => (
        <Tag color={getCategoryColor(category)}>
          {getCategoryIcon(category)} {getCategoryLabel(category)}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => (
        <span style={{ fontWeight: 600, color: "#ff4d4f" }}>
          {formatCurrency(amount)}
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Badge
          color={status === "approved" ? "#52c41a" : "#faad14"}
          text={status === "approved" ? "Approved" : "Pending"}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              icon={<FileTextOutlined />}
              size="small"
              onClick={() => {
                setSelectedExpense(record);
                setDetailVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                setEditingExpense(record);
                form.setFieldsValue({
                  ...record,
                  date: record.date ? require("dayjs")(record.date) : null,
                });
                setModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete Expense"
              description="Are you sure you want to delete this expense?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Category breakdown for stats
  const categoryBreakdown = Object.entries(stats.categories).map(
    ([category, amount]) => ({
      category,
      label: getCategoryLabel(category),
      amount,
      color: getCategoryColor(category),
      percentage:
        stats.total > 0 ? ((amount / stats.total) * 100).toFixed(1) : 0,
    }),
  );

  return (
    <div>
      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-danger">
            <Statistic
              title="Total Expenses"
              value={stats.total}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-warning">
            <Statistic
              title="This Month"
              value={stats.thisMonth}
              prefix={<CalendarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-primary">
            <Statistic
              title="Last Month"
              value={stats.lastMonth}
              prefix={<CalendarOutlined />}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="statistic-card statistic-card-success">
            <Statistic
              title="Total Items"
              value={expenses.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "white" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card title="Category Breakdown" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {categoryBreakdown.map((item) => (
              <Col xs={24} sm={12} md={8} lg={6} key={item.category}>
                <Card size="small">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <Tag color={item.color}>
                        {getCategoryIcon(item.category)} {item.label}
                      </Tag>
                      <div
                        style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}
                      >
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#1890ff",
                      }}
                    >
                      {item.percentage}%
                    </div>
                  </div>
                  <Progress
                    percent={parseFloat(item.percentage)}
                    strokeColor={item.color}
                    size="small"
                    style={{ marginTop: 8 }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Main Table */}
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ fontSize: 20, color: "#ff4d4f" }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              Expense Records
            </span>
            <Tag color="red">{filteredExpenses.length} entries</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchExpenses}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => message.info("Export feature coming soon")}
            >
              Export
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingExpense(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              Add Expense
            </Button>
          </Space>
        }
      >
        {/* Filters */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Input
            placeholder="Search expenses..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: 180 }}
            placeholder="Filter by category"
          >
            <Option value="all">All Categories</Option>
            {CATEGORIES.map((cat) => (
              <Option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </Option>
            ))}
          </Select>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 240 }}
            placeholder={["Start Date", "End Date"]}
          />
          <Space>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              onClick={handleFilter}
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
          dataSource={filteredExpenses}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} expenses`,
            pageSizeOptions: ["10", "20", "50"],
          }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: (
              <Empty
                description="No expenses found. Start recording your first expense!"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      {/* Add/Edit Expense Modal */}
      <Modal
        title={
          <Space>
            {editingExpense ? (
              <>
                <EditOutlined />
                Edit Expense
              </>
            ) : (
              <>
                <PlusOutlined />
                Record New Expense
              </>
            )}
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingExpense(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleAddEdit}>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: "Please select a category" }]}
          >
            <Select placeholder="Select category" size="large">
              {CATEGORIES.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please enter description" }]}
          >
            <TextArea
              rows={3}
              placeholder="Describe the expense..."
              size="large"
            />
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
              placeholder="5000"
              prefix={<DollarOutlined />}
              size="large"
            />
          </Form.Item>

          <Form.Item name="date" label="Date">
            <DatePicker style={{ width: "100%" }} size="large" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Additional notes..." />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingExpense(null);
                  form.resetFields();
                }}
                size="large"
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" size="large">
                {editingExpense ? "Update" : "Record"} Expense
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Expense Detail Modal */}
      <Modal
        title="Expense Details"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedExpense(null);
        }}
        footer={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              Print
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setDetailVisible(false);
                setSelectedExpense(null);
              }}
            >
              Close
            </Button>
          </Space>
        }
        width={600}
      >
        {selectedExpense && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Receipt Number">
              <Tag color="blue">{selectedExpense.receipt}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Category">
              <Tag color={getCategoryColor(selectedExpense.category)}>
                {getCategoryIcon(selectedExpense.category)}{" "}
                {getCategoryLabel(selectedExpense.category)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Description">
              {selectedExpense.description}
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ff4d4f" }}>
                {formatCurrency(selectedExpense.amount)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Date">
              {formatDate(selectedExpense.date)}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge
                color={
                  selectedExpense.status === "approved" ? "#52c41a" : "#faad14"
                }
                text={
                  selectedExpense.status === "approved" ? "Approved" : "Pending"
                }
              />
            </Descriptions.Item>
            {selectedExpense.notes && (
              <Descriptions.Item label="Notes">
                {selectedExpense.notes}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Expenses;
