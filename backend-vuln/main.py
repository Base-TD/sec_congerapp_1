"""
CongesApp — Backend VULNÉRABLE (version pédagogique)
=====================================================
Ce fichier contient INTENTIONNELLEMENT 5 vulnérabilités pour le TP.

VULN 1 — SQL Injection        (ligne ~80)
VULN 2 — Command Injection    (ligne ~100)
VULN 3 — Secrets hardcodés    (ligne ~20)
VULN 4 — Logging de mots de passe (ligne ~120)
VULN 5 — IDOR                 (ligne ~140) ← non détectable par SAST
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import sqlite3
import subprocess
import logging
import jwt
import datetime
import os

# ══════════════════════════════════════════
# VULN 3 — Secrets hardcodés en clair
# ══════════════════════════════════════════
SECRET_KEY = "super_secret_jwt_key_12345"          # ← FAILLE : secret en dur
DB_PASSWORD = "admin123"                            # ← FAILLE : inutile mais présent
ADMIN_PASSWORD = "conges2024!"                      # ← FAILLE : mot de passe admin

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="CongesApp API (VULNÉRABLE)", version="1.0.0-vuln")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

DB_PATH = "/app/conges.db"

# ─── Modèles ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class CongeRequest(BaseModel):
    date_debut: str
    date_fin: str
    motif: str
    type_conge: str

class ExportRequest(BaseModel):
    filename: str

class ActionRequest(BaseModel):
    conge_id: int
    action: str  # "approved" ou "rejected"
    commentaire: str = ""

# ─── Init DB ───────────────────────────────────────────────────────────────────

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        nom TEXT,
        prenom TEXT,
        solde_cp INTEGER DEFAULT 25,
        solde_rtt INTEGER DEFAULT 10
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS conges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date_debut TEXT,
        date_fin TEXT,
        motif TEXT,
        type_conge TEXT,
        statut TEXT DEFAULT 'pending',
        commentaire TEXT DEFAULT '',
        created_at TEXT
    )""")
    users = [
        (1, "alice", "password123", "employee", "Martin", "Alice", 25, 10),
        (2, "bob",   "password456", "employee", "Durand", "Bob",   18, 8),
        (3, "claire","password789", "manager",  "Petit",  "Claire",25, 10),
        (4, "admin", "conges2024!", "admin",    "Admin",  "RH",    99, 99),
    ]
    for u in users:
        try:
            c.execute("INSERT INTO users VALUES (?,?,?,?,?,?,?,?)", u)
        except sqlite3.IntegrityError:
            pass
    conges_data = [
        (1, "2025-07-01", "2025-07-14", "Vacances été", "CP", "approved", "Validé", "2025-05-01"),
        (1, "2025-09-15", "2025-09-16", "RDV médical", "RTT", "pending", "", "2025-06-01"),
        (2, "2025-06-20", "2025-06-21", "Déménagement", "CP", "pending", "", "2025-06-01"),
        (2, "2025-08-01", "2025-08-31", "Congé sabbatique", "CP", "rejected", "Solde insuffisant", "2025-05-15"),
        (3, "2025-12-24", "2025-12-31", "Fêtes", "CP", "approved", "OK", "2025-06-01"),
    ]
    for cg in conges_data:
        c.execute("""INSERT OR IGNORE INTO conges
            (user_id,date_debut,date_fin,motif,type_conge,statut,commentaire,created_at)
            VALUES (?,?,?,?,?,?,?,?)""", cg)
    conn.commit()
    conn.close()

# ─── Auth helpers ───────────────────────────────────────────────────────────────

def decode_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ─── Routes ────────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    init_db()
    logger.info("CongesApp VULNÉRABLE démarrée")

@app.get("/")
def root():
    return {"app": "CongesApp", "version": "vuln", "status": "running"}

