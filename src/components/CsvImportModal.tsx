'use client'

import { useState, useRef } from 'react'
import { X, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react'

interface CsvImportModalProps {
  title: string
  importApiUrl: string
  templateApiUrl: string
  expectedColumns: string[]
  onClose: () => void
  onSuccess: () => void
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current.trim())
  return result
}

function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? ''
    })
    return row
  })
  return { headers, rows }
}

export default function CsvImportModal({
  title,
  importApiUrl,
  templateApiUrl,
  expectedColumns,
  onClose,
  onSuccess,
}: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('')
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped?: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsvText(text)
    setParsed(parseCsvText(text))
    setResult(null)
  }

  const handleTextChange = (text: string) => {
    setCsvText(text)
    if (text.trim()) {
      setParsed(parseCsvText(text))
    } else {
      setParsed(null)
    }
    setResult(null)
  }

  const handleImport = async () => {
    if (!parsed || parsed.rows.length === 0) return
    setImporting(true)
    try {
      const res = await fetch(importApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed.rows }),
      })
      const data = await res.json()
      setResult(data)
      if (data.imported > 0) {
        onSuccess()
      }
    } catch {
      setResult({ imported: 0, errors: ['インポート中にエラーが発生しました'] })
    } finally {
      setImporting(false)
    }
  }

  const previewRows = parsed?.rows.slice(0, 5) ?? []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">{title} CSVインポート</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Expected columns */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 mb-1">期待されるCSV列（1行目はヘッダー行）:</p>
            <p className="text-xs text-blue-600 font-mono">{expectedColumns.join(', ')}</p>
          </div>

          {/* Template download */}
          <div className="flex items-center gap-3">
            <a
              href={templateApiUrl}
              download
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              <Download className="w-4 h-4" />
              テンプレートCSVをダウンロード
            </a>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CSVファイルを選択</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <Upload className="w-4 h-4" />
                ファイルを選択
              </button>
              <span className="text-xs text-slate-400">または下にCSVテキストを貼り付け</span>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          {/* CSV paste */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CSVテキストを貼り付け</label>
            <textarea
              value={csvText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={'顧客名,種別,住所,電話番号,メールアドレス\n株式会社サンプル,法人,東京都千代田区1-1-1,03-0000-0000,info@example.com'}
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Preview */}
          {parsed && parsed.rows.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                プレビュー（全{parsed.rows.length}件中 先頭5件）
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {parsed.headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-slate-500 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {parsed.headers.map((h) => (
                          <td key={h} className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[150px] truncate">
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-3 ${result.errors.length > 0 && result.imported === 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {result.imported > 0 ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <p className="text-sm font-medium text-slate-700">
                  インポート完了：{result.imported}件登録
                  {result.skipped !== undefined && result.skipped > 0 && `、${result.skipped}件スキップ（重複）`}
                  {result.errors.length > 0 && `、${result.errors.length}件エラー`}
                </p>
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i} className="text-xs text-red-600">{e}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li className="text-xs text-red-400">...他{result.errors.length - 5}件のエラー</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
          >
            {result ? '閉じる' : 'キャンセル'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={importing || !parsed || parsed.rows.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              {importing ? 'インポート中...' : `${parsed?.rows.length ?? 0}件をインポート`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
