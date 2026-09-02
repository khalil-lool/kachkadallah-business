import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const navItems = [
  { to: '/', label: 'Caisse', end: true, icon: IconCaisse },
  { to: '/colis', label: 'Colis', end: false, icon: IconColis },
  { to: '/depenses', label: 'Dépenses', end: false, icon: IconDepense },
]

export default function Layout() {
  const { profile, isOperateur, signOut } = useAuth()

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-rule bg-paper-raised">
        <div className="px-5 py-6 border-b border-rule">
          <img
            src="/logo.png"
            alt="Kachkadallah Business"
            className="w-full aspect-[3/2] object-contain"
          />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors ${
                  isActive
                    ? 'bg-ink text-paper-raised font-medium'
                    : 'text-ink-soft hover:bg-paper hover:text-ink'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-rule space-y-3">
          <div className="px-3">
            <p className="text-sm text-ink truncate">{profile?.nom_affiche ?? '…'}</p>
            <p className="text-xs text-ink-soft">{isOperateur ? 'Opérateur' : 'Consultation'}</p>
          </div>
          <button
            onClick={signOut}
            className="w-full text-sm text-ink-soft hover:text-ink border border-rule rounded-sm px-3 py-2 text-left"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Colonne principale */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barre du haut — mobile uniquement */}
        <header className="md:hidden border-b border-rule bg-paper-raised px-4 py-3 flex items-center justify-between">
          <img
            src="/logo.png"
            alt="Kachkadallah Business"
            className="h-11 w-20 object-cover object-center rounded-sm"
          />
          <button onClick={signOut} className="text-xs text-ink-soft border border-rule rounded-sm px-2.5 py-1">
            Déconnexion
          </button>
        </header>

        {!isOperateur && (
          <div className="bg-ink text-paper-raised text-center text-xs py-1.5 px-4">
            La confiance n'exclut pas le contrôle.
          </div>
        )}

        <main className="flex-1 w-full max-w-4xl mx-auto px-5 py-8 pb-24 md:pb-8">
          <Outlet />
        </main>

        <Footer />

        {/* Navigation — mobile uniquement, fixée en bas */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-paper-raised border-t border-rule flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2.5 text-xs ${
                  isActive ? 'text-ink font-medium' : 'text-ink-soft'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

function Footer() {
  const annee = new Date().getFullYear()

  return (
    <footer className="border-t border-rule bg-paper-raised" aria-label="Informations de l'application">
      <div className="border-t border-rule">
        <div className="max-w-4xl mx-auto px-5 py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-ink-soft">
          <span>© {annee} Kachkadallah Business · Utilisation interne</span>
          <span>Ce qui est fait à la lumière du jour ne craint pas d'être vu.</span>
        </div>
      </div>
      <div className="hidden">
        <span>Kachkadallah Business — Registre de caisse</span>
        <span>Ce qui est fait à la lumière du jour ne craint pas d'être vu.</span>
      </div>
    </footer>
  )
}

function IconCaisse({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="7" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 11h18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="15" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconColis({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3.5 8 12 12l8.5-4M12 12v8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function IconDepense({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 17V7l6 4 6-6 4 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
