'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, Printer, X, FileText, Download, Users, Upload } from 'lucide-react'
import CsvImportModal from '@/components/CsvImportModal'

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
  exitDate: string | null
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
  exitDate: '',
})

function isActiveWorker(w: WorkerRosterEntry): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const entry = w.entryDate ? new Date(w.entryDate) : null
  const exit = w.exitDate ? new Date(w.exitDate) : null

  if (entry && entry > today) return false
  if (exit && exit < today) return false
  return true
}

export default function WorkerRosterPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectFilter, setProjectFilter] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  const [workers, setWorkers] = useState<WorkerRosterEntry[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editWorker, setEditWorker] = useState<WorkerRosterEntry | null>(null)
  const [workerForm, setWorkerForm] = useState(emptyWorkerForm())
  const [saving, setSaving] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/worker-roster').then((r) => r.json()),
    ]).then(([p, w]) => {
      setProjects(Array.isArray(p) ? p : [])
      setWorkers(Array.isArray(w) ? w : [])
      setLoading(false)
    })
  }, [])

  const filteredWorkers = workers.filter((w) => {
    if (projectFilter && w.projectId !== projectFilter) return false
    if (activeOnly && !isActiveWorker(w)) return false
    return true
  })

  const openAdd = () => {
    setEditWorker(null)
    setWorkerForm(emptyWorkerForm())
    setShowModal(true)
  }

  const openEdit = (w: WorkerRosterEntry) => {
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
      exitDate: w.exitDate ? w.exitDate.split('T')[0] : '',
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
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
        exitDate: workerForm.exitDate || null,
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
        setShowModal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この作業員を名簿から削除しますか？')) return
    const res = await fetch(`/api/worker-roster/${id}`, { method: 'DELETE' })
    if (res.ok) setWorkers((prev) => prev.filter((w) => w.id !== id))
  }

  const handlePrint = () => {
    const params = new URLSearchParams()
    if (projectFilter) params.set('projectId', projectFilter)
    if (activeOnly) params.set('activeOnly', '1')
    window.open(`/safety/roster/print?${params.toString()}`, '_blank')
  }

  const handleExport = async () => {
    const xlsx = await import('xlsx')
    const rows = filteredWorkers.map((w, i) => ({
      No: i + 1,
      氏名: w.workerName,
      所属会社: w.company,
      職種: w.jobType || '',
      入場日: w.entryDate ? new Date(w.entryDate).toLocaleDateString('ja-JP') : '',
      退場日: w.exitDate ? new Date(w.exitDate).toLocaleDateString('ja-JP') : '',
      資格: w.certifications || '',
      緊急連絡先: w.emergencyContact || '',
      緊急連絡先電話: w.emergencyPhone || '',
      生年月日: w.birthDate ? new Date(w.birthDate).toLocaleDateString('ja-JP') : '',
      血液型: w.bloodType ? `${w.bloodType}型` : '',
      保険種別: w.insuranceType || '',
      案件: w.project ? `${w.project.projectNumber} ${w.project.name}` : '',
    }))

    const ws = xlsx.utils.json_to_sheet(rows)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, '作業員名簿')
    xlsx.writeFile(wb, '作業員名簿.xlsx')
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ja-JP') : '-'

  return (
    <div>
      <Header title="作業員名簿" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/safety"
            className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> 安全管理
          </Link>
        </div>

        <p className="text-slate-500 text-sm mb-6">
          現場に入場する作業員を管理します。資格・緊急連絡先・入退場日を一元管理できます。
        </p>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての案件</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectNumber} - {p.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setActiveOnly((v) => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                activeOnly ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  activeOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-sm text-slate-700">在場者のみ表示</span>
          </label>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">{filteredWorkers.length}名</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 bg-white border border-slate-300 hover:border-emerald-400 hover:text-emerald-700 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" /> CSVインポート
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-700 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Excel出力
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-700 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" /> 印刷
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 作業員を追加
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center text-slate-500 p-8">読み込み中...</div>
        ) : filteredWorkers.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">作業員が登録されていません</p>
            <button
              onClick={openAdd}
              className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium mx-auto"
            >
              <Plus className="w-4 h-4" /> 作業員を追加
            </button>
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
                    <th className="px-4 py-3 text-left">入場日</th>
                    <th className="px-4 py-3 text-left">退場日</th>
                    <th className="px-4 py-3 text-left">資格・免許</th>
                    <th className="px-4 py-3 text-left">緊急連絡先</th>
                    <th className="px-4 py-3 text-left">状態</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorkers.map((w) => {
                    const active = isActiveWorker(w)
                    return (
                      <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{w.workerName}</td>
                        <td className="px-4 py-3 text-slate-600">{w.company}</td>
                        <td className="px-4 py-3 text-slate-500">{w.jobType || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {fmtDate(w.entryDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {fmtDate(w.exitDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-[180px]">
                          {w.certifications
                            ? w.certifications.split(',').map((c, i) => (
                                <span
                                  key={i}
                                  className="inline-block text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 mr-1 mb-0.5"
                                >
                                  {c.trim()}
                                </span>
                              ))
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {w.emergencyContact
                            ? `${w.emergencyContact}${w.emergencyPhone ? ` (${w.emergencyPhone})` : ''}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {active ? '在場中' : '退場済'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(w)}
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="編集"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(w.id)}
                              className="p-1 text-slate-400 hover:text-red-600"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {editWorker ? '作業員情報を編集' : '作業員を追加'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Project */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                  <select
                    value={workerForm.projectId}
                    onChange={(e) => setWorkerForm({ ...workerForm, projectId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectNumber} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">氏名 *</label>
                  <input
                    type="text"
                    value={workerForm.workerName}
                    onChange={(e) => setWorkerForm({ ...workerForm, workerName: e.target.value })}
                    required
                    placeholder="山田 太郎"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">所属会社 *</label>
                  <input
                    type="text"
                    value={workerForm.company}
                    onChange={(e) => setWorkerForm({ ...workerForm, company: e.target.value })}
                    required
                    placeholder="株式会社〇〇"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Job type / Role */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">職種</label>
                  <input
                    type="text"
                    value={workerForm.jobType}
                    onChange={(e) => setWorkerForm({ ...workerForm, jobType: e.target.value })}
                    placeholder="大工・左官・鉄筋など"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Birth date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">生年月日</label>
                  <input
                    type="date"
                    value={workerForm.birthDate}
                    onChange={(e) => setWorkerForm({ ...workerForm, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Entry date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">入場日</label>
                  <input
                    type="date"
                    value={workerForm.entryDate}
                    onChange={(e) => setWorkerForm({ ...workerForm, entryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Exit date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">退場日</label>
                  <input
                    type="date"
                    value={workerForm.exitDate}
                    onChange={(e) => setWorkerForm({ ...workerForm, exitDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Blood type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">血液型</label>
                  <select
                    value={workerForm.bloodType}
                    onChange={(e) => setWorkerForm({ ...workerForm, bloodType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">不明</option>
                    <option value="A">A型</option>
                    <option value="B">B型</option>
                    <option value="O">O型</option>
                    <option value="AB">AB型</option>
                  </select>
                </div>

                {/* Insurance */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">保険種別</label>
                  <input
                    type="text"
                    value={workerForm.insuranceType}
                    onChange={(e) => setWorkerForm({ ...workerForm, insuranceType: e.target.value })}
                    placeholder="健康保険・国保など"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Certifications */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    資格・免許（カンマ区切り）
                  </label>
                  <input
                    type="text"
                    value={workerForm.certifications}
                    onChange={(e) =>
                      setWorkerForm({ ...workerForm, certifications: e.target.value })
                    }
                    placeholder="玉掛け技能講習, 足場組立作業主任者"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Emergency contact */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    緊急連絡先（氏名）
                  </label>
                  <input
                    type="text"
                    value={workerForm.emergencyContact}
                    onChange={(e) =>
                      setWorkerForm({ ...workerForm, emergencyContact: e.target.value })
                    }
                    placeholder="山田 花子（妻）"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Emergency phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    緊急連絡先（電話）
                  </label>
                  <input
                    type="tel"
                    value={workerForm.emergencyPhone}
                    onChange={(e) =>
                      setWorkerForm({ ...workerForm, emergencyPhone: e.target.value })
                    }
                    placeholder="090-0000-0000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? '保存中...' : editWorker ? '更新する' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <CsvImportModal
          title="作業員名簿"
          importApiUrl={`/api/worker-roster/import${projectFilter ? `?projectId=${projectFilter}` : ''}`}
          templateApiUrl="/api/export/templates/worker-roster"
          expectedColumns={['氏名', '所属会社', '職種', '生年月日', '入場日', '退場日', '資格', '血液型', '緊急連絡先', '緊急連絡先電話', '保険種別']}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false)
            fetch('/api/worker-roster').then(r => r.json()).then(data => {
              if (Array.isArray(data)) setWorkers(data)
            })
          }}
        />
      )}
    </div>
  )
}
