// components/Shared/Navbar.jsx
import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Dropdown,
  Avatar,
  Button,
  Space,
  Drawer,
  message,
  Tooltip,
} from "antd";
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
  SwapOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import PropertySelector from "./PropertySelector";

const { Header } = Layout;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, switchRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentRole, setCurrentRole] = useState(user?.role || "caretaker");
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update current role when user changes
  useEffect(() => {
    if (user?.role) {
      setCurrentRole(user.role);
    }
  }, [user]);

  const isAdmin = currentRole === "admin";
  const hasMultipleRoles =
    user?.secondary_role !== null && user?.secondary_role !== undefined;

  // Handle role switching
  const handleRoleToggle = async () => {
    if (isSwitching) return;

    const newRole = isAdmin ? "caretaker" : "admin";
    setIsSwitching(true);

    try {
      const result = await switchRole(newRole);

      if (result.success) {
        setCurrentRole(newRole);
        message.success(
          `Switched to ${newRole === "admin" ? "Admin" : "Caretaker"} role`,
        );

        setTimeout(() => {
          const targetPath =
            newRole === "admin" ? "/admin" : "/caretaker/dashboard";
          if (location.pathname !== targetPath) {
            navigate(targetPath);
          }
        }, 100);
      } else {
        message.error(result.error || "Failed to switch role");
        setCurrentRole(user?.role || "caretaker");
      }
    } catch (error) {
      console.error("Role switch error:", error);
      message.error("Failed to switch role");
      setCurrentRole(user?.role || "caretaker");
    } finally {
      setIsSwitching(false);
    }
  };

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
      onClick: () => navigate("/profile"),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
      onClick: () => navigate("/settings"),
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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Clickable Role Badge - Only show if user has multiple roles */}
        {hasMultipleRoles && !isMobile && (
          <Tooltip title={`Switch to ${isAdmin ? "Caretaker" : "Admin"}`}>
            <Button
              type="text"
              size="small"
              onClick={handleRoleToggle}
              disabled={isSwitching}
              icon={<SwapOutlined />}
              style={{
                borderRadius: 20,
                padding: "2px 12px",
                height: 28,
                background: isAdmin ? "#e6f7ff" : "#f6ffed",
                color: isAdmin ? "#1890ff" : "#52c41a",
                border: `1px solid ${isAdmin ? "#91d5ff" : "#b7eb8f"}`,
                fontWeight: 500,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {isAdmin ? "Admin" : "Caretaker"}
            </Button>
          </Tooltip>
        )}

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

        {/* Mobile Role Switch */}
        {hasMultipleRoles && (
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #f0f0f0",
              background: "#fafafa",
            }}
          >
            <Button
              block
              onClick={handleRoleToggle}
              disabled={isSwitching}
              icon={<SwapOutlined />}
              style={{
                borderRadius: 20,
                height: 36,
                background: isAdmin ? "#e6f7ff" : "#f6ffed",
                color: isAdmin ? "#1890ff" : "#52c41a",
                border: `1px solid ${isAdmin ? "#91d5ff" : "#b7eb8f"}`,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              Switch to {isAdmin ? "Caretaker" : "Admin"}
            </Button>
          </div>
        )}

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
