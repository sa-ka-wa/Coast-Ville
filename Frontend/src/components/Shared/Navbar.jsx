// components/Shared/Navbar.jsx
import React from "react";
import { Layout, Menu, Dropdown, Avatar, Button, Space } from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  ScheduleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import PropertySelector from "./PropertySelector";

const { Header } = Layout;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  const menuItems = isAdmin
    ? [
        {
          key: "/admin",
          icon: <DashboardOutlined />,
          label: "Dashboard",
        },
        {
          key: "/admin/tenants",
          icon: <TeamOutlined />,
          label: "Tenants",
        },
        {
          key: "/admin/payments",
          icon: <DollarOutlined />,
          label: "Payments",
        },
        {
          key: "/admin/water",
          icon: <ScheduleOutlined />,
          label: "Water Bills",
        },
        {
          key: "/admin/reports",
          icon: <FileTextOutlined />,
          label: "Reports",
        },
      ]
    : [
        {
          key: "/caretaker",
          icon: <DashboardOutlined />,
          label: "Dashboard",
        },
        {
          key: "/caretaker/tenants",
          icon: <TeamOutlined />,
          label: "Tenants",
        },
        {
          key: "/caretaker/readings",
          icon: <ScheduleOutlined />,
          label: "Meter Readings",
        },
        {
          key: "/caretaker/payments",
          icon: <WalletOutlined />,
          label: "Payments",
        },
        {
          key: "/caretaker/expenses",
          icon: <DollarOutlined />,
          label: "Expenses",
        },
      ];

  const userMenu = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: logout,
    },
  ];

  return (
    <Header
      style={{
        background: "#fff",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        position: "fixed",
        width: "100%",
        zIndex: 100,
        top: 0,
        height: 64,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2
            style={{
              margin: 0,
              color: "#1890ff",
              fontSize: 20,
              cursor: "pointer",
            }}
            onClick={() => navigate(isAdmin ? "/admin" : "/caretaker")}
          >
            🏠 RentManager
          </h2>
        </div>

        {/* Property Selector */}
        <PropertySelector />

        {/* Navigation Menu */}
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            border: "none",
            minWidth: 400,
            background: "transparent",
            color: "#111827",
          }}
          className="navbar-menu"
        />
      </div>

      {/* User Menu */}
      <div>
        <Dropdown
          menu={{
            items: userMenu,
            className: "user-menu-dropdown",
          }}
          placement="bottomRight"
        >
          <Button
            type="text"
            style={{ display: "flex", alignItems: "center", color: "#111827" }}
          >
            <Avatar icon={<UserOutlined />} />
            <span style={{ marginLeft: 8, color: "#111827" }}>
              {user?.name || "User"}
            </span>
          </Button>
        </Dropdown>
      </div>
    </Header>
  );
};

export default Navbar;
