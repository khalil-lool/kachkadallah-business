import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError("Identifiant ou mot de passe incorrect.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="font-display text-2xl text-ink tracking-tight">Kachkadallah Business</p>
          <p className="text-ink-soft text-sm mt-1">Registre des achats, ventes et caisse</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-paper-raised border border-rule rounded-sm p-8"
        >
          <label className="block text-sm text-ink-soft mb-1.5" htmlFor="email">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-5 px-3 py-2.5 border border-rule rounded-sm bg-paper focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold text-ink"
          />

          <label className="block text-sm text-ink-soft mb-1.5" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 px-3 py-2.5 border border-rule rounded-sm bg-paper focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold text-ink"
          />

          {error && (
            <p className="text-expense text-sm mb-4" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-ink text-paper-raised rounded-sm font-medium hover:bg-ink-soft transition-colors disabled:opacity-60"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-ink-soft mt-6">
          Les bons comptes font les bons amis.
        </p>
      </div>
    </div>
  )
}
