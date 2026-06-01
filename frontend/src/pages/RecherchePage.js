import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const IS_VULN = process.env.REACT_APP_MODE === "vuln";

export default function RecherchePage() {
  const { api } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [rawQuery, setRawQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await api.get("/conges/search", { params: { q: query } });
      setResults(data.results);
      setRawQuery(data.query_used || "");
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur de recherche");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Recherche de congés</h2>
        <p>Recherchez parmi vos demandes par motif ou type de congé.</p>
      </div>

      {IS_VULN && (
        <div className="alert alert-warning" style={{marginBottom: 20}}>
          <div>
            <strong style={{display:"block", marginBottom:4}}>🐛 VULN 1 — SQL Injection</strong>
            Cette recherche concatène directement votre saisie dans la requête SQL.
            <br />Essayez : <code style={{background:"var(--bg3)",padding:"1px 6px",borderRadius:4,fontFamily:"var(--mono)"}}>%' OR '1'='1</code>
            {" "}pour voir toutes les demandes de tous les utilisateurs.
          </div>
        </div>
      )}

      <div className="card" style={{marginBottom:20}}>
        <form onSubmit={handleSearch} className="flex gap-3 items-center">
          <input
            className="form-input"
            style={{flex:1}}
            placeholder="Vacances, RTT, CP…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" style={{width:14,height:14}} /> : "Rechercher"}
          </button>
        </form>

        {IS_VULN && rawQuery && (
          <div style={{marginTop:12, padding:"10px 12px", background:"var(--bg3)", borderRadius:8, borderLeft:"3px solid var(--red)"}}>
            <div className="text-xs text-muted" style={{marginBottom:4}}>Requête SQL exécutée (exposée pour la démo) :</div>
            <code className="font-mono text-sm" style={{color:"var(--red)", wordBreak:"break-all"}}>{rawQuery}</code>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {results !== null && (
        <div className="card">
          <div className="card-title">{results.length} résultat{results.length > 1 ? "s" : ""}</div>
          {results.length === 0 ? (
            <div className="empty-state"><p>Aucun résultat pour cette recherche.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>User ID</th><th>Type</th>
                    <th>Début</th><th>Fin</th><th>Motif</th><th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td className="text-xs text-muted">{r[0]}</td>
                      <td className="font-mono text-sm" style={{color: IS_VULN ? "var(--amber)" : "var(--text2)"}}>{r[1]}</td>
                      <td><span className="badge" style={{background:"var(--bg3)",color:"var(--text2)"}}>{r[5]}</span></td>
                      <td className="font-mono text-sm">{r[2]}</td>
                      <td className="font-mono text-sm">{r[3]}</td>
                      <td>{r[4]}</td>
                      <td>{r[6]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {IS_VULN && results.some(r => r[1] !== results[0][1]) && (
                <div className="alert alert-error" style={{margin:"12px 0 0"}}>
                  ⚡ Injection réussie — vous voyez des données appartenant à d'autres utilisateurs !
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
