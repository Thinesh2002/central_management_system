import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { RequireAuth, useSession } from "./components/Session";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import DarazPage from "./pages/Daraz";

function Protected({ permission, children }) {
  return (
    <RequireAuth>
      <Layout>
        <RequireAuth permission={permission}>{children}</RequireAuth>
      </Layout>
    </RequireAuth>
  );
}

// Land on the first page the user can actually open.
function Home() {
  const { access, loading } = useSession();
  if (loading) return null;
  if (!access.dashboard.view && access.daraz.view) return <Navigate to="/daraz" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/dashboard" element={<Protected permission="dashboard.view"><DashboardPage /></Protected>} />
      <Route path="/daraz" element={<Protected permission="daraz.view"><DarazPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
