// components/IntelligentBulkWaterReadingImport.jsx
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
  Collapse,
  Tabs,
  Tooltip,
  Switch,
} from "antd";
import {
  UploadOutlined,
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
  RobotOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { bulkImportWaterReadings } from "../../services/water";
import { getUnits } from "../../services/units";
import { useProperty } from "../../context/PropertyContext";
import { formatCurrency } from "../../utils/formatters";
import waterReadingParser from "../../utils/waterReadingParser";

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

const IntelligentBulkWaterReadingImport = ({ onSuccess, onCancel }) => {
  const [text, setText] = useState("");
  const [parsedData, setParsedData] = useState([]);
  const [motherMeters, setMotherMeters] = useState({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [currentMonth, setCurrentMonth] = useState("");
  const [units, setUnits] = useState([]);
  const [validationResults, setValidationResults] = useState(null);
  const [activeTab, setActiveTab] = useState("parse");
  const [autoCorrect, setAutoCorrect] = useState(true);
  const { activeProperty } = useProperty();

  // Fetch units for validation
  useEffect(() => {
    if (activeProperty?.id) {
      fetchUnits();
    }
  }, [activeProperty]);

  const fetchUnits = async () => {
    try {
      const response = await getUnits({ property_id: activeProperty.id });
      setUnits(response.data || []);
    } catch (error) {
      console.error("Error fetching units:", error);
    }
  };

  // Parse the text with intelligent parser
  const parseReadings = () => {
    if (!text.trim()) {
      message.warning("Please paste the water readings first");
      return;
    }

    setLoading(true);
    try {
      // Use the intelligent parser
      const result = waterReadingParser.parse(text);

      console.log("📊 Parse result:", result);

      setParsedData(result.readings);
      setMotherMeters(result.mother_meters);

      if (result.month_info) {
        setCurrentMonth(`${result.month_info.month} ${result.month_info.year}`);
      }

      // Validate against existing units
      if (units.length > 0 && result.readings.length > 0) {
        const validation = waterReadingParser.validateReadings(
          result.readings,
          units,
        );
        setValidationResults(validation);
        console.log("✅ Validation results:", validation);
      }

      // ✅ AUTO-SWITCH TO REVIEW TAB AFTER PARSING
      if (
        result.readings.length > 0 ||
        Object.keys(result.mother_meters).length > 0
      ) {
        setActiveTab("review");
      }

      if (
        result.readings.length === 0 &&
        Object.keys(result.mother_meters).length === 0
      ) {
        message.warning(
          "No readings could be parsed. Please check the format.",
        );
      } else {
        const unknownCount = result.readings.filter((r) => r.is_unknown).length;
        const messageText = `✅ Parsed ${result.readings.length} readings and ${Object.keys(result.mother_meters).length} mother meters`;
        if (unknownCount > 0) {
          message.warning(`${messageText} (⚠️ ${unknownCount} unknown meters)`);
        } else {
          message.success(messageText);
        }
      }
    } catch (error) {
      console.error("Parse error:", error);
      message.error("Error parsing readings: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Import readings to the system
  const importReadings = async () => {
    if (parsedData.length === 0) {
      message.warning("No readings to import");
      return;
    }

    // Filter out unknown meters if not auto-correcting
    let readingsToImport = parsedData;
    if (!autoCorrect) {
      readingsToImport = parsedData.filter((r) => !r.is_unknown);
      if (readingsToImport.length < parsedData.length) {
        message.warning(
          `Skipping ${parsedData.length - readingsToImport.length} unknown meters`,
        );
      }
    }

    if (readingsToImport.length === 0) {
      message.warning("No valid readings to import");
      return;
    }

    setImporting(true);
    try {
      const payload = {
        readings: readingsToImport,
        mother_meters: motherMeters,
        property_id: activeProperty?.id,
        month: currentMonth,
        auto_correct: autoCorrect,
      };

      console.log("📤 Importing readings:", payload);

      const response = await bulkImportWaterReadings(payload);
      setImportResults(response.data);

      const successCount =
        response.data.imported?.length || readingsToImport.length;
      const errorCount = response.data.errors?.length || 0;

      if (errorCount > 0) {
        message.warning(
          `⚠️ Imported ${successCount} readings with ${errorCount} errors`,
        );
      } else {
        message.success(
          `✅ Successfully imported ${successCount} water readings`,
        );
      }

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error("Import error:", error);
      message.error("Failed to import readings: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 50,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Meter",
      dataIndex: "meter_number",
      key: "meter_number",
      render: (text, record) => {
        const isUnknown = record.is_unknown;
        const isImplicit = record.is_implicit;
        let color = "blue";
        let tooltip = "";
        if (isUnknown) {
          color = "red";
          tooltip = "⚠️ Unknown meter - will be skipped or needs correction";
        } else if (isImplicit) {
          color = "orange";
          tooltip = "ℹ️ Implicit meter number - auto-detected";
        }
        return (
          <Tooltip title={tooltip}>
            <Tag color={color} style={{ fontSize: 13 }}>
              {text}
              {isUnknown && <WarningOutlined style={{ marginLeft: 4 }} />}
              {isImplicit && <EditOutlined style={{ marginLeft: 4 }} />}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Reading",
      dataIndex: "current_reading",
      key: "current_reading",
      render: (value) => (
        <Text strong style={{ fontSize: 16 }}>
          {value}
        </Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        if (record.is_unknown) {
          return <Badge status="error" text="Unknown" />;
        }
        return <Badge status="processing" text="Ready" />;
      },
    },
  ];

  const motherMeterColumns = [
    {
      title: "Meter",
      dataIndex: "meter",
      key: "meter",
      render: (text) => <Tag color="green">{text}</Tag>,
    },
    {
      title: "Reading",
      dataIndex: "reading",
      key: "reading",
      render: (value) => (
        <Text strong style={{ fontSize: 16 }}>
          {value}
        </Text>
      ),
    },
  ];

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

          {imported.length > 0 && (
            <div style={{ marginTop: 16, textAlign: "left" }}>
              <Divider>Imported Readings</Divider>
              <Table
                columns={[
                  { title: "Meter", dataIndex: "meter_number", key: "meter" },
                  { title: "Tenant", dataIndex: "tenant", key: "tenant" },
                  { title: "Unit", dataIndex: "unit", key: "unit" },
                  {
                    title: "Reading",
                    dataIndex: "current_reading",
                    key: "reading",
                  },
                  {
                    title: "Units Used",
                    dataIndex: "units_used",
                    key: "units",
                  },
                ]}
                dataSource={imported}
                rowKey="meter_number"
                pagination={{ pageSize: 10 }}
                size="small"
              />
            </div>
          )}

          {errors.length > 0 && (
            <div style={{ marginTop: 16, textAlign: "left" }}>
              <Divider>Error Details</Divider>
              <ul style={{ color: "#ff4d4f" }}>
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
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
                setMotherMeters({});
                setText("");
                setCurrentMonth("");
                setValidationResults(null);
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
            <span>AI-Powered Water Reading Import</span>
          </Space>
        }
        description={
          <div>
            <p>
              <strong>Intelligent parsing handles:</strong>
            </p>
            <ul style={{ marginLeft: 16 }}>
              <li>
                Various separators: <code>...</code>, <code>.</code>,{" "}
                <code>-</code>, <code>:</code>, spaces
              </li>
              <li>Implicit meter numbers (just the reading)</li>
              <li>Common typos and variations</li>
              <li>Unknown meters (flagged for review)</li>
              <li>Automatic month detection</li>
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
        {currentMonth && (
          <Tag color="green" style={{ fontSize: 14, marginLeft: 8 }}>
            📅 {currentMonth}
          </Tag>
        )}
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">Units in system: </Text>
          <Tag color="purple">{units.length} units</Tag>
        </div>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="📝 Input" key="parse">
          <TextArea
            rows={10}
            placeholder={`Paste water readings here...
The AI will automatically detect the format.
Examples:
1...0606
2...548
7...0573
K1...0482
K2...0350

MOTHER METERS
1....03601
2....03196`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ fontSize: 14, fontFamily: "monospace" }}
          />

          <div
            style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={parseReadings}
              loading={loading}
              size="large"
            >
              AI Parse Readings
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setText("");
                setParsedData([]);
                setMotherMeters({});
                setCurrentMonth("");
                setValidationResults(null);
                setActiveTab("parse");
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
              <p style={{ marginTop: 8 }}>Parsing readings with AI...</p>
            </div>
          )}
        </TabPane>

        <TabPane
          tab={`📊 Review (${parsedData.length})`}
          key="review"
          disabled={
            parsedData.length === 0 && Object.keys(motherMeters).length === 0
          }
        >
          {(parsedData.length > 0 || Object.keys(motherMeters).length > 0) && (
            <>
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
                    Parsed Readings
                  </Title>
                  <Text type="secondary">
                    {parsedData.length} readings found
                  </Text>
                  {validationResults && (
                    <div style={{ marginTop: 4 }}>
                      <Tag color="green">
                        {validationResults.valid?.length || 0} valid
                      </Tag>
                      <Tag color="orange">
                        {validationResults.warnings?.length || 0} warnings
                      </Tag>
                      <Tag color="red">
                        {validationResults.errors?.length || 0} errors
                      </Tag>
                    </div>
                  )}
                </div>
                <Space>
                  <Tooltip title="Auto-correct unknown meters">
                    <Switch
                      checkedChildren="Auto"
                      unCheckedChildren="Manual"
                      checked={autoCorrect}
                      onChange={setAutoCorrect}
                    />
                  </Tooltip>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={importReadings}
                    loading={importing}
                    size="large"
                    style={{ background: "#52c41a", borderColor: "#52c41a" }}
                    disabled={parsedData.length === 0}
                  >
                    Import All ({parsedData.length})
                  </Button>
                </Space>
              </div>

              {validationResults && validationResults.warnings?.length > 0 && (
                <Alert
                  message={`⚠️ ${validationResults.warnings.length} warnings`}
                  description={
                    <ul style={{ marginBottom: 0 }}>
                      {validationResults.warnings.map((w, i) => (
                        <li key={i}>
                          Meter {w.meter_number} matched to {w.unit_number}{" "}
                          (partial match)
                        </li>
                      ))}
                    </ul>
                  }
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              {validationResults && validationResults.errors?.length > 0 && (
                <Alert
                  message={`❌ ${validationResults.errors.length} errors`}
                  description={
                    <ul style={{ marginBottom: 0 }}>
                      {validationResults.errors.map((e, i) => (
                        <li key={i}>{e.error}</li>
                      ))}
                    </ul>
                  }
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <Table
                columns={columns}
                dataSource={parsedData}
                rowKey="meter_number"
                pagination={{ pageSize: 20 }}
                size="small"
                scroll={{ y: 300 }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4}>
                        <Text strong>Total: {parsedData.length} readings</Text>
                        {validationResults && (
                          <span style={{ marginLeft: 16 }}>
                            <Tag color="green">
                              {validationResults.valid?.length || 0} valid
                            </Tag>
                            <Tag color="orange">
                              {validationResults.warnings?.length || 0} warnings
                            </Tag>
                            <Tag color="red">
                              {validationResults.errors?.length || 0} errors
                            </Tag>
                          </span>
                        )}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />

              {Object.keys(motherMeters).length > 0 && (
                <Card style={{ marginTop: 16, borderColor: "#faad14" }}>
                  <Title level={5}>
                    <DatabaseOutlined style={{ color: "#faad14" }} />
                    Mother Meters ({Object.keys(motherMeters).length})
                  </Title>
                  <Table
                    columns={motherMeterColumns}
                    dataSource={Object.entries(motherMeters).map(
                      ([meter, reading]) => ({
                        meter,
                        reading,
                      }),
                    )}
                    rowKey="meter"
                    pagination={false}
                    size="small"
                  />
                </Card>
              )}
            </>
          )}

          {parsedData.length === 0 &&
            Object.keys(motherMeters).length === 0 && (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <p style={{ fontSize: 16, color: "#8c8c8c" }}>
                  No data to review yet.
                </p>
                <p style={{ color: "#8c8c8c" }}>
                  Go to the <strong>Input</strong> tab and paste your readings.
                </p>
              </div>
            )}
        </TabPane>
      </Tabs>

      {parsedData.length === 0 && text && !loading && (
        <Alert
          message="No readings parsed"
          description="Please check the format. Try including meter numbers before readings."
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default IntelligentBulkWaterReadingImport;
