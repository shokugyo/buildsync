'use client'

import Header from '@/components/Header'
import Link from 'next/link'
import { ShieldCheck, AlertTriangle, ClipboardList, FileText, BookOpen, Users } from 'lucide-react'

export default function SafetyPage() {
  return (
    <div>
      <Header title="安全管理" />
      <div className="p-6">
        <p className="text-slate-500 mb-8 text-sm">
          現場の安全活動を記録・管理します。KY活動（危険予知活動）とヒヤリハット報告を行ってください。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
          <Link
            href="/safety/ky"
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <ShieldCheck className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">KY活動記録</h2>
                <p className="text-xs text-slate-500">危険予知活動</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              作業前の危険予知活動（KYK）を記録します。危険内容・対策・リスクレベルを管理できます。
            </p>
          </Link>

          <Link
            href="/safety/near-misses"
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-orange-200 transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                <AlertTriangle className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">ヒヤリハット報告</h2>
                <p className="text-xs text-slate-500">ニアミス・危険事例</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              事故には至らなかったヒヤリハット事例を報告・共有します。原因分析と対策まで管理できます。
            </p>
          </Link>

          <Link
            href="/safety/patrols"
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-green-200 transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
                <ClipboardList className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">安全パトロール</h2>
                <p className="text-xs text-slate-500">現場巡回記録</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              定期的な安全パトロールの結果を記録します。チェック項目ごとの判定と是正措置を管理できます。
            </p>
          </Link>

          <Link
            href="/safety/green-file"
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-emerald-200 transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                <FileText className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">グリーンファイル</h2>
                <p className="text-xs text-slate-500">安全書類管理</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              作業員名簿・再下請通知書など、建設工事に必要な安全書類（グリーンファイル）を管理・出力できます。
            </p>
          </Link>

          <Link
            href="/safety/education"
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <BookOpen className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">安全教育</h2>
                <p className="text-xs text-slate-500">教育記録管理</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              安全教育の実施記録を管理します。教育内容・講師・参加者を記録・印刷できます。
            </p>
          </Link>

          <Link
            href="/safety/roster"
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-indigo-200 transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                <Users className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">作業員名簿</h2>
                <p className="text-xs text-slate-500">入退場管理</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              現場に入場する作業員を管理します。資格・緊急連絡先・入退場日をExcel出力・印刷できます。
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
