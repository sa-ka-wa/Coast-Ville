// components/Caretaker/ManageTenantsWrapper.jsx
import React from "react";
import { useProperty } from "../../context/PropertyContext";
import ManageTenants from "../../pages/Caretaker/ManageTenants";

const ManageTenantsWrapper = () => {
  const { activeProperty } = useProperty();

  console.log(
    "🔄 Wrapper: Active property changed to:",
    activeProperty?.name,
    "ID:",
    activeProperty?.id,
  );

  // Force re-render when property changes by using key
  return <ManageTenants key={`tenant-list-${activeProperty?.id || "none"}`} />;
};

export default ManageTenantsWrapper;
