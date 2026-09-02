import type { Colis, Depense } from './supabaseClient'

export function coutTotalColis(c: Pick<Colis, 'prix_achat' | 'transport' | 'autres_frais'>) {
  return c.prix_achat + c.transport + c.autres_frais
}

export function beneficeColis(c: Colis) {
  if (c.statut !== 'vendu' || c.montant_vente == null) return null
  return c.montant_vente - (c.frais_change || 0) - coutTotalColis(c)
}

export function calculerCaisse(colisList: Colis[], depenses: Depense[], capitalInitial = 0) {
  let totalVentes = 0
  let totalAchatsEtFrais = 0
  let totalFraisChange = 0
  let beneficeCumule = 0
  let colisEnCours = 0

  for (const c of colisList) {
    const cout = coutTotalColis(c)
    totalAchatsEtFrais += cout
    if (c.statut === 'vendu' && c.montant_vente != null) {
      totalVentes += c.montant_vente
      totalFraisChange += c.frais_change || 0
      beneficeCumule += c.montant_vente - (c.frais_change || 0) - cout
    } else {
      colisEnCours += 1
    }
  }

  const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0)
  const solde = capitalInitial + totalVentes - totalAchatsEtFrais - totalFraisChange - totalDepenses

  return {
    solde,
    totalVentes,
    totalAchatsEtFrais,
    totalFraisChange,
    totalDepenses,
    beneficeCumule,
    colisEnCours,
  }
}

export function evolutionCaisse(colisList: Colis[], depenses: Depense[], capitalInitial = 0) {
  type Mouvement = { date: string; montant: number }
  const mouvements: Mouvement[] = []

  for (const c of colisList) {
    mouvements.push({ date: c.date_achat, montant: -coutTotalColis(c) })
    if (c.statut === 'vendu' && c.montant_vente != null && c.date_vente) {
      mouvements.push({ date: c.date_vente, montant: c.montant_vente - (c.frais_change || 0) })
    }
  }
  for (const d of depenses) {
    mouvements.push({ date: d.date, montant: -d.montant })
  }

  mouvements.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const parJour = new Map<string, number>()
  let cumul = capitalInitial
  for (const m of mouvements) {
    cumul += m.montant
    parJour.set(m.date, cumul)
  }

  return Array.from(parJour.entries()).map(([date, solde]) => ({ date, solde }))
}

export function beneficeParColisVendu(colisList: Colis[]) {
  return colisList
    .filter((c) => c.statut === 'vendu' && c.montant_vente != null)
    .sort((a, b) => ((a.date_vente ?? '') < (b.date_vente ?? '') ? -1 : 1))
    .map((c) => ({
      produit: c.produit,
      benefice: (c.montant_vente as number) - (c.frais_change || 0) - coutTotalColis(c),
    }))
}

export function formatFCFA(montant: number) {
  const arrondi = Math.round(montant)
  const signe = arrondi < 0 ? '-' : ''
  const abs = Math.abs(arrondi).toLocaleString('fr-FR')
  return `${signe}${abs} F`
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}