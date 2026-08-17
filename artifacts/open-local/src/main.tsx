import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import "./i18n";

// Supply the session token to all generated API client hooks globally so
// authenticated endpoints (e.g. PATCH /vendors/:id) receive an Authorization
// header without each call site needing to configure it manually.
setAuthTokenGetter(() => localStorage.getItem("ol_session"));

createRoot(document.getElementById("root")!).render(<App />);
