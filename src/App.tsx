import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./app/session";
import Login from "./app/Login";
import { Layout } from "./app/Layout";
import CatalogPage from "./features/catalog/CatalogPage";
import RulesPage from "./features/rules/RulesPage";
import AuditPage from "./features/audit/AuditPage";
import AnalyticsPage from "./features/analytics/AnalyticsPage";
import ConfigPage from "./features/config/ConfigPage";
import BillingPage from "./features/billing/BillingPage";

export default function App() {
  const { user } = useSession();

  if (!user) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/configuration" element={<ConfigPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </Layout>
  );
}
