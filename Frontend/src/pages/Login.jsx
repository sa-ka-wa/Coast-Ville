// pages/Login.jsx
import React, { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Layout,
  Typography,
  message,
  Alert,
} from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);

    try {
      const result = await login(values.email, values.password);

      if (result.success) {
        message.success("Login successful!");

        // Redirect based on role
        if (result.user.role === "admin") {
          navigate("/admin", { replace: true });
        } else if (result.user.role === "caretaker") {
          navigate("/caretaker", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } else {
        setError(result.error || "Invalid email or password");
        message.error(result.error || "Login failed");
      }
    } catch (error) {
      setError("An error occurred during login. Please try again.");
      message.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Demo credentials for quick testing
  const fillDemoCredentials = () => {
    // You can set these to your test accounts
    // For demo purposes only
  };

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
      <Card
        style={{
          width: 400,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          borderRadius: 8,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={2} style={{ color: "#1890ff", marginBottom: 4 }}>
            🏠 RentManager
          </Title>
          <Text type="secondary">Property Management System</Text>
        </div>

        {error && (
          <Alert
            message="Login Error"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            onClose={() => setError(null)}
          />
        )}

        <Form
          layout="vertical"
          onFinish={onFinish}
          size="large"
          initialValues={{
            email: "admin@example.com",
            password: "password123",
          }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please enter your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Enter your email"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Please enter your password!" },
              { min: 6, message: "Password must be at least 6 characters!" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size="large"
            >
              Sign In
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Text type="secondary">
              Don't have an account? <Link to="/register">Register now</Link>
            </Text>
          </div>
        </Form>

        <Alert
          message="Demo Credentials"
          description={
            <div>
              <div>
                <strong>Admin:</strong> admin@example.com / password123
              </div>
              <div>
                <strong>Caretaker:</strong> caretaker@example.com / password123
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 16, fontSize: 12 }}
        />
      </Card>
    </Layout>
  );
};

export default Login;
