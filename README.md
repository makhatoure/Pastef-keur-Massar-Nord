# Plateforme de Gestion — Cellule Pastef quartiers: S.M.SY 1/ D.S.2.E

Application web interne légère, mobile-first (adaptée aux smartphones Android), conçue pour piloter la journée d'action communautaire :
- **Matin :** Don de sang (remise immédiate et stricte de **2 moustiquaires** par donneur confirmé).
- **Soir :** Distribution au podium (bénéficiaires recensés par les chefs de quartier, recherche rapide, contrôle anti-doublon, mise à jour du statut « Servi »).
- **Gestion Centrale du Stock :** Décompte automatique et temps réel, protection contre tout stock négatif, journal d'audit certifié.
- **Rapports Officiels :** Génération de rapport PDF officiel avec en-tête de la cellule et export Excel complet multi-feuilles.

---

## 👥 Profils et Comptes d'Accès

| Rôle | Identifiant | Code PIN | Droits & Attributions |
| :--- | :--- | :--- | :--- |
| **Administrateur** | `admin` | `2026` | Contrôle total, saisie des listes des chefs, gestion du stock, corrections avec justification obligatoire, clôture définitive, exports PDF/Excel. |
| **Agent Matin** | `agent1` | `1234` | Saisie des donneurs de sang, validation de la remise de 2 moustiquaires. |
| **Agent Soir** | `agent2` | `1234` | Recherche des bénéficiaires au podium, service et confirmation des remises. |

---

## 🚀 Démarrage Rapide

1. Ouvrez un terminal dans le dossier du projet :
   ```bash
   cd C:\Users\User\.gemini\antigravity\scratch\cellule-pastef-gestion
   ```

2. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

3. Ouvrez votre navigateur sur votre ordinateur ou votre smartphone connecté au même réseau Wi-Fi :
   - Sur l'ordinateur : `http://localhost:3000`
   - Sur le smartphone : `http://<VOTRE_IP_LOCALE>:3000`

---

## 📋 Respect Rigoureux du Cahier des Charges

1. **Identité Visuelle Officielle :** Le nom exact **« Cellule Pastef quartiers: S.M.SY 1/ D.S.2.E »** figure sur la page de connexion, le tableau de bord et les rapports PDF générés.
2. **Circuit du Matin (Don de sang) :**
   - Formulaire épuré pour smartphone Android (Nom, Téléphone, Quartier).
   - Ration bloquée à 2 moustiquaires.
   - Modale de confirmation obligatoire avant déduction du stock.
   - Détection automatique des doublons.
3. **Circuit du Soir (Podium) :**
   - Saisie préalable des listes des chefs de quartier (individuelle ou en lot copier-coller).
   - Recherche instantanée par nom ou numéro de téléphone.
   - Contrôle strict : impossible de servir deux fois la même inscription.
   - Ajout exceptionnel sur place uniquement sous autorisation administrative.
4. **Stock Commun et Infalsifiable :**
   - Calcul mathématique garanti : `Stock Restant = Initial + Entrées − Sorties Matin − Sorties Soir`.
   - Impossible d'avoir un stock négatif (blocage côté serveur et interface).
   - Traçabilité complète de tout mouvement ou correction.
5. **Clôture et Rapports :**
   - Bouton de clôture définitive qui verrouille les écritures ordinaires.
   - Génération instantanée du rapport PDF certifié et de l'export Excel 4 feuilles.
