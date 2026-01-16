# Daily Finance

Site web de screening d'actions cotées avec analyse de valorisation basée sur le PER.

## 🎯 Caractéristiques

- **Couverture maximale** : Import d'actions de multiples bourses (US, EU, INTL)
- **Screener avancé** : Recherche, filtres (pays, bourse, statut), tri, pagination
- **Analyse de valorisation** : Calcul PER actuel vs moyenne, statuts (sous/sur-évalué)
- **Design moderne** : Interface minimaliste style Trade Republic, dark mode
- **Architecture scalable** : Système de providers plug-in pour sources de données

## 🚀 Stack Technique

- **Framework** : Next.js 14+ (App Router)
- **Langage** : TypeScript
- **Styling** : TailwindCSS + shadcn/ui
- **Tables** : TanStack Table
- **Base de données** : SQLite + Prisma
- **API** : Financial Modeling Prep (FMP) + Alpha Vantage (fallback)

## 📦 Installation

### Prérequis

- Node.js 18+
- SQLite (fichier local)
- Clés API (voir ci-dessous)

### Étapes

1. **Cloner le repo**

```bash
git clone <repo-url>
cd dailyfinance
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Configuration**

Copier `.env.example` vers `.env` et remplir les variables :

```bash
cp .env.example .env
```

Variables requises :

- `DATABASE_URL` : non utilisé avec SQLite (fichier local `prisma/dev.db`)
- `FMP_API_KEY` : Clé API Financial Modeling Prep ([obtenir ici](https://financialmodelingprep.com/developer/docs/))
- `ALPHA_VANTAGE_API_KEY` : Clé API Alpha Vantage ([obtenir ici](https://www.alphavantage.co/support/#api-key))
- `IMPORT_SECRET_KEY` : Clé secrète pour protéger l'endpoint d'import
- `NEXT_PUBLIC_APP_URL` : URL de l'application (http://localhost:3000 en dev)

4. **Setup de la base de données**

```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. **Import des actions (dataset local)**

Preparez un dataset CSV/JSON local (voir data/README.md).

```bash
npm run import:stocks
```

6. **Rafraichir les prix (quotidien)**

```bash
npm run refresh:quotes
```

7. **Démarrer le serveur de développement**

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## 📖 Utilisation

### Commandes

- `npm run dev` : Démarrer en mode développement
- `npm run build` : Build pour production
- `npm run start` : Démarrer en production
- `npm run lint` : Linter le code
- `npm run format` : Formatter le code avec Prettier
- `npm run import:stocks` : Importer les actions depuis les APIs
- `npm run refresh:quotes` : Rafraichir uniquement les prix/variations (quotidien)
- `npm run update:quotes` : Mettre à jour les prix et données
- `npm test` : Lancer les tests unitaires

### API Endpoints

- `GET /api/stocks` : Liste paginée d'actions (query params: `query`, `country`, `exchange`, `status`, `page`)
- `GET /api/stocks/[symbol]?exchange=NASDAQ` : Details d'une action
- `POST /api/import` : Lancer un import (protégé par `IMPORT_SECRET_KEY`)
- `POST /api/watchlist/toggle` : Toggle watchlist

### Structure du Projet

```
dailyfinance/
├── app/                    # App Router Next.js
│   ├── api/               # API routes
│   ├── stock/[symbol]/   # Page détail action
│   ├── layout.tsx        # Layout racine
│   ├── page.tsx          # Page screener (accueil)
│   └── globals.css       # Styles globaux
├── components/            # Composants React
│   ├── ui/               # Composants shadcn/ui
│   ├── header.tsx
│   ├── search-bar.tsx
│   ├── filter-bar.tsx
│   ├── stocks-table.tsx
│   └── ...
├── lib/                   # Utilitaires
│   ├── providers/        # Providers API (FMP, AlphaVantage)
│   ├── prisma.ts         # Client Prisma
│   ├── valuation.ts      # Logique de valorisation
│   └── utils.ts          # Helpers
├── hooks/                 # Custom hooks
├── prisma/
│   └── schema.prisma     # Schéma de base de données
├── scripts/              # Scripts d'import/update
│   ├── import-stocks.ts
│   └── update-quotes.ts
└── ...
```

## 💾 Modèle de Données

### Stock
- Informations de base (nom, symbol, ISIN, exchange, pays, secteur, etc.)
- Relations : quotes, valuations, watchlistItems

### Quote
- Prix, variation, volume
- Horodatage
- Relation : stock

### Valuation
- PER actuel, PER moyen
- Statut (UNDER, FAIR, OVER, NA)
- Relation : stock

### WatchlistItem
- Watchlist par utilisateur (userKey)
- Relation : stock

### DataSource
- Métadonnées sur les sources de données
- Tracking des syncs

## 🔧 Calcul de Valorisation

Le calcul actuel est un **placeholder** simplifié :

1. **PER Actuel** : Récupéré depuis l'API (FMP/AlphaVantage) ou `null`
2. **PER Moyen** : 
   - Si secteur connu : moyenne sectorielle simulée
   - Sinon : formule déterministe basée sur PER actuel
3. **Statut** :
   - `UNDER` : PER actuel < PER moyen × 0.9
   - `FAIR` : PER actuel entre PER moyen × 0.9 et × 1.1
   - `OVER` : PER actuel > PER moyen × 1.1
   - `NA` : Données insuffisantes

Voir `lib/valuation.ts` pour le code et `lib/valuation.test.ts` pour les tests.

## 📊 Couverture des Données

### Financial Modeling Prep (FMP)
- ✅ Actions US (NASDAQ, NYSE, AMEX)
- ✅ Actions EU (Euronext, LSE, etc.)
- ✅ Actions internationales
- ⚠️ Limite : 300 req/min (free tier)

### Alpha Vantage (Fallback)
- ✅ Recherche de symboles
- ✅ Données fondamentales
- ⚠️ Limite : 5 req/min (free tier)
- ❌ Pas de liste complète d'actions

### Limitations

- Les APIs gratuites ont des limites de taux
- Certaines données (ISIN, secteur) peuvent être manquantes
- Le calcul PER est un placeholder (à améliorer)

## 🎨 Design

Interface inspirée de Trade Republic :

- **Typographie** : Inter, espacements généreux
- **Couleurs** : Palette sobre (noir/gris/blanc), accents verts/rouges
- **Dark mode** : Support complet avec `next-themes`
- **Responsive** : Mobile-first
- **Composants** : shadcn/ui (Radix UI + Tailwind)

## 🧪 Tests

```bash
npm test
```

Tests unitaires sur la logique de valorisation (`lib/valuation.test.ts`).

## 📝 TODO / Améliorations Futures

- [ ] Calcul PER plus sophistiqué (données historiques, ratios sectoriels réels)
- [ ] Graphiques d'historique (prix, PER)
- [ ] Authentification utilisateur (watchlist persistante)
- [ ] Export CSV/Excel
- [ ] Alertes email/push
- [ ] Scraping légal pour sources additionnelles
- [ ] Cache Redis pour performance
- [ ] Webhooks pour updates en temps réel

## 📄 Licence

MIT

## 🤝 Contribution

Les contributions sont bienvenues ! Ouvrir une issue ou une PR.

---

**Développé avec ❤️ pour les investisseurs**








