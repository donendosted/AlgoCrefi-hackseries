"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export default class DashboardErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // no-op
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05050A", padding: 20 }}>
        <div
          style={{
            width: "min(420px, 100%)",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h2 className="font-display" style={{ margin: 0, fontSize: 24, color: "#F0F0F0" }}>
            Something went wrong
          </h2>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              background: "#00FFD1",
              color: "#05050A",
              border: "none",
              borderRadius: 8,
              padding: "10px 16px",
              fontFamily: "Inter,sans-serif",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
