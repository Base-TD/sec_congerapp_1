import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

function StatusBadge({ statut }) {
  const map = { pending: ["badge-pending","En attente"], approved: ["badge-approved","Approuvé"], rejected: ["badge-rejected","Refusé"] };
  const [cls, label] = map[statut] || ["badge","—"];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function MesCongesPage() {
  const { api } = useAuth();
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/conges").then(r => setConges(r.data)).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <div className="loading-page"><div className="spinner" /> Chargement…</div>;

  return (
    <>
      <div className="page-header">
        <h2>Mes congés</h2>
        <p>Historique de toutes vos demandes de congé.</p>
      </div>

      <div className="card">
        {conges.length === 0 ? (
          <div className="empty-state">
            <p>Aucune demande enregistrée.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Type</th><th>Début</th><th>Fin</th>
                  <th>Motif</th><th>Statut</th><th>Commentaire</th><th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {conges.map(c => (
                  <tr key={c.id}>
                    <td className="text-muted text-xs">{c.id}</td>
                    <td><span className="badge" style={{background:"var(--bg3)",color:"var(--text2)"}}>{c.type_conge}</span></td>
                    <td className="font-mono text-sm">{c.date_debut}</td>
                    <td className="font-mono text-sm">{c.date_fin}</td>
                    <td style={{maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.motif}</td>
                    <td><StatusBadge statut={c.statut} /></td>
                    <td className="text-muted text-sm">{c.commentaire || "—"}</td>
                    <td className="text-muted text-xs font-mono">{c.created_at?.split("T")[0]}</td>
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

export function NouvelledemandePage() {
  const { api } = useAuth();
  const [form, setForm] = useState({ date_debut: "", date_fin: "", motif: "", type_conge: "CP" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await api.post("/conges", form);
      setStatus({ type: "success", msg: "Demande créée avec succès !" });
      setForm({ date_debut: "", date_fin: "", motif: "", type_conge: "CP" });
    } catch (err) {
      setStatus({ type: "error", msg: err.response?.data?.detail || "Erreur lors de la création" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Nouvelle demande de congé</h2>
        <p>Remplissez le formulaire ci-dessous. Votre manager sera notifié.</p>
      </div>

      <div className="card" style={{maxWidth: 520}}>
        {status && (
          <div className={`alert alert-${status.type}`}>{status.msg}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Type de congé</label>
            <select className="form-select" value={form.type_conge}
              onChange={e => setForm(f => ({...f, type_conge: e.target.value}))}>
              <option value="CP">Congés payés (CP)</option>
              <option value="RTT">RTT</option>
              <option value="Maladie">Congé maladie</option>
              <option value="Sans solde">Sans solde</option>
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Date de début</label>
              <input type="date" className="form-input" required
                value={form.date_debut}
                onChange={e => setForm(f => ({...f, date_debut: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Date de fin</label>
              <input type="date" className="form-input" required
                value={form.date_fin}
                min={form.date_debut}
                onChange={e => setForm(f => ({...f, date_fin: e.target.value}))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Motif</label>
            <textarea className="form-textarea" required
              placeholder="Décrivez brièvement le motif de votre demande"
              value={form.motif}
              onChange={e => setForm(f => ({...f, motif: e.target.value}))} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" style={{width:14,height:14}} /> Envoi…</> : "Envoyer la demande"}
          </button>
        </form>
      </div>
    </>
  );
}
