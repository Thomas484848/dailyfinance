# 🌍 Guide d'importation du fichier CSV mondial

Ce guide explique comment importer votre gros fichier CSV `stocks_master_world.csv` dans la base de données SQLite.

## 📋 Prérequis

1. Votre fichier CSV doit être placé dans : `data/stocks_master_world.csv`
2. La base de données Prisma doit être configurée

## 🚀 Étapes d'importation

### 1. Vérifier que tout est prêt

```powershell
# Vérifier que le fichier existe
Get-Item data\stocks_master_world.csv

# Vérifier la taille du fichier
(Get-Item data\stocks_master_world.csv).Length / 1MB
```

### 2. Préparer la base de données

```powershell
# Générer le client Prisma (si nécessaire)
npx prisma generate

# Créer/migrer la base de données (si nécessaire)
npx prisma migrate dev
```

### 3. Lancer l'importation

```powershell
# Méthode 1 : Utiliser le script npm (recommandé)
npm run import:world

# Méthode 2 : Lancer directement
npx tsx scripts/import-world-stocks.ts
```

## ⚡ Performance

Le script est optimisé pour gérer de gros fichiers :
- **Batch inserts** : Les données sont insérées par lots de 500
- **Streaming** : Le fichier est lu ligne par ligne (pas chargé en mémoire)
- **Skip duplicates** : Les doublons sont automatiquement ignorés
- **Progress logs** : Affichage des progrès tous les 1000 enregistrements

### Temps estimé

Pour un fichier de ~21 MB :
- Environ **50 000 à 200 000 lignes** selon le contenu
- Vitesse : **100-500 lignes/sec** (dépend de votre machine)
- Temps total : **2-10 minutes**

## 📊 Format du CSV

Le script attend un CSV avec ces colonnes :

| Colonne | Obligatoire | Description |
|---------|-------------|-------------|
| `symbol` | ✅ Oui | Symbole de l'action (ex: AAPL) |
| `name` | ✅ Oui | Nom de l'entreprise |
| `exchange_code` | Non | Code de la bourse (ex: NASDAQ) |
| `country` | Non | Pays (ex: USA) |
| `currency` | Non | Devise (ex: USD) |
| `isin` | Non | Code ISIN international |
| `mic` | Non | Market Identifier Code |
| `type` | Non | Type d'instrument (STOCK, FUND, etc.) |

## 🔍 Vérification après importation

```powershell
# Compter le nombre de stocks importés
npx prisma studio
# Puis ouvrir la table "Stock"

# Ou avec une requête SQL directe
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Stock;"
```

## ⚠️ Gestion des erreurs

Le script gère automatiquement :
- **Lignes vides** : ignorées
- **Doublons** : ignorés via `skipDuplicates`
- **Contraintes ISIN** : les doublons ISIN sont gérés
- **Erreurs de parsing** : affichées mais n'arrêtent pas l'import

### En cas de problème

1. **L'import s'arrête avec une erreur de contrainte** :
   ```powershell
   # Vider la table Stock
   npx prisma studio
   # Puis supprimer tous les enregistrements
   ```

2. **Import trop lent** :
   - Augmenter `BATCH_SIZE` dans le script (ligne 7)
   - Vérifier que vous n'avez pas trop d'index sur la table

3. **Mémoire insuffisante** :
   - Le script utilise déjà le streaming, c'est optimal
   - Réduire `BATCH_SIZE` si nécessaire

## 🎯 Optimisations avancées

### Désactiver temporairement les index

Pour accélérer l'import massif, vous pouvez :

```sql
-- Avant l'import (dans SQLite)
DROP INDEX IF EXISTS "Stock_symbol_idx";
DROP INDEX IF EXISTS "Stock_name_idx";
DROP INDEX IF EXISTS "Stock_country_idx";
DROP INDEX IF EXISTS "Stock_exchange_idx";

-- Après l'import
CREATE INDEX "Stock_symbol_idx" ON "Stock"("symbol");
CREATE INDEX "Stock_name_idx" ON "Stock"("name");
CREATE INDEX "Stock_country_idx" ON "Stock"("country");
CREATE INDEX "Stock_exchange_idx" ON "Stock"("exchange");
```

### Import par pays

Si vous voulez importer seulement certains pays, modifiez le script :

```typescript
// Dans la fonction parseRow, après la ligne 86
if (row.country && !['USA', 'FRA', 'GBR'].includes(row.country)) {
  return null; // Ignorer ce pays
}
```

## 📈 Étapes suivantes

Après l'import :
1. **Vérifier les données** : `npm run dev` puis naviguer dans l'application
2. **Importer les cotations** : `npm run refresh:quotes` (pour quelques actions)
3. **Mettre à jour** : `npm run update:quotes` (mise à jour régulière)

## 🆘 Support

Si vous rencontrez des problèmes :
- Vérifier les logs de la console
- Vérifier le schéma Prisma : `prisma/schema.prisma`
- Vérifier la base de données : `prisma/dev.db`

---

Bon import ! 🚀

