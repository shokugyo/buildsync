'use client'

import { useState, useEffect } from 'react'

export type Language = 'ja' | 'en'

export const translations = {
  ja: {
    'nav.dashboard': 'ダッシュボード',
    'nav.projects': '案件管理',
    'nav.orders': '発注管理',
    'nav.invoices': '請求管理',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.add': '追加',
    'common.search': '検索',
    'common.loading': '読み込み中...',
    'common.noData': 'データがありません',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.orders': 'Orders',
    'nav.invoices': 'Invoices',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.noData': 'No data',
  },
} as const

export type TranslationKey = keyof typeof translations.ja

export function getLanguage(): Language {
  if (typeof window === 'undefined') return 'ja'
  return (localStorage.getItem('buildsync_language') as Language) || 'ja'
}

export function setLanguage(lang: Language): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('buildsync_language', lang)
}

export function t(lang: Language, key: TranslationKey): string {
  return translations[lang][key] ?? key
}

export function useTranslation() {
  const [lang, setLang] = useState<Language>('ja')

  useEffect(() => {
    setLang(getLanguage())
  }, [])

  const translate = (key: TranslationKey): string => {
    return translations[lang][key] ?? key
  }

  const changeLanguage = (newLang: Language) => {
    setLanguage(newLang)
    setLang(newLang)
  }

  return { t: translate, lang, changeLanguage }
}
