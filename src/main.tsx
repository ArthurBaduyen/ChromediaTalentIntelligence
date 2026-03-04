import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { ToastProvider } from "./shared/components/ToastProvider";
import { AuthProvider } from "./shared/auth/AuthProvider";
import { AppErrorBoundary } from "./shared/components/AppErrorBoundary";
import "./app/styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
