// components/Caretaker/WaterReadingDetail.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Tabs,
  Statistic,
  Row,
  Col,
  message,
  Spin,
  Tag,
  Avatar,
  Divider,
} from "antd";
import {
  LineChartOutlined,
  FileTextOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  DollarOutlined,
  BarChartOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { getWaterReadings } from "../../services/water";
import { getTenant } from "../../services/tenants";
import { formatCurrency, formatDate } from "../../utils/formatters";

const WaterReadingDetail = ({ tenantId, visible, onClose, propertyId }) => {
  const [loading, setLoading] = useState(false);
  const [readings, setReadings] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [stats, setStats] = useState({
    totalReadings: 0,
    averageConsumption: 0,
    totalUnits: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    if (visible && tenantId) {
      fetchData();
    }
  }, [visible, tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      // Fetch tenant details
      try {
        const tenantResponse = await getTenant(tenantId);
        setTenant(tenantResponse.data);
      } catch (error) {
        console.warn("Tenant fetch failed:", error.message);
        setTenant({
          id: tenantId,
          name: "Tenant",
          houseNo: "N/A",
        });
      }

      // Fetch ALL water readings and filter by tenant
      let allReadings = [];
      try {
        // Get readings with optional property filter
        const filters = {};
        if (propertyId) {
          filters.property_id = propertyId;
        }
        const readingsResponse = await getWaterReadings(filters);
        allReadings = readingsResponse.data || [];
        console.log(`📊 Fetched ${allReadings.length} total readings`);
      } catch (error) {
        console.warn("Readings fetch failed, using mock:", error.message);
        allReadings = getMockReadings(tenantId);
      }

      // Filter readings for this specific tenant (handle both field names)
      const tenantReadings = allReadings.filter(
        (reading) =>
          reading.tenantId === tenantId || reading.tenant_id === tenantId,
      );

      console.log(
        `📊 Found ${tenantReadings.length} readings for tenant ${tenantId}`,
      );

      // Sort by date (newest first)
      const sortedReadings = tenantReadings.sort((a, b) => {
        const dateA = new Date(a.readingDate || a.reading_date);
        const dateB = new Date(b.readingDate || b.reading_date);
        return dateB - dateA;
      });

      setReadings(sortedReadings);

      // Calculate statistics
      const totalUnits = sortedReadings.reduce(
        (sum, r) => sum + (r.unitsUsed || r.units_used || 0),
        0,
      );
      const totalAmount = sortedReadings.reduce(
        (sum, r) => sum + (r.amount || 0),
        0,
      );

      setStats({
        totalReadings: sortedReadings.length,
        averageConsumption:
          sortedReadings.length > 0 ? totalUnits / sortedReadings.length : 0,
        totalUnits: totalUnits,
        totalAmount: totalAmount,
      });

      if (sortedReadings.length === 0) {
        message.info("No previous readings found for this tenant");
      }
    } catch (error) {
      console.error("Error fetching water readings:", error);
      message.error("Failed to load water reading history");
      // Use mock data if API fails
      const mockData = getMockReadings(tenantId);
      setReadings(mockData);
      calculateStats(mockData);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const totalUnits = data.reduce(
      (sum, r) => sum + (r.unitsUsed || r.units_used || 0),
      0,
    );
    const totalAmount = data.reduce((sum, r) => sum + (r.amount || 0), 0);

    setStats({
      totalReadings: data.length,
      averageConsumption: data.length > 0 ? totalUnits / data.length : 0,
      totalUnits: totalUnits,
      totalAmount: totalAmount,
    });
  };

  // Mock data for fallback
  const getMockReadings = (id) => {
    return [
      {
        id: 1,
        tenantId: id,
        tenant_name: "John Mwangi",
        house_no: "A03",
        previous_reading: 2478,
        current_reading: 2506,
        units_used: 28,
        amount: 1960,
        reading_date: new Date().toISOString().split("T")[0],
        rate: 70,
        status: "approved",
        notes: "Regular reading",
      },
      {
        id: 2,
        tenantId: id,
        tenant_name: "John Mwangi",
        house_no: "A03",
        previous_reading: 2450,
        current_reading: 2478,
        units_used: 28,
        amount: 1960,
        reading_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        rate: 70,
        status: "approved",
        notes: "Regular reading",
      },
      {
        id: 3,
        tenantId: id,
        tenant_name: "John Mwangi",
        house_no: "A03",
        previous_reading: 2422,
        current_reading: 2450,
        units_used: 28,
        amount: 1960,
        reading_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        rate: 70,
        status: "approved",
        notes: "Regular reading",
      },
      {
        id: 4,
        tenantId: id,
        tenant_name: "John Mwangi",
        house_no: "A03",
        previous_reading: 2400,
        current_reading: 2422,
        units_used: 22,
        amount: 1540,
        reading_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        rate: 70,
        status: "approved",
        notes: "Regular reading",
      },
      {
        id: 5,
        tenantId: id,
        tenant_name: "John Mwangi",
        house_no: "A03",
        previous_reading: 2380,
        current_reading: 2400,
        units_used: 20,
        amount: 1400,
        reading_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        rate: 70,
        status: "approved",
        notes: "Regular reading",
      },
    ];
  };

  const columns = [
    {
      title: "Reading Date",
      key: "reading_date",
      render: (_, record) => {
        const date = record.readingDate || record.reading_date;
        return date ? formatDate(date) : "N/A";
      },
      sorter: (a, b) => {
        const dateA = new Date(a.readingDate || a.reading_date);
        const dateB = new Date(b.readingDate || b.reading_date);
        return dateB - dateA;
      },
      defaultSortOrder: "descend",
    },
    {
      title: "Previous Reading",
      key: "previous_reading",
      render: (_, record) => {
        const val = record.previousReading || record.previous_reading;
        return val?.toLocaleString() || "-";
      },
    },
    {
      title: "Current Reading",
      key: "current_reading",
      render: (_, record) => {
        const val = record.currentReading || record.current_reading;
        return val?.toLocaleString() || "-";
      },
    },
    {
      title: "Units Used",
      key: "units_used",
      render: (_, record) => {
        const val = record.unitsUsed || record.units_used;
        return val?.toLocaleString() || "-";
      },
      sorter: (a, b) => {
        const valA = a.unitsUsed || a.units_used || 0;
        const valB = b.unitsUsed || b.units_used || 0;
        return valA - valB;
      },
    },
    {
      title: "Rate",
      key: "rate",
      render: (_, record) => {
        const val = record.rate || 70;
        return `KSh ${val?.toLocaleString()}`;
      },
    },
    {
      title: "Amount",
      key: "amount",
      render: (_, record) => {
        const val = record.amount || 0;
        return (
          <span style={{ fontWeight: 600, color: "#1890ff" }}>
            {formatCurrency(val)}
          </span>
        );
      },
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const status = record.status || "pending";
        const statusMap = {
          pending: { color: "orange", label: "Pending" },
          approved: { color: "green", label: "Approved" },
          rejected: { color: "red", label: "Rejected" },
          billed: { color: "blue", label: "Billed" },
        };
        const s = statusMap[status] || { color: "default", label: status };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: "Notes",
      key: "notes",
      render: (_, record) => record.notes || "-",
      ellipsis: true,
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <HistoryOutlined style={{ color: "#1890ff", fontSize: 20 }} />
          <span>Water Reading History</span>
          {tenant && (
            <span style={{ fontSize: 14, fontWeight: "normal", marginLeft: 8 }}>
              <Avatar
                size="small"
                style={{ backgroundColor: "#1890ff", marginRight: 8 }}
              >
                {tenant.name ? tenant.name.charAt(0).toUpperCase() : "T"}
              </Avatar>
              {tenant.name} - House {tenant.houseNo || tenant.house_no || "N/A"}
            </span>
          )}
          {readings.length > 0 && (
            <Tag color="blue">{readings.length} records</Tag>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={fetchData}
          loading={loading}
        >
          Refresh
        </Button>,
        <Button
          key="print"
          icon={<FileTextOutlined />}
          onClick={() => window.print()}
        >
          Print Report
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        {/* Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Readings"
                value={stats.totalReadings}
                prefix={<ScheduleOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Units"
                value={stats.totalUnits}
                suffix="m³"
                prefix={<BarChartOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Avg. Consumption"
                value={stats.averageConsumption.toFixed(1)}
                suffix="m³"
                prefix={<LineChartOutlined />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Amount"
                value={stats.totalAmount}
                prefix="KSh"
                formatter={(value) => value.toLocaleString()}
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Card>
          </Col>
        </Row>

        <Divider style={{ margin: "8px 0 16px" }} />

        {/* Readings Table */}
        {readings.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💧</div>
            <h3>No Previous Readings</h3>
            <p style={{ color: "#8c8c8c" }}>
              This tenant has no water readings yet. Submit a new reading to get
              started.
            </p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={readings}
            rowKey={(record) => record.id}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} readings`,
              pageSizeOptions: ["10", "20", "50"],
            }}
            scroll={{ x: 800 }}
            size="middle"
          />
        )}
      </Spin>
    </Modal>
  );
};

export default WaterReadingDetail;
