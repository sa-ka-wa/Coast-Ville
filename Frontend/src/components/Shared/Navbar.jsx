// components/Shared/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Layout, Menu, Dropdown, Avatar, Button, Space, Drawer } from "antd";
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
  MenuOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import PropertySelector from "./PropertySelector";

const { Header } = Layout;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
          key: "/caretaker/dashboard",
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
          label: "Readings",
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
      onClick: () => {
        logout();
        navigate("/login");
      },
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
    setMobileMenuOpen(false);
  };

  return (
    <Header
      style={{
        background: "#fff",
        padding: isMobile ? "0 12px" : "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        position: "fixed",
        width: "100%",
        zIndex: 100,
        top: 0,
        height: isMobile ? 56 : 64,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 24,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2
            style={{
              margin: 0,
              color: "#1890ff",
              fontSize: isMobile ? 16 : 20,
              cursor: "pointer",
            }}
            onClick={() =>
              navigate(isAdmin ? "/admin" : "/caretaker/dashboard")
            }
          >
            🏠 {isMobile ? "" : "RentManager"}
          </h2>
        </div>

        {/* Property Selector - Hide on mobile */}
        {!isMobile && <PropertySelector />}

        {/* Mobile Menu Button */}
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileMenuOpen(true)}
            style={{ fontSize: 20, padding: "4px 8px" }}
          />
        )}
      </div>

      {/* Desktop Navigation */}
      {!isMobile && (
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            border: "none",
            minWidth: 400,
            background: "transparent",
            color: "#111827",
            flex: 1,
          }}
          className="navbar-menu"
        />
      )}

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
            style={{
              display: "flex",
              alignItems: "center",
              color: "#111827",
              padding: isMobile ? "4px 8px" : "8px 16px",
            }}
          >
            <Avatar
              icon={<UserOutlined />}
              size={isMobile ? "small" : "default"}
            />
            {!isMobile && (
              <span style={{ marginLeft: 8, color: "#111827" }}>
                {user?.name || "User"}
              </span>
            )}
          </Button>
        </Dropdown>
      </div>

      {/* Mobile Drawer Menu */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar icon={<UserOutlined />} />
            <span style={{ fontWeight: 500 }}>{user?.name || "User"}</span>
          </div>
        }
        placement="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        closable={true}
        width={280}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
          <PropertySelector />
        </div>
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: "none" }}
        />
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid #f0f0f0",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#fafafa",
          }}
        >
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              navigate("/login");
              setMobileMenuOpen(false);
            }}
            block
            style={{ textAlign: "left", color: "#ff4d4f" }}
          >
            Logout
          </Button>
        </div>
      </Drawer>
    </Header>
  );
};

export default Navbar;
