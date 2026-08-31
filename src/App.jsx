// =============================================================================
// APPLICATION DE POINTAGE QUOTIDIEN — ÉQUIPE COMMERCIALE
// -----------------------------------------------------------------------------
// Application React en un seul fichier, pensée pour être remplie en 2 ou 3
// clics par les managers. Pas de backend : l'état vit dans React (useState)
// et est sauvegardé dans le localStorage du navigateur à chaque changement,
// afin que les noms des managers, la composition des équipes et le pointage
// restent d'une visite à l'autre sur le même appareil.
//
// Parcours principal :
//   Écran 1 (Accueil)     -> le manager clique sur sa carte
//   Écran 2 (Pointage)    -> l'équipe est pré-cochée "Présent", le manager
//                             ajuste si besoin puis clique "Valider la journée"
//   Écran 3 (Confirmation)-> récapitulatif + retour rapide
//
// Fonctions secondaires (jamais dans le chemin principal) : sélecteur de
// date, vue semaine, vue Direction (lecture seule), gestion d'équipe.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Download,
  Trash2,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Palmtree,
  Car,
  Laptop,
  ClipboardCheck,
  LayoutGrid,
  Settings2,
  Filter,
  Pencil,
  Check,
  X,
  Plus,
  RotateCcw,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// 1. CONFIGURATION DES STATUTS DE PRÉSENCE
// -----------------------------------------------------------------------------
// L'ordre du tableau définit l'ordre du cycle au clic sur le bouton de statut :
// Présent -> Absent -> Congé -> Déplacement client -> Télétravail -> Présent
const ORDRE_STATUTS = ['present', 'absent', 'conge', 'deplacement', 'teletravail'];

const STATUTS = {
  present: {
    label: 'Présent',
    icon: CheckCircle2,
    bouton: 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-400',
    badge: 'bg-green-100 text-green-800 border-green-300',
    puce: 'bg-green-500',
    texte: 'text-green-700',
  },
  absent: {
    label: 'Absent',
    icon: XCircle,
    bouton: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-400',
    badge: 'bg-red-100 text-red-800 border-red-300',
    puce: 'bg-red-500',
    texte: 'text-red-700',
  },
  conge: {
    label: 'Congé',
    icon: Palmtree,
    bouton: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-400',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    puce: 'bg-blue-500',
    texte: 'text-blue-700',
  },
  deplacement: {
    label: 'Déplacement client',
    icon: Car,
    bouton: 'bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-400',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    puce: 'bg-orange-500',
    texte: 'text-orange-700',
  },
  teletravail: {
    label: 'Télétravail',
    icon: Laptop,
    bouton: 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-400',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    puce: 'bg-purple-500',
    texte: 'text-purple-700',
  },
};

// Fait passer un statut au suivant dans le cycle défini plus haut.
function statutSuivant(statut) {
  const index = ORDRE_STATUTS.indexOf(statut);
  return ORDRE_STATUTS[(index + 1) % ORDRE_STATUTS.length];
}

