'use client'

import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4 text-center">
      <WifiOff className="h-16 w-16 text-gray-400" />
      <h1 className="text-2xl font-bold text-gray-800">オフライン中です</h1>
      <p className="text-gray-500">接続が回復したら自動的に更新されます</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 active:bg-blue-800"
      >
        再試行
      </button>
    </div>
  )
}