# ══════════════════════════════════════════
# VULN 4 — Logging du mot de passe en clair
# ══════════════════════════════════════════
@app.post("/auth/login")
def login(req: LoginRequest):
    # FAILLE : le mot de passe est loggué en clair dans les fichiers de log
    logger.info(f"Tentative de connexion: username={req.username} password={req.password}")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username=? AND password=?",
              (req.username, req.password))
    user = c.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="Identifiants invalides")

    payload = {
        "sub": str(user[0]),
        "username": user[1],
        "role": user[3],
        "nom": user[4],
        "prenom": user[5],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return {
        "access_token": token,
        "user": {"id": user[0], "username": user[1], "role": user[3],
                 "nom": user[4], "prenom": user[5],
                 "solde_cp": user[6], "solde_rtt": user[7]}
    }

# ══════════════════════════════════════════
# VULN 1 — SQL Injection
# ══════════════════════════════════════════
@app.get("/conges/search")
def search_conges(q: str = "", user=Depends(decode_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # FAILLE : concaténation directe de l'entrée utilisateur dans la requête SQL
    query = f"SELECT * FROM conges WHERE motif LIKE '%{q}%' OR type_conge LIKE '%{q}%'"
    logger.info(f"Requête SQL: {query}")
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    return {"results": rows, "query_used": query}

@app.get("/conges")
def get_my_conges(user=Depends(decode_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM conges WHERE user_id=? ORDER BY created_at DESC",
              (user["sub"],))
    rows = c.fetchall()
    conn.close()
    keys = ["id","user_id","date_debut","date_fin","motif","type_conge","statut","commentaire","created_at"]
    return [dict(zip(keys, r)) for r in rows]

@app.post("/conges")
def create_conge(req: CongeRequest, user=Depends(decode_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""INSERT INTO conges (user_id,date_debut,date_fin,motif,type_conge,statut,created_at)
                 VALUES (?,?,?,?,?,'pending',?)""",
              (user["sub"], req.date_debut, req.date_fin, req.motif, req.type_conge,
               datetime.datetime.now().isoformat()))
    conn.commit()
    conn.close()
    return {"message": "Demande créée"}

# ══════════════════════════════════════════
# VULN 5 — IDOR (non détectable par SAST)
# ══════════════════════════════════════════
@app.get("/conges/{conge_id}")
def get_conge(conge_id: int, user=Depends(decode_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # FAILLE : aucune vérification que le congé appartient à l'utilisateur connecté
    # N'importe quel utilisateur authentifié peut lire le congé de n'importe qui
    c.execute("SELECT * FROM conges WHERE id=?", (conge_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Congé introuvable")
    keys = ["id","user_id","date_debut","date_fin","motif","type_conge","statut","commentaire","created_at"]
    return dict(zip(keys, row))

@app.get("/profil/{user_id}")
def get_profil(user_id: int, user=Depends(decode_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # FAILLE IDOR : on peut accéder au profil de n'importe quel user
    c.execute("SELECT id,username,role,nom,prenom,solde_cp,solde_rtt FROM users WHERE id=?",
              (user_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    keys = ["id","username","role","nom","prenom","solde_cp","solde_rtt"]
    return dict(zip(keys, row))

# ══════════════════════════════════════════
# VULN 2 — Command Injection
# ══════════════════════════════════════════
@app.post("/admin/export")
def export_data(req: ExportRequest, user=Depends(decode_token)):
    if user["role"] not in ("admin", "rh"):
        raise HTTPException(status_code=403, detail="Accès refusé")
    # FAILLE : shell=True + concaténation du nom de fichier fourni par l'utilisateur
    cmd = f"sqlite3 /app/conges.db '.headers on' '.mode csv' 'SELECT * FROM conges' > /tmp/{req.filename}"
    logger.info(f"Export commande: {cmd}")
    result = subprocess.call(cmd, shell=True)
    return {"message": f"Export effectué", "file": f"/tmp/{req.filename}", "return_code": result}

@app.get("/admin/users")
def get_all_users(user=Depends(decode_token)):
    if user["role"] not in ("admin", "rh"):
        raise HTTPException(status_code=403, detail="Accès refusé")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id,username,role,nom,prenom,solde_cp,solde_rtt FROM users")
    rows = c.fetchall()
    conn.close()
    keys = ["id","username","role","nom","prenom","solde_cp","solde_rtt"]
    return [dict(zip(keys, r)) for r in rows]

@app.get("/admin/conges")
def get_all_conges(user=Depends(decode_token)):
    if user["role"] not in ("admin", "manager", "rh"):
        raise HTTPException(status_code=403, detail="Accès refusé")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT c.*, u.nom, u.prenom FROM conges c
                 JOIN users u ON c.user_id = u.id
                 ORDER BY c.created_at DESC""")
    rows = c.fetchall()
    conn.close()
    keys = ["id","user_id","date_debut","date_fin","motif","type_conge",
            "statut","commentaire","created_at","nom","prenom"]
    return [dict(zip(keys, r)) for r in rows]

@app.post("/admin/action")
def action_conge(req: ActionRequest, user=Depends(decode_token)):
    if user["role"] not in ("admin", "manager", "rh"):
        raise HTTPException(status_code=403, detail="Accès refusé")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE conges SET statut=?, commentaire=? WHERE id=?",
              (req.action, req.commentaire, req.conge_id))
    conn.commit()
    conn.close()
    return {"message": f"Congé #{req.conge_id} mis à jour: {req.action}"}

@app.get("/me")
def get_me(user=Depends(decode_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id,username,role,nom,prenom,solde_cp,solde_rtt FROM users WHERE id=?",
              (user["sub"],))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    keys = ["id","username","role","nom","prenom","solde_cp","solde_rtt"]
    return dict(zip(keys, row))
