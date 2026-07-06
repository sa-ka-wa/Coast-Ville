import React from "react";
import { Card, Layout, Typography } from "antd";

const { Title, Text } = Typography;

const NotFound = () => {
  return (
    <Layout
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 360, textAlign: "center" }}>
        <Title level={3}>Page not found</Title>
        <Text type="secondary">The page you requested does not exist.</Text>
      </Card>
    </Layout>
  );
};

export default NotFound;
