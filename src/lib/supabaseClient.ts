import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase n'est pas configuré : crée un fichier .env à partir de .env.example"
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Colis = {
  id: string
  produit: string
  quantite: number
  prix_unitaire: number
  prix_achat: number
  transport: number
  autres_frais: number
  frais_commentaire: string | null
  statut: 'en_cours' | 'vendu'
  montant_vente: number | null
  frais_change: number
  date_achat: string
  date_vente: string | null
  created_by: string
  created_at: string
}

export type Depense = {
  id: string
  montant: number
  commentaire: string
  date: string
  created_by: string
  created_at: string
}

export type ReglagesCaisse = {
  id: boolean
  capital_initial: number
  updated_by: string | null
  updated_at: string
}

export type Profile = {
  id: string
  nom_affiche: string
  role: 'operateur' | 'consultant'
}