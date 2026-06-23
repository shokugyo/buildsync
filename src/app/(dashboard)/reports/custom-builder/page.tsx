'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Download, Save, Trash2, RefreshCw, ChevronRight, LayoutList } from 'lucide-react'

// ---------------------------------------------------------------------------
// Data sources
// ---------------------------------------------------------------------------
const DATA_SOURCES = [
  {
    id: 'projects',
    label: '案件',
    fields: ['案件番号', '案件名', '状態', '顧客名', '住所', '着工日', '竣工日', '契約金額'],
  },
  {
    id: 'orders',
    label: '発注',
    fields: ['発注番号', '件名', '発注先', '発注金額', '状態', '発注日'],
  },
  {
    id: 'invoices',
    label: '請求書',
    fields: ['請求書番号', '件名', '顧客名', '金額', '状態', '請求日', '支払期限'],
  },
  {
    id: 'schedules',
    label: '工程',
    fields: ['工程名', '担当者', '開始日', '終了日', '状態', '進捗率'],
  },
  {
    id: 'work-reports',
    label: '作業報告',
    fields: ['報告日', '案件名', '報告者', '状態', '作業内容', '天気', '作業人数'],
  },
  {
    id: 'inspections',
    label: '検査',
    fields: ['検査日', '検査種別', '検査名', '結果', '不具合数', '検査担当'],
  },
  {
    id: 'costs',
    label: '原価',
    fields: ['費目', '予算金額', '発注金額', '請求金額', '支払金額', '案件名'],
  },
] as const

type SourceId = (typeof DATA_SOURCES)[number]['id']

