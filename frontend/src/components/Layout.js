import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const IS_VULN = process.env.REACT_APP_MODE === "vuln";

const IconHome = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);
const IconCalendar = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);
const IconPlus = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const IconUsers = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const IconShield = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const IconLogout = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);
const IconSearch = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);
const IconList = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

function initials(nom, prenom) {
  return `${(prenom || "?")[0]}${(nom || "?")[0]}`.toUpperCase();
}

function roleBadge(role) {
  const map = { admin: "Admin RH", manager: "Manager", employee: "Employé" };
  return map[role] || role;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  const isManager = user?.role === "manager" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  return (
    <div className="app-shell">
      {IS_VULN && (
        <div className="vuln-banner">
          ⚠️ VERSION VULNÉRABLE — À USAGE PÉDAGOGIQUE UNIQUEMENT — NE PAS DÉPLOYER EN PRODUCTION
        </div>
      )}

      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🗓 CongesApp</h1>
          <span>{IS_VULN ? "v1.0 — vulnérable" : "v2.0 — sécurisée"}</span>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Général</span>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <IconHome /> Tableau de bord
          </NavLink>
          <NavLink to="/mes-conges" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <IconCalendar /> Mes congés
          </NavLink>
          <NavLink to="/nouvelle-demande" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <IconPlus /> Nouvelle demande
          </NavLink>
          <NavLink to="/recherche" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <IconSearch /> Recherche
          </NavLink>

          {isManager && (
            <>
              <span className="nav-section-label" style={{marginTop: 8}}>Administration</span>
              <NavLink to="/admin/demandes" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                <IconList /> Toutes les demandes
              </NavLink>
              <NavLink to="/admin/utilisateurs" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                <IconUsers /> Utilisateurs
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin/export" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                  <IconShield /> Export & audit
                </NavLink>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info" onClick={handleLogout} title="Se déconnecter">
            <div className="avatar">{initials(user?.nom, user?.prenom)}</div>
            <div className="user-info-text">
              <div className="name">{user?.prenom} {user?.nom}</div>
              <div className="role">{roleBadge(user?.role)}</div>
            </div>
            <IconLogout />
          </div>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
