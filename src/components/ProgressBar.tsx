import { motion, AnimatePresence } from 'framer-motion'

interface ProgressBarProps {
  visitedCountries: number
  visitedCities: number
  totalCities: number
  totalCountries?: number
}

function RollingNumber({ value }: { value: number }) {
  return (
    <span className="inline-flex h-6 overflow-hidden align-middle">
      <AnimatePresence mode="wait">
        <motion.span
          key={value}
          className="inline-block"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export default function ProgressBar({
  visitedCountries,
  visitedCities,
  totalCities,
  totalCountries = 27,
}: ProgressBarProps) {
  const progress = Math.min((visitedCountries / totalCountries) * 100, 100)

  return (
    <div className="rounded-2xl border border-muted/70 bg-white/90 p-4 shadow-sm dark:bg-dark-card">
      <p className="mb-2 text-sm text-slate-600 dark:text-slate-200">
        已点亮 <RollingNumber value={visitedCountries} />/{totalCountries} 国 ·{' '}
        <RollingNumber value={visitedCities} />/{totalCities} 城
      </p>
      <div className="h-4 overflow-hidden rounded-full bg-muted/40">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-secondary to-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
