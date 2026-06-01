import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const IS_VULN = process.env.REACT_APP_MODE === "vuln";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      navigate(user.role === "employee" ? "/dashboard" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Identifiants invalides");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (username, password) => {
    setForm({ username, password });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <h1>🗓 CongesApp</h1>
          <p>Gestion des congés {IS_VULN ? "— version vulnérable" : "— version sécurisée"}</p>
        </div>

        {IS_VULN && (
          <div className="alert alert-warning" style={{marginBottom: 20}}>
            ⚠️ Version pédagogique — contient des failles intentionnelles
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nom d'utilisateur</label>
            <input
              className="form-input"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="alice, bob, claire, admin"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-input"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary full-width" disabled={loading}>
            {loading ? <><span className="spinner" style={{width:14,height:14}} /> Connexion…</> : "Se connecter"}
          </button>
        </form>

        <div className="login-hint">
          <strong>Comptes de test :</strong>
          {[
            { u: "alice",  p: "password123", r: "Employée" },
            { u: "bob",    p: "password456", r: "Employé" },
            { u: "claire", p: "password789", r: "Manager" },
            { u: "admin",  p: "conges2024!", r: "Admin RH" },
          ].map(({ u, p, r }) => (
            <div key={u} style={{cursor:"pointer", padding:"2px 0"}}
              onClick={() => quickLogin(u, p)}>
              <span style={{color:"var(--accent)"}}>{u}</span>
              <span style={{color:"var(--text3)"}}> / {p}</span>
              <span style={{float:"right", color:"var(--text3)"}}>{r}</span>
            </div>
          ))}
          <div style={{marginTop:6, color:"var(--text3)", fontSize:"0.72rem"}}>
            Cliquer sur un compte pour le remplir
          </div>
        </div>
      </div>
    </div>
  );
}
