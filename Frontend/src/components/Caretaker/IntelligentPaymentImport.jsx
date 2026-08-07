// src/components/Caretaker/IntelligentPaymentImport.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Input,
  Table,
  message,
  Space,
  Typography,
  Tag,
  Spin,
  Alert,
  Modal,
  Progress,
  Statistic,
  Row,
  Col,
  Divider,
  Badge,
  Tabs,
  Tooltip,
  Switch,
  Select,
  List,
  Avatar,
} from "antd";
import {
  RobotOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  SaveOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  UserOutlined,
  HomeOutlined,
  DollarOutlined,
  WarningOutlined,
  CheckOutlined,
  EditOutlined,
  MobileOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { paymentSmsParser } from "../../utils/paymentSmsParser";
import { getTenants } from "../../services/tenants";
import { confirmPayment } from "../../services/payments";
import { useProperty } from "../../context/PropertyContext";
import { formatCurrency } from "../../utils/formatters";

const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const IntelligentPaymentImport = ({ onSuccess, onCancel }) => {
  const [text, setText] = useState("");
  const [parsedData, setParsedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [matchedPayments, setMatchedPayments] = useState([]);
  const [unmatchedPayments, setUnmatchedPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("parse");
  const [autoConfirm, setAutoConfirm] = useState(true);
  const { activeProperty } = useProperty();
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    if (activeProperty?.id) {
      fetchTenants();
    }
  }, [activeProperty]);

  const fetchTenants = async () => {
    try {
      const response = await getTenants({ property_id: activeProperty.id });
      setTenants(response.data || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  };

  const parsePayments = async () => {
    if (!text.trim()) {
      message.warning("Please paste the SMS messages first");
      return;
    }

    setLoading(true);
    try {
      // Split by newlines and parse each line
      const lines = text.split("\n").filter((line) => line.trim());
      const results = [];

      for (const line of lines) {
        const result = await paymentSmsParser.parseAndMatch(
          line,
          activeProperty?.id,
        );
        results.push(result);
      }

      // Separate matched and unmatched
      const matched = results.filter((r) => r.matched);
      const unmatched = results.filter((r) => !r.matched);

      setMatchedPayments(matched);
      setUnmatchedPayments(unmatched);
      setParsedData(results);

      if (matched.length > 0) {
        message.success(`✅ ${matched.length} payments matched automatically`);
      }
      if (unmatched.length > 0) {
        message.warning(`⚠️ ${unmatched.length} payments need manual matching`);
      }

      setActiveTab("review");
    } catch (error) {
      console.error("Parse error:", error);
      message.error("Error parsing payments: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (paymentData, tenantId) => {
    try {
      const payload = {
        tenant_id: tenantId,
        amount: paymentData.amount,
        payment_method: "mpesa",
        mpesa_code:
          paymentData.mpesa_code || "AI" + Date.now().toString().slice(-6),
        payment_for_month: new Date().toISOString().split("T")[0],
        phone: paymentData.phone_number,
        account_reference: paymentData.account_reference,
        notes: `AI Import: ${paymentData.sender_name || "Unknown"}\n${paymentData.raw?.substring(0, 200)}`,
      };

      const response = await confirmPayment(payload);
      return response;
    } catch (error) {
      console.error("Error confirming payment:", error);
      throw error;
    }
  };

  const importAll = async () => {
    const allMatched = [...matchedPayments];
    const manuallyMatched = unmatchedPayments.filter((p) => p.manual_match);

    if (allMatched.length === 0 && manuallyMatched.length === 0) {
      message.warning("No payments to import");
      return;
    }

    setImporting(true);
    try {
      const imported = [];
      const errors = [];

      // Import auto-matched
      for (const payment of allMatched) {
        try {
          const result = await handleConfirmPayment(
            payment,
            payment.best_match.tenant.id,
          );
          imported.push({
            payment: payment,
            tenant: payment.best_match.tenant,
            result: result.data,
          });
        } catch (error) {
          errors.push({
            payment: payment,
            error: error.message,
          });
        }
      }

      // Import manually matched
      for (const payment of manuallyMatched) {
        try {
          const tenantId = payment.manual_match;
          const result = await handleConfirmPayment(payment, tenantId);
          const tenant = tenants.find((t) => t.id === tenantId);
          imported.push({
            payment: payment,
            tenant: tenant,
            result: result.data,
          });
        } catch (error) {
          errors.push({
            payment: payment,
            error: error.message,
          });
        }
      }

      setImportResults({
        imported: imported,
        errors: errors,
        total: imported.length + errors.length,
      });

      if (errors.length === 0) {
        message.success(`✅ Successfully imported ${imported.length} payments`);
      } else {
        message.warning(
          `⚠️ Imported ${imported.length} payments with ${errors.length} errors`,
        );
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Import error:", error);
      message.error("Failed to import payments: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  const renderMatchedList = () => {
    return (
      <List
        dataSource={matchedPayments}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar
                  icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                />
              }
              title={
                <Space>
                  <strong>{item.best_match?.tenant?.name || "Unknown"}</strong>
                  <Tag color="green">Auto-Matched</Tag>
                  <Tag color="blue">{item.best_match?.score}%</Tag>
                </Space>
              }
              description={
                <div>
                  <Space>
                    <span>💰 {formatCurrency(item.amount)}</span>
                    <span>🏠 {item.house_no || "N/A"}</span>
                    <span>📱 {item.phone_number || "N/A"}</span>
                    {item.mpesa_code && <span>🔑 {item.mpesa_code}</span>}
                  </Space>
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  const renderUnmatchedList = () => {
    return (
      <List
        dataSource={unmatchedPayments}
        renderItem={(item, index) => (
          <List.Item
            actions={[
              <Select
                key="match"
                placeholder="Select tenant"
                style={{ width: 200 }}
                onChange={(value) => {
                  const updated = [...unmatchedPayments];
                  updated[index].manual_match = value;
                  setUnmatchedPayments(updated);
                }}
                value={item.manual_match}
              >
                {tenants.map((tenant) => (
                  <Option key={tenant.id} value={tenant.id}>
                    {tenant.name} - {tenant.houseNo || "N/A"}
                  </Option>
                ))}
              </Select>,
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  icon={<WarningOutlined style={{ color: "#faad14" }} />}
                />
              }
              title={
                <Space>
                  <span style={{ color: "#faad14" }}>⚠️ Unmatched Payment</span>
                  {item.manual_match && <Tag color="green">✅ Matched</Tag>}
                </Space>
              }
              description={
                <div>
                  <Space>
                    <span>💰 {formatCurrency(item.amount)}</span>
                    <span>🏠 {item.house_no || "N/A"}</span>
                    <span>📱 {item.phone_number || "N/A"}</span>
                    {item.mpesa_code && <span>🔑 {item.mpesa_code}</span>}
                  </Space>
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  // Render results after import
  if (importResults) {
    const { imported = [], errors = [] } = importResults;
    const successCount = imported.length;
    const errorCount = errors.length;

    return (
      <Card>
        <div style={{ textAlign: "center", padding: "20px" }}>
          {errorCount === 0 ? (
            <CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a" }} />
          ) : (
            <CloseCircleOutlined style={{ fontSize: 64, color: "#faad14" }} />
          )}
          <h2 style={{ marginTop: 16 }}>
            {errorCount === 0
              ? "Import Complete!"
              : "Import Completed with Errors"}
          </h2>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Statistic
                title="Successful"
                value={successCount}
                prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Errors"
                value={errorCount}
                prefix={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Col>
          </Row>

          {errors.length > 0 && (
            <div style={{ marginTop: 16, textAlign: "left" }}>
              <Divider>Error Details</Divider>
              <ul style={{ color: "#ff4d4f" }}>
                {errors.map((err, idx) => (
                  <li key={idx}>
                    {err.payment?.sender_name || "Unknown"}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => {
                setImportResults(null);
                setParsedData([]);
                setMatchedPayments([]);
                setUnmatchedPayments([]);
                setText("");
                setActiveTab("parse");
              }}
              size="large"
            >
              Import Another
            </Button>
            {onCancel && (
              <Button onClick={onCancel} size="large" style={{ marginLeft: 8 }}>
                Done
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Alert
        message={
          <Space>
            <RobotOutlined style={{ color: "#1890ff", fontSize: 20 }} />
            <span>AI-Powered Payment Import</span>
          </Space>
        }
        description={
          <div>
            <p>
              <strong>Paste multiple M-Pesa SMS messages:</strong>
            </p>
            <ul style={{ marginLeft: 16 }}>
              <li>One SMS per line</li>
              <li>AI will automatically parse and match payments</li>
              <li>Unmatched payments can be manually matched</li>
              <li>Auto-confirm high-confidence matches</li>
            </ul>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16 }}>
        <Text strong>Current Property: </Text>
        <Tag color="blue" style={{ fontSize: 14 }}>
          {activeProperty?.name || "Not selected"}
        </Tag>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">Tenants in system: </Text>
          <Tag color="purple">{tenants.length} tenants</Tag>
        </div>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="📝 Input" key="parse">
          <TextArea
            rows={10}
            placeholder={`Paste M-Pesa SMS messages here...
One SMS per line:

Confirmed. KSh 15,000 received from JOHN MWANGI on 1/7/2026 at 10:30 AM. Account: 101. Code: THG2JK9A1M.
Confirmed. KSh 12,000 received from MARY WANJIKU on 2/7/2026 at 2:15 PM. Account: 102. Code: THG2JK9A2M.
Confirmed. KSh 18,000 received from PETER OCHIENG on 3/7/2026 at 9:45 AM. Account: 103. Code: THG2JK9A3M.`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ fontSize: 14 }}
          />

          <div
            style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={parsePayments}
              loading={loading}
              size="large"
            >
              AI Parse Payments
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setText("");
                setParsedData([]);
                setMatchedPayments([]);
                setUnmatchedPayments([]);
              }}
              size="large"
            >
              Clear
            </Button>
            {onCancel && (
              <Button onClick={onCancel} size="large">
                Cancel
              </Button>
            )}
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Spin size="large" />
              <p style={{ marginTop: 8 }}>
                AI is parsing and matching payments...
              </p>
            </div>
          )}
        </TabPane>

        <TabPane
          tab={`📊 Review (${matchedPayments.length + unmatchedPayments.length})`}
          key="review"
          disabled={parsedData.length === 0}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <Title level={5} style={{ margin: 0 }}>
                <CheckCircleOutlined style={{ color: "#52c41a" }} />
                Payment Summary
              </Title>
              <div style={{ marginTop: 8 }}>
                <Tag color="green">{matchedPayments.length} Auto-Matched</Tag>
                <Tag color="orange">{unmatchedPayments.length} Need Review</Tag>
              </div>
            </div>
            <Space>
              <Tooltip title="Auto-confirm high-confidence matches">
                <Switch
                  checkedChildren="Auto"
                  unCheckedChildren="Manual"
                  checked={autoConfirm}
                  onChange={setAutoConfirm}
                />
              </Tooltip>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={importAll}
                loading={importing}
                size="large"
                style={{ background: "#52c41a", borderColor: "#52c41a" }}
                disabled={
                  matchedPayments.length === 0 &&
                  unmatchedPayments.filter((p) => p.manual_match).length === 0
                }
              >
                Import All (
                {matchedPayments.length +
                  unmatchedPayments.filter((p) => p.manual_match).length}
                )
              </Button>
            </Space>
          </div>

          {matchedPayments.length > 0 && (
            <Card
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                  Auto-Matched Payments ({matchedPayments.length})
                </Space>
              }
              style={{ marginBottom: 16, borderColor: "#52c41a" }}
            >
              {renderMatchedList()}
            </Card>
          )}

          {unmatchedPayments.length > 0 && (
            <Card
              title={
                <Space>
                  <WarningOutlined style={{ color: "#faad14" }} />
                  Unmatched Payments - Select Tenant (
                  {unmatchedPayments.filter((p) => !p.manual_match).length})
                </Space>
              }
              style={{ borderColor: "#faad14" }}
            >
              <Alert
                message="These payments couldn't be auto-matched. Please select a tenant for each."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              {renderUnmatchedList()}

              {unmatchedPayments.filter((p) => p.manual_match).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Alert
                    message={`✅ ${unmatchedPayments.filter((p) => p.manual_match).length} payments matched, ${unmatchedPayments.filter((p) => !p.manual_match).length} remaining`}
                    type="success"
                    showIcon
                  />
                </div>
              )}
            </Card>
          )}
        </TabPane>
      </Tabs>

      {parsedData.length === 0 && text && !loading && (
        <Alert
          message="No payments parsed"
          description="Please check the format. Each SMS should be on a new line."
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default IntelligentPaymentImport;
