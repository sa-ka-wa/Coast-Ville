// components/TestConnection.jsx
import React, { useState, useEffect } from "react";
import { Card, Alert, Spin, Tag, Button } from "antd";
import api from "../services/api";

const TestConnection = () => {
  const [status, setStatus] = useState("testing");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState({});

  const testConnection = async () => {
    setStatus("testing");
    try {
      const response = await api.get("/health");
      setStatus("connected");
      setMessage(response.data.message);
      setDetails({
        status: response.status,
        data: response.data,
        url: api.defaults.baseURL,
      });
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Connection failed");
      setDetails({
        error: error.message,
        url: api.defaults.baseURL,
        config: error.config,
      });
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

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
        <Tag color={status === "connected" ? "green" : "red"}>
          Status: {status}
        </Tag>
        <Button onClick={testConnection} size="small" style={{ marginLeft: 8 }}>
          Retry
        </Button>
      </div>
      {details.url && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
          <pre>{JSON.stringify(details, null, 2)}</pre>
        </div>
      )}
    </Card>
  );
};

export default TestConnection;