interface SavedReport {
  id: string
  name: string
  source: SourceId
  fields: string[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CustomBuilderPage() {
  const [selectedSource, setSelectedSource] = useState<SourceId>('projects')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [reportName, setReportName] = useState('')
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [generating, setGenerating] = useState(false)

  // Drag-and-drop state
  const dragIndex = useRef<number | null>(null)

  // Load saved reports from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('customReports')
      if (raw) setSavedReports(JSON.parse(raw) as SavedReport[])
    } catch {
      // ignore
    }
  }, [])

  // When source changes, reset selected fields
  const handleSourceChange = (id: SourceId) => {
    setSelectedSource(id)
    setSelectedFields([])
  }

  const currentSource = DATA_SOURCES.find((s) => s.id === selectedSource)!
  const availableFields = currentSource.fields as readonly string[]

  // Field toggle
  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    )
  }

  // Select all / clear all
  const selectAll = () => setSelectedFields([...availableFields])
  const clearAll = () => setSelectedFields([])

  // ---------------------------------------------------------------------------
  // Drag-and-drop for selected fields ordering
  // ---------------------------------------------------------------------------
  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex.current === null || dragIndex.current === index) return
    const reordered = [...selectedFields]
    const [moved] = reordered.splice(dragIndex.current, 1)
    reordered.splice(index, 0, moved)
    dragIndex.current = index
    setSelectedFields(reordered)
  }

  const handleDragEnd = () => {
    dragIndex.current = null
  }

  // ---------------------------------------------------------------------------
  // Save to localStorage
  // ---------------------------------------------------------------------------
  const handleSave = () => {
    if (!reportName.trim()) {
      alert('レポート名を入力してください')
      return
    }
    if (selectedFields.length === 0) {
      alert('フィールドを1つ以上選択してください')
      return
    }
    const newReport: SavedReport = {
      id: Date.now().toString(),
      name: reportName.trim(),
      source: selectedSource,
      fields: [...selectedFields],
    }
    const updated = [...savedReports, newReport]
    setSavedReports(updated)
    localStorage.setItem('customReports', JSON.stringify(updated))
    alert('レポートを保存しました')
  }

  // Load a saved report into the builder
  const handleLoad = (report: SavedReport) => {
    setSelectedSource(report.source)
    setSelectedFields([...report.fields])
    setReportName(report.name)
  }

  // Delete a saved report
  const handleDeleteSaved = (id: string) => {
    if (!confirm('このレポートを削除しますか？')) return
    const updated = savedReports.filter((r) => r.id !== id)
    setSavedReports(updated)
    localStorage.setItem('customReports', JSON.stringify(updated))
  }

  // ---------------------------------------------------------------------------
  // CSV download
  // ---------------------------------------------------------------------------
  const handleDownload = async () => {
    if (selectedFields.length === 0) {
      alert('フィールドを1つ以上選択してください')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/export/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: selectedSource,
          fields: selectedFields,
          reportName: reportName || 'カスタムレポート',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        alert(err.error ?? 'エラーが発生しました')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `custom-report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      <Header title="カスタムレポートビルダー" />
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-slate-400">
          <Link href="/reports" className="hover:text-slate-600">報告管理</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-700 font-medium">カスタムレポートビルダー</span>
        </div>

        {/* ── 1. レポート名 ── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">レポート名</h2>
          <input
            type="text"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            placeholder="例：月次発注一覧"
            className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* ── 2. データソース ── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">データソースを選択</h2>
          <div className="flex flex-wrap gap-3">
            {DATA_SOURCES.map((src) => (
              <label
                key={src.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                  selectedSource === src.id
                    ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="source"
                  value={src.id}
                  checked={selectedSource === src.id}
                  onChange={() => handleSourceChange(src.id)}
                  className="accent-blue-600"
                />
                {src.label}
              </label>
            ))}
          </div>
        </div>

        {/* ── 3. フィールド選択 + ドラッグ順序 ── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">出力フィールドを選択</h2>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded"
              >
                全選択
              </button>
              <button
                onClick={clearAll}
                className="text-xs px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded"
              >
                全解除
              </button>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-3 mb-5">
            {availableFields.map((field) => (
              <label
                key={field}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                  selectedFields.includes(field)
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field)}
                  onChange={() => toggleField(field)}
                  className="accent-blue-600 w-4 h-4"
                />
                {field}
              </label>
            ))}
          </div>

          {/* Drag-to-reorder area */}
          {selectedFields.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <LayoutList className="w-3.5 h-3.5" />
                列の順序をドラッグで変更できます
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedFields.map((field, idx) => (
                  <div
                    key={field}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded cursor-grab active:cursor-grabbing select-none border border-slate-200"
                  >
                    <span className="text-slate-400">⋮⋮</span>
                    <span className="text-slate-400">{idx + 1}.</span>
                    {field}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 4. プレビュー ── */}
        {selectedFields.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">プレビュー（ヘッダー行）</h2>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    {selectedFields.map((field) => (
                      <th
                        key={field}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 font-medium whitespace-nowrap"
                      >
                        {field}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {selectedFields.map((field) => (
                      <td
                        key={field}
                        className="px-3 py-2 border border-slate-100 text-slate-300 italic whitespace-nowrap"
                      >
                        （データ）
                      </td>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>
          </div>
        )}

        {/* ── 5. アクションボタン ── */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            レポートを保存
          </button>
          <button
            onClick={handleDownload}
            disabled={generating || selectedFields.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {generating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {generating ? '生成中...' : 'CSVダウンロード'}
          </button>
        </div>

        {/* ── 6. 保存済みレポート一覧 ── */}
        {savedReports.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">保存済みレポート</h2>
            <div className="space-y-2">
              {savedReports.map((report) => {
                const src = DATA_SOURCES.find((s) => s.id === report.source)
                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{report.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {src?.label ?? report.source} &middot; {report.fields.length}フィールド
                        （{report.fields.slice(0, 4).join('、')}{report.fields.length > 4 ? '…' : ''}）
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <button
                        onClick={() => handleLoad(report)}
                        className="text-xs px-3 py-1.5 border border-blue-200 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                      >
                        読み込む
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(report.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
