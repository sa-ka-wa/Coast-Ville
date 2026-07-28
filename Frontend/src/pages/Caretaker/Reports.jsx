import React, { useState } from "react";
import { Card, Tabs, Space } from "antd";
import {
  FileTextOutlined,
  DollarOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useProperty } from "../../context/PropertyContext";
import MonthlyStatement from "../../components/Reports/MonthlyStatement";

const { TabPane } = Tabs;

const Reports = () => {
  const { activeProperty } = useProperty();
  const [activeTab, setActiveTab] = useState("statements");

  return (
    <div>
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: "#1890ff" }} />
            <span>Reports & Statements</span>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                Monthly Statements
              </span>
            }
            key="statements"
          >
            <MonthlyStatement
              propertyId={activeProperty?.id}
              year={2026}
              month={7}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <DollarOutlined />
                Payment Summary
              </span>
            }
            key="payments"
          >
            {/* Add payment summary component here */}
          </TabPane>

          <TabPane
            tab={
              <span>
                <HomeOutlined />
                Property Reports
              </span>
            }
            key="property"
          >
            {/* Add property reports here */}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Reports;
