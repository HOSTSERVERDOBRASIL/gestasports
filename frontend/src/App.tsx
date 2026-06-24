import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppRoutes } from "./routes/AppRoutes";
import { useLocation } from "react-router-dom";

function App() {
  const location = useLocation();

  return (
    <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;
