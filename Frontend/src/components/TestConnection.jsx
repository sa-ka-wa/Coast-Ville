// components/TestConnection.jsx
import React, { useState, useEffect } from "react";
import { Card, Alert, Spin, Tag } from "antd";
import api from "../services/api";

const TestConnection = () => {
  const [status, setStatus] = useState("testing");
  const [message, setMessage] = useState("");

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      const response = await api.get("/health");
      setStatus("connected");
      setMessage(response.data.message);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Connection failed");
    }
  };

  return (
    <Card title="Backend Connection Status">
      {status === "testing" && <Spin tip="Testing connection..." />}
      {status === "connected" && (
        <Alert
          message="✅ Connected to Backend"
          description={message}
          type="success"
          showIcon
        />
      )}
      {status === "error" && (
        <Alert
          message="❌ Connection Failed"
          description={message}
          type="error"
          showIcon
        />
      )}
      <div style={{ marginTop: 16 }}>
        <Tag color="blue">API URL: {import.meta.env.VITE_API_URL}</Tag>
      </div>
    </Card>
  );
};

export default TestConnection;
