// src/components/Shared/AppInstallBanner.jsx
import React, { useState, useEffect } from "react";
import { Button, Space, message } from "antd";
import { DownloadOutlined, CloseOutlined } from "@ant-design/icons";

const AppInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setShowBanner(true);
    });

    // Listen for the app installed event
    window.addEventListener("appinstalled", () => {
      setShowBanner(false);
      message.success("✅ RentManager installed successfully!");
    });

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowBanner(false);
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const result = await deferredPrompt.userChoice;

      if (result.outcome === "accepted") {
        console.log("User accepted the install prompt");
        setShowBanner(false);
        message.success("✅ RentManager installed successfully!");
      } else {
        console.log("User dismissed the install prompt");
        message.info("You can install later from the browser menu");
      }

      // Clear the deferred prompt
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Remember that the user dismissed the banner
    localStorage.setItem("installBannerDismissed", "true");
  };

  // Don't show if already dismissed or installed
  if (
    !showBanner ||
    localStorage.getItem("installBannerDismissed") === "true"
  ) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
        padding: "16px",
        zIndex: 1000,
        boxShadow: "0 -4px 12px rgba(0,0,0,0.15)",
        animation: "slideUp 0.5s ease",
      }}
    >
      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 500,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "white",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              background: "rgba(255,255,255,0.2)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            🏠
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              Install RentManager
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Get app-like experience on your phone
            </div>
          </div>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleInstallClick}
            style={{
              background: "white",
              color: "#1890ff",
              border: "none",
              borderRadius: 20,
              fontWeight: 600,
            }}
          >
            Install
          </Button>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={handleDismiss}
            style={{ color: "white" }}
          />
        </Space>
      </div>
    </div>
  );
};

export default AppInstallBanner;
