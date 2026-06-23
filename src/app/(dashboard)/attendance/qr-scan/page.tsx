'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import {
  ArrowLeft,
  QrCode,
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
  Camera,
  CameraOff,
  AlertCircle,
  Users,
} from 'lucide-react'

interface ScanRecord {
  id: string
  type: 'in' | 'out'
  workerName: string
  projectName: string
  time: string
  result: '成功' | '重複' | 'エラー'
  message: string
}

interface WorkerRoster {
  id: string
  workerName: string
  company: string
  project: { id: string; name: string }
}

type ScanMode = 'camera' | 'manual'

export default function QrScanPage() {
  // ---- scan mode ----
  const [mode, setMode] = useState<ScanMode>('camera')

  // ---- camera state ----
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastScannedRef = useRef<string | null>(null)
  const lastScannedTimeRef = useRef<number>(0)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanType, setScanType] = useState<'in' | 'out'>('in')

  // ---- manual input ----
  const [qrInput, setQrInput] = useState('')

  // ---- worker roster for manual fallback ----
  const [rosters, setRosters] = useState<WorkerRoster[]>([])
  const [selectedRosterId, setSelectedRosterId] = useState('')

  // ---- common ----
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([])

  // Load scan history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('qr-scan-history-v2')
    if (saved) {
      try { setScanHistory(JSON.parse(saved)) } catch {}
    }
  }, [])

  // Fetch worker roster for manual mode
  useEffect(() => {
    fetch('/api/worker-roster')
      .then(r => r.ok ? r.json() : [])
      .then((data: WorkerRoster[]) => setRosters(data))
      .catch(() => {})
  }, [])

  const saveScanHistory = useCallback((records: ScanRecord[]) => {
    localStorage.setItem('qr-scan-history-v2', JSON.stringify(records))
  }, [])

  const addScanRecord = useCallback((record: Omit<ScanRecord, 'id'>) => {
    setScanHistory(prev => {
      const updated = [{ ...record, id: Date.now().toString() }, ...prev].slice(0, 20)
      saveScanHistory(updated)
      return updated
    })
  }, [saveScanHistory])

  const showToast = useCallback((message: string, success: boolean) => {
    setToast({ message, success })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // --- AudioContext beep ---
  const playBeep = useCallback((success: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = success ? 880 : 330
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    } catch {}
  }, [])

  // ---- API call ----
  const processCheckin = useCallback(async (params: { qrData?: string; workerId?: string }, type: 'in' | 'out') => {
    setLoading(true)
    try {
      const res = await fetch('/api/attendance/qr-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, type }),
      })
      const json = await res.json()

      if (!res.ok) {
        playBeep(false)
        showToast(json.error || 'エラーが発生しました', false)
        addScanRecord({
          type,
          workerName: '-',
          projectName: '-',
          time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          result: 'エラー',
          message: json.error || 'エラー',
        })
        return
      }

      const isDuplicate = json.duplicate === true
      playBeep(!isDuplicate)
      showToast(json.message, !isDuplicate)
      addScanRecord({
        type,
        workerName: json.workerName || '-',
        projectName: json.projectName || '-',
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        result: isDuplicate ? '重複' : '成功',
        message: json.message,
      })
    } catch {
      playBeep(false)
      showToast('通信エラーが発生しました', false)
    } finally {
      setLoading(false)
    }
  }, [playBeep, showToast, addScanRecord])

  // ---- Camera controls ----
  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'カメラへのアクセスが拒否されました。ブラウザの設定でカメラ許可を有効にしてください。'
        : 'カメラを起動できませんでした。手動入力モードをご利用ください。'
      setCameraError(msg)
      setCameraActive(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  // ---- QR scan loop ----
  const scanFrame = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Dynamic import of jsQR (client-only)
    const jsQR = (await import('jsqr')).default
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (!code) return

    const data = code.data.trim()
    const now = Date.now()

    // Debounce: 同じQRを3秒以内に再スキャンしない
    if (data === lastScannedRef.current && now - lastScannedTimeRef.current < 3000) return

    lastScannedRef.current = data
    lastScannedTimeRef.current = now

    // parse BUILDSYNC:workerId or BUILDSYNC:userId:projectId
    const parts = data.split(':')
    if (parts[0] !== 'BUILDSYNC') return

    if (parts.length === 2) {
      // WorkerRoster ID
      await processCheckin({ workerId: parts[1] }, scanType)
    } else if (parts.length === 3) {
      // legacy userId:projectId
      await processCheckin({ qrData: data }, scanType)
    }
  }, [scanType, processCheckin])

  // Start scan interval when camera becomes active
  useEffect(() => {
    if (cameraActive) {
      scanIntervalRef.current = setInterval(scanFrame, 500)
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
    }
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    }
  }, [cameraActive, scanFrame])

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  // ---- Mode switch ----
  const handleModeSwitch = (newMode: ScanMode) => {
    if (newMode === 'camera') {
      setMode('camera')
    } else {
      stopCamera()
      setMode('manual')
    }
  }

  // ---- Manual handlers ----
  const handleManualQrScan = async (type: 'in' | 'out') => {
    const data = qrInput.trim()
    if (!data) { showToast('QRコードデータを入力してください', false); return }
    await processCheckin({ qrData: data }, type)
    setQrInput('')
  }

  const handleRosterScan = async (type: 'in' | 'out') => {
    if (!selectedRosterId) { showToast('作業員を選択してください', false); return }
    await processCheckin({ workerId: selectedRosterId }, type)
  }

  return (
    <div>
      <Header title="QRスキャン入退場" />
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/attendance" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
            入退場管理に戻る
          </Link>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => handleModeSwitch('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'camera' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            カメラスキャン
          </button>
          <button
            onClick={() => handleModeSwitch('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'manual' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            手動入力
          </button>
        </div>

        {/* ====== CAMERA MODE ====== */}
        {mode === 'camera' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-slate-900">カメラでQRスキャン</h2>
              </div>
              {cameraActive && (
                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  スキャン中
                </span>
              )}
            </div>

            {/* Scan type toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setScanType('in')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${
                  scanType === 'in'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-200 text-slate-600 hover:border-blue-300'
                }`}
              >
                <LogIn className="w-4 h-4" /> 入場スキャン
              </button>
              <button
                onClick={() => setScanType('out')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${
                  scanType === 'out'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                <LogOut className="w-4 h-4" /> 退場スキャン
              </button>
            </div>

            {/* Video preview */}
            <div
              className="relative w-full rounded-xl overflow-hidden bg-slate-900"
              style={{ aspectRatio: '4/3', maxHeight: 320 }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan guide overlay */}
              {cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="border-2 border-blue-400 rounded-lg"
                    style={{ width: '55%', height: '55%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
                  >
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                  </div>
                  <p className="absolute bottom-3 text-white text-xs opacity-80">
                    {scanType === 'in' ? '入場' : '退場'} QRコードを枠内に合わせてください
                  </p>
                </div>
              )}
              {!cameraActive && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <CameraOff className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm opacity-60">カメラを起動してください</p>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
                  <p className="text-sm text-red-300">{cameraError}</p>
                </div>
              )}
            </div>
            {/* Hidden canvas for QR processing */}
            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-3 flex gap-2">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  カメラを起動
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <CameraOff className="w-4 h-4" />
                  カメラを停止
                </button>
              )}
            </div>
            {cameraError && (
              <p className="text-xs text-slate-500 mt-2 text-center">
                カメラが使えない場合は「手動入力」タブをお使いください。
              </p>
            )}
          </div>
        )}

        {/* ====== MANUAL MODE ====== */}
        {mode === 'manual' && (
          <div className="space-y-4 mb-4">
            {/* QR data text input */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-slate-900">QRコードデータ入力</h2>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                QRスキャナーで読み取ったデータを貼り付け、または直接入力してください。
                <br />形式: <code className="bg-slate-100 px-1 rounded">BUILDSYNC:ID</code>
              </p>
              <input
                type="text"
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleManualQrScan('in') }}
                placeholder="BUILDSYNC:..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleManualQrScan('in')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium"
                >
                  <LogIn className="w-4 h-4" /> 入場
                </button>
                <button
                  onClick={() => handleManualQrScan('out')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" /> 退場
                </button>
              </div>
            </div>

            {/* Worker roster select */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-slate-900">作業員名簿から選択</h2>
              </div>
              {rosters.length === 0 ? (
                <p className="text-sm text-slate-400">名簿データがありません</p>
              ) : (
                <>
                  <select
                    value={selectedRosterId}
                    onChange={e => setSelectedRosterId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  >
                    <option value="">作業員を選択...</option>
                    {rosters.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.workerName}（{r.company}）— {r.project?.name || '案件不明'}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRosterScan('in')}
                      disabled={loading || !selectedRosterId}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium"
                    >
                      <LogIn className="w-4 h-4" /> 入場
                    </button>
                    <button
                      onClick={() => handleRosterScan('out')}
                      disabled={loading || !selectedRosterId}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium"
                    >
                      <LogOut className="w-4 h-4" /> 退場
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ====== SCAN LOG ====== */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">スキャン履歴（最新20件）</h3>
            {scanHistory.length > 0 && (
              <button
                onClick={() => { setScanHistory([]); localStorage.removeItem('qr-scan-history-v2') }}
                className="text-xs text-slate-400 hover:text-red-500"
              >
                クリア
              </button>
            )}
          </div>
          {scanHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">スキャン履歴がありません</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {scanHistory.map(scan => (
                <li key={scan.id} className="flex items-center gap-3 px-4 py-3">
                  {scan.result === '成功' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : scan.result === '重複' ? (
                    <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {scan.workerName}
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${
                        scan.type === 'in' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {scan.type === 'in' ? '入場' : '退場'}
                      </span>
                      <span className={`ml-1 text-xs px-1.5 py-0.5 rounded font-medium ${
                        scan.result === '成功'
                          ? 'bg-green-100 text-green-700'
                          : scan.result === '重複'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {scan.result}
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

      {/* Toast */}
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
