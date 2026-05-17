import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { DashboardGrid } from "./components/DashboardGrid";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { FamilyProvider } from "./context/FamilyContext";
import { useAuth } from "./hooks/useAuth";
import "./index.css";

type Page = "dashboard" | "settings";

function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <FamilyProvider familyId={user.uid}>
      {page === "settings" ? (
        <SettingsPage onBack={() => setPage("dashboard")} />
      ) : (
        <DashboardGrid onSettings={() => setPage("settings")} />
      )}
    </FamilyProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
