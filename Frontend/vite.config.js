import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "RentManager - Property Management",
        short_name: "RentManager",
        description:
          "Property management system for rent collection, water readings, and payments",
        theme_color: "#1890ff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/caretaker/dashboard",
        icons: [
          {
            src: "/icons/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "View property dashboard",
            url: "/caretaker/dashboard",
            icons: [
              {
                src: "/icons/dashboard-96x96.png",
                sizes: "96x96",
                type: "image/png",
              },
            ],
          },
          {
            name: "Add Reading",
            short_name: "Add Reading",
            description: "Add water meter reading",
            url: "/caretaker/readings",
            icons: [
              {
                src: "/icons/reading-96x96.png",
                sizes: "96x96",
                type: "image/png",
              },
            ],
          },
          {
            name: "Payments",
            short_name: "Payments",
            description: "View and record payments",
            url: "/caretaker/payments",
            icons: [
              {
                src: "/icons/payment-96x96.png",
                sizes: "96x96",
                type: "image/png",
              },
            ],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Add allowedHosts to allow ngrok domain
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      ".ngrok.io",
      ".ngrok-free.dev",
      "easiest-predefine-crushable.ngrok-free.dev",
    ],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5555",
        changeOrigin: true,
        secure: false,
        ws: true, // Add ws: true for WebSocket proxying
      },
    },
    watch: {
      usePolling: true,
    },
    hmr: {
      overlay: true,
      host: "localhost",
      protocol: "ws",
      clientPort: 5173,
      port: 5173,
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          antd: ["antd"],
        },
      },
    },
  },
});
