import App from "App";
import { MaterialUIControllerProvider } from "context";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found. Check public/index.html");
}

const root = createRoot(container);

root.render(
  <BrowserRouter>
    <MaterialUIControllerProvider>
      <App />
    </MaterialUIControllerProvider>
  </BrowserRouter>
);
