# Option 3 - Éventail Large avec Interactions Avancées
## 📝 Plan de modification et documentation

**Date :** 2026-06-04  
**Objectif :** Transformer la pioche pour afficher quasi toutes les cartes (78) avec interactions contemplatives

---

## 🗂️ Fichiers modifiés

### 1. `lib/config.ts`
**Changements :**
- Ajout de `FAN_MODE: 'classic' | 'wide'` pour switcher entre les modes
- Ajustement des dimensions CARD_FAN pour le mode 'wide'
- Overlap réduit de ~70% pour montrer plus de cartes
- Amplitude d'arc augmentée pour un éventail plus large (~160-180°)

**Backé :** ✅ `backups/file_backups/config.ts.{timestamp}.original`

### 2. `app/components/card-fan.tsx`
**Changements :**
- Nouvelle fonction `getCardStyleWide()` pour l'arc élargi
- Interaction au survol : carte se soulève (scale 1.05, ombre)
- Interaction au drag : écartement des cartes adjacentes (effet "vent")
- Positions mieux réparties sur l'arc
- Scroll horizontal optimisé pour 78 cartes quasi-visibles

**Backé :** ✅ `backups/file_backups/card-fan.tsx.{timestamp}.original`

---

## 🔄 Comment_switcher entre les modes

### Dans `lib/config.ts`, changer :
```typescript
FAN_MODE: 'classic',  // ← Mode actuel (avant Option 3)
// OU
FAN_MODE: 'wide',    // ← Nouvel Option 3 (éventail large)
```

### Rollback total :
1. Exécuter `rollback_option3.bat`
2. OU restaurer manuellement depuis `backups/file_backups/`
3. Refresh navigateur (Ctrl+F5)

---

## 🎯 Comportements attendus (Option 3)

### État initial (repos) :
- ✅ 78 cartes en arc large (~160-180°)
- ✅ Overlap minimal (10-15px max)
- ✅ ~60-70 cartes visibles sans scroll
- ✅ Toutes cartes accessibles avec léger scroll horizontal

### Au survol (hover) :
- ✅ Carte se soulève (scale 1.05)
- ✅ Ombre portée augmentée
- ✅ Légère rotation vers le doigt/souris

### Au drag :
- ✅ Carte suivait le doigt/souris
- ✅ Cartes adjacentes s'écartent naturellement (effet de foule)
- ✅ Validation zone à 50% de l'écran (inchangé)

### Sélection :
- ✅ Carte choisie se détache clairement
- ✅ Animation de tirage (inchangée)
- ✅ Carte retirée de la pioche (comme avant)

---

## 🧪 Checklist de test

Avant de valider l'Option 3 :
- [ ] Les 78 cartes sont quasi-toutes visibles au premier affichage
- [ ] Scroll horizontal fluide pour voir les cartes manquantes
- [ ] Survol d'une carte la met en valeur
- [ ] Drag permet d'écarter les cartes voisines
- [ ] Sélection fonctionne toujours (zone à 50%)
- [ ] Animation de tirage inchangée
- [ ] Reset fonctionne (les 78 cartes réapparaissent)
- [ ] Mobile : l'expérience est bonne sur petit écran
- [ ] Desktop : l'expérience est fluide

### Si un test échoue :
→ Exécuter `rollback_option3.bat` pour retour rapide

---

## 📊 Métriques de succès

**Avant (classic) :**
- Cartes visibles sans scroll : ~20-25
- Overlap : -75px (desktop), -50px (mobile)
- Arc : ~90-100°

**Après (wide) :**
- Cartes visibles sans scroll : ~60-70 ✅
- Overlap : -10 à -15px ✅
- Arc : ~160-180° ✅

---

## 🛡️ Sécurité

- Backups créés : ✅ OUI
- Script rollback : ✅ OUI
- Switch possible : ✅ OUI (via FAN_MODE)
- Tests de rollback : ❓ À faire après implémentation

---

## 📞 Prochaine étapes

1. ✅ Backups créés
2. ✅ Script rollback créé  
3. ✅ Documentation écrite
4. ⏳ **Attente validation utilisateur**
5. ⏳ Implémentation Option 3
6. ⏳ Tests
7. ⏳ Validation finale ou rollback