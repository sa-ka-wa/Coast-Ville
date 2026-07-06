// pages/Admin/Tenants.jsx
import React from "react";
import TenantList from "../../components/Admin/TenantManagement/TenantList";

const Tenants = () => {
  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      <TenantList />
    </div>
  );
};

export default Tenants;
