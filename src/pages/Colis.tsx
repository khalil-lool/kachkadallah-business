import { useEffect, useState, type FormEvent } from 'react'
import { supabase, type Colis, type Vente } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import {
  coutTotalColis,
  coutUnitaireColis,
  quantiteVendue,
  quantiteRestante,
  estEntierementVendu,
  beneficeVente,
  beneficeCumuleColis,
  formatFCFA,
  formatDate,
} from '../lib/calculs'

export default function ColisPage() {
  const { profile, isOperateur } = useAuth()
  const [colisList, setColisList] = useState<Colis[]>([])
  const [ventes, setVentes] = useState<Vente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [venteEnCours, setVenteEnCours] = useState<Colis | null>(null)
  const [editEnCours, setEditEnCours] = useState<Colis | null>(null)
  const [supprimerEnCours, setSupprimerEnCours] = useState<Colis | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    const [{ data: c }, { data: v }] = await Promise.all([
      supabase.from('colis').select('*').order('date_achat', { ascending: false }),
      supabase.from('ventes').select('*').order('date_vente', { ascending: false }),
    ])
    setColisList((c as Colis[]) ?? [])
    setVentes((v as Vente[]) ?? [])
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
              ventes={ventes.filter((v) => v.colis_id === c.id)}
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
          quantiteRestanteColis={quantiteRestante(venteEnCours, ventes)}
          operateurId={profile!.id}
          onClose={() => setVenteEnCours(null)}
          onSold={(benefice, quantite) => {
            setVenteEnCours(null)
            setConfirmation(
              `${quantite} unité${quantite > 1 ? 's' : ''} de « ${venteEnCours.produit} » vendue${
                quantite > 1 ? 's' : ''
              }. Bénéfice de cette vente : ${formatFCFA(benefice)}.`
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
          description="Cette action est définitive et retirera ce colis (et toutes ses ventes) du calcul de la caisse."
          onAnnuler={() => setSupprimerEnCours(null)}
          onConfirmer={() => handleDelete(supprimerEnCours)}
        />
      )}
    </div>
  )
}

