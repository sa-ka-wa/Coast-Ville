// components/Shared/Sidebar.jsx
import React from "react";
import { Layout, Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  AppstoreAddOutlined,
  HomeOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  const adminMenuItems = [
    { key: "/admin", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/admin/tenants", icon: <TeamOutlined />, label: "Tenants" },
    { key: "/admin/payments", icon: <DollarOutlined />, label: "Payments" },
    { key: "/admin/water", icon: <ExperimentOutlined />, label: "Water Bills" },
    { key: "/admin/reports", icon: <FileTextOutlined />, label: "Reports" },
  ];

  const caretakerMenuItems = [
    { key: "/caretaker", icon: <DashboardOutlined />, label: "Dashboard" },
    {
      key: "/caretaker/tenants",
      icon: <TeamOutlined />,
      label: "Manage Tenants",
    },
    {
      key: "/caretaker/readings",
      icon: <ExperimentOutlined />,
      label: "Meter Readings",
    },
    { key: "/caretaker/expenses", icon: <DollarOutlined />, label: "Expenses" },
  ];

  const menuItems = isAdmin ? adminMenuItems : caretakerMenuItems;

  return (
    <Sider
      width={240}
      style={{
        background: "#fff",
        height: "calc(100vh - 64px)",
        position: "fixed",
        left: 0,
        top: 64,
        bottom: 0,
        overflow: "auto",
        boxShadow: "2px 0 8px rgba(0,0,0,0.06)",
        borderRight: "1px solid #f0f0f0",
      }}
    >
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ fontSize: 14, color: "#8c8c8c" }}>Property</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Sunset Apartments</div>
        <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
          {isAdmin ? "Admin Panel" : "Caretaker Panel"}
        </div>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ border: "none", marginTop: 8 }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 0,
          padding: "20px 24px",
          borderTop: "1px solid #f0f0f0",
          width: "100%",
          fontSize: 12,
          color: "#8c8c8c",
        }}
      >
        <div>Version 1.0.0</div>
        <div>© 2026 RentManager</div>
      </div>
    </Sider>
  );
};

export default Sidebar;
