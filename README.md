# CongesApp — Application pédagogique de Secure Development

> Application de gestion de congés conçue pour le TP du Jour 1 du module **Secure Software Development** (M1 Expert en Cybersécurité).

---

## Structure du projet

```
congesapp/
├── backend-vuln/          Backend FastAPI — VERSION VULNÉRABLE
│   ├── main.py            5 failles intentionnelles documentées
│   ├── requirements.txt
│   └── Dockerfile
├── backend-secure/        Backend FastAPI — VERSION SÉCURISÉE
│   ├── main.py            Toutes les failles corrigées + audit log
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/              Frontend React — interface unique
│   ├── src/
│   │   ├── App.js
│   │   ├── index.css
│   │   ├── contexts/AuthContext.js
│   │   ├── components/Layout.js
│   │   └── pages/
│   │       ├── LoginPage.js
│   │       ├── DashboardPage.js
│   │       ├── CongesPages.js
│   │       ├── RecherchePage.js
│   │       └── AdminPages.js
│   ├── public/index.html
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.vuln.yml    Lance la version vulnérable
├── docker-compose.secure.yml  Lance la version sécurisée
└── README.md
```

---

## Lancement rapide

### Prérequis
- Docker Desktop installé et lancé
- Ports 3000, 3001, 8000, 8001 disponibles

### Version vulnérable (TP — démo des failles)
```bash
docker-compose -f docker-compose.vuln.yml up --build
```
- **Frontend** : http://localhost:3000
- **API Swagger** : http://localhost:8000/docs

### Version sécurisée (comparaison)
```bash
docker-compose -f docker-compose.secure.yml up --build
```
- **Frontend** : http://localhost:3001
- **API Swagger** : http://localhost:8001/docs

### Lancer les deux simultanément
```bash
docker-compose -f docker-compose.vuln.yml up --build -d
docker-compose -f docker-compose.secure.yml up --build -d
```

---

## Comptes de test

| Username | Mot de passe  | Rôle     | Accès                          |
|----------|---------------|----------|--------------------------------|
| alice    | password123   | Employée | Dashboard, ses congés, recherche |
| bob      | password456   | Employé  | Dashboard, ses congés, recherche |
| claire   | password789   | Manager  | + Toutes les demandes, utilisateurs |
| admin    | conges2024!   | Admin RH | + Export CSV, journal d'audit  |

---

## Les 5 vulnérabilités — guide pédagogique

### VULN 1 — SQL Injection (`backend-vuln/main.py` ~ligne 130)

**Localisation** : `GET /conges/search?q=...`

**Code vulnérable** :
```python
query = f"SELECT * FROM conges WHERE motif LIKE '%{q}%' OR type_conge LIKE '%{q}%'"
cursor.execute(query)
```

**Exploitation** :
```
GET /conges/search?q=%' OR '1'='1
```
→ Retourne les congés de tous les utilisateurs, pas seulement les siens.

**Détectable par SAST** : ✅ Oui (Semgrep, Bandit)

**Correction** (voir `backend-secure/main.py`) :
```python
rows = conn.execute(
    "SELECT * FROM conges WHERE user_id=? AND (motif LIKE ? OR type_conge LIKE ?)",
    (user["sub"], f"%{q}%", f"%{q}%")
)
```

---

### VULN 2 — Command Injection (`backend-vuln/main.py` ~ligne 160)

**Localisation** : `POST /admin/export`

**Code vulnérable** :
```python
cmd = f"sqlite3 /app/conges.db ... > /tmp/{req.filename}"
subprocess.call(cmd, shell=True)
```

**Exploitation** :
```json
{ "filename": "export.csv; cat /etc/passwd > /tmp/pwned.txt" }
```
→ Exécute une commande arbitraire sur le serveur.

**Détectable par SAST** : ✅ Oui (Bandit détecte `subprocess.call(shell=True)`)

