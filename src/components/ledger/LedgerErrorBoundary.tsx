"use client";

import React, { Component, ReactNode } from "react";
import { ShieldAlert, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class LedgerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[LedgerErrorBoundary] Uncaught ledger component error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: "#FFF1F2",
            border: "2px solid #E11D48",
            boxShadow: "4px 4px 0 #000000",
            padding: "24px",
            borderRadius: "4px",
            textAlign: "center",
            margin: "16px 0",
          }}
        >
          <div style={{ display: "inline-flex", padding: "10px", background: "#FFE4E6", borderRadius: "50%", marginBottom: "12px", border: "1.5px solid #E11D48" }}>
            <ShieldAlert size={24} color="#BE123C" />
          </div>
          <h3 style={{ fontFamily: "var(--display)", fontSize: "18px", fontWeight: 900, color: "#9F1239", margin: "0 0 6px 0" }}>
            {this.props.fallbackTitle || "FINANCIAL MODULE TEMPORARILY UNAVAILABLE"}
          </h3>
          <p style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "#881337", maxWidth: "480px", margin: "0 auto 16px auto", lineHeight: 1.45 }}>
            {this.state.error?.message || "An unexpected rendering glitch occurred. Click retry to recover without losing your ledger data."}
          </p>
          <button
            type="button"
            className="btn-ledger btn-ledger-primary"
            onClick={this.handleReset}
            style={{ fontSize: "11px", padding: "8px 18px" }}
          >
            <RotateCcw size={12} aria-hidden="true" />
            RETRY MODULE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
