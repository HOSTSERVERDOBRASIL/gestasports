import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { TenantThemeProvider } from "./context/TenantThemeContext";
import { ThemeProvider } from "./context/ThemeContext";
import { applyBrazilianPortugueseDefaults } from "./utils/locale";
import { getTenantBasename } from "./utils/tenantPath";
import { ApiError } from "./services/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      }
    }
  }
});
const tenantBasename = getTenantBasename();

applyBrazilianPortugueseDefaults();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={tenantBasename}>
        <ThemeProvider>
          <AuthProvider>
            <TenantThemeProvider>
              <App />
            </TenantThemeProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