function ColisCard({
  colis,
  ventes,
  isOperateur,
  onVendre,
  onModifier,
  onSupprimer,
}: {
  colis: Colis
  ventes: Vente[]
  isOperateur: boolean
  onVendre: () => void
  onModifier: () => void
  onSupprimer: () => void
}) {
  const cout = coutTotalColis(colis)
  const vendu = quantiteVendue(colis.id, ventes)
  const restant = quantiteRestante(colis, ventes)
  const totalVendu = estEntierementVendu(colis, ventes)
  const beneficeTotal = beneficeCumuleColis(colis, ventes)
  const quantite = colis.quantite ?? 1
  const prixUnitaire = colis.prix_unitaire ?? colis.prix_achat

  return (
    <div className="border border-rule rounded-sm bg-paper-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-ink font-medium">{colis.produit}</p>
          <p className="text-xs text-ink-soft mt-0.5">
            Acheté le {formatDate(colis.date_achat)}
          </p>
          <p className="text-xs text-ink-soft mt-0.5">
            {quantite} unité{quantite > 1 ? 's' : ''} × {formatFCFA(prixUnitaire)} = {formatFCFA(colis.prix_achat)}
          </p>
          <p className="text-xs text-ink-soft mt-0.5">
            Transport : {formatFCFA(colis.transport)}
            {colis.autres_frais > 0 && <> · Autres frais : {formatFCFA(colis.autres_frais)}</>}
          </p>
          <p className="text-xs text-ink mt-0.5 font-medium">
            Coût total de revient : {formatFCFA(cout)}
          </p>
          {colis.frais_commentaire && (
            <p className="text-xs text-ink-soft mt-0.5">Note : {colis.frais_commentaire}</p>
          )}
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-sm shrink-0 text-center ${
            totalVendu
              ? 'bg-profit-soft text-profit'
              : vendu > 0
                ? 'bg-gold/20 text-ink'
                : 'bg-expense-soft text-expense'
          }`}
        >
          {totalVendu ? 'Vendu' : vendu > 0 ? `${vendu}/${quantite} vendus` : 'En cours'}
        </span>
      </div>

      {ventes.length > 0 && (
        <div className="mt-3 pt-3 ledger-rule text-sm space-y-2">
          {ventes.map((v) => {
            const b = beneficeVente(v, colis)
            return (
              <div key={v.id} className="flex items-center justify-between">
                <span className="text-ink-soft">
                  {v.quantite_vendue} unité{v.quantite_vendue > 1 ? 's' : ''} vendue{v.quantite_vendue > 1 ? 's' : ''}
                  {' '}le {formatDate(v.date_vente)}
                </span>
                <span className={`tabular ${b >= 0 ? 'text-profit' : 'text-expense'}`}>
                  {formatFCFA(v.montant)} ({b >= 0 ? '+' : ''}
                  {formatFCFA(b)})
                </span>
              </div>
            )
          })}
          {ventes.length > 1 && beneficeTotal != null && (
            <div className="flex items-center justify-between font-medium pt-1 ledger-rule">
              <span className="text-ink-soft">Bénéfice cumulé</span>
              <span className={`tabular ${beneficeTotal >= 0 ? 'text-profit' : 'text-expense'}`}>
                {beneficeTotal >= 0 ? '+' : ''}
                {formatFCFA(beneficeTotal)}
              </span>
            </div>
          )}
        </div>
      )}

      {isOperateur && (
        <div className="mt-3 pt-3 ledger-rule flex flex-wrap gap-2">
          {restant > 0 && (
            <button
              onClick={onVendre}
              className="text-sm text-ink border border-rule rounded-sm px-3 py-1.5 hover:bg-paper"
            >
              Vendre ({restant} restant{restant > 1 ? 's' : ''})
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
  quantiteRestanteColis,
  operateurId,
  onClose,
  onSold,
}: {
  colis: Colis
  quantiteRestanteColis: number
  operateurId: string
  onClose: () => void
  onSold: (benefice: number, quantite: number) => void
}) {
  const [quantiteVendueInput, setQuantiteVendueInput] = useState(String(quantiteRestanteColis))
  const [montant, setMontant] = useState('')
  const [fraisChange, setFraisChange] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const coutUnitaire = coutUnitaireColis(colis)
  const quantiteNum = parseFloat(quantiteVendueInput) || 0
  const montantNum = parseFloat(montant) || 0
  const fc = parseFloat(fraisChange) || 0
  const beneficePrevu = montantNum - fc - coutUnitaire * quantiteNum

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!montant) {
      setError('Indique le montant encaissé.')
      return
    }
    if (quantiteNum <= 0) {
      setError('Indique une quantité supérieure à zéro.')
      return
    }
    if (quantiteNum > quantiteRestanteColis) {
      setError(`Tu ne peux pas vendre plus que le restant (${quantiteRestanteColis}).`)
      return
    }
    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('ventes').insert({
      colis_id: colis.id,
      quantite_vendue: quantiteNum,
      montant: montantNum,
      frais_change: fc,
      date_vente: today,
      created_by: operateurId,
    })
    setSaving(false)
    if (error) {
      setError("Erreur lors de l'enregistrement : " + error.message)
      return
    }
    onSold(beneficePrevu, quantiteNum)
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-10">
      <form
        onSubmit={handleSubmit}
        className="bg-paper-raised border border-rule rounded-sm p-6 w-full max-w-sm space-y-4"
      >
        <div>
          <p className="font-display text-lg text-ink">Vendre « {colis.produit} »</p>
          <p className="text-xs text-ink-soft mt-1">
            Restant à vendre : {quantiteRestanteColis} unité{quantiteRestanteColis > 1 ? 's' : ''} · Coût unitaire :{' '}
            {formatFCFA(coutUnitaire)}
          </p>
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1.5">Quantité vendue</label>
          <input
            type="number"
            min="0.01"
            max={quantiteRestanteColis}
            step="0.01"
            autoFocus
            value={quantiteVendueInput}
            onChange={(e) => setQuantiteVendueInput(e.target.value)}
            className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1.5">Montant encaissé pour cette quantité</label>
          <input
            type="number"
            min="0"
            step="0.01"
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