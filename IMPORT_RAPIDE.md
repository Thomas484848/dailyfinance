# 🚀 Import rapide de votre CSV

## En 3 étapes simples :

### 1️⃣ Vérifier que votre fichier est au bon endroit
Votre fichier `stocks_master_world.csv` est déjà dans `data/` ✅

### 2️⃣ Lancer l'import

```powershell
npm run import:world
```

### 3️⃣ C'est fait ! 

Le script va :
- ✅ Lire votre CSV ligne par ligne (économie de mémoire)
- ✅ Importer par lots de 500 (rapide)
- ✅ Gérer automatiquement les doublons
- ✅ Afficher les progrès en temps réel
- ✅ Vous donner des statistiques à la fin

## 📊 Ce que vous verrez

```
[import] 🌍 Starting world stocks import
[import] 📄 File size: 20.69 MB
[import] 📋 Columns found: symbol, name, exchange_code, mic, country, currency, isin, type, source, key
[import] ⚡ Progress: 1000 imported, 0 skipped, 0 errors | 250 rows/sec
[import] ⚡ Progress: 2000 imported, 0 skipped, 0 errors | 275 rows/sec
...
[import] ✅ Import completed!
[import] 📊 Statistics:
  - Total imported: 50,234
  - Skipped: 12
  - Errors: 0
  - Time: 183.5s
  - Rate: 274 rows/sec
```

## ⏱️ Combien de temps ça prend ?

- **Petit fichier** (< 10 000 lignes) : ~30 secondes
- **Moyen** (10 000 - 50 000) : 2-5 minutes  
- **Gros** (50 000 - 200 000) : 5-15 minutes
- **Très gros** (> 200 000) : 15-30 minutes

## 🔍 Vérifier après l'import

1. **Ouvrir Prisma Studio** :
   ```powershell
   npx prisma studio
   ```
   Puis ouvrir la table "Stock" et voir vos données !

2. **Compter les stocks** :
   ```powershell
   sqlite3 prisma\dev.db "SELECT COUNT(*) FROM Stock;"
   ```

3. **Voir quelques exemples** :
   ```powershell
   sqlite3 prisma\dev.db "SELECT symbol, name, exchange, country FROM Stock LIMIT 10;"
   ```

## ❓ Problèmes fréquents

### "File not found"
➡️ Assurez-vous que `data/stocks_master_world.csv` existe

### Import très lent
➡️ Normal pour gros fichiers, laissez tourner !

### Erreur "Unique constraint failed"
➡️ C'est normal, les doublons sont ignorés automatiquement

---

**Besoin d'aide ?** Consultez `GUIDE_IMPORT_CSV.md` pour plus de détails.

