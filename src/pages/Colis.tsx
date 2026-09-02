import { useEffect, useState, type FormEvent } from 'react'
import { supabase, type Colis } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { coutTotalColis, beneficeColis, formatFCFA, formatDate } from '../lib/calculs'

export default function ColisPage() {
  const { profile, isOperateur } = useAuth()
  const [colisList, setColisList] = useState<Colis[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [venteEnCours, setVenteEnCours] = useState<Colis | null>(null)
  const [editEnCours, setEditEnCours] = useState<Colis | null>(null)
  const [supprimerEnCours, setSupprimerEnCours] = useState<Colis | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    const { data } = await supabase.from('colis').select('*').order('date_achat', { ascending: false })
    setColisList((data as Colis[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleDelete(colis: Colis) {
    const { error } = await supabase.from('colis').delete().eq('id', colis.id)
    setSupprimerEnCours(null)
    if (error) {
      setError('Erreur lors de la suppression : ' + error.message)
      return
    }
    setConfirmation(`Colis « ${colis.produit} » supprimé.`)
    reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Colis</h1>
        {isOperateur && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm bg-ink text-paper-raised px-4 py-2 rounded-sm hover:bg-ink-soft"
          >
            {showForm ? 'Annuler' : '+ Nouveau colis'}
          </button>
        )}
      </div>

      {confirmation && (
        <div className="border border-gold bg-paper-raised rounded-sm px-4 py-3 text-sm text-ink flex items-start justify-between gap-3">
          <span>{confirmation}</span>
          <button onClick={() => setConfirmation(null)} className="text-ink-soft hover:text-ink shrink-0">
            ✕
          </button>
        </div>
      )}
      {error && (
        <div className="border border-expense bg-expense-soft rounded-sm px-4 py-3 text-sm text-expense flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0">
            ✕
          </button>
        </div>
      )}

      {showForm && isOperateur && (
        <ColisForm
          operateurId={profile!.id}
          onDone={() => {
            setShowForm(false)
            reload()
          }}
        />
      )}

      {loading ? (
        <p className="text-ink-soft">Chargement…</p>
      ) : colisList.length === 0 ? (
        <p className="text-ink-soft text-sm">Aucun colis enregistré pour l'instant.</p>
      ) : (
        <div className="space-y-3">
          {colisList.map((c) => (
            <ColisCard
              key={c.id}
              colis={c}
              isOperateur={isOperateur}
              onVendre={() => setVenteEnCours(c)}
              onModifier={() => setEditEnCours(c)}
              onSupprimer={() => setSupprimerEnCours(c)}
            />
          ))}
        </div>
      )}

      {venteEnCours && (
        <VenteModal
          colis={venteEnCours}
          onClose={() => setVenteEnCours(null)}
          onSold={(benefice, colisVendu) => {
            setVenteEnCours(null)
            setConfirmation(
              `Colis « ${colisVendu.produit} » vendu ${formatFCFA(colisVendu.montant_vente ?? 0)}. ` +
                `Coût de revient : ${formatFCFA(coutTotalColis(colisVendu))}. ` +
                `Bénéfice de cette vente : ${formatFCFA(benefice)}.`
            )
            reload()
          }}
        />
      )}

      {editEnCours && (
        <EditModal
          colis={editEnCours}
          onClose={() => setEditEnCours(null)}
          onSaved={() => {
            setEditEnCours(null)
            setConfirmation('Colis modifié.')
            reload()
          }}
        />
      )}

      {supprimerEnCours && (
        <ConfirmModal
          titre={`Supprimer « ${supprimerEnCours.produit} » ?`}
          description="Cette action est définitive et retirera ce colis (et son éventuel bénéfice) du calcul de la caisse."
          onAnnuler={() => setSupprimerEnCours(null)}
          onConfirmer={() => handleDelete(supprimerEnCours)}
        />
      )}
    </div>
  )
}

function ColisCard({
  colis,
  isOperateur,
  onVendre,
  onModifier,
  onSupprimer,
}: {
  colis: Colis
  isOperateur: boolean
  onVendre: () => void
  onModifier: () => void
  onSupprimer: () => void
}) {
  const cout = coutTotalColis(colis)
  const benefice = beneficeColis(colis)
  const quantite = colis.quantite ?? 1
  const prixUnitaire = colis.prix_unitaire ?? colis.prix_achat

  return (
    <div className="border border-rule rounded-sm bg-paper-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-ink font-medium">{colis.produit}</p>
          <p className="text-xs text-ink-soft mt-0.5">
            Acheté le {formatDate(colis.date_achat)} · Coût de revient : {formatFCFA(cout)}
          </p>
          <p className="text-xs text-ink-soft mt-0.5">
            {quantite} unité{quantite > 1 ? 's' : ''} × {formatFCFA(prixUnitaire)} = {formatFCFA(colis.prix_achat)}
          </p>
          {colis.frais_commentaire && (
            <p className="text-xs text-ink-soft mt-0.5">Note : {colis.frais_commentaire}</p>
          )}
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-sm shrink-0 ${
            colis.statut === 'vendu' ? 'bg-profit-soft text-profit' : 'bg-expense-soft text-expense'
          }`}
        >
          {colis.statut === 'vendu' ? 'Vendu' : 'En cours'}
        </span>
      </div>

      {colis.statut === 'vendu' && benefice != null ? (
        <div className="mt-3 pt-3 ledger-rule text-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-ink-soft">
              Vendu{colis.date_vente ? ` le ${formatDate(colis.date_vente)}` : ''}
            </span>
            <span className="tabular text-ink">{formatFCFA(colis.montant_vente ?? 0)}</span>
          </div>
          {colis.frais_change > 0 && (
            <div className="flex items-center justify-between text-ink-soft">
              <span>Frais de change</span>
              <span className="tabular">-{formatFCFA(colis.frais_change)}</span>
            </div>
          )}
          <div className="flex items-center justify-between font-medium">
            <span className="text-ink-soft">Bénéfice</span>
            <span className={`tabular ${benefice >= 0 ? 'text-profit' : 'text-expense'}`}>
              {benefice >= 0 ? '+' : ''}
              {formatFCFA(benefice)}
            </span>
          </div>
        </div>
      ) : null}

      {isOperateur && (
        <div className="mt-3 pt-3 ledger-rule flex flex-wrap gap-2">
          {colis.statut === 'en_cours' && (
            <button
              onClick={onVendre}
              className="text-sm text-ink border border-rule rounded-sm px-3 py-1.5 hover:bg-paper"
            >
              Marquer comme vendu
            </button>
          )}
          <button
            onClick={onModifier}
            className="text-sm text-ink-soft border border-rule rounded-sm px-3 py-1.5 hover:bg-paper hover:text-ink"
          >
            Modifier
          </button>
          <button
            onClick={onSupprimer}
            className="text-sm text-expense border border-rule rounded-sm px-3 py-1.5 hover:bg-expense-soft"
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

function ColisForm({ operateurId, onDone }: { operateurId: string; onDone: () => void }) {
  const [produit, setProduit] = useState('')
  const [quantite, setQuantite] = useState('1')
  const [prixUnitaire, setPrixUnitaire] = useState('')
  const [transport, setTransport] = useState('')
  const [autresFrais, setAutresFrais] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const quantiteNum = parseFloat(quantite) || 0
  const prixUnitaireNum = parseFloat(prixUnitaire) || 0
  const prixAchatTotal = quantiteNum * prixUnitaireNum
  const cout = prixAchatTotal + (parseFloat(transport) || 0) + (parseFloat(autresFrais) || 0)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!produit.trim()) {
      setError('Indique le nom du produit.')
      return
    }
    if (quantiteNum <= 0) {
      setError('Indique une quantité supérieure à zéro.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('colis').insert({
      produit: produit.trim(),
      quantite: quantiteNum,
      prix_unitaire: prixUnitaireNum,
      prix_achat: prixAchatTotal,
      transport: parseFloat(transport) || 0,
      autres_frais: parseFloat(autresFrais) || 0,
      frais_commentaire: commentaire.trim() || null,
      created_by: operateurId,
    })
    setSaving(false)
    if (error) {
      setError("Erreur lors de l'enregistrement : " + error.message)
      return
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="border border-rule rounded-sm bg-paper-raised p-5 space-y-4">
      <div>
        <label className="block text-sm text-ink-soft mb-1.5">Produit</label>
        <input
          value={produit}
          onChange={(e) => setProduit(e.target.value)}
          placeholder="Ex. Tissus, chaussures…"
          className="w-full px-3 py-2 border border-rule rounded-sm bg-paper focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm text-ink-soft mb-1.5">Quantité</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1.5">Prix unitaire</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={prixUnitaire}
            onChange={(e) => setPrixUnitaire(e.target.value)}
            className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1.5">Transport</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
            className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div>
          <label className="block text-sm text-ink-soft mb-1.5">Autres frais</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={autresFrais}
            onChange={(e) => setAutresFrais(e.target.value)}
            className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
      </div>

      <p className="text-sm text-ink-soft -mt-1">
        Prix d'achat calculé : <span className="tabular text-ink font-medium">{formatFCFA(prixAchatTotal)}</span>
      </p>

      <div>
        <label className="block text-sm text-ink-soft mb-1.5">Commentaire (optionnel)</label>
        <input
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Ex. détail des frais de douane…"
          className="w-full px-3 py-2 border border-rule rounded-sm bg-paper focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
      </div>

      <div className="flex items-center justify-between pt-2 ledger-rule">
        <p className="text-sm text-ink-soft">
          Coût total de revient : <span className="tabular text-ink font-medium">{formatFCFA(cout)}</span>
        </p>
        {error && <p className="text-expense text-sm">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-2.5 bg-ink text-paper-raised rounded-sm font-medium hover:bg-ink-soft disabled:opacity-60"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer le colis'}
      </button>
    </form>
  )
}

function VenteModal({
  colis,
  onClose,
  onSold,
}: {
  colis: Colis
  onClose: () => void
  onSold: (benefice: number, colisVendu: Colis) => void
}) {
  const [montant, setMontant] = useState('')
  const [fraisChange, setFraisChange] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cout = coutTotalColis(colis)
  const montantNum = parseFloat(montant) || 0
  const fc = parseFloat(fraisChange) || 0
  const beneficePrevu = montantNum - fc - cout

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!montant) {
      setError('Indique le montant encaissé.')
      return
    }
    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('colis')
      .update({
        statut: 'vendu',
        montant_vente: montantNum,
        frais_change: fc,
        date_vente: today,
      })
      .eq('id', colis.id)
      .select()
      .single()
    setSaving(false)
    if (error || !data) {
      setError("Erreur lors de l'enregistrement : " + (error?.message ?? ''))
      return
    }
    onSold(beneficePrevu, data as Colis)
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-10">
      <form
        onSubmit={handleSubmit}
        className="bg-paper-raised border border-rule rounded-sm p-6 w-full max-w-sm space-y-4"
      >
        <div>
          <p className="font-display text-lg text-ink">Vendre « {colis.produit} »</p>
          <p className="text-xs text-ink-soft mt-1">Coût de revient : {formatFCFA(cout)}</p>
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1.5">Montant total encaissé</label>
          <input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1.5">
            Frais de change <span className="text-ink-soft">(optionnel)</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={fraisChange}
            onChange={(e) => setFraisChange(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        {montant && (
          <p className="text-sm">
            Bénéfice de cette vente :{' '}
            <span className={`tabular font-medium ${beneficePrevu >= 0 ? 'text-profit' : 'text-expense'}`}>
              {beneficePrevu >= 0 ? '+' : ''}
              {formatFCFA(beneficePrevu)}
            </span>
          </p>
        )}

        {error && <p className="text-expense text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-rule rounded-sm text-ink hover:bg-paper"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-ink text-paper-raised rounded-sm font-medium hover:bg-ink-soft disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Confirmer la vente'}
          </button>
        </div>
      </form>
    </div>
  )
}

function EditModal({
  colis,
  onClose,
  onSaved,
}: {
  colis: Colis
  onClose: () => void
  onSaved: () => void
}) {
  const [produit, setProduit] = useState(colis.produit)
  const [quantite, setQuantite] = useState(String(colis.quantite ?? 1))
  const [prixUnitaire, setPrixUnitaire] = useState(String(colis.prix_unitaire ?? colis.prix_achat))
  const [transport, setTransport] = useState(String(colis.transport))
  const [autresFrais, setAutresFrais] = useState(String(colis.autres_frais))
  const [commentaire, setCommentaire] = useState(colis.frais_commentaire ?? '')
  const [montantVente, setMontantVente] = useState(
    colis.montant_vente != null ? String(colis.montant_vente) : ''
  )
  const [fraisChange, setFraisChange] = useState(String(colis.frais_change || 0))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const quantiteNum = parseFloat(quantite) || 0
    const prixUnitaireNum = parseFloat(prixUnitaire) || 0

    const payload: Partial<Colis> = {
      produit: produit.trim(),
      quantite: quantiteNum,
      prix_unitaire: prixUnitaireNum,
      prix_achat: quantiteNum * prixUnitaireNum,
      transport: parseFloat(transport) || 0,
      autres_frais: parseFloat(autresFrais) || 0,
      frais_commentaire: commentaire.trim() || null,
    }

    if (colis.statut === 'vendu') {
      payload.montant_vente = parseFloat(montantVente) || 0
      payload.frais_change = parseFloat(fraisChange) || 0
    }

    const { error } = await supabase.from('colis').update(payload).eq('id', colis.id)
    setSaving(false)
    if (error) {
      setError('Erreur lors de la modification : ' + error.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-10 py-8 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-paper-raised border border-rule rounded-sm p-6 w-full max-w-sm space-y-4"
      >
        <p className="font-display text-lg text-ink">Modifier « {colis.produit} »</p>

        <div>
          <label className="block text-sm text-ink-soft mb-1.5">Produit</label>
          <input
            value={produit}
            onChange={(e) => setProduit(e.target.value)}
            className="w-full px-3 py-2 border border-rule rounded-sm bg-paper focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-ink-soft mb-1.5">Quantité</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-soft mb-1.5">Prix unitaire</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={prixUnitaire}
              onChange={(e) => setPrixUnitaire(e.target.value)}
              className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-ink-soft mb-1.5">Transport</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-soft mb-1.5">Autres frais</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={autresFrais}
              onChange={(e) => setAutresFrais(e.target.value)}
              className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1.5">Commentaire</label>
          <input
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            className="w-full px-3 py-2 border border-rule rounded-sm bg-paper focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        {colis.statut === 'vendu' && (
          <div className="grid grid-cols-2 gap-3 pt-2 ledger-rule">
            <div>
              <label className="block text-sm text-ink-soft mb-1.5">Montant vente</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={montantVente}
                onChange={(e) => setMontantVente(e.target.value)}
                className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
            <div>
              <label className="block text-sm text-ink-soft mb-1.5">Frais de change</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fraisChange}
                onChange={(e) => setFraisChange(e.target.value)}
                className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
          </div>
        )}

        {error && <p className="text-expense text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-rule rounded-sm text-ink hover:bg-paper"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-ink text-paper-raised rounded-sm font-medium hover:bg-ink-soft disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function ConfirmModal({
  titre,
  description,
  onAnnuler,
  onConfirmer,
}: {
  titre: string
  description: string
  onAnnuler: () => void
  onConfirmer: () => void
}) {
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-20">
      <div className="bg-paper-raised border border-rule rounded-sm p-6 w-full max-w-sm space-y-4">
        <p className="font-display text-lg text-ink">{titre}</p>
        <p className="text-sm text-ink-soft">{description}</p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onAnnuler}
            className="flex-1 py-2.5 border border-rule rounded-sm text-ink hover:bg-paper"
          >
            Annuler
          </button>
          <button
            onClick={onConfirmer}
            className="flex-1 py-2.5 bg-expense text-paper-raised rounded-sm font-medium hover:opacity-90"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}