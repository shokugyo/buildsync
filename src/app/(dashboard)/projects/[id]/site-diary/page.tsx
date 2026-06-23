'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Save, X, Printer, Trash2 } from 'lucide-react'

interface SiteDiary {
  id: string
  projectId: string
  date: string
  weather?: string | null
  temperature?: number | null
  workers?: number | null
  workContent?: string | null
  issues?: string | null
  tomorrowPlan?: string | null
  author: { name: string }
  createdAt: string
  updatedAt: string
}

const WEATHER_OPTIONS = ['晴', '曇', '雨', '雪', '雨のち晴', '曇のち雨']

const WEATHER_EMOJI: Record<string, string> = {
  '晴': '☀️',
  '曇': '☁️',
  '雨': '🌧️',
  '雪': '❄️',
  '雨のち晴': '🌦️',
  '曇のち雨': '🌥️',
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function toYYYYMM(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toYYYYMMDD(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const defaultForm = {
  weather: '',
  temperature: '',
  workers: '',
  workContent: '',
  issues: '',
  tomorrowPlan: '',
}

export default function ProjectSiteDiaryPage() {
  const params = useParams()
  const projectId = params.id as string

  const [currentMonth, setCurrentMonth] = useState(() => toYYYYMM(new Date()))
  const [diaries, setDiaries] = useState<SiteDiary[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [activeDiary, setActiveDiary] = useState<SiteDiary | null>(null)

  const [year, mon] = currentMonth.split('-').map(Number)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/projects/${projectId}/site-diary?month=${currentMonth}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDiaries(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectId, currentMonth])

  const prevMonth = () => {
    const d = new Date(year, mon - 2, 1)
    setCurrentMonth(toYYYYMM(d))
  }

  const nextMonth = () => {
    const d = new Date(year, mon, 1)
    setCurrentMonth(toYYYYMM(d))
  }

  const daysInMonth = new Date(year, mon, 0).getDate()
  const firstWeekday = new Date(year, mon - 1, 1).getDay()

  const diaryMap: Record<string, SiteDiary> = {}
  diaries.forEach(d => {
    const dateStr = toYYYYMMDD(new Date(d.date))
    diaryMap[dateStr] = d
  })

  const openDay = (dateStr: string) => {
    setSelectedDate(dateStr)
    const existing = diaryMap[dateStr]
    if (existing) {
      setActiveDiary(existing)
      setForm({
        weather: existing.weather || '',
        temperature: existing.temperature != null ? String(existing.temperature) : '',
        workers: existing.workers != null ? String(existing.workers) : '',
        workContent: existing.workContent || '',
        issues: existing.issues || '',
        tomorrowPlan: existing.tomorrowPlan || '',
      })
    } else {
      setActiveDiary(null)
      setForm(defaultForm)
    }
    setShowPanel(true)
  }

  const closePanel = () => {
    setShowPanel(false)
    setSelectedDate(null)
    setActiveDiary(null)
    setForm(defaultForm)
  }

  const handleSave = async () => {
    if (!selectedDate) return
    setSaving(true)
    try {
      const body = {
        date: selectedDate,
        weather: form.weather || null,
        temperature: form.temperature !== '' ? parseFloat(form.temperature) : null,
        workers: form.workers !== '' ? parseInt(form.workers) : null,
        workContent: form.workContent || null,
        issues: form.issues || null,
        tomorrowPlan: form.tomorrowPlan || null,
      }

      const res = await fetch(`/api/projects/${projectId}/site-diary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const saved: SiteDiary = await res.json()
        setDiaries(prev => {
          const filtered = prev.filter(d => toYYYYMMDD(new Date(d.date)) !== selectedDate)
          return [...filtered, saved]
        })
        setActiveDiary(saved)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!activeDiary) return
    if (!confirm('この日誌を削除しますか？')) return
    const res = await fetch(`/api/site-diary/${activeDiary.id}`, { method: 'DELETE' })
    if (res.ok) {
      setDiaries(prev => prev.filter(d => d.id !== activeDiary.id))
      closePanel()
    }
  }

  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)
  while (calendarCells.length % 7 !== 0) calendarCells.push(null)

  const today = toYYYYMMDD(new Date())

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 print:hidden">
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              案件に戻る
            </Link>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              印刷
            </button>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-600" />
              <h1 className="text-xl font-bold text-slate-900">工事日誌</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-slate-700 min-w-[90px] text-center">
                {year}年{mon}月
              </span>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-slate-500 p-8">読み込み中...</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Calendar weekday headers */}
              <div className="grid grid-cols-7 border-b border-slate-200">
                {WEEKDAYS.map((w, i) => (
                  <div
                    key={w}
                    className={`py-2 text-center text-xs font-semibold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="border-b border-r border-slate-100 min-h-[110px]"
                      />
                    )
                  }
                  const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const diary = diaryMap[dateStr]
                  const weekday = (firstWeekday + day - 1) % 7
                  const isToday = dateStr === today
                  const isSelected = dateStr === selectedDate

                  return (
                    <div
                      key={dateStr}
                      onClick={() => openDay(dateStr)}
                      className={`border-b border-r border-slate-100 min-h-[110px] p-2 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                            isToday
                              ? 'bg-blue-600 text-white'
                              : weekday === 0
                              ? 'text-red-500'
                              : weekday === 6
                              ? 'text-blue-500'
                              : 'text-slate-700'
                          }`}
                        >
                          {day}
                        </span>
                        {diary?.weather && (
                          <span className="text-lg leading-none">{WEATHER_EMOJI[diary.weather] || ''}</span>
                        )}
                      </div>
                      {diary && (
                        <div className="space-y-0.5 mt-1">
                          {diary.temperature != null && (
                            <p className="text-[10px] text-slate-400">{diary.temperature}°C</p>
                          )}
                          {diary.workers != null && (
                            <p className="text-[10px] text-slate-500">作業員 {diary.workers}人</p>
                          )}
                          {diary.workContent && (
                            <p className="text-[10px] text-slate-600 line-clamp-3 leading-tight">
                              {diary.workContent}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Monthly summary */}
          {diaries.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4 print:hidden">
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <p className="text-xs text-slate-500 mb-1">記録日数</p>
                <p className="text-2xl font-bold text-slate-800">{diaries.length}<span className="text-sm font-normal text-slate-500 ml-1">日</span></p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <p className="text-xs text-slate-500 mb-1">平均作業人数</p>
                <p className="text-2xl font-bold text-slate-800">
                  {(() => {
                    const withWorkers = diaries.filter(d => d.workers != null)
                    if (withWorkers.length === 0) return '-'
                    const avg = withWorkers.reduce((s, d) => s + (d.workers || 0), 0) / withWorkers.length
                    return avg.toFixed(1)
                  })()}
                  <span className="text-sm font-normal text-slate-500 ml-1">人</span>
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <p className="text-xs text-slate-500 mb-1">問題件数</p>
                <p className="text-2xl font-bold text-slate-800">
                  {diaries.filter(d => d.issues && d.issues.trim() !== '').length}
                  <span className="text-sm font-normal text-slate-500 ml-1">件</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel */}
      {showPanel && (
        <div className="w-[400px] border-l border-slate-200 bg-white flex flex-col sticky top-0 h-screen overflow-y-auto print:hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">工事日誌</h2>
              {selectedDate && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </p>
              )}
            </div>
            <button onClick={closePanel} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">天気</label>
                <select
                  value={form.weather}
                  onChange={e => setForm({ ...form, weather: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択</option>
                  {WEATHER_OPTIONS.map(w => (
                    <option key={w} value={w}>{WEATHER_EMOJI[w]} {w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">気温 (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.temperature}
                  onChange={e => setForm({ ...form, temperature: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 25.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">作業人数</label>
              <input
                type="number"
                min="0"
                value={form.workers}
                onChange={e => setForm({ ...form, workers: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 5"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">作業内容</label>
              <textarea
                value={form.workContent}
                onChange={e => setForm({ ...form, workContent: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="本日の作業内容を入力してください"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">問題・課題</label>
              <textarea
                value={form.issues}
                onChange={e => setForm({ ...form, issues: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="発生した問題や課題を入力してください"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">翌日の予定</label>
              <textarea
                value={form.tomorrowPlan}
                onChange={e => setForm({ ...form, tomorrowPlan: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="翌日の作業予定を入力してください"
              />
            </div>

            {activeDiary && (
              <p className="text-xs text-slate-400">
                記録者: {activeDiary.author?.name} ·{' '}
                {new Date(activeDiary.updatedAt).toLocaleDateString('ja-JP')}
              </p>
            )}
          </div>

          <div className="px-5 py-4 border-t border-slate-200 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存する'}
            </button>
            {activeDiary && (
              <button
                onClick={handleDelete}
                className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                title="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
