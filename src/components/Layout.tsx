import { AnimatePresence, motion } from 'framer-motion'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useUserStore } from '../stores/useUserStore'

const navItems = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/footprints', label: '我的足迹', icon: '👣' },
  { to: '/planner', label: '智能规划', icon: '🗺️' },
  { to: '/random', label: '随机灵感', icon: '🎲' },
  { to: '/wishlist', label: '心愿单', icon: '⭐' },
]

function linkClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm transition ${active ? 'bg-primary text-white' : 'text-slate-700 hover:bg-muted/40 dark:text-slate-100'}`
}

export default function Layout() {
  const location = useLocation()
  const darkMode = useUserStore((state) => state.settings.darkMode)
  const updateSettings = useUserStore((state) => state.updateSettings)

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen bg-background text-[#333333] dark:bg-dark-bg dark:text-[#E8E4E0]`}>
      <header className="sticky top-0 z-30 hidden border-b border-muted/50 bg-background/90 backdrop-blur md:block dark:bg-dark-bg/90">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4">
          <span className="font-handwrite text-3xl text-purple">申根漫游记</span>
          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => linkClass(isActive)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            className="rounded-full border border-muted px-3 py-1 text-xs"
            onClick={() => updateSettings({ darkMode: !darkMode })}
          >
            {darkMode ? '🌙 暗色' : '☀️ 亮色'}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-4 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-muted/50 bg-background/95 p-2 md:hidden dark:bg-dark-bg/95">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-lg px-1 py-1 text-center text-[11px] ${isActive ? 'bg-primary text-white' : 'text-slate-700 dark:text-slate-100'}`
            }
          >
            <div>{item.icon}</div>
            <div>{item.label.replace('我的', '')}</div>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
