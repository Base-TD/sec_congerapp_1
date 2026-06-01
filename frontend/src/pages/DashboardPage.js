import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function StatusBadge({ statut }) {
  const map = { pending: ["badge-pending","En attente"], approved: ["badge-approved","Approuvé"], rejected: ["badge-rejected","Refusé"] };
  const [cls, label] = map[statut] || ["badge","—"];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function DashboardPage() {
  const { user, api } = useAuth();
  const [conges, setConges] = useState([]);
  const [me, setMe] = useState(user);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/conges").then(r => setConges(r.data)),
      api.get("/me").then(r => setMe(r.data)),
    ]).finally(() => setLoading(false));
  }, [api]);

  const pending = conges.filter(c => c.statut === "pending").length;
  const approved = conges.filter(c => c.statut === "approved").length;
  const recent = [...conges].sort((a,b) => b.id - a.id).slice(0, 5);

  if (loading) return (
    <div className="loading-page">
      <div className="spinner" /> Chargement…
    </div>
  );

  return (
    <>
      <div className="page-header">
        <h2>Bonjour, {me?.prenom} 👋</h2>
        <p>Voici un résumé de vos congés et demandes en cours.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Congés payés</div>
          <div className="stat-value" style={{color:"var(--accent)"}}>{me?.solde_cp}</div>
          <div className="stat-sub">jours disponibles</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">RTT</div>
          <div className="stat-value" style={{color:"#22c55e"}}>{me?.solde_rtt}</div>
          <div className="stat-sub">jours disponibles</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">En attente</div>
          <div className="stat-value" style={{color:"var(--amber)"}}>{pending}</div>
          <div className="stat-sub">demande{pending > 1 ? "s" : ""}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approuvés</div>
          <div className="stat-value" style={{color:"var(--green)"}}>{approved}</div>
          <div className="stat-sub">cette année</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{justifyContent:"space-between"}}>
          <span>Mes dernières demandes</span>
          <Link to="/nouvelle-demande" className="btn btn-primary btn-sm">+ Nouvelle demande</Link>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <p>Aucune demande pour l'instant.<br />
              <Link to="/nouvelle-demande" style={{color:"var(--accent)"}}>Créer votre première demande →</Link>
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Période</th>
                  <th>Motif</th>
                  <th>Statut</th>
                  <th>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(c => (
                  <tr key={c.id}>
                    <td><span className="badge" style={{background:"var(--bg3)",color:"var(--text2)"}}>{c.type_conge}</span></td>
                    <td className="font-mono text-sm">
                      {c.date_debut} → {c.date_fin}
                    </td>
                    <td style={{maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{c.motif}</td>
                    <td><StatusBadge statut={c.statut} /></td>
                    <td className="text-muted text-sm">{c.commentaire || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
