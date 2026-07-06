import React from "react";
import { Card, Layout, Typography } from "antd";

const { Title, Text } = Typography;

const Reports = () => {
  return (
    <Layout style={{ padding: "24px", background: "#f0f2f5" }}>
      <Card>
        <Title level={3}>Reports</Title>
        <Text type="secondary">Reporting insights will appear here.</Text>
      </Card>
    </Layout>
  );
};

export default Reports;
