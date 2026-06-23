'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, Printer, X, FileText } from 'lucide-react'

interface Project {
  id: string
  name: string
  projectNumber: string
}

interface WorkerRosterEntry {
  id: string
  projectId: string
  project: Project
  workerName: string
  company: string
  birthDate: string | null
  jobType: string | null
  certifications: string | null
  bloodType: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  insuranceType: string | null
  entryDate: string | null
  createdAt: string
}

interface SubcontractorNotice {
  id: string
  projectId: string
  project: Project
  contractorName: string
  representative: string | null
  address: string | null
  licenseNumber: string | null
  workType: string
  workPeriodStart: string | null
  workPeriodEnd: string | null
  createdAt: string
}

const emptyWorkerForm = () => ({
  projectId: '',
  workerName: '',
  company: '',
  birthDate: '',
  jobType: '',
  certifications: '',
  bloodType: '',
  emergencyContact: '',
  emergencyPhone: '',
  insuranceType: '',
  entryDate: '',
})

const emptySubForm = () => ({
  projectId: '',
  contractorName: '',
  representative: '',
  address: '',
  licenseNumber: '',
  workType: '',
  workPeriodStart: '',
  workPeriodEnd: '',
})

export default function GreenFilePage() {
  const [activeTab, setActiveTab] = useState<'roster' | 'subcontractor'>('roster')
  const [projects, setProjects] = useState<Project[]>([])
  const [projectFilter, setProjectFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // Worker Roster state
  const [workers, setWorkers] = useState<WorkerRosterEntry[]>([])
  const [showWorkerModal, setShowWorkerModal] = useState(false)
  const [editWorker, setEditWorker] = useState<WorkerRosterEntry | null>(null)
  const [workerForm, setWorkerForm] = useState(emptyWorkerForm())
  const [savingWorker, setSavingWorker] = useState(false)

  // Subcontractor Notice state
  const [notices, setNotices] = useState<SubcontractorNotice[]>([])
  const [showSubModal, setShowSubModal] = useState(false)
  const [editSub, setEditSub] = useState<SubcontractorNotice | null>(null)
  const [subForm, setSubForm] = useState(emptySubForm())
  const [savingSub, setSavingSub] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/worker-roster').then((r) => r.json()),
      fetch('/api/subcontractor-notices').then((r) => r.json()),
    ]).then(([p, w, s]) => {
      setProjects(Array.isArray(p) ? p : [])
      setWorkers(Array.isArray(w) ? w : [])
      setNotices(Array.isArray(s) ? s : [])
      setLoading(false)
    })
  }, [])

  const filteredWorkers = workers.filter((w) =>
    !projectFilter || w.projectId === projectFilter
  )

  const filteredNotices = notices.filter((n) =>
    !projectFilter || n.projectId === projectFilter
  )

  // Worker Roster handlers
  const openAddWorker = () => {
    setEditWorker(null)
    setWorkerForm(emptyWorkerForm())
    setShowWorkerModal(true)
  }

  const openEditWorker = (w: WorkerRosterEntry) => {
    setEditWorker(w)
    setWorkerForm({
      projectId: w.projectId,
      workerName: w.workerName,
      company: w.company,
      birthDate: w.birthDate ? w.birthDate.split('T')[0] : '',
      jobType: w.jobType || '',
      certifications: w.certifications || '',
      bloodType: w.bloodType || '',
      emergencyContact: w.emergencyContact || '',
      emergencyPhone: w.emergencyPhone || '',
      insuranceType: w.insuranceType || '',
      entryDate: w.entryDate ? w.entryDate.split('T')[0] : '',
    })
    setShowWorkerModal(true)
  }

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingWorker(true)
    try {
      const payload = {
        projectId: workerForm.projectId,
        workerName: workerForm.workerName,
        company: workerForm.company,
        birthDate: workerForm.birthDate || null,
        jobType: workerForm.jobType || null,
        certifications: workerForm.certifications || null,
        bloodType: workerForm.bloodType || null,
        emergencyContact: workerForm.emergencyContact || null,
        emergencyPhone: workerForm.emergencyPhone || null,
        insuranceType: workerForm.insuranceType || null,
        entryDate: workerForm.entryDate || null,
      }

      let res: Response
      if (editWorker) {
        res = await fetch(`/api/worker-roster/${editWorker.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/worker-roster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        const data = await res.json()
        if (editWorker) {
          setWorkers((prev) => prev.map((w) => (w.id === editWorker.id ? data : w)))
        } else {
          setWorkers((prev) => [data, ...prev])
        }
        setShowWorkerModal(false)
      }
    } finally {
      setSavingWorker(false)
    }
  }

  const handleDeleteWorker = async (id: string) => {
    if (!confirm('この作業員を名簿から削除しますか？')) return
    const res = await fetch(`/api/worker-roster/${id}`, { method: 'DELETE' })
    if (res.ok) setWorkers((prev) => prev.filter((w) => w.id !== id))
  }

  // Subcontractor Notice handlers
  const openAddSub = () => {
    setEditSub(null)
    setSubForm(emptySubForm())
    setShowSubModal(true)
  }

  const openEditSub = (s: SubcontractorNotice) => {
    setEditSub(s)
    setSubForm({
      projectId: s.projectId,
      contractorName: s.contractorName,
      representative: s.representative || '',
      address: s.address || '',
      licenseNumber: s.licenseNumber || '',
      workType: s.workType,
      workPeriodStart: s.workPeriodStart ? s.workPeriodStart.split('T')[0] : '',
      workPeriodEnd: s.workPeriodEnd ? s.workPeriodEnd.split('T')[0] : '',
    })
    setShowSubModal(true)
  }

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSub(true)
    try {
      const payload = {
        projectId: subForm.projectId,
        contractorName: subForm.contractorName,
        representative: subForm.representative || null,
        address: subForm.address || null,
        licenseNumber: subForm.licenseNumber || null,
        workType: subForm.workType,
        workPeriodStart: subForm.workPeriodStart || null,
        workPeriodEnd: subForm.workPeriodEnd || null,
      }

      let res: Response
      if (editSub) {
        res = await fetch(`/api/subcontractor-notices/${editSub.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/subcontractor-notices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        const data = await res.json()
        if (editSub) {
          setNotices((prev) => prev.map((n) => (n.id === editSub.id ? data : n)))
        } else {
          setNotices((prev) => [data, ...prev])
        }
        setShowSubModal(false)
      }
    } finally {
      setSavingSub(false)
    }
  }

  const handleDeleteSub = async (id: string) => {
    if (!confirm('この再下請通知書を削除しますか？')) return
    const res = await fetch(`/api/subcontractor-notices/${id}`, { method: 'DELETE' })
    if (res.ok) setNotices((prev) => prev.filter((n) => n.id !== id))
  }

  const handlePrint = () => {
    const params = new URLSearchParams()
    if (projectFilter) params.set('projectId', projectFilter)
    window.open(`/safety/green-file/print?${params.toString()}`, '_blank')
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ja-JP') : '-'

  return (
    <div>
      <Header title="グリーンファイル" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/safety" className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm">
            <ChevronLeft className="w-4 h-4" /> 安全管理
          </Link>
        </div>

        <p className="text-slate-500 text-sm mb-6">
          建設工事における安全書類（グリーンファイル）を管理します。
        </p>

        {/* Project filter */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">すべての案件</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectNumber} - {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'roster'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            作業員名簿
          </button>
          <button
            onClick={() => setActiveTab('subcontractor')}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'subcontractor'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            再下請通知書
          </button>
        </div>

        {/* ========== 作業員名簿 ========== */}
        {activeTab === 'roster' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">{filteredWorkers.length}件</p>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-white border border-slate-300 hover:border-green-400 hover:text-green-700 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Printer className="w-4 h-4" /> 名簿出力
                </button>
                <button
                  onClick={openAddWorker}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> 追加
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-slate-500 p-8">読み込み中...</div>
            ) : filteredWorkers.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">作業員名簿がありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-xs font-medium text-slate-500">
                        <th className="px-4 py-3 text-left">氏名</th>
                        <th className="px-4 py-3 text-left">所属会社</th>
                        <th className="px-4 py-3 text-left">職種</th>
                        <th className="px-4 py-3 text-left">資格</th>
                        <th className="px-4 py-3 text-left">入場日</th>
                        <th className="px-4 py-3 text-left">生年月日</th>
                        <th className="px-4 py-3 text-left">緊急連絡先</th>
                        <th className="px-4 py-3 text-left">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredWorkers.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{w.workerName}</td>
                          <td className="px-4 py-3 text-slate-600">{w.company}</td>
                          <td className="px-4 py-3 text-slate-500">{w.jobType || '-'}</td>
                          <td className="px-4 py-3 text-slate-500 max-w-[160px]">
                            {w.certifications
                              ? w.certifications.split(',').map((c, i) => (
                                  <span
                                    key={i}
                                    className="inline-block text-xs bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5 mr-1 mb-0.5"
                                  >
                                    {c.trim()}
                                  </span>
                                ))
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{fmtDate(w.entryDate)}</td>
                          <td className="px-4 py-3 text-slate-500">{fmtDate(w.birthDate)}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {w.emergencyContact
                              ? `${w.emergencyContact}${w.emergencyPhone ? ` (${w.emergencyPhone})` : ''}`
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditWorker(w)}
                                className="p-1 text-slate-400 hover:text-blue-600"
                                title="編集"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteWorker(w.id)}
                                className="p-1 text-slate-400 hover:text-red-600"
                                title="削除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== 再下請通知書 ========== */}
        {activeTab === 'subcontractor' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">{filteredNotices.length}件</p>
              <button
                onClick={openAddSub}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> 追加
              </button>
            </div>

            {loading ? (
              <div className="text-center text-slate-500 p-8">読み込み中...</div>
            ) : filteredNotices.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">再下請通知書がありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-xs font-medium text-slate-500">
                        <th className="px-4 py-3 text-left">業者名</th>
                        <th className="px-4 py-3 text-left">代表者</th>
                        <th className="px-4 py-3 text-left">工種</th>
                        <th className="px-4 py-3 text-left">工期</th>
                        <th className="px-4 py-3 text-left">許可番号</th>
                        <th className="px-4 py-3 text-left">案件</th>
                        <th className="px-4 py-3 text-left">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredNotices.map((n) => (
                        <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{n.contractorName}</td>
                          <td className="px-4 py-3 text-slate-600">{n.representative || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{n.workType}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {n.workPeriodStart || n.workPeriodEnd
                              ? `${fmtDate(n.workPeriodStart)} 〜 ${fmtDate(n.workPeriodEnd)}`
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{n.licenseNumber || '-'}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            <p>{n.project?.name}</p>
                            <p className="text-slate-400">{n.project?.projectNumber}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditSub(n)}
                                className="p-1 text-slate-400 hover:text-blue-600"
                                title="編集"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSub(n.id)}
                                className="p-1 text-slate-400 hover:text-red-600"
                                title="削除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== Worker Roster Modal ========== */}
      {showWorkerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {editWorker ? '作業員情報を編集' : '作業員を追加'}
              </h2>
              <button onClick={() => setShowWorkerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveWorker} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                  <select
                    value={workerForm.projectId}
                    onChange={(e) => setWorkerForm({ ...workerForm, projectId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">選択してください</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectNumber} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">氏名 *</label>
                  <input
                    type="text"
                    value={workerForm.workerName}
                    onChange={(e) => setWorkerForm({ ...workerForm, workerName: e.target.value })}
                    required
                    placeholder="山田 太郎"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">所属会社 *</label>
                  <input
                    type="text"
                    value={workerForm.company}
                    onChange={(e) => setWorkerForm({ ...workerForm, company: e.target.value })}
                    required
                    placeholder="株式会社〇〇"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">職種</label>
                  <input
                    type="text"
                    value={workerForm.jobType}
                    onChange={(e) => setWorkerForm({ ...workerForm, jobType: e.target.value })}
                    placeholder="大工・左官・鉄筋など"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">生年月日</label>
                  <input
                    type="date"
                    value={workerForm.birthDate}
                    onChange={(e) => setWorkerForm({ ...workerForm, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">入場日</label>
                  <input
                    type="date"
                    value={workerForm.entryDate}
                    onChange={(e) => setWorkerForm({ ...workerForm, entryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">血液型</label>
                  <select
                    value={workerForm.bloodType}
                    onChange={(e) => setWorkerForm({ ...workerForm, bloodType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">不明</option>
                    <option value="A">A型</option>
                    <option value="B">B型</option>
                    <option value="O">O型</option>
                    <option value="AB">AB型</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">保険種別</label>
                  <input
                    type="text"
                    value={workerForm.insuranceType}
                    onChange={(e) => setWorkerForm({ ...workerForm, insuranceType: e.target.value })}
                    placeholder="健康保険・国保など"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    資格・免許（カンマ区切り）
                  </label>
                  <input
                    type="text"
                    value={workerForm.certifications}
                    onChange={(e) => setWorkerForm({ ...workerForm, certifications: e.target.value })}
                    placeholder="玉掛け技能講習, 足場組立作業主任者"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">緊急連絡先（氏名）</label>
                  <input
                    type="text"
                    value={workerForm.emergencyContact}
                    onChange={(e) => setWorkerForm({ ...workerForm, emergencyContact: e.target.value })}
                    placeholder="山田 花子（妻）"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">緊急連絡先（電話）</label>
                  <input
                    type="tel"
                    value={workerForm.emergencyPhone}
                    onChange={(e) => setWorkerForm({ ...workerForm, emergencyPhone: e.target.value })}
                    placeholder="090-0000-0000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWorkerModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={savingWorker}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {savingWorker ? '保存中...' : editWorker ? '更新する' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== Subcontractor Notice Modal ========== */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {editSub ? '再下請通知書を編集' : '再下請通知書を追加'}
              </h2>
              <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSub} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                  <select
                    value={subForm.projectId}
                    onChange={(e) => setSubForm({ ...subForm, projectId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">選択してください</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectNumber} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">再下請負業者名 *</label>
                  <input
                    type="text"
                    value={subForm.contractorName}
                    onChange={(e) => setSubForm({ ...subForm, contractorName: e.target.value })}
                    required
                    placeholder="株式会社〇〇工業"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">代表者名</label>
                  <input
                    type="text"
                    value={subForm.representative}
                    onChange={(e) => setSubForm({ ...subForm, representative: e.target.value })}
                    placeholder="代表取締役 〇〇 〇〇"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">所在地</label>
                  <input
                    type="text"
                    value={subForm.address}
                    onChange={(e) => setSubForm({ ...subForm, address: e.target.value })}
                    placeholder="東京都〇〇区〇〇町0-0-0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工種 *</label>
                  <input
                    type="text"
                    value={subForm.workType}
                    onChange={(e) => setSubForm({ ...subForm, workType: e.target.value })}
                    required
                    placeholder="型枠工事・鉄筋工事など"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">建設業許可番号</label>
                  <input
                    type="text"
                    value={subForm.licenseNumber}
                    onChange={(e) => setSubForm({ ...subForm, licenseNumber: e.target.value })}
                    placeholder="国土交通大臣(般-00)第〇〇〇〇号"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工期開始</label>
                  <input
                    type="date"
                    value={subForm.workPeriodStart}
                    onChange={(e) => setSubForm({ ...subForm, workPeriodStart: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工期終了</label>
                  <input
                    type="date"
                    value={subForm.workPeriodEnd}
                    onChange={(e) => setSubForm({ ...subForm, workPeriodEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={savingSub}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {savingSub ? '保存中...' : editSub ? '更新する' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
