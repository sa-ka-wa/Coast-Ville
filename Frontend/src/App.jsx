// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, Layout } from "antd";
import { AuthProvider } from "./context/AuthContext";
import { PropertyProvider } from "./context/PropertyContext";
import { useAuth } from "./hooks/useAuth";
import { useProperty } from "./context/PropertyContext";
import ProtectedRoute from "./components/Shared/ProtectedRoute";
import Navbar from "./components/Shared/Navbar";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import CaretakerDashboard from "./pages/Caretaker/CaretakerDashboard";
import ManageTenants from "./pages/Caretaker/ManageTenants";
import MeterReadings from "./pages/Caretaker/MeterReadings";
import TenantDetails from "./pages/Caretaker/TenantDetails";
import Expenses from "./pages/Caretaker/Expenses";
import Tenants from "./pages/Admin/Tenants";
import Payments from "./pages/Admin/Payments";
import WaterBills from "./pages/Admin/WaterBills";
import Reports from "./pages/Admin/Reports";

const { Content } = Layout;

const AppContent = () => {
  const { user, isLoading } = useAuth();
  const { activeProperty } = useProperty();
  const { pathname } = window.location;
  const isAuthPage = pathname === "/login" || pathname === "/register";

  console.log(
    "🔑 AppContent - activeProperty:",
    activeProperty?.id,
    activeProperty?.name,
  );

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
        <p style={{ marginTop: 16, color: "var(--text-secondary)" }}>
          Loading...
        </p>
      </div>
    );
  }

  const showNavigation = !isAuthPage && user;
  const tenantListKey = activeProperty?.id
    ? `tenants-${activeProperty.id}`
    : "tenants-none";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {showNavigation && <Navbar />}
      <Layout>
        <Layout
          style={{
            marginTop: showNavigation ? 64 : 0,
            transition: "margin 0.3s ease",
          }}
        >
          <Content
            style={{
              padding: showNavigation ? "24px" : 0,
              background: "var(--bg-primary)",
              minHeight: "100vh",
            }}
          >
            <div className="fade-in">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/tenants" element={<Tenants />} />
                  <Route path="/admin/payments" element={<Payments />} />
                  <Route path="/admin/water" element={<WaterBills />} />
                  <Route path="/admin/reports" element={<Reports />} />
                </Route>

                <Route
                  element={<ProtectedRoute allowedRoles={["caretaker"]} />}
                >
                  <Route path="/caretaker" element={<CaretakerDashboard />} />

                  {/* IMPORTANT: Pass propertyId and propertyName as props */}
                  <Route
                    path="/caretaker/tenants"
                    element={
                      <ManageTenants
                        key={tenantListKey}
                        propertyId={activeProperty?.id}
                        propertyName={activeProperty?.name}
                      />
                    }
                  />
                  <Route
                    path="/caretaker/tenants/:id"
                    element={<TenantDetails />}
                  />

                  <Route
                    path="/caretaker/readings"
                    element={<MeterReadings />}
                  />
                  <Route path="/caretaker/expenses" element={<Expenses />} />
                </Route>

                <Route
                  path="/"
                  element={
                    user ? (
                      user.role === "admin" ? (
                        <Navigate to="/admin" replace />
                      ) : (
                        <Navigate to="/caretaker" replace />
                      )
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

const App = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1890ff",
          borderRadius: 8,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
        components: {
          Card: {
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          },
          Table: {
            headerBg: "#fafafa",
          },
          Button: {
            borderRadius: 8,
          },
          Input: {
            borderRadius: 8,
          },
          Select: {
            borderRadius: 8,
          },
        },
      }}
    >
      <AuthProvider>
        <PropertyProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </PropertyProvider>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
