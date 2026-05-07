import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import countryInfoData from '../data/country-info.json'
import { useUserStore } from '../stores/useUserStore'
import type { CountryInfoMap } from '../types/country-info'

interface AddCustomCityModalProps {
  open: boolean
  onClose: () => void
  defaultCountryCode?: string
  onAdded?: (cityName: string, countryCode: string) => void
}

const countryInfo = countryInfoData as CountryInfoMap
const countries = Object.entries(countryInfo)
  .map(([code, info]) => ({ code, name: info.name, nameZh: info.nameZh, flag: info.flag }))
  .sort((a, b) => a.nameZh.localeCompare(b.nameZh))

export default function AddCustomCityModal({ open, onClose, defaultCountryCode, onAdded }: AddCustomCityModalProps) {
  const addCustomCity = useUserStore((state) => state.addCustomCity)
  const getAllCities = useUserStore((state) => state.getAllCities)

  const [countryQuery, setCountryQuery] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(defaultCountryCode ?? '')
  const [cityName, setCityName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setSelectedCountry(defaultCountryCode ?? '')
    setCountryQuery('')
    setCityName('')
    setError('')
  }, [defaultCountryCode, open])

  const filteredCountries = useMemo(() => {
    const keyword = countryQuery.trim().toLowerCase()
    if (!keyword) return countries
    return countries.filter((item) => item.name.toLowerCase().includes(keyword) || item.nameZh.toLowerCase().includes(keyword) || item.code.toLowerCase().includes(keyword))
  }, [countryQuery])

  const submit = () => {
    const trimmed = cityName.trim()
    if (!selectedCountry) {
      setError('请选择国家')
      return
    }
    if (!trimmed) {
      setError('请输入城市名')
      return
    }
    const exists = getAllCities().some((city) => {
      const names = [city.nameZh ?? '', city.name ?? ''].map((item) => item.toLowerCase().trim()).filter(Boolean)
      return names.includes(trimmed.toLowerCase()) && city.countryCode === selectedCountry
    })
    if (exists) {
      setError('该城市已存在于列表中')
      return
    }
    addCustomCity(trimmed, selectedCountry)
    onAdded?.(trimmed, selectedCountry)
    onClose()
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 dark:bg-dark-card"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">添加你去过的城市</h3>
                <p className="text-xs text-slate-500">记录那些不在列表中的小众目的地</p>
              </div>
              <button onClick={onClose}>×</button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs text-slate-500">选择国家</p>
                <input
                  className="mb-2 w-full rounded border border-muted/60 px-2 py-1"
                  placeholder="搜索国家（中文/英文）"
                  value={countryQuery}
                  onChange={(e) => setCountryQuery(e.target.value)}
                />
                <div className="max-h-44 overflow-y-auto rounded border border-muted/50">
                  {filteredCountries.map((item) => (
                    <button
                      key={item.code}
                      className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-background/70 ${selectedCountry === item.code ? 'bg-secondary/20' : ''}`}
                      onClick={() => setSelectedCountry(item.code)}
                    >
                      <span>{item.flag}</span>
                      <span>{item.nameZh}</span>
                      <span className="text-slate-400">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <p className="mb-1 text-xs text-slate-500">城市名称</p>
                <input
                  className="w-full rounded border border-muted/60 px-2 py-1"
                  placeholder="输入城市名（中文或英文皆可），如：图卢兹、Bordeaux、因特拉肯..."
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                />
              </label>

              {error ? <p className="text-xs text-red-600">{error}</p> : null}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-full bg-muted/40 px-4 py-1.5 text-sm" onClick={onClose}>取消</button>
              <button className="rounded-full bg-[#9b8ea8] px-4 py-1.5 text-sm text-white" onClick={submit}>
                添加并标记为已去过
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
