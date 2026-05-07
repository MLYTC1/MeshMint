import { Buffer } from "buffer";
import "./index.css";

if (typeof window !== "undefined") {
  (window as typeof window & { Buffer: typeof Buffer }).Buffer = Buffer;
}

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;

async function renderApp() {
  const [{ StrictMode }, { createRoot }, { Providers }, { default: App }] =
    await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./providers"),
      import("./App"),
    ]);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Providers>
        <App />
      </Providers>
    </StrictMode>
  );
}

renderApp();
