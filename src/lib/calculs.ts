import type { Colis, Depense, Vente } from './supabaseClient'

export function coutTotalColis(c: Pick<Colis, 'prix_achat' | 'transport' | 'autres_frais'>) {
  return c.prix_achat + c.transport + c.autres_frais
}

export function coutUnitaireColis(c: Colis) {
  return c.quantite > 0 ? coutTotalColis(c) / c.quantite : 0
}

export function quantiteVendue(colisId: string, ventes: Vente[]) {
  return ventes
    .filter((v) => v.colis_id === colisId)
    .reduce((sum, v) => sum + v.quantite_vendue, 0)
}

export function quantiteRestante(c: Colis, ventes: Vente[]) {
  return c.quantite - quantiteVendue(c.id, ventes)
}

export function estEntierementVendu(c: Colis, ventes: Vente[]) {
  return quantiteRestante(c, ventes) <= 0
}

export function beneficeVente(v: Vente, colis: Colis) {
  const coutUnitaire = coutUnitaireColis(colis)
  return v.montant - (v.frais_change || 0) - coutUnitaire * v.quantite_vendue
}

export function beneficeCumuleColis(c: Colis, ventes: Vente[]) {
  const ventesDuColis = ventes.filter((v) => v.colis_id === c.id)
  if (ventesDuColis.length === 0) return null
  return ventesDuColis.reduce((sum, v) => sum + beneficeVente(v, c), 0)
}

export function calculerCaisse(
  colisList: Colis[],
  ventes: Vente[],
  depenses: Depense[],
  capitalInitial = 0
) {
  let totalAchatsEtFrais = 0
  let colisEnCours = 0

  for (const c of colisList) {
    totalAchatsEtFrais += coutTotalColis(c)
    if (!estEntierementVendu(c, ventes)) {
      colisEnCours += 1
    }
  }

  let totalVentes = 0
  let totalFraisChange = 0
  let beneficeCumule = 0

  const colisParId = new Map(colisList.map((c) => [c.id, c]))
  for (const v of ventes) {
    const c = colisParId.get(v.colis_id)
    if (!c) continue
    totalVentes += v.montant
    totalFraisChange += v.frais_change || 0
    beneficeCumule += beneficeVente(v, c)
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

export function evolutionCaisse(
  colisList: Colis[],
  ventes: Vente[],
  depenses: Depense[],
  capitalInitial = 0
) {
  type Mouvement = { date: string; montant: number }
  const mouvements: Mouvement[] = []

  for (const c of colisList) {
    mouvements.push({ date: c.date_achat, montant: -coutTotalColis(c) })
  }
  for (const v of ventes) {
    mouvements.push({ date: v.date_vente, montant: v.montant - (v.frais_change || 0) })
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

export function beneficeParColisVendu(colisList: Colis[], ventes: Vente[]) {
  return colisList
    .filter((c) => estEntierementVendu(c, ventes) && quantiteVendue(c.id, ventes) > 0)
    .map((c) => {
      const ventesDuColis = ventes.filter((v) => v.colis_id === c.id)
      const derniereVente = ventesDuColis.reduce((latest, v) =>
        v.date_vente > latest.date_vente ? v : latest
      )
      return {
        produit: c.produit,
        benefice: beneficeCumuleColis(c, ventes) ?? 0,
        dateVente: derniereVente.date_vente,
      }
    })
    .sort((a, b) => (a.dateVente < b.dateVente ? -1 : 1))
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