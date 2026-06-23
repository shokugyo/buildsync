'use client'

import { useState, useEffect, useCallback } from 'react'

export interface FilterPreset {
  name: string
  filters: Record<string, string>
}

export function useSavedFilters(key: string) {
  const [presets, setPresets] = useState<FilterPreset[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) setPresets(JSON.parse(raw))
    } catch {
      setPresets([])
    }
  }, [key])

  const savePreset = useCallback((name: string, filters: Record<string, string>) => {
    setPresets((prev) => {
      const next = [...prev.filter((p) => p.name !== name), { name, filters }]
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }, [key])

  const deletePreset = useCallback((name: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.name !== name)
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }, [key])

  const applyPreset = useCallback((preset: FilterPreset): Record<string, string> => {
    return preset.filters
  }, [])

  return { presets, savePreset, deletePreset, applyPreset }
}