// -----------------------------------------------------------------------------
// 2. UTILITAIRES DE DATES (pas de dépendance externe)
// -----------------------------------------------------------------------------
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function fromISODate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addJoursCalendaires(dateStr, n) {
  const d = fromISODate(dateStr);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
function estWeekend(dateStr) {
  const jour = fromISODate(dateStr).getDay(); // 0 = dimanche, 6 = samedi
  return jour === 0 || jour === 6;
}
// Jour ouvré précédent (saute samedi/dimanche)
function jourOuvrePrecedent(dateStr) {
  let d = addJoursCalendaires(dateStr, -1);
  while (estWeekend(d)) d = addJoursCalendaires(d, -1);
  return d;
}
// Jour ouvré suivant (saute samedi/dimanche)
function jourOuvreSuivant(dateStr) {
  let d = addJoursCalendaires(dateStr, 1);
  while (estWeekend(d)) d = addJoursCalendaires(d, 1);
  return d;
}
// Si la date tombe un week-end, ramène au lundi suivant.
function ancrerJourOuvre(dateStr) {
  return estWeekend(dateStr) ? jourOuvreSuivant(addJoursCalendaires(dateStr, -1)) : dateStr;
}
// Renvoie n jours ouvrés se terminant à dateStr (dateStr inclus), du plus ancien au plus récent.
// Utilisé pour la vue "Semaine" : toujours 5 jours ouvrés pleins, quel que soit le jour d'ouverture.
function joursOuvresJusqua(dateStr, n) {
  const jours = [dateStr];
  let curseur = dateStr;
  while (jours.length < n) {
    curseur = jourOuvrePrecedent(curseur);
    jours.unshift(curseur);
  }
  return jours;
}
const NOMS_JOURS_COURT = { 0: 'Dim', 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam' };
function formatDateFr(dateStr) {
  return fromISODate(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
function formatDateCourt(dateStr) {
  const d = fromISODate(dateStr);
  return `${NOMS_JOURS_COURT[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

// Calcule des initiales (1 ou 2 lettres) à partir d'un nom, recalculées à
// chaque affichage : renommer un manager met donc directement à jour son
// avatar, sans champ séparé à synchroniser.
function initialesDe(nom) {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

// Palette de couleurs attribuées automatiquement aux nouveaux managers.
const PALETTE_COULEURS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-teal-600',
];

// -----------------------------------------------------------------------------
// 2 bis. PERSISTANCE (localStorage)
// -----------------------------------------------------------------------------
// Pas de backend : on sauvegarde l'état complet (managers, équipe, pointage)
// dans le localStorage du navigateur, pour qu'il survive à un rechargement
// de la page ou à la fermeture de l'onglet, sur le même appareil.
const CLE_STOCKAGE = 'pointage-commercial-etat-v1';

function chargerEtat() {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE);
    return brut ? JSON.parse(brut) : null;
  } catch {
    // localStorage indisponible (navigation privée, quota...) : on repart des données de démo.
    return null;
  }
}
function sauvegarderEtat(etat) {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat));
  } catch {
    // Sauvegarde impossible : l'application continue de fonctionner en mémoire uniquement.
  }
}
// Lu une seule fois, au chargement du module (donc au chargement de la page).
const ETAT_SAUVEGARDE = typeof window !== 'undefined' ? chargerEtat() : null;

// -----------------------------------------------------------------------------
// 3. DONNÉES DE DÉMONSTRATION
// -----------------------------------------------------------------------------
const MANAGERS_INITIAUX = [
  { id: 'm1', nom: 'Sophie Martin', couleur: 'bg-blue-600' },
  { id: 'm2', nom: 'Karim Benali', couleur: 'bg-emerald-600' },
  { id: 'm3', nom: 'Julie Lefèvre', couleur: 'bg-amber-600' },
];

const SECTEURS = ['Nord', 'Sud', 'Est', 'Ouest'];

const COMMERCIAUX_INITIAUX = [
  { id: 'c1', nom: 'Alice Dupont', managerId: 'm1', secteur: 'Nord' },
  { id: 'c2', nom: 'Bruno Girard', managerId: 'm1', secteur: 'Sud' },
  { id: 'c3', nom: 'Chloé Faure', managerId: 'm1', secteur: 'Est' },
  { id: 'c4', nom: 'David Morel', managerId: 'm1', secteur: 'Ouest' },
  { id: 'c5', nom: 'Emma Rousseau', managerId: 'm2', secteur: 'Nord' },
  { id: 'c6', nom: 'Fabien Noël', managerId: 'm2', secteur: 'Sud' },
  { id: 'c7', nom: 'Gabrielle Petit', managerId: 'm2', secteur: 'Est' },
  { id: 'c8', nom: 'Hugo Lambert', managerId: 'm2', secteur: 'Ouest' },
  { id: 'c9', nom: 'Inès Caron', managerId: 'm3', secteur: 'Nord' },
  { id: 'c10', nom: 'Jules Renard', managerId: 'm3', secteur: 'Sud' },
  { id: 'c11', nom: 'Léa Fontaine', managerId: 'm3', secteur: 'Est' },
  { id: 'c12', nom: 'Marc Dubois', managerId: 'm3', secteur: 'Ouest' },
];

// Motif de statuts pour les 4 jours ouvrés précédant aujourd'hui
// (index 0 = le plus ancien des 4 jours, index 3 = hier).
// `null` signifie "présent" (valeur par défaut, pas besoin de la stocker).
const MOTIF_DEMO = {
  c1: [null, null, null, null],
  c2: ['absent', null, null, null],
  c3: [null, 'conge', 'conge', null],
  c4: [null, null, 'deplacement', null],
  c5: [null, null, null, 'teletravail'],
  c6: [null, 'absent', null, null],
  c7: ['deplacement', null, null, null],
  c8: [null, null, null, 'conge'],
  c9: [null, null, null, 'absent'],
  c10: [null, 'teletravail', null, null],
  c11: [null, null, 'absent', null],
  c12: [null, null, null, 'deplacement'],
};

// Construit l'état initial du pointage : les 4 jours ouvrés avant aujourd'hui
// sont pré-remplis avec des statuts variés, "aujourd'hui" reste vide (donc
// tout le monde y apparaît "Présent" par défaut, comme demandé).
function construireDonneesDemo() {
  const aujourdHui = ancrerJourOuvre(toISODate(new Date()));
  const fenetre = joursOuvresJusqua(aujourdHui, 5); // [J-4, J-3, J-2, J-1, J]
  const joursPasses = fenetre.slice(0, 4);
  const donnees = {};
  joursPasses.forEach((jour, index) => {
    const parCommercial = {};
    COMMERCIAUX_INITIAUX.forEach((c) => {
      const statut = MOTIF_DEMO[c.id]?.[index];
      if (statut) parCommercial[c.id] = statut;
    });
    donnees[jour] = parCommercial;
  });
  return donnees;
}

// -----------------------------------------------------------------------------
// 4. PETITS COMPOSANTS RÉUTILISABLES
// -----------------------------------------------------------------------------

// Légende des couleurs de statut, affichée sur les écrans de pointage.
function LegendeStatuts() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
      {ORDRE_STATUTS.map((cle) => {
        const s = STATUTS[cle];
        return (
          <span key={cle} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${s.puce}`} />
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

// Pastille compacte affichant un statut (utilisée dans la vue semaine / direction).
function BadgeStatut({ statut }) {
  const s = STATUTS[statut];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${s.badge}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {s.label}
    </span>
  );
}

// Grand bouton tactile de statut : un clic fait avancer le cycle.
function BoutonStatut({ statut, onClick }) {
  const s = STATUTS[statut];
  const Icon = s.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] focus:outline-none focus-visible:ring-4 sm:w-64 ${s.bouton}`}
    >
      <Icon className="h-5 w-5" />
      {s.label}
    </button>
  );
}

// -----------------------------------------------------------------------------
// 5. ÉCRAN 1 — SÉLECTION DU MANAGER ("Qui êtes-vous ?")
// -----------------------------------------------------------------------------
// Une carte manager : cliquable pour entrer dans son espace, sauf en mode
// édition où elle devient un formulaire de renommage (le nom saisi reste
// mémorisé, cf. persistance dans le composant racine).
function CarteManager({ manager, taille, modeEdition, onChoisir, onRenommer, onSupprimer }) {
  const [nom, setNom] = useState(manager.nom);

  if (modeEdition) {
    const suppressionBloquee = taille > 0;
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6">
        <span
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${manager.couleur}`}
        >
          {initialesDe(nom || manager.nom)}
        </span>
        <div className="flex-1">
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onBlur={() => nom.trim() && onRenommer(nom.trim())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1.5 text-sm text-slate-500">
            {taille} commerciaux dans l'équipe
            {suppressionBloquee && ' — retirez d\'abord son équipe pour le supprimer'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSupprimer()}
          disabled={suppressionBloquee}
          title={suppressionBloquee ? "Impossible : l'équipe n'est pas vide" : 'Supprimer ce manager'}
          className="rounded-lg p-2.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onChoisir}
      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 active:scale-[0.99]"
    >
      <span
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${manager.couleur}`}
      >
        {initialesDe(manager.nom)}
      </span>
      <span>
        <span className="block text-lg font-semibold text-slate-800">{manager.nom}</span>
        <span className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          {taille} commerciaux dans l'équipe
        </span>
      </span>
    </button>
  );
}

function EcranAccueil({
  managers,
  commerciaux,
  onChoisirManager,
  onChoisirDirection,
  onRenommerManager,
  onAjouterManager,
  onSupprimerManager,
}) {
  const [modeEdition, setModeEdition] = useState(false);
  const [nouveauNom, setNouveauNom] = useState('');

  function soumettreNouveauManager(e) {
    e.preventDefault();
    if (!nouveauNom.trim()) return;
    onAjouterManager(nouveauNom.trim());
    setNouveauNom('');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Qui êtes-vous ?</h1>
        <p className="mt-2 text-slate-500">Touchez votre carte pour accéder au pointage du jour.</p>
        <button
          type="button"
          onClick={() => setModeEdition((v) => !v)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          {modeEdition ? (
            <>
              <Check className="h-4 w-4" />
              Terminer la modification
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4" />
              Modifier les noms des managers
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {managers.map((m) => {
          const taille = commerciaux.filter((c) => c.managerId === m.id).length;
          return (
            <CarteManager
              key={m.id}
              manager={m}
              taille={taille}
              modeEdition={modeEdition}
              onChoisir={() => onChoisirManager(m.id)}
              onRenommer={(nom) => onRenommerManager(m.id, nom)}
              onSupprimer={() => onSupprimerManager(m.id)}
            />
          );
        })}

        {/* Carte "Direction", visuellement distincte des cartes manager */}
        {!modeEdition && (
          <button
            type="button"
            onClick={onChoisirDirection}
            className="flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-400 active:scale-[0.99] sm:col-span-2"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-600 text-white">
              <Building2 className="h-7 w-7" />
            </span>
            <span>
              <span className="block text-lg font-semibold text-white">Direction</span>
              <span className="mt-1 block text-sm text-slate-300">
                Vue globale consolidée de toutes les équipes (lecture seule)
              </span>
            </span>
          </button>
        )}
      </div>

      {modeEdition && (
        <form
          onSubmit={soumettreNouveauManager}
          className="mt-5 flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 sm:flex-row"
        >
          <input
            type="text"
            value={nouveauNom}
            onChange={(e) => setNouveauNom(e.target.value)}
            placeholder="Nom du nouveau manager"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Ajouter un manager
          </button>
        </form>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 6. EN-TÊTE COMMUN AUX ÉCRANS "MANAGER" (identité + onglets + date)
// -----------------------------------------------------------------------------
function EnTeteManager({ manager, onglet, onChangerOnglet, onChangerUtilisateur }) {
  const onglets = [
    { id: 'jour', label: 'Aujourd\'hui', icon: ClipboardCheck },
    { id: 'semaine', label: 'Semaine', icon: LayoutGrid },
    { id: 'equipe', label: 'Équipe', icon: Settings2 },
  ];
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${manager.couleur}`}
          >
            {initialesDe(manager.nom)}
          </span>
          <span className="font-semibold text-slate-800">{manager.nom}</span>
        </div>
        <button
          type="button"
          onClick={onChangerUtilisateur}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
        >
          Changer d'utilisateur
        </button>
      </div>
      <div className="mx-auto flex max-w-4xl gap-1 px-4 pt-3">
        {onglets.map((o) => {
          const actif = onglet === o.id;
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChangerOnglet(o.id)}
              className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition ${
                actif
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Sélecteur de date compact (fonction secondaire, jamais nécessaire pour le jour même).
function SelecteurDate({ date, onChanger }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      <button
        type="button"
        onClick={() => onChanger(jourOuvrePrecedent(date))}
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
        aria-label="Jour précédent"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="flex items-center gap-1.5 px-2 text-sm font-medium text-slate-700">
        <CalendarDays className="h-4 w-4 text-slate-400" />
        {formatDateCourt(date)}
      </span>
      <button
        type="button"
        onClick={() => onChanger(jourOuvreSuivant(date))}
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
        aria-label="Jour suivant"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChanger(ancrerJourOuvre(toISODate(new Date())))}
        className="ml-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
      >
        Aujourd'hui
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 7. ÉCRAN 2 — POINTAGE DU JOUR
// -----------------------------------------------------------------------------
function EcranPointageJour({ equipe, date, onChangerDate, getStatut, onCyclerStatut, onValider }) {
  const estAujourdHui = date === ancrerJourOuvre(toISODate(new Date()));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold capitalize text-slate-800">{formatDateFr(date)}</h2>
          {!estAujourdHui && (
            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Correction d'une journée passée
            </span>
          )}
        </div>
        <SelecteurDate date={date} onChanger={onChangerDate} />
      </div>

      <div className="mb-4">
        <LegendeStatuts />
      </div>

      <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {equipe.map((c) => {
          const statut = getStatut(date, c.id);
          return (
            <div
              key={c.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-800">{c.nom}</p>
                <p className="text-sm text-slate-500">Secteur {c.secteur}</p>
              </div>
              <BoutonStatut statut={statut} onClick={() => onCyclerStatut(date, c.id)} />
            </div>
          );
        })}
        {equipe.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">
            Aucun commercial dans cette équipe. Ajoutez-en depuis l'onglet « Équipe ».
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onValider}
        disabled={equipe.length === 0}
        className="mt-6 w-full rounded-2xl bg-slate-800 py-4 text-lg font-bold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Valider la journée
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 8. ÉCRAN 3 — CONFIRMATION
// -----------------------------------------------------------------------------
function EcranConfirmation({ date, recap, onModifier, onChangerUtilisateur }) {
  const phrase = ORDRE_STATUTS.filter((cle) => recap[cle] > 0)
    .map((cle) => `${recap[cle]} ${STATUTS[cle].label.toLowerCase()}${recap[cle] > 1 ? 's' : ''}`)
    .join(', ');

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-9 w-9 text-green-600" />
      </span>
      <h2 className="text-xl font-bold text-slate-800">Journée validée</h2>
      <p className="mt-1 capitalize text-slate-500">{formatDateFr(date)}</p>
      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
        {phrase || 'Aucun commercial dans cette équipe'}
      </p>

      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onModifier}
          className="flex-1 rounded-xl border border-slate-300 bg-white py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Modifier
        </button>
        <button
          type="button"
          onClick={onChangerUtilisateur}
          className="flex-1 rounded-xl bg-slate-800 py-3 font-semibold text-white transition hover:bg-slate-900"
        >
          Changer d'utilisateur
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 9. VUE SECONDAIRE — TABLEAU HEBDOMADAIRE
// -----------------------------------------------------------------------------
function EcranSemaine({ equipe, ancre, onChangerAncre, getStatut, onCyclerStatut }) {
  const jours = joursOuvresJusqua(ancre, 5);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Vue semaine</h2>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => onChangerAncre(addJoursCalendaires(ancre, -7))}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-sm font-medium text-slate-700">
            {formatDateCourt(jours[0])} — {formatDateCourt(jours[jours.length - 1])}
          </span>
          <button
            type="button"
            onClick={() => onChangerAncre(addJoursCalendaires(ancre, 7))}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        Astuce : cliquez sur une pastille pour corriger le statut d'un jour passé.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="p-3 font-semibold text-slate-600">Commercial</th>
              {jours.map((j) => (
                <th key={j} className="p-3 text-center font-semibold capitalize text-slate-600">
                  {formatDateCourt(j)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equipe.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="p-3 font-medium text-slate-800">
                  {c.nom}
                  <span className="ml-2 text-xs font-normal text-slate-400">{c.secteur}</span>
                </td>
                {jours.map((j) => (
                  <td key={j} className="p-2 text-center">
                    <button type="button" onClick={() => onCyclerStatut(j, c.id)} className="mx-auto block">
                      <BadgeStatut statut={getStatut(j, c.id)} />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
            {equipe.length === 0 && (
              <tr>
                <td colSpan={jours.length + 1} className="p-6 text-center text-slate-500">
                  Aucun commercial dans cette équipe.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 10. VUE SECONDAIRE — GESTION DE L'ÉQUIPE
// -----------------------------------------------------------------------------
function EcranEquipe({ managerId, equipe, onAjouter, onRetirer, onReinitialiser }) {
  const [nom, setNom] = useState('');
  const [secteur, setSecteur] = useState(SECTEURS[0]);

  function soumettre(e) {
    e.preventDefault();
    if (!nom.trim()) return;
    onAjouter({ nom: nom.trim(), secteur, managerId });
    setNom('');
    setSecteur(SECTEURS[0]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h2 className="mb-5 text-xl font-bold text-slate-800">Gestion de l'équipe</h2>

      <form
        onSubmit={soumettre}
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-medium text-slate-600">Nom du commercial</span>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Nadia Bertrand"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Secteur</span>
          <select
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:w-40"
          >
            {SECTEURS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Ajouter
        </button>
      </form>

      <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {equipe.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-slate-800">{c.nom}</p>
              <p className="text-sm text-slate-500">Secteur {c.secteur}</p>
            </div>
            <button
              type="button"
              onClick={() => onRetirer(c.id)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Retirer
            </button>
          </div>
        ))}
        {equipe.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">Aucun commercial pour l'instant.</p>
        )}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-5 text-center">
        <p className="text-xs text-slate-400">
          Les noms des managers et des commerciaux, ainsi que le pointage, sont mémorisés
          automatiquement sur cet appareil.
        </p>
        <button
          type="button"
          onClick={onReinitialiser}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Réinitialiser avec les données de démonstration
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 11. VUE DIRECTION — CONSOLIDATION GLOBALE (LECTURE SEULE)
// -----------------------------------------------------------------------------
function EcranDirection({ managers, commerciaux, date, onChangerDate, getStatut, onRetour }) {
  const [filtreManager, setFiltreManager] = useState('tous');
  const [filtreStatut, setFiltreStatut] = useState('tous');

  const lignes = useMemo(
    () =>
      commerciaux.map((c) => ({
        ...c,
        statut: getStatut(date, c.id),
        managerNom: managers.find((m) => m.id === c.managerId)?.nom ?? '—',
      })),
    [commerciaux, managers, date, getStatut]
  );

  const lignesFiltrees = lignes.filter((l) => {
    if (filtreManager !== 'tous' && l.managerId !== filtreManager) return false;
    if (filtreStatut !== 'tous' && l.statut !== filtreStatut) return false;
    return true;
  });

  const tauxPresence = (liste) => {
    if (liste.length === 0) return 0;
    const presents = liste.filter((l) => l.statut === 'present').length;
    return Math.round((presents / liste.length) * 100);
  };

  const parManager = managers.map((m) => ({
    ...m,
    liste: lignes.filter((l) => l.managerId === m.id),
  }));
  const parSecteur = SECTEURS.map((s) => ({
    secteur: s,
    liste: lignes.filter((l) => l.secteur === s),
  }));

  function exporterCSV() {
    const entetes = ['Commercial', 'Manager', 'Secteur', 'Statut', 'Date'];
    const lignesCSV = lignesFiltrees.map((l) =>
      [l.nom, l.managerNom, l.secteur, STATUTS[l.statut].label, date].join(';')
    );
    const contenu = [entetes.join(';'), ...lignesCSV].join('\n');
    const blob = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `pointage_direction_${date}.csv`;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRetour}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <Building2 className="h-5 w-5 text-slate-500" />
                Vue Direction
              </h1>
              <p className="text-xs text-slate-400">Consolidation en lecture seule — aucune modification possible ici</p>
            </div>
          </div>
          <SelecteurDate date={date} onChanger={onChangerDate} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Taux de présence par manager — {formatDateFr(date)}
        </h2>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {parManager.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${m.couleur}`}>
                  {initialesDe(m.nom)}
                </span>
                <span className="font-semibold text-slate-800">{m.nom}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-green-500" style={{ width: `${tauxPresence(m.liste)}%` }} />
              </div>
              <p className="mt-1 text-sm text-slate-500">{tauxPresence(m.liste)}% de présence</p>
            </div>
          ))}
        </div>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Taux de présence par secteur
        </h2>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {parSecteur.map((s) => (
            <div key={s.secteur} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-800">{s.secteur}</p>
              <div className="my-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-green-500" style={{ width: `${tauxPresence(s.liste)}%` }} />
              </div>
              <p className="text-sm text-slate-500">{tauxPresence(s.liste)}%</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filtreManager}
              onChange={(e) => setFiltreManager(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="tous">Toutes les équipes</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </select>
            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="tous">Tous les statuts</option>
              {ORDRE_STATUTS.map((cle) => (
                <option key={cle} value={cle}>
                  {STATUTS[cle].label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={exporterCSV}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="p-3 font-semibold text-slate-600">Commercial</th>
                <th className="p-3 font-semibold text-slate-600">Manager</th>
                <th className="p-3 font-semibold text-slate-600">Secteur</th>
                <th className="p-3 font-semibold text-slate-600">Statut</th>
              </tr>
            </thead>
            <tbody>
              {lignesFiltrees.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-medium text-slate-800">{l.nom}</td>
                  <td className="p-3 text-slate-600">{l.managerNom}</td>
                  <td className="p-3 text-slate-600">{l.secteur}</td>
                  <td className="p-3">
                    <BadgeStatut statut={l.statut} />
                  </td>
                </tr>
              ))}
              {lignesFiltrees.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    Aucun résultat pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 12. COMPOSANT RACINE
// -----------------------------------------------------------------------------
export default function App() {
  // Identité de l'espace de travail courant : null = accueil, 'direction', ou id d'un manager
  const [espaceId, setEspaceId] = useState(null);
  // Onglet actif dans l'espace manager
  const [onglet, setOnglet] = useState('jour');

  // Managers : modifiables (renommer / ajouter / supprimer) depuis l'écran d'accueil.
  // Repartent de la sauvegarde locale si elle existe, sinon des données de démo.
  const [managers, setManagers] = useState(ETAT_SAUVEGARDE?.managers ?? MANAGERS_INITIAUX);
  // Compteur pour générer des identifiants uniques aux nouveaux managers
  const [prochainManagerId, setProchainManagerId] = useState(
    ETAT_SAUVEGARDE?.prochainManagerId ?? MANAGERS_INITIAUX.length + 1
  );

  // Équipe commerciale : modifiable via l'écran "Équipe"
  const [commerciaux, setCommerciaux] = useState(ETAT_SAUVEGARDE?.commerciaux ?? COMMERCIAUX_INITIAUX);
  // Compteur pour générer des identifiants uniques aux nouveaux commerciaux
  const [prochainId, setProchainId] = useState(ETAT_SAUVEGARDE?.prochainId ?? COMMERCIAUX_INITIAUX.length + 1);

  // Pointage : { [date]: { [commercialId]: statut } }. Repart de la sauvegarde locale
  // si elle existe, sinon des données de démo (construites une seule fois).
  const [pointage, setPointage] = useState(() => ETAT_SAUVEGARDE?.pointage ?? construireDonneesDemo());

  // Date affichée sur l'écran de pointage du jour (par défaut : aujourd'hui)
  const [dateJour, setDateJour] = useState(() => ancrerJourOuvre(toISODate(new Date())));
  // Date d'ancrage de la vue Direction : par défaut, le dernier jour ouvré déjà pointé,
  // pour que la consolidation soit parlante dès l'ouverture.
  const [dateDirection, setDateDirection] = useState(() => jourOuvrePrecedent(ancrerJourOuvre(toISODate(new Date()))));
  // Ancre de la vue semaine (par manager, on repart de la date du jour)
  const [ancreSemaine, setAncreSemaine] = useState(() => ancrerJourOuvre(toISODate(new Date())));

  // Sauvegarde automatique dans le localStorage à chaque changement de données :
  // c'est ce qui fait que les noms saisis et le pointage restent d'une visite à l'autre.
  useEffect(() => {
    sauvegarderEtat({ managers, prochainManagerId, commerciaux, prochainId, pointage });
  }, [managers, prochainManagerId, commerciaux, prochainId, pointage]);

  // Statut d'un commercial à une date donnée (par défaut : "présent")
  function getStatut(date, commercialId) {
    return pointage[date]?.[commercialId] ?? 'present';
  }

  // Fait avancer le statut d'un commercial au clic
  function cyclerStatut(date, commercialId) {
    setPointage((prev) => {
      const jour = prev[date] || {};
      const actuel = jour[commercialId] ?? 'present';
      return { ...prev, [date]: { ...jour, [commercialId]: statutSuivant(actuel) } };
    });
  }

  function ajouterCommercial({ nom, secteur, managerId }) {
    const id = `c${prochainId}`;
    setProchainId((n) => n + 1);
    setCommerciaux((prev) => [...prev, { id, nom, secteur, managerId }]);
  }
  function retirerCommercial(id) {
    setCommerciaux((prev) => prev.filter((c) => c.id !== id));
  }

  function renommerManager(id, nom) {
    setManagers((prev) => prev.map((m) => (m.id === id ? { ...m, nom } : m)));
  }
  function ajouterManager(nom) {
    const id = `m${prochainManagerId}`;
    const couleur = PALETTE_COULEURS[managers.length % PALETTE_COULEURS.length];
    setProchainManagerId((n) => n + 1);
    setManagers((prev) => [...prev, { id, nom, couleur }]);
  }
  function supprimerManager(id) {
    // Sécurité : on ne supprime pas un manager dont l'équipe n'est pas vide
    // (le bouton est déjà désactivé dans l'interface, ceci est une double sécurité).
    if (commerciaux.some((c) => c.managerId === id)) return;
    setManagers((prev) => prev.filter((m) => m.id !== id));
  }

  // Efface la sauvegarde locale et recharge la page pour repartir des données de démo.
  function reinitialiserDonnees() {
    if (!window.confirm('Effacer toutes les données saisies et revenir à la démo ?')) return;
    try {
      window.localStorage.removeItem(CLE_STOCKAGE);
    } catch {
      // rien à faire si le localStorage est indisponible
    }
    window.location.reload();
  }

  function choisirManager(id) {
    setEspaceId(id);
    setOnglet('jour');
    setDateJour(ancrerJourOuvre(toISODate(new Date())));
    setAncreSemaine(ancrerJourOuvre(toISODate(new Date())));
  }
  function retourAccueil() {
    setEspaceId(null);
    setOnglet('jour');
  }

  // --- Aiguillage principal ---

  // Écran 1 : accueil
  if (espaceId === null) {
    return (
      <div className="min-h-screen bg-slate-50">
        <EcranAccueil
          managers={managers}
          commerciaux={commerciaux}
          onChoisirManager={choisirManager}
          onChoisirDirection={() => setEspaceId('direction')}
          onRenommerManager={renommerManager}
          onAjouterManager={ajouterManager}
          onSupprimerManager={supprimerManager}
        />
      </div>
    );
  }

  // Vue Direction
  if (espaceId === 'direction') {
    return (
      <EcranDirection
        managers={managers}
        commerciaux={commerciaux}
        date={dateDirection}
        onChangerDate={setDateDirection}
        getStatut={getStatut}
        onRetour={retourAccueil}
      />
    );
  }

  // Espace d'un manager
  const manager = managers.find((m) => m.id === espaceId);
  const equipe = commerciaux.filter((c) => c.managerId === espaceId);

  const recapDuJour = ORDRE_STATUTS.reduce((acc, cle) => {
    acc[cle] = equipe.filter((c) => getStatut(dateJour, c.id) === cle).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      {onglet !== 'confirmation' && (
        <EnTeteManager
          manager={manager}
          onglet={onglet}
          onChangerOnglet={setOnglet}
          onChangerUtilisateur={retourAccueil}
        />
      )}

      {onglet === 'jour' && (
        <EcranPointageJour
          equipe={equipe}
          date={dateJour}
          onChangerDate={setDateJour}
          getStatut={getStatut}
          onCyclerStatut={cyclerStatut}
          onValider={() => setOnglet('confirmation')}
        />
      )}

      {onglet === 'confirmation' && (
        <EcranConfirmation
          date={dateJour}
          recap={recapDuJour}
          onModifier={() => setOnglet('jour')}
          onChangerUtilisateur={retourAccueil}
        />
      )}

      {onglet === 'semaine' && (
        <EcranSemaine
          equipe={equipe}
          ancre={ancreSemaine}
          onChangerAncre={setAncreSemaine}
          getStatut={getStatut}
          onCyclerStatut={cyclerStatut}
        />
      )}

      {onglet === 'equipe' && (
        <EcranEquipe
          managerId={espaceId}
          equipe={equipe}
          onAjouter={ajouterCommercial}
          onRetirer={retirerCommercial}
          onReinitialiser={reinitialiserDonnees}
        />
      )}
    </div>
  );
}
