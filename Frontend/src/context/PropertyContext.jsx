// context/PropertyContext.jsx
import React, { createContext, useState, useContext, useEffect } from "react";
import { getProperties } from "../services/properties"; // Remove setActiveProperty

const PropertyContext = createContext();

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error("useProperty must be used within PropertyProvider");
  }
  return context;
};

export const PropertyProvider = ({ children }) => {
  const [properties, setProperties] = useState([]);
  const [activeProperty, setActivePropertyState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const response = await getProperties();
      setProperties(response.data);

      // Set first property as active or load from localStorage
      const savedPropertyId = localStorage.getItem("activePropertyId");
      if (savedPropertyId) {
        const savedProperty = response.data.find(
          (p) => p.id === parseInt(savedPropertyId),
        );
        if (savedProperty) {
          setActivePropertyState(savedProperty);
        } else if (response.data.length > 0) {
          setActivePropertyState(response.data[0]);
          localStorage.setItem("activePropertyId", response.data[0].id);
        }
      } else if (response.data.length > 0) {
        setActivePropertyState(response.data[0]);
        localStorage.setItem("activePropertyId", response.data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const switchProperty = async (propertyId) => {
    try {
      const property = properties.find((p) => p.id === propertyId);
      if (property) {
        setActivePropertyState(property);
        localStorage.setItem("activePropertyId", propertyId);
        console.log(`🔄 Switched to: ${property.name}`);
        return { success: true, property };
      }
      return { success: false, error: "Property not found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const addProperty = (property) => {
    setProperties([...properties, property]);
  };

  const updateProperty = (updatedProperty) => {
    setProperties(
      properties.map((p) =>
        p.id === updatedProperty.id ? updatedProperty : p,
      ),
    );
    if (activeProperty?.id === updatedProperty.id) {
      setActivePropertyState(updatedProperty);
    }
  };

  const value = {
    properties,
    activeProperty,
    loading,
    fetchProperties,
    switchProperty,
    addProperty,
    updateProperty,
  };

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
};
