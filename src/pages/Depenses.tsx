import { useEffect, useState, type FormEvent } from 'react'
import { supabase, type Depense } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { formatFCFA, formatDate } from '../lib/calculs'
import { ConfirmModal } from './Colis'

export default function DepensesPage() {
  const { profile, isOperateur } = useAuth()
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editEnCours, setEditEnCours] = useState<Depense | null>(null)
  const [supprimerEnCours, setSupprimerEnCours] = useState<Depense | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    const { data } = await supabase.from('depenses').select('*').order('date', { ascending: false })
    setDepenses((data as Depense[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleDelete(depense: Depense) {
    const { error } = await supabase.from('depenses').delete().eq('id', depense.id)
    setSupprimerEnCours(null)
    if (error) {
      setError('Erreur lors de la suppression : ' + error.message)
      return
    }
    reload()
  }

  const total = depenses.reduce((s, d) => s + d.montant, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Dépenses imprévues</h1>
        {isOperateur && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm bg-ink text-paper-raised px-4 py-2 rounded-sm hover:bg-ink-soft"
          >
            {showForm ? 'Annuler' : '+ Nouvelle dépense'}
          </button>
        )}
      </div>

      {error && (
        <div className="border border-expense bg-expense-soft rounded-sm px-4 py-3 text-sm text-expense flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0">
            ✕
          </button>
        </div>
      )}

      {showForm && isOperateur && (
        <DepenseForm
          operateurId={profile!.id}
          onDone={() => {
            setShowForm(false)
            reload()
          }}
        />
      )}

      {loading ? (
        <p className="text-ink-soft">Chargement…</p>
      ) : depenses.length === 0 ? (
        <p className="text-ink-soft text-sm">Aucune dépense imprévue enregistrée.</p>
      ) : (
        <div className="border border-rule rounded-sm bg-paper-raised">
          {depenses.map((d) => (
            <div key={d.id} className="ledger-row flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm text-ink">{d.commentaire}</p>
                <p className="text-xs text-ink-soft">{formatDate(d.date)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="tabular text-sm font-medium text-expense">-{formatFCFA(d.montant)}</p>
                {isOperateur && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditEnCours(d)}
                      className="text-xs text-ink-soft border border-rule rounded-sm px-2 py-1 hover:bg-paper hover:text-ink"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => setSupprimerEnCours(d)}
                      className="text-xs text-expense border border-rule rounded-sm px-2 py-1 hover:bg-expense-soft"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-paper">
            <p className="text-sm text-ink-soft">Total</p>
            <p className="tabular text-sm font-medium text-expense">-{formatFCFA(total)}</p>
          </div>
        </div>
      )}

      {editEnCours && (
        <EditDepenseModal
          depense={editEnCours}
          onClose={() => setEditEnCours(null)}
          onSaved={() => {
            setEditEnCours(null)
            reload()
          }}
        />
      )}

      {supprimerEnCours && (
        <ConfirmModal
          titre="Supprimer cette dépense ?"
          description="Cette action est définitive et retirera cette dépense du calcul de la caisse."
          onAnnuler={() => setSupprimerEnCours(null)}
          onConfirmer={() => handleDelete(supprimerEnCours)}
        />
      )}
    </div>
  )
}

function DepenseForm({ operateurId, onDone }: { operateurId: string; onDone: () => void }) {
  const [montant, setMontant] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!montant || !commentaire.trim()) {
      setError('Le montant et le commentaire sont obligatoires.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('depenses').insert({
      montant: parseFloat(montant),
      commentaire: commentaire.trim(),
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
        <label className="block text-sm text-ink-soft mb-1.5">Montant</label>
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
          Commentaire <span className="text-ink-soft">(obligatoire — visible par le patron)</span>
        </label>
        <input
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Ex. réparation véhicule, frais imprévu à la douane…"
          className="w-full px-3 py-2 border border-rule rounded-sm bg-paper focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
      </div>
      {error && <p className="text-expense text-sm">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full py-2.5 bg-ink text-paper-raised rounded-sm font-medium hover:bg-ink-soft disabled:opacity-60"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer la dépense'}
      </button>
    </form>
  )
}

function EditDepenseModal({
  depense,
  onClose,
  onSaved,
}: {
  depense: Depense
  onClose: () => void
  onSaved: () => void
}) {
  const [montant, setMontant] = useState(String(depense.montant))
  const [commentaire, setCommentaire] = useState(depense.commentaire)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!montant || !commentaire.trim()) {
      setError('Le montant et le commentaire sont obligatoires.')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('depenses')
      .update({ montant: parseFloat(montant), commentaire: commentaire.trim() })
      .eq('id', depense.id)
    setSaving(false)
    if (error) {
      setError('Erreur lors de la modification : ' + error.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-10">
      <form
        onSubmit={handleSubmit}
        className="bg-paper-raised border border-rule rounded-sm p-6 w-full max-w-sm space-y-4"
      >
        <p className="font-display text-lg text-ink">Modifier la dépense</p>
        <div>
          <label className="block text-sm text-ink-soft mb-1.5">Montant</label>
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