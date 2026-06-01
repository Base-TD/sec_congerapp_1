import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

const IS_VULN = process.env.REACT_APP_MODE === "vuln";

function StatusBadge({ statut }) {
  const map = { pending: ["badge-pending","En attente"], approved: ["badge-approved","Approuvé"], rejected: ["badge-rejected","Refusé"] };
  const [cls, label] = map[statut] || ["badge","—"];
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Page Toutes les demandes ────────────────────────────────────────────────────
export function AdminDemandesPage() {
  const { api, user } = useAuth();
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [actionForm, setActionForm] = useState({ action: "approved", commentaire: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchConges = () => {
    api.get("/admin/conges").then(r => setConges(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchConges(); }, []);

  const handleAction = async () => {
    setActionLoading(true);
    try {
      await api.post("/admin/action", { conge_id: modal.id, ...actionForm });
      setModal(null);
      fetchConges();
    } catch (err) {
      alert(err.response?.data?.detail || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /> Chargement…</div>;

  const pending = conges.filter(c => c.statut === "pending");
  const others = conges.filter(c => c.statut !== "pending");

  return (
    <>
      <div className="page-header">
        <h2>Toutes les demandes</h2>
        <p>{conges.length} demande{conges.length > 1 ? "s" : ""} au total · {pending.length} en attente</p>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{marginBottom:20}}>
          <div className="card-title">⏳ En attente de validation ({pending.length})</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employé</th><th>Type</th><th>Période</th><th>Motif</th><th>Action</th></tr></thead>
              <tbody>
                {pending.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.prenom} {c.nom}</strong></td>
                    <td><span className="badge" style={{background:"var(--bg3)",color:"var(--text2)"}}>{c.type_conge}</span></td>
                    <td className="font-mono text-sm">{c.date_debut} → {c.date_fin}</td>
                    <td style={{maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.motif}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={() => { setModal(c); setActionForm({ action:"approved", commentaire:"" }); }}>✓ Approuver</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setModal(c); setActionForm({ action:"rejected", commentaire:"" }); }}>✗ Refuser</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Historique</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Employé</th><th>Type</th><th>Période</th><th>Motif</th><th>Statut</th><th>Commentaire</th></tr></thead>
            <tbody>
              {others.map(c => (
                <tr key={c.id}>
                  <td>{c.prenom} {c.nom}</td>
                  <td><span className="badge" style={{background:"var(--bg3)",color:"var(--text2)"}}>{c.type_conge}</span></td>
                  <td className="font-mono text-sm">{c.date_debut} → {c.date_fin}</td>
                  <td style={{maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.motif}</td>
                  <td><StatusBadge statut={c.statut} /></td>
                  <td className="text-muted text-sm">{c.commentaire || "—"}</td>
                </tr>
              ))}
              {others.length === 0 && <tr><td colSpan={6} style={{textAlign:"center",color:"var(--text3)",padding:"24px"}}>Aucun historique</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Traiter la demande #{modal.id}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div style={{marginBottom:16, padding:"12px", background:"var(--bg3)", borderRadius:8}}>
              <div className="text-sm"><strong>{modal.prenom} {modal.nom}</strong></div>
              <div className="text-sm text-muted">{modal.type_conge} · {modal.date_debut} → {modal.date_fin}</div>
              <div className="text-sm text-muted">{modal.motif}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Décision</label>
              <select className="form-select" value={actionForm.action}
                onChange={e => setActionForm(f => ({...f, action: e.target.value}))}>
                <option value="approved">✓ Approuver</option>
                <option value="rejected">✗ Refuser</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Commentaire (optionnel)</label>
              <textarea className="form-textarea" value={actionForm.commentaire}
                onChange={e => setActionForm(f => ({...f, commentaire: e.target.value}))}
                placeholder="Motif de la décision…" />
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Annuler</button>
              <button className={`btn ${actionForm.action === "approved" ? "btn-success" : "btn-danger"}`}
                onClick={handleAction} disabled={actionLoading}>
                {actionLoading ? "…" : actionForm.action === "approved" ? "Confirmer l'approbation" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Page Utilisateurs ──────────────────────────────────────────────────────────
export function AdminUsersPage() {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idor, setIdor] = useState(null);
  const [idorResult, setIdorResult] = useState(null);

  useEffect(() => {
    api.get("/admin/users").then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  const testIdor = async (targetId) => {
    try {
      const { data } = await api.get(`/profil/${targetId}`);
      setIdorResult({ id: targetId, data, success: true });
    } catch (err) {
      setIdorResult({ id: targetId, data: err.response?.data, success: false });
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /> Chargement…</div>;

  return (
    <>
      <div className="page-header">
        <h2>Utilisateurs</h2>
        <p>{users.length} utilisateurs enregistrés</p>
      </div>

      {IS_VULN && (
        <div className="alert alert-warning" style={{marginBottom:20}}>
          <div>
            <strong style={{display:"block",marginBottom:4}}>🐛 VULN 5 — IDOR (non détectable par SAST)</strong>
            L'endpoint <code style={{fontFamily:"var(--mono)"}}>/profil/:id</code> ne vérifie pas que l'utilisateur connecté
            est bien le propriétaire de la ressource. Testez en cliquant "Tester IDOR" sur n'importe quel utilisateur.
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Nom</th><th>Username</th><th>Rôle</th>
                <th>Solde CP</th><th>Solde RTT</th>
                {IS_VULN && <th>Démo IDOR</th>}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="text-xs text-muted font-mono">{u.id}</td>
                  <td><strong>{u.prenom} {u.nom}</strong></td>
                  <td className="font-mono text-sm">{u.username}</td>
                  <td>
                    <span className={`badge badge-role-${u.role}`}>{u.role}</span>
                  </td>
                  <td style={{color:"var(--accent)"}}>{u.solde_cp} j</td>
                  <td style={{color:"var(--green)"}}>{u.solde_rtt} j</td>
                  {IS_VULN && (
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => testIdor(u.id)}>
                        Tester IDOR
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {IS_VULN && idorResult && (
        <div className="card" style={{marginTop:16, borderColor: idorResult.success ? "var(--red)" : "var(--border)"}}>
          <div className="card-title" style={{color: idorResult.success ? "var(--red)" : "var(--text)"}}>
            {idorResult.success ? "⚡ IDOR réussi — profil #" + idorResult.id + " exposé" : "Accès refusé (version sécurisée)"}
          </div>
          <pre style={{fontFamily:"var(--mono)",fontSize:"0.8rem",color:"var(--text2)",whiteSpace:"pre-wrap",margin:0}}>
            {JSON.stringify(idorResult.data, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}

// ── Page Export & Audit ────────────────────────────────────────────────────────
export function AdminExportPage() {
  const { api } = useAuth();
  const [filename, setFilename] = useState("export.csv");
  const [exportStatus, setExportStatus] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    if (!IS_VULN) {
      api.get("/admin/audit").then(r => setAuditLog(r.data)).finally(() => setAuditLoading(false));
    } else {
      setAuditLoading(false);
    }
  }, []);

  const handleExport = async (e) => {
    e.preventDefault();
    setExportStatus(null);
    setLoading(true);
    try {
      const { data } = await api.post("/admin/export", { filename });
      setExportStatus({ type: "success", msg: `Export réussi : ${data.file || filename}` });
    } catch (err) {
      setExportStatus({ type: "error", msg: err.response?.data?.detail || "Erreur d'export" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Export & Audit</h2>
        <p>Exporter les données et consulter le journal d'audit.</p>
      </div>

      {IS_VULN && (
        <div className="alert alert-warning" style={{marginBottom:20}}>
          <div>
            <strong style={{display:"block",marginBottom:4}}>🐛 VULN 2 — Command Injection</strong>
            Le nom de fichier est passé directement dans un <code style={{fontFamily:"var(--mono)"}}>subprocess.call(shell=True)</code>.
            <br />Essayez : <code style={{fontFamily:"var(--mono)",background:"var(--bg3)",padding:"1px 6px",borderRadius:4}}>export.csv; cat /etc/passwd > /tmp/pwned.txt</code>
          </div>
        </div>
      )}

      <div className="card" style={{maxWidth:480, marginBottom:24}}>
        <div className="card-title">📤 Exporter les congés en CSV</div>
        {exportStatus && <div className={`alert alert-${exportStatus.type}`}>{exportStatus.msg}</div>}
        <form onSubmit={handleExport}>
          <div className="form-group">
            <label className="form-label">Nom du fichier de sortie</label>
            <input className="form-input" value={filename}
              onChange={e => setFilename(e.target.value)}
              placeholder="export.csv" />
            {IS_VULN && <span className="text-xs text-muted" style={{marginTop:4}}>⚠️ Aucune validation — injection possible</span>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Export en cours…" : "Lancer l'export"}
          </button>
        </form>
      </div>

      {!IS_VULN && (
        <div className="card">
          <div className="card-title">📋 Journal d'audit (100 dernières entrées)</div>
          {auditLoading ? (
            <div className="loading-page"><div className="spinner" /></div>
          ) : auditLog.length === 0 ? (
            <div className="empty-state"><p>Aucune entrée d'audit</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>User</th><th>Action</th><th>Ressource</th><th>IP</th><th>Date</th></tr></thead>
                <tbody>
                  {auditLog.map(l => (
                    <tr key={l.id}>
                      <td className="text-xs text-muted">{l.id}</td>
                      <td className="font-mono text-sm">{l.user_id}</td>
                      <td><span className="badge" style={{background:"var(--blue-bg)",color:"var(--accent)"}}>{l.action}</span></td>
                      <td className="font-mono text-sm">{l.resource}</td>
                      <td className="font-mono text-xs text-muted">{l.ip}</td>
                      <td className="font-mono text-xs text-muted">{l.timestamp?.split("T")[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {IS_VULN && (
        <div className="card">
          <div className="card-title text-muted">🔒 Journal d'audit</div>
          <div className="empty-state">
            <p style={{color:"var(--text3)"}}>Aucune journalisation des actions dans cette version.<br/>
            <span style={{fontSize:"0.75rem"}}>La version sécurisée enregistre toutes les actions sensibles.</span></p>
          </div>
        </div>
      )}
    </>
  );
}
