import { useEffect, useState, type FormEvent } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { supabase, type Colis, type Vente, type Depense } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import {
  calculerCaisse,
  formatFCFA,
  formatDate,
  evolutionCaisse,
  beneficeParColisVendu,
} from '../lib/calculs'

const INK = '#15263c'
const PROFIT = '#1f6e52'
const EXPENSE = '#9c4a26'
const RULE = '#d9d3c4'

export default function Dashboard() {
  const { profile, isOperateur } = useAuth()
  const [colisList, setColisList] = useState<Colis[]>([])
  const [ventes, setVentes] = useState<Vente[]>([])
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [capitalInitial, setCapitalInitial] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editCapital, setEditCapital] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: v }, { data: d }, { data: r }] = await Promise.all([
      supabase.from('colis').select('*').order('date_achat', { ascending: false }),
      supabase.from('ventes').select('*').order('date_vente', { ascending: false }),
      supabase.from('depenses').select('*').order('date', { ascending: false }),
      supabase.from('reglages_caisse').select('*').eq('id', true).maybeSingle(),
    ])
    setColisList((c as Colis[]) ?? [])
    setVentes((v as Vente[]) ?? [])
    setDepenses((d as Depense[]) ?? [])
    setCapitalInitial(r?.capital_initial ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return <p className="text-ink-soft">Chargement…</p>
  }

  const stats = calculerCaisse(colisList, ventes, depenses, capitalInitial)
  const evolution = evolutionCaisse(colisList, ventes, depenses, capitalInitial)
  const beneficesColis = beneficeParColisVendu(colisList, ventes)

  const dernieresOperations = [
    ...colisList.map((c) => ({
      type: 'achat' as const,
      date: c.date_achat,
      label: c.produit,
      montant: -(c.prix_achat + c.transport + c.autres_frais),
    })),
    ...ventes.map((v) => {
      const c = colisList.find((col) => col.id === v.colis_id)
      return {
        type: 'vente' as const,
        date: v.date_vente,
        label: c ? c.produit : 'Colis supprimé',
        montant: v.montant - (v.frais_change || 0),
      }
    }),
    ...depenses.map((d) => ({
      type: 'depense' as const,
      date: d.date,
      label: d.commentaire,
      montant: -d.montant,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8)

  return (
    <div className="space-y-10">
      <section className="text-center py-6">
        <p className="text-sm text-ink-soft mb-2">Solde de caisse actuel</p>
        <p className="font-display text-5xl text-ink tabular">{formatFCFA(stats.solde)}</p>
        {isOperateur && (
          <button
            onClick={() => setEditCapital(true)}
            className="mt-3 text-xs text-ink-soft border border-rule rounded-sm px-3 py-1.5 hover:bg-paper-raised hover:text-ink"
          >
            Modifier le capital de départ
          </button>
        )}
      </section>

      {editCapital && (
        <CapitalModal
          valeurActuelle={capitalInitial}
          operateurId={profile!.id}
          onClose={() => setEditCapital(false)}
          onSaved={() => {
            setEditCapital(false)
            load()
          }}
        />
      )}

      <section className="grid grid-cols-3 gap-px bg-rule border border-rule rounded-sm overflow-hidden">
        <div className="bg-paper-raised p-4 text-center">
          <p className="text-2xl font-display tabular text-profit">{formatFCFA(stats.beneficeCumule)}</p>
          <p className="text-xs text-ink-soft mt-1">Bénéfices cumulés</p>
        </div>
        <div className="bg-paper-raised p-4 text-center">
          <p className="text-2xl font-display tabular text-ink">{stats.colisEnCours}</p>
          <p className="text-xs text-ink-soft mt-1">Produits en cours</p>
        </div>
        <div className="bg-paper-raised p-4 text-center">
          <p className="text-2xl font-display tabular text-expense">{formatFCFA(stats.totalDepenses)}</p>
          <p className="text-xs text-ink-soft mt-1">Dépenses imprévues</p>
        </div>
      </section>

      {evolution.length > 1 && (
        <section>
          <h2 className="font-display text-lg text-ink mb-3">Évolution de la caisse</h2>
          <div className="border border-rule rounded-sm bg-paper-raised p-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolution} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="soldeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={INK} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={INK} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={RULE} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatDate(d)}
                  tick={{ fontSize: 11, fill: '#5b6472' }}
                  axisLine={{ stroke: RULE }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatFCFA(v)}
                  tick={{ fontSize: 11, fill: '#5b6472' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(value) => formatFCFA(Number(value))}
                  labelFormatter={(d) => formatDate(d as string)}
                  contentStyle={{ borderColor: RULE, borderRadius: 2, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="solde" stroke={INK} strokeWidth={2} fill="url(#soldeGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {beneficesColis.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-ink mb-3">Bénéfice par colis vendu</h2>
          <div className="border border-rule rounded-sm bg-paper-raised p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={beneficesColis} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={RULE} vertical={false} />
                <XAxis
                  dataKey="produit"
                  tick={{ fontSize: 11, fill: '#5b6472' }}
                  axisLine={{ stroke: RULE }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatFCFA(v)}
                  tick={{ fontSize: 11, fill: '#5b6472' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(value) => formatFCFA(Number(value))}
                  contentStyle={{ borderColor: RULE, borderRadius: 2, fontSize: 12 }}
                />
                <Bar dataKey="benefice" radius={[2, 2, 0, 0]}>
                  {beneficesColis.map((entry, i) => (
                    <Cell key={i} fill={entry.benefice >= 0 ? PROFIT : EXPENSE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg text-ink mb-3">Dernières opérations</h2>
        {dernieresOperations.length === 0 ? (
          <p className="text-ink-soft text-sm">Aucune opération enregistrée pour l'instant.</p>
        ) : (
          <div className="border border-rule rounded-sm bg-paper-raised">
            {dernieresOperations.map((op, i) => (
              <div key={i} className="ledger-row flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-ink">{op.label}</p>
                  <p className="text-xs text-ink-soft">
                    {formatDate(op.date)} ·{' '}
                    {op.type === 'achat' ? 'Achat colis' : op.type === 'vente' ? 'Colis vendu' : 'Dépense imprévue'}
                  </p>
                </div>
                <p
                  className={`tabular text-sm font-medium ${
                    op.montant >= 0 ? 'text-profit' : 'text-expense'
                  }`}
                >
                  {op.montant >= 0 ? '+' : ''}
                  {formatFCFA(op.montant)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function CapitalModal({
  valeurActuelle,
  operateurId,
  onClose,
  onSaved,
}: {
  valeurActuelle: number
  operateurId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [valeur, setValeur] = useState(String(valeurActuelle))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { error } = await supabase
      .from('reglages_caisse')
      .update({
        capital_initial: parseFloat(valeur) || 0,
        updated_by: operateurId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', true)
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
        <div>
          <p className="font-display text-lg text-ink">Capital de départ</p>
          <p className="text-xs text-ink-soft mt-1">
            Montant de départ (avant tout achat/vente) à inclure dans le solde de caisse.
          </p>
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1.5">Montant</label>
          <input
            type="number"
            step="0.01"
            autoFocus
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            className="w-full px-3 py-2 border border-rule rounded-sm bg-paper tabular focus:outline-none focus:ring-2 focus:ring-gold/40"
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