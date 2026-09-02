# Kachkadallah Business — Registre de caisse

Application web de suivi des colis (achat → transport/frais → vente), des
dépenses imprévues, et du solde de caisse — avec un compte **Opérateur**
(toi, qui saisis tout) et un compte **Consultant** (ton patron, lecture
seule).

Ce guide t'accompagne pas à pas, même sans expérience technique. Compte
environ 30-45 minutes la première fois.

---

## Étape 1 — Créer le projet Supabase (la base de données)

1. Va sur [supabase.com](https://supabase.com) et crée un compte gratuit.
2. Clique sur **New project**. Choisis un nom (ex. `kachkadallah-business`)
   et un mot de passe de base de données (note-le en lieu sûr).
3. Attends 1-2 minutes que le projet soit prêt.
4. Dans le menu de gauche, va sur **SQL Editor** → **New query**.
5. Ouvre le fichier `supabase/schema.sql` de ce projet, copie tout son
   contenu, colle-le dans l'éditeur SQL, puis clique sur **Run**.
   → Cela crée les tables `profiles`, `colis`, `depenses` et les règles de
   sécurité (l'opérateur peut tout faire, le consultant peut seulement lire).

## Étape 2 — Créer les deux comptes de connexion

1. Toujours dans Supabase, va sur **Authentication** → **Users** → **Add user**
   → **Create new user**.
2. Crée un premier compte pour toi (ex. `toi@example.com` + mot de passe).
3. Crée un deuxième compte pour ton patron (ex. `patron@example.com` +
   mot de passe).
4. Pour chaque compte créé, **copie son UUID** (identifiant affiché dans la
   liste des utilisateurs).
5. Retourne dans **SQL Editor** → **New query**, et exécute (en remplaçant
   les UUID par les vrais) :

   ```sql
   insert into profiles (id, nom_affiche, role) values
     ('UUID_DE_TON_COMPTE', 'Toi', 'operateur'),
     ('UUID_DU_COMPTE_PATRON', 'Le Patron', 'consultant');
   ```

## Étape 3 — Récupérer les clés API

1. Dans Supabase : **Project Settings** (icône engrenage) → **API**.
2. Note les deux valeurs :
   - **Project URL**
   - **anon public key**

## Étape 4 — Configurer le projet en local (pour tester)

1. Installe [Node.js](https://nodejs.org) si ce n'est pas déjà fait.
2. Dans un terminal, ouvre le dossier du projet puis :
   ```bash
   npm install
   cp .env.example .env
   ```
3. Ouvre le fichier `.env` créé et colle tes vraies valeurs :
   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Lance l'application en local pour tester :
   ```bash
   npm run dev
   ```
   Ouvre l'adresse affichée (ex. `http://localhost:5173`) et connecte-toi
   avec le compte opérateur créé à l'étape 2.

## Étape 5 — Déployer sur Vercel (mise en ligne)

1. Crée un compte gratuit sur [vercel.com](https://vercel.com) (tu peux te
   connecter avec GitHub).
2. Mets ce projet sur GitHub (crée un nouveau dépôt et pousse le code —
   demande-moi de l'aide si besoin).
3. Sur Vercel : **Add New** → **Project** → sélectionne ton dépôt GitHub.
4. Dans **Environment Variables**, ajoute les deux mêmes variables que dans
   ton `.env` :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clique sur **Deploy**. Après 1-2 minutes, ton application est en ligne
   avec une adresse `https://....vercel.app`.

## Étape 6 — Nom de domaine personnalisé (optionnel, recommandé)

1. Achète un nom de domaine (ex. `kachkadallahbusiness.com`) chez un
   registraire comme Namecheap ou OVH.
2. Dans Vercel : ton projet → **Settings** → **Domains** → ajoute ton
   domaine, puis suis les instructions pour configurer les DNS chez ton
   registraire (Vercel les affiche automatiquement).

---

## Comment ça fonctionne au quotidien

- **Toi (opérateur)** : tu ajoutes un colis (produit, prix d'achat,
  transport, frais). Le coût total sort automatiquement de la caisse.
  Quand tu revends le colis, tu saisis le montant encaissé en une fois —
  l'appli t'affiche immédiatement le bénéfice de cette vente, qui vient
  s'ajouter au solde.
- **Le patron (consultant)** : il se connecte avec son propre compte et voit
  tout (colis, ventes, bénéfices, dépenses, solde) mais ne peut rien
  modifier — les boutons d'ajout n'apparaissent même pas, et la base de
  données refuse toute tentative d'écriture de ce compte (sécurité au
  niveau serveur, pas seulement dans l'interface).

## Support

Si une étape bloque, montre-moi le message d'erreur exact — je t'aiderai à
le résoudre.
