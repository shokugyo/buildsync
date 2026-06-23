'use client'

import { useRef, useState } from 'react'
import { X } from 'lucide-react'

export interface BlackboardData {
  projectName: string
  workType: string
  constructionContent: string
  constructionCompany: string
  date: string
  location: string
  photographer: string
  note: string
}

interface BlackboardProps {
  data: BlackboardData
  onSave: (data: BlackboardData) => void
  onClose: () => void
}

export default function Blackboard({ data: initialData, onSave, onClose }: BlackboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [form, setForm] = useState<BlackboardData>(initialData)
  const [previewed, setPreviewed] = useState(false)
  const [saving, setSaving] = useState(false)

  const drawBlackboard = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 640
    const H = 400
    canvas.width = W
    canvas.height = H

    // Black background
    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 0, W, H)

    // Border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.strokeRect(6, 6, W - 12, H - 12)

    // Title bar
    ctx.fillStyle = '#1a4a1a'
    ctx.fillRect(6, 6, W - 12, 50)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(6, 6, W - 12, 50)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px sans-serif'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillText('電子小黒板', W / 2, 31)

    // Rows
    const rows: { label: string; value: string }[] = [
      { label: '案件名', value: form.projectName },
      { label: '工　種', value: form.workType },
      { label: '施工内容', value: form.constructionContent },
      { label: '施工会社', value: form.constructionCompany },
      { label: '日　時', value: form.date },
      { label: '撮影場所', value: form.location },
      { label: '撮影者', value: form.photographer },
      { label: '備　考', value: form.note },
    ]

    const startY = 66
    const rowH = (H - startY - 10) / rows.length
    const pad = 14

    rows.forEach((row, i) => {
      const y = startY + i * rowH
      // Row background (alternating)
      ctx.fillStyle = i % 2 === 0 ? '#1a2a1a' : '#0f1f0f'
      ctx.fillRect(6, y, W - 12, rowH)

      // Divider line
      ctx.strokeStyle = '#336633'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(6, y + rowH)
      ctx.lineTo(W - 6, y + rowH)
      ctx.stroke()

      // Label
      ctx.fillStyle = '#88cc88'
      ctx.font = '12px sans-serif'
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      ctx.fillText(row.label, pad, y + 6)

      // Value
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px sans-serif'
      // Truncate if too wide
      let text = row.value || '—'
      while (text.length > 1 && ctx.measureText(text).width > W - pad * 2 - 70) {
        text = text.slice(0, -1)
      }
      ctx.fillText(text, pad + 70, y + 6)
    })

    // Outer border again on top
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.strokeRect(6, 6, W - 12, H - 12)

    setPreviewed(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <span>電子小黒板</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Input form */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">案件名</label>
              <input
                type="text"
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                placeholder="例: ○○ビル新築工事"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">工種</label>
                <input
                  type="text"
                  value={form.workType}
                  onChange={(e) => setForm({ ...form, workType: e.target.value })}
                  placeholder="例: 基礎工事"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">施工会社</label>
                <input
                  type="text"
                  value={form.constructionCompany}
                  onChange={(e) => setForm({ ...form, constructionCompany: e.target.value })}
                  placeholder="例: ○○建設株式会社"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">施工内容</label>
              <input
                type="text"
                value={form.constructionContent}
                onChange={(e) => setForm({ ...form, constructionContent: e.target.value })}
                placeholder="例: 配筋検査 D13@200"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">日時</label>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">撮影場所</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="例: 1階 玄関ホール"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">撮影者</label>
              <input
                type="text"
                value={form.photographer}
                onChange={(e) => setForm({ ...form, photographer: e.target.value })}
                placeholder="例: 田中 太郎"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">備考</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="備考を入力"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Preview button */}
          <button
            type="button"
            onClick={drawBlackboard}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            小黒板プレビュー
          </button>

          {/* Canvas */}
          <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[200px]">
            <canvas
              ref={canvasRef}
              className="max-w-full"
              style={{ display: previewed ? 'block' : 'none' }}
            />
            {!previewed && (
              <p className="text-slate-500 text-sm">「小黒板プレビュー」ボタンで確認</p>
            )}
          </div>

          {/* Save / Close buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
            >
              {saving ? '保存中...' : 'データを保存'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
