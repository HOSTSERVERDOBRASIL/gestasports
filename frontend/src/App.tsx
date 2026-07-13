import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppRoutes } from "./routes/AppRoutes";
import { ToastProvider } from "./components/ui/Toast";
import { SessionExpiryBanner } from "./components/ui/SessionExpiryBanner";
import { useLocation } from "react-router-dom";

function App() {
  const location = useLocation();

  return (
    <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>
      <SessionExpiryBanner />
      <AppRoutes />
      <ToastProvider />
    </ErrorBoundary>
  );
}

export default App;
