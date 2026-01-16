# 🚀 Guide de Démarrage Rapide - Daily Finance

## ⚠️ Important

Ce projet nécessite de nettoyer l'ancien projet React et d'installer Next.js proprement.

## Étapes d'Installation

### 1. Nettoyage (si nécessaire)

```powershell
# Supprimer les anciens fichiers
Remove-Item -Recurse -Force node_modules, package-lock.json, src
```

### 2. Installation des dépendances

```powershell
npm install --legacy-peer-deps
```

> **Note** : L'option `--legacy-peer-deps` est nécessaire pour résoudre les conflits de dépendances.

### 3. Configuration de la base de données

Éditez le fichier `.env` et configurez votre connexion PostgreSQL :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/daily_finance?schema=public"
```

### 4. Configuration des clés API

Obtenez vos clés API (gratuites) :

- **FMP** : https://financialmodelingprep.com/developer/docs/
- **Alpha Vantage** : https://www.alphavantage.co/support/#api-key

Ajoutez-les dans `.env` :

```env
FMP_API_KEY="votre_clé_fmp"
ALPHA_VANTAGE_API_KEY="votre_clé_alphavantage"
```

### 5. Initialiser la base de données

```powershell
npx prisma generate
npx prisma migrate dev --name init
```

### 6. Importer les données

⚠️ **Attention** : Cette commande peut prendre du temps (10-30 min) et consommera vos quotas API.

```powershell
npm run import:stocks
```

### 7. Démarrer l'application

```powershell
npm run dev
```

Ouvrez http://localhost:3000

## 🎯 Commandes Utiles

```powershell
# Développement
npm run dev

# Tests
npm test

# Mise à jour des prix
npm run update:quotes

# Linter
npm run lint

# Formater le code
npm run format

# Build production
npm run build
npm run start
```

## 📁 Structure du Projet

```
dailyfinance/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── stock/[symbol]/   # Page détail
│   ├── page.tsx          # Screener (accueil)
│   ├── layout.tsx        # Layout racine
│   └── globals.css       # Styles globaux
├── components/            # Composants React
│   ├── ui/               # shadcn/ui
│   └── ...
├── lib/                   # Bibliothèques
│   ├── providers/        # API providers (FMP, AlphaVantage)
│   ├── prisma.ts
│   ├── valuation.ts
│   └── utils.ts
├── prisma/
│   └── schema.prisma     # Schéma DB
├── scripts/              # Scripts Node
│   ├── import-stocks.ts
│   └── update-quotes.ts
└── ...
```

## 🐛 Dépannage

### Erreur : "Cannot find module '@prisma/client'"

```powershell
npx prisma generate
```

### Erreur de dépendances npm

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install --legacy-peer-deps
```

### Base de données non accessible

Vérifiez que PostgreSQL est démarré et que `DATABASE_URL` est correct dans `.env`.

### Pas de données après import

Vérifiez vos clés API dans `.env` et les quotas API.

## 📝 Prochaines Étapes

1. ✅ Installer et configurer
2. ✅ Importer les données
3. ✅ Tester le screener
4. 🔄 Personnaliser les filtres
5. 🔄 Ajouter des graphiques
6. 🔄 Implémenter l'authentification

---

**Bon développement ! 🎉**

