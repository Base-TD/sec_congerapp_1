CongesApp — Data Flow Diagram (DFD Niveau 1)
=============================================

ACTEURS EXTERNES
────────────────
[Employé]   [Manager]   [Admin / RH]
     │            │            │
     └────────────┴────────────┘
                  │
           (HTTPS / JWT)
                  │
         ┄ ┄ ┄ TB1 ┄ ┄ ┄          ← Trust Boundary 1 : Internet / Frontend
                  │
         ┌────────────────┐
         │  CDN Frontend  │
         │   (React SPA)  │
         └────────────────┘
                  │
           (API REST JSON)
                  │
         ┄ ┄ ┄ TB2 ┄ ┄ ┄          ← Trust Boundary 2 : Frontend / Backend
                  │
    ┌─────────────────────────┐
    │      API FastAPI         │
    │  (Auth · Congés · Admin) │
    └──┬──────────┬──────────┬─┘
       │          │          │
       │          │          └──────────────────┐
       │          │                             │
  (SQL param.)  (S3 PUT/GET)              (SMTP envoi)
       │          │                             │
┄ ┄ TB3 ┄ ┄  ┄ TB4 ┄ ┄              ┄ ┄ TB5 ┄ ┄
       │          │                             │
  ┌────────┐  ┌───────────┐            ┌──────────────┐
  │  Base  │  │  Stockage │            │   Service    │
  │  SQL   │  │    S3     │            │    SMTP      │
  │(users, │  │(justific.)│            │ (notifs mgr) │
  │conges) │  └───────────┘            └──────────────┘
  └────────┘
       │
  (SELECT users)
       │
  ┄ TB6 ┄ ┄                           ← Trust Boundary 6 : API / SSO externe
       │
  ┌──────────────┐
  │  SSO OAuth2  │
  │ (service ext)│
  └──────────────┘


FLUX DE DONNÉES PRINCIPAUX
──────────────────────────

FD1  Employé ──────────────────→ API        POST /auth/login (username, password)
FD2  API ──────────────────────→ SSO        Vérification identité OAuth2
FD3  SSO ──────────────────────→ API        Token de session
FD4  API ──────────────────────→ Employé    JWT signé (rôle, user_id, exp)

FD5  Employé ──────────────────→ API        POST /conges (date_debut, date_fin, motif, type)
FD6  API ──────────────────────→ PostgreSQL  INSERT INTO conges (paramètres liés)
FD7  API ──────────────────────→ SMTP        Notification email → Manager

FD8  Manager ──────────────────→ API        GET /admin/conges (liste demandes en attente)
FD9  API ──────────────────────→ PostgreSQL  SELECT conges JOIN users
FD10 Manager ──────────────────→ API        POST /admin/action (conge_id, action, commentaire)
FD11 API ──────────────────────→ PostgreSQL  UPDATE conges SET statut=...

FD12 Employé ──────────────────→ API        POST upload justificatif médical
FD13 API ──────────────────────→ S3         PUT objet (clé = user_id/filename)

FD14 Admin / RH ───────────────→ API        POST /admin/export (filename)
FD15 API ──────────────────────→ Filesystem Export CSV → /tmp/exports/


TRUST BOUNDARIES
────────────────

TB1  Internet ↔ CDN Frontend
     Données entrantes non fiables — validation côté client uniquement (cosmétique)

TB2  Frontend ↔ API FastAPI
     Toute donnée venant du frontend est non fiable
     → Validation Pydantic côté API obligatoire sur chaque endpoint

TB3  API ↔ PostgreSQL
     Connexion réseau interne — requêtes paramétrées obligatoires (VULN 1 en version vulnérable)

TB4  API ↔ Stockage S3
     IAM Role / credentials AWS — jamais de bucket public

TB5  API ↔ Service SMTP interne
     Réseau interne — pas d'exposition externe directe

TB6  API ↔ SSO OAuth2 (service tiers)
     Service externe — vérifier la signature des tokens retournés, ne pas faire confiance à l'identité sans validation


COMPOSANTS ET RÔLES
────────────────────

┌─────────────────┬───────────────────────────────────────────────────┐
│ Composant       │ Rôle                                              │
├─────────────────┼───────────────────────────────────────────────────┤
│ CDN Frontend    │ Sert le bundle React statique                     │
│ API FastAPI     │ Traite toutes les requêtes métier, valide, autorise│
│ PostgreSQL      │ Stockage persistant (users, conges, audit_log)    │
│ S3              │ Stockage objet (justificatifs médicaux)           │
│ SMTP interne    │ Envoi des notifications email aux managers        │
│ SSO OAuth2      │ Authentification centralisée (service tiers)      │
└─────────────────┴───────────────────────────────────────────────────┘


SURFACES D'ATTAQUE STRIDE IDENTIFIÉES (extrait TP)
───────────────────────────────────────────────────

ID   STRIDE  Flux / Composant     Description
──   ──────  ─────────────────    ──────────────────────────────────────────────
S1   S       FD1 — Auth JWT       Clé secrète hardcodée → JWT forgeable (VULN 3)
T1   T       FD5 — POST /conges   Statut modifiable sans rôle manager (VULN 5)
T2   T       FD8 — Recherche      SQL Injection via concaténation directe (VULN 1)
R1   R       FD10 — Action admin  Aucun audit log en version vulnérable
I1   I       FD1 — Login          Mot de passe loggué en clair (VULN 4)
D1   D       FD8 — Recherche      ReDoS possible sur champ motif non borné
E1   E       FD9 — GET /profil    IDOR : aucune vérification de propriété (VULN 5)
C2   T       FD14 — Export        Command Injection via filename (VULN 2)