import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import { MesCongesPage, NouvelledemandePage } from "./pages/CongesPages";
import RecherchePage from "./pages/RecherchePage";
import { AdminDemandesPage, AdminUsersPage, AdminExportPage } from "./pages/AdminPages";
import "./index.css";

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />

      <Route path="/dashboard" element={
        <RequireAuth><Layout><DashboardPage /></Layout></RequireAuth>
      } />
      <Route path="/mes-conges" element={
        <RequireAuth><Layout><MesCongesPage /></Layout></RequireAuth>
      } />
      <Route path="/nouvelle-demande" element={
        <RequireAuth><Layout><NouvelledemandePage /></Layout></RequireAuth>
      } />
      <Route path="/recherche" element={
        <RequireAuth><Layout><RecherchePage /></Layout></RequireAuth>
      } />
      <Route path="/admin/demandes" element={
        <RequireRole roles={["admin","manager","rh"]}>
          <Layout><AdminDemandesPage /></Layout>
        </RequireRole>
      } />
      <Route path="/admin/utilisateurs" element={
        <RequireRole roles={["admin","manager","rh"]}>
          <Layout><AdminUsersPage /></Layout>
        </RequireRole>
      } />
      <Route path="/admin/export" element={
        <RequireRole roles={["admin","rh"]}>
          <Layout><AdminExportPage /></Layout>
        </RequireRole>
      } />

      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
