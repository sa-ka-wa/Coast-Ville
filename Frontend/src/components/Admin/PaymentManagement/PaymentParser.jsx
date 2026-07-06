// components/Admin/PaymentManagement/PaymentParser.jsx
import React, { useState } from "react";
import {
  Card,
  Input,
  Button,
  Alert,
  Descriptions,
  Modal,
  message,
  Space,
} from "antd";
import { CheckCircleOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { parseMpesaSMS } from "../../../utils/mpesaParser";
import { formatCurrency } from "../../../utils/formatters";
import {
  matchTenantToPayment,
  confirmPayment,
} from "../../../services/payments";

const { TextArea } = Input;

const PaymentParser = ({ onPaymentConfirmed }) => {
  const [smsText, setSmsText] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [matchedTenant, setMatchedTenant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleParse = async () => {
    if (!smsText.trim()) {
      message.warning("Please paste an M-Pesa SMS");
      return;
    }

    setLoading(true);
    try {
      // Parse SMS
      const parsed = parseMpesaSMS(smsText);
      setParsedData(parsed);

      // Match tenant
      const response = await matchTenantToPayment(parsed.phone, parsed.amount);
      if (response.data.tenant) {
        setMatchedTenant(response.data.tenant);
        message.success(
          `Matched: ${response.data.tenant.name} (${response.data.tenant.houseNo})`,
        );
      } else {
        message.warning("No matching tenant found. Please check manually.");
      }
    } catch (error) {
      message.error("Failed to parse SMS: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!matchedTenant || !parsedData) return;

    setConfirming(true);
    try {
      const response = await confirmPayment(matchedTenant.id, parsedData);

      Modal.success({
        title: "Payment Confirmed! ✅",
        content: (
          <div>
            <p>
              Payment of {formatCurrency(parsedData.amount)} from{" "}
              {matchedTenant.name} confirmed.
            </p>
            <p>Receipt sent via WhatsApp to {matchedTenant.phone}</p>
          </div>
        ),
      });

      // Reset form
      setSmsText("");
      setParsedData(null);
      setMatchedTenant(null);

      if (onPaymentConfirmed) onPaymentConfirmed();
    } catch (error) {
      message.error("Failed to confirm payment: " + error.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Card
      title="Process M-Pesa Payment"
      extra={
        <Space>
          <Button
            icon={<WhatsAppOutlined />}
            onClick={() => window.open("https://web.whatsapp.com", "_blank")}
          >
            Send Receipt
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <TextArea
          rows={4}
          value={smsText}
          onChange={(e) => setSmsText(e.target.value)}
          placeholder="Paste M-Pesa confirmation message here..."
          disabled={loading || confirming}
        />
        <Button
          type="primary"
          onClick={handleParse}
          loading={loading}
          style={{ marginTop: 16 }}
          disabled={confirming}
        >
          Parse Payment
        </Button>
      </div>

      {parsedData && matchedTenant && (
        <Alert
          message="Payment Details"
          description={
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Receipt No">
                {parsedData.receipt}
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <strong>{formatCurrency(parsedData.amount)}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {parsedData.phone}
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {parsedData.date || new Date().toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Matched Tenant" span={2}>
                <strong>{matchedTenant.name}</strong> - {matchedTenant.houseNo}
              </Descriptions.Item>
              <Descriptions.Item label="Monthly Rent">
                {formatCurrency(matchedTenant.monthlyRent)}
              </Descriptions.Item>
              <Descriptions.Item label="Current Balance">
                {formatCurrency(matchedTenant.balance || 0)}
              </Descriptions.Item>
            </Descriptions>
          }
          type="success"
          showIcon
          action={
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleConfirm}
              loading={confirming}
              size="large"
            >
              Confirm Payment
            </Button>
          }
        />
      )}
    </Card>
  );
};

export default PaymentParser;
