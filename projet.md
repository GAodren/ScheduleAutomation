# 🚀 Projet : [[ScheduleAutomation]]

**Statut :** 🛠️ Développement (MVP)
**Stack :** React, Supabase, Tailwind CSS
**Concept :** Génération automatique de plannings complexes sous contraintes en un clic.

---

## 💡 Proposition de Valeur
- **Problème :** 5h de gestion administrative par quinzaine, casse-tête des indisponibilités et contraintes contractuelles.
- **Solution :** Un bouton "Régénérer" qui calcule la rotation optimale en respectant 100% des règles RH et personnelles.

---

## 🏗️ Architecture Technique (Ce qu'il te manque)

### 1. Backend & Base de Données : **Supabase**
C'est le choix parfait pour ta stack. Il remplace avantageusement un serveur complexe.
- **Auth :** Gestion des comptes clients (Restaurateurs).
- **Database (PostgreSQL) :** Stockage des employés, de leurs contrats et des plannings générés.
- **Edge Functions :** Pour héberger l'algorithme de génération de planning (pour ne pas ralentir le navigateur de l'utilisateur).

### 2. L'Intelligence : **L'Algorithme de Contraintes**
C'est le cœur du projet. Tu dois gérer :
- **Contraintes dures :** Temps de repos légal, max heures/semaine.
- **Contraintes souples :** Préférences (pas le jeudi soir, etc.).
- **Objets :** `Salarie`, `Shift`, `Indisponibilité`.

### 3. Hébergement
- **Frontend :** Vercel ou Netlify (déploiement continu via ton GitHub).

---

## 🛠️ Stack Technique Étendue
| Composant | Outil | Rôle |
| :--- | :--- | :--- |
| **Frontend** | React + Vite | Interface utilisateur fluide. |
| **Styles** | Tailwind CSS | Pour reproduire tes designs proprement et rapidement. |
| **Base de données** | **Supabase** | Stockage des données et authentification. |
| **State Management** | React Context ou TanStack Query | Gérer les données entre la config et le planning. |
| **Déploiement** | Vercel | Hébergement lié à GitHub. |

---

## 📋 Roadmap de Développement

### Phase 1 : Data Persistence (Priorité)
- [ ] Connecter Supabase à ton projet React.
- [ ] Créer les tables `membres` (nom, catégorie, max_heures, statut).
- [ ] Rendre le formulaire "Ajouter un membre" fonctionnel (Insert dans la DB).

### Phase 2 : Logique Métier
- [ ] Créer une table `contraintes_specifiques` (ex: "Jean-Marc ne travaille pas le jeudi").
- [ ] Développer le script de génération automatique (commencer par une version simple "Round Robin").

### Phase 3 : Dashboard & Analytics
- [ ] Intégrer les graphiques de "Volume Horaire" et "Taux de Présence" avec les vraies données de la DB.

---

## 📝 Notes & Idées
- **Sécurité :** S'assurer qu'un gérant d'un restaurant A ne puisse pas voir les employés du restaurant B (Row Level Security sur Supabase).
- **Export :** Ajouter un bouton pour exporter le planning final en PDF ou Excel pour l'affichage en cuisine.