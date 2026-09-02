import { useEffect, useState } from 'react'
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
import { supabase, type Colis, type Depense } from '../lib/supabaseClient'
import {
  calculerCaisse,
  formatFCFA,
  formatDate,
  coutTotalColis,
  evolutionCaisse,
  beneficeParColisVendu,
} from '../lib/calculs'

const INK = '#15263c'
const PROFIT = '#1f6e52'
const EXPENSE = '#9c4a26'
const RULE = '#d9d3c4'

export default function Dashboard() {
  const [colisList, setColisList] = useState<Colis[]>([])
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: c }, { data: d }] = await Promise.all([
        supabase.from('colis').select('*').order('date_achat', { ascending: false }),
        supabase.from('depenses').select('*').order('date', { ascending: false }),
      ])
      setColisList((c as Colis[]) ?? [])
      setDepenses((d as Depense[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <p className="text-ink-soft">Chargement…</p>
  }

  const stats = calculerCaisse(colisList, depenses)
  const evolution = evolutionCaisse(colisList, depenses)
  const beneficesColis = beneficeParColisVendu(colisList)

  const dernieresOperations = [
    ...colisList.map((c) => ({
      type: c.statut === 'vendu' ? ('vente' as const) : ('achat' as const),
      date: c.statut === 'vendu' && c.date_vente ? c.date_vente : c.date_achat,
      label: c.produit,
      montant:
        c.statut === 'vendu' && c.montant_vente != null
          ? c.montant_vente - coutTotalColis(c)
          : -coutTotalColis(c),
    })),
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
      </section>

      <section className="grid grid-cols-3 gap-px bg-rule border border-rule rounded-sm overflow-hidden">
        <div className="bg-paper-raised p-4 text-center">
          <p className="text-2xl font-display tabular text-profit">{formatFCFA(stats.beneficeCumule)}</p>
          <p className="text-xs text-ink-soft mt-1">Bénéfices cumulés</p>
        </div>
        <div className="bg-paper-raised p-4 text-center">
          <p className="text-2xl font-display tabular text-ink">{stats.colisEnCours}</p>
          <p className="text-xs text-ink-soft mt-1">Colis en cours</p>
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
