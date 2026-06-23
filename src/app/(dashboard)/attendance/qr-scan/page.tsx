'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { ArrowLeft, QrCode, LogIn, LogOut, CheckCircle, XCircle } from 'lucide-react'

interface ScanResult {
  id: string
  type: 'in' | 'out'
  workerName: string
  projectName: string
  time: string
  success: boolean
  message: string
}

export default function QrScanPage() {
  const [qrInput, setQrInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null)
  const [recentScans, setRecentScans] = useState<ScanResult[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('qr-scan-history')
    if (saved) {
      try {
        setRecentScans(JSON.parse(saved))
      } catch {}
    }
  }, [])

  const showToast = (message: string, success: boolean) => {
    setToast({ message, success })
    setTimeout(() => setToast(null), 4000)
  }

  const handleScan = async (type: 'in' | 'out') => {
    const data = qrInput.trim()
    if (!data) {
      showToast('QRコードデータを入力してください', false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/attendance/qr-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: data, type }),
      })

      const json = await res.json()

      if (!res.ok) {
        showToast(json.error || 'エラーが発生しました', false)
        const record: ScanResult = {
          id: Date.now().toString(),
          type,
          workerName: '-',
          projectName: '-',
          time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          success: false,
          message: json.error || 'エラー',
        }
        const updated = [record, ...recentScans].slice(0, 10)
        setRecentScans(updated)
        localStorage.setItem('qr-scan-history', JSON.stringify(updated))
        return
      }

      showToast(json.message, true)
      const record: ScanResult = {
        id: Date.now().toString(),
        type,
        workerName: json.workerName || '-',
        projectName: json.projectName || '-',
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        success: true,
        message: json.message,
      }
      const updated = [record, ...recentScans].slice(0, 10)
      setRecentScans(updated)
      localStorage.setItem('qr-scan-history', JSON.stringify(updated))
      setQrInput('')
    } catch {
      showToast('通信エラーが発生しました', false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header title="QRスキャン入退場" />
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/attendance" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
            入退場管理に戻る
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">QRコードスキャン</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            QRコードをスキャナーで読み取るか、データを貼り付けて入場・退場を記録します。
            <br />
            形式: <code className="bg-slate-100 px-1 rounded text-xs">BUILDSYNC:ユーザーID:案件ID</code>
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">QRコードデータ</label>
            <input
              type="text"
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleScan('in')
              }}
              placeholder="BUILDSYNC:userId:projectId"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">Enterキーでチェックインできます</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleScan('in')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" />
              チェックイン（入場）
            </button>
            <button
              onClick={() => handleScan('out')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              チェックアウト（退場）
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">最近のスキャン履歴</h3>
          </div>
          {recentScans.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">スキャン履歴がありません</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentScans.map(scan => (
                <li key={scan.id} className="flex items-center gap-3 px-4 py-3">
                  {scan.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {scan.workerName}
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${scan.type === 'in' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {scan.type === 'in' ? '入場' : '退場'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 truncate">{scan.projectName} — {scan.message}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{scan.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 transition-all ${
          toast.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