**Correction** :
```python
subprocess.run(["sqlite3", DB_PATH, ".output", safe_path, "SELECT * FROM conges;"],
               capture_output=True, timeout=10)
```

---

### VULN 3 — Secrets hardcodés (`backend-vuln/main.py` ligne 20-22)

**Code vulnérable** :
```python
SECRET_KEY = "super_secret_jwt_key_12345"
DB_PASSWORD = "admin123"
ADMIN_PASSWORD = "conges2024!"
```

**Impact** : Un attaquant avec accès au code source peut forger des JWT valides.

**Détectable par SAST** : ✅ Oui (Semgrep, truffleHog, git-secrets)

**Correction** :
```python
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY manquant")
```

---

### VULN 4 — Logging de mots de passe (`backend-vuln/main.py` ~ligne 120)

**Code vulnérable** :
```python
logger.info(f"Tentative de connexion: username={req.username} password={req.password}")
```

**Impact** : Les mots de passe en clair apparaissent dans les fichiers de log
(accessibles par les admins système, les SIEM, les outils de monitoring).

**Détectable par SAST** : ✅ Oui (Semgrep avec règles custom)

**Correction** :
```python
logger.info(f"Tentative de connexion: username={req.username} ip={request.client.host}")
# Jamais le mot de passe
```

---

### VULN 5 — IDOR (Insecure Direct Object Reference) (`backend-vuln/main.py` ~ligne 145)

**Localisation** : `GET /profil/{user_id}` et `GET /conges/{conge_id}`

**Code vulnérable** :
```python
@app.get("/profil/{user_id}")
def get_profil(user_id: int, user=Depends(decode_token)):
    # Aucune vérification que user_id == user["sub"]
    c.execute("SELECT * FROM users WHERE id=?", (user_id,))
```

**Exploitation** :
```
GET /profil/1   # connecté en tant que bob (id=2) → voit le profil d'alice
GET /conges/3   # connecté en tant qu'alice → voit les congés de bob
```

**Détectable par SAST** : ❌ Non — c'est de la logique métier, pas un pattern syntaxique

**Correction** :
```python
if user["role"] not in ("admin", "manager") and str(user_id) != user["sub"]:
    raise HTTPException(status_code=403, detail="Accès non autorisé")
```

---

## SAST — Lancer Semgrep sur les deux versions

```bash
# Installer Semgrep
pip install semgrep

# Scanner la version vulnérable
semgrep --config=auto backend-vuln/main.py

# Scanner la version sécurisée (doit être propre)
semgrep --config=auto backend-secure/main.py

# Comparaison côte à côte
echo "=== VULNÉRABLE ===" && semgrep --config=auto backend-vuln/main.py --json | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(f'{len(d[\"results\"])} problèmes trouvés')
for r in d['results']:
    print(f'  [{r[\"check_id\"].split(\".\")[-1]}] ligne {r[\"start\"][\"line\"]}: {r[\"extra\"][\"message\"][:80]}')
"

echo "=== SÉCURISÉE ===" && semgrep --config=auto backend-secure/main.py --json | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(f'{len(d[\"results\"])} problèmes trouvés')
"
```

---

## Notes 

**Ordre recommandé pour une reprise entière de l'app :**
1. Lancer la version vulnérable (`docker-compose.vuln.yml`)
2. Faire le tour de l'interface avec le compte `alice`
3. Passer au compte `admin`, montrer la page Recherche (VULN 1)
4. Montrer la page Export (VULN 2), tenter l'injection
5. Lancer Semgrep — montrer ce qu'il détecte (VULN 1, 2, 3, 4)
6. Montrer IDOR sur la page Utilisateurs (VULN 5) 
7. Lancer la version sécurisée sur port 3001 en parallèle
8. Comparer les deux côte à côte : comportement + code + journal d'audit

**VULN 5 (IDOR) est la plus importante pédagogiquement** car elle illustre
la limite fondamentale des outils automatisés : ils ne comprennent pas
la logique métier. C'est pour ça que le threat modeling du matin existe.
