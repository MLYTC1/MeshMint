// SPA entry — Solana/browser polyfills must run before any wallet adapter import.
import { Buffer } from "buffer";

const g = globalThis as unknown as Record<string, unknown>;
if (!g.global) g.global = globalThis;
if (!g.process) g.process = { env: {} };
if (!g.Buffer) g.Buffer = Buffer;
if (typeof window !== "undefined") {
  const w = window as unknown as Record<string, unknown>;
  if (!w.Buffer) w.Buffer = Buffer;
}

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

const rootEl = document.getElementById("root")!;
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
