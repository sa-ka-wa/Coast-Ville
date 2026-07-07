// src/components/PaymentParser.jsx
import React, { useState } from "react";
import {
  Card,
  Input,
  Button,
  Alert,
  Descriptions,
  Tag,
  Space,
  Spin,
  message,
  Avatar,
  List,
  Typography,
} from "antd";
import {
  MobileOutlined,
  SearchOutlined,
  UserOutlined,
  CheckCircleOutlined,
  WhatsAppOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import {
  parseMpesaMessage,
  matchPayment, // ← Changed from matchTenantToPayment
  confirmPayment,
} from "../../../services/payments";

const { TextArea } = Input;
const { Text } = Typography;

const PaymentParser = ({ onPaymentConfirmed, propertyId }) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [matchedTenants, setMatchedTenants] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState(0); // 0: paste, 1: parsed, 2: matched, 3: confirmed

  const handleParse = async () => {
    if (!message.trim()) {
      message.warning("Please paste the M-Pesa message");
      return;
    }

    setLoading(true);
    setStep(1);
    try {
      const response = await parseMpesaMessage({ message });
      const data = response.data;
      setParsedData(data);

      if (data.amount) {
        message.success(
          `💰 Parsed amount: KSh ${data.amount.toLocaleString()}`,
        );
        // Auto-match tenant
        await handleMatchTenant(data);
        setStep(2);
      } else {
        message.warning("Could not parse amount from message");
        setStep(0);
      }
    } catch (error) {
      console.error("Error parsing M-Pesa message:", error);
      message.error("Failed to parse M-Pesa message");
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchTenant = async (data) => {
    try {
      const response = await matchPayment({
        // ← Changed from matchTenantToPayment
        amount: data.amount,
        phone: data.phone,
      });

      const matches = response.data.matched_tenants || [];
      setMatchedTenants(matches);

      if (matches.length === 1) {
        message.success("✅ Tenant matched automatically!");
        // Auto-confirm if only one match
        setTimeout(() => {
          handleConfirmPayment(matches[0].id);
        }, 1000);
      } else if (matches.length > 1) {
        message.info("👥 Multiple tenants matched, please select one");
      } else {
        message.warning("❌ No tenant matched automatically");
      }
    } catch (error) {
      console.error("Error matching tenant:", error);
      message.error("Failed to match tenant");
    }
  };

  const handleConfirmPayment = async (tenantId) => {
    if (!tenantId && matchedTenants.length !== 1) {
      message.warning("Please select a tenant");
      return;
    }

    const selectedTenantId = tenantId || matchedTenants[0]?.id;
    if (!selectedTenantId) {
      message.warning("No tenant selected");
      return;
    }

    setConfirming(true);
    try {
      const paymentData = {
        tenant_id: selectedTenantId,
        amount: parsedData.amount,
        payment_method: "mpesa",
        mpesa_code: parsedData.mpesa_code || parsedData.till_number,
        payment_for_month: new Date().toISOString().split("T")[0],
        notes: `M-Pesa payment from ${parsedData.sender || "Unknown"}\n${message.substring(0, 500)}`,
        property_id: propertyId,
      };

      const response = await confirmPayment(paymentData);

      message.success("✅ Payment confirmed successfully!");
      setStep(3);

      // Notify parent
      if (onPaymentConfirmed) {
        onPaymentConfirmed(response.data.payment);
      }

      // Reset after 3 seconds
      setTimeout(() => {
        setMessage("");
        setParsedData(null);
        setMatchedTenants([]);
        setStep(0);
      }, 3000);
    } catch (error) {
      console.error("Error confirming payment:", error);
      message.error(
        error.response?.data?.message || "Failed to confirm payment",
      );
      setStep(0);
    } finally {
      setConfirming(false);
    }
  };

  const handleClear = () => {
    setMessage("");
    setParsedData(null);
    setMatchedTenants([]);
    setStep(0);
  };

  return (
    <Card
      title={
        <Space>
          <MobileOutlined style={{ color: "#25D366" }} />
          <span>M-Pesa Payment Parser</span>
          <Tag color="green">Copy & Paste</Tag>
        </Space>
      }
      style={{ maxWidth: 800, margin: "0 auto" }}
    >
      {/* Step 1: Paste SMS */}
      <div style={{ marginBottom: 16 }}>
        <TextArea
          rows={4}
          placeholder={`📋 Paste M-Pesa SMS message here...

Example:
Confirmed. KSh 15,000 received from JOHN MWANGI on 1/7/2026 at 10:30 AM.
Paybill: 123456, Account: RENT-001. Code: THG2JK9A1M.`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ fontSize: 14 }}
          disabled={step === 3}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleParse}
            loading={loading}
            disabled={!message.trim() || step === 3}
          >
            🔍 Parse Message
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard
                ?.readText?.()
                .then((text) => {
                  if (text) setMessage(text);
                })
                .catch(() => {});
            }}
          >
            Paste from Clipboard
          </Button>
          <Button onClick={handleClear} disabled={step === 3}>
            Clear
          </Button>
        </div>
      </div>

      {/* Step 2: Parsed Data */}
      {parsedData && step >= 1 && step < 3 && (
        <Card
          size="small"
          style={{
            marginBottom: 16,
            background: "#f6ffed",
            borderColor: "#b7eb8f",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>Amount</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#52c41a" }}>
                KSh {parsedData.amount?.toLocaleString()}
              </div>
            </div>
            <Divider type="vertical" style={{ height: 40 }} />
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>Sender</div>
              <div style={{ fontWeight: 600 }}>
                {parsedData.sender || "Unknown"}
              </div>
            </div>
            <Divider type="vertical" style={{ height: 40 }} />
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>M-Pesa Code</div>
              <Tag color="blue" style={{ fontSize: 14 }}>
                {parsedData.mpesa_code || "N/A"}
              </Tag>
            </div>
            {parsedData.till_number && (
              <>
                <Divider type="vertical" style={{ height: 40 }} />
                <div>
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                    Till Number
                  </div>
                  <Tag color="purple">{parsedData.till_number}</Tag>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Step 3: Matched Tenants */}
      {matchedTenants.length > 0 && step === 2 && (
        <Card
          title={
            <Space>
              <UserOutlined />
              Matched Tenants ({matchedTenants.length})
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <List
            dataSource={matchedTenants}
            renderItem={(tenant) => (
              <List.Item
                actions={[
                  <Button
                    type="primary"
                    size="small"
                    loading={confirming}
                    onClick={() => handleConfirmPayment(tenant.id)}
                    icon={<CheckCircleOutlined />}
                  >
                    Confirm
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ backgroundColor: "#1890ff" }}>
                      {tenant.name[0]}
                    </Avatar>
                  }
                  title={<strong>{tenant.name}</strong>}
                  description={
                    <Space>
                      <span>🏠 House: {tenant.house_no || "N/A"}</span>
                      <span>|</span>
                      <span>
                        💰 Balance: KSh {(tenant.balance || 0).toLocaleString()}
                      </span>
                      <span>|</span>
                      <span>🎯 Match: {tenant.match_score || 0}%</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {parsedData &&
        matchedTenants.length === 0 &&
        step === 2 &&
        !confirming && (
          <Alert
            message="❌ No tenant matched"
            description="Could not automatically match this payment to a tenant. Try manual entry instead."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

      {/* Step 4: Confirmed */}
      {step === 3 && (
        <Alert
          message="✅ Payment Confirmed!"
          description={
            <div>
              <p>
                Amount:{" "}
                <strong>KSh {parsedData?.amount?.toLocaleString()}</strong> has
                been recorded successfully.
              </p>
              <p style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  icon={<WhatsAppOutlined />}
                  style={{ backgroundColor: "#25D366", borderColor: "#25D366" }}
                >
                  Send Receipt via WhatsApp
                </Button>
              </p>
            </div>
          }
          type="success"
          showIcon
        />
      )}
    </Card>
  );
};

export default PaymentParser;
