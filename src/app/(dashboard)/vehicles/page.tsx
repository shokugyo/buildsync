'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Plus, X, Pencil, Trash2, Car, AlertTriangle } from 'lucide-react'

type Vehicle = {
  id: string
  name: string
  plateNumber: string
  vehicleType: string
  status: string
  projectId?: string
  project?: { id: string; name: string; projectNumber: string }
  assignedTo?: string
  driver?: { id: string; name: string }
  lastInspectedAt?: string
  nextInspectionAt?: string
  mileage?: number
  fuelType?: string
  notes?: string
  companyId: string
  createdAt: string
}

type Project = { id: string; name: string; projectNumber: string }
type User = { id: string; name: string }

const STATUSES = ['利用可能', '使用中', 'メンテナンス中', '廃車']
const VEHICLE_TYPES = ['トラック', '乗用車', 'バン', '重機']

const statusColor: Record<string, string> = {
  利用可能: 'bg-green-100 text-green-700',
  使用中: 'bg-blue-100 text-blue-700',
  メンテナンス中: 'bg-orange-100 text-orange-700',
  廃車: 'bg-red-100 text-red-700',
}

function isInspectionWarning(dateStr?: string) {
  if (!dateStr) return false
  const diff = new Date(dateStr).getTime() - Date.now()
  // Warn if expired OR within 30 days
  return diff <= 30 * 24 * 60 * 60 * 1000
}

function isInspectionOverdue(dateStr?: string) {
  if (!dateStr) return false
  return new Date(dateStr).getTime() < Date.now()
}

const emptyForm = {
  name: '',
  plateNumber: '',
  vehicleType: 'トラック',
  status: '利用可能',
  projectId: '',
  assignedTo: '',
  lastInspectedAt: '',
  nextInspectionAt: '',
  mileage: '',
  fuelType: '',
  notes: '',
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  async function fetchVehicles() {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/vehicles?${params}`)
    if (res.ok) setVehicles(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetchVehicles()
  }, [filterStatus])

  useEffect(() => {
    fetch('/api/projects').then(r => r.ok ? r.json() : []).then(setProjects)
    fetch('/api/users').then(r => r.ok ? r.json() : []).then(setUsers)
  }, [])

  function openAdd() {
    setEditingVehicle(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  function openEdit(v: Vehicle) {
    setEditingVehicle(v)
    setForm({
      name: v.name,
      plateNumber: v.plateNumber,
      vehicleType: v.vehicleType,
      status: v.status,
      projectId: v.projectId || '',
      assignedTo: v.assignedTo || '',
      lastInspectedAt: v.lastInspectedAt ? v.lastInspectedAt.slice(0, 10) : '',
      nextInspectionAt: v.nextInspectionAt ? v.nextInspectionAt.slice(0, 10) : '',
      mileage: v.mileage !== undefined && v.mileage !== null ? String(v.mileage) : '',
      fuelType: v.fuelType || '',
      notes: v.notes || '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : '/api/vehicles'
    const method = editingVehicle ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      await fetchVehicles()
      setShowModal(false)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('この車両を削除しますか？')) return
    const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
    if (res.ok) await fetchVehicles()
  }

  const total = vehicles.length
  const inUse = vehicles.filter(v => v.status === '使用中').length
  const maintenance = vehicles.filter(v => v.status === 'メンテナンス中').length
  const warnList = vehicles.filter(v => isInspectionWarning(v.nextInspectionAt))
  const warnCount = warnList.length

  return (
    <div className="flex flex-col h-full">
      <Header title="車両管理" />
      <div className="flex-1 overflow-auto p-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: '総台数', value: total, color: 'text-slate-800' },
            { label: '使用中', value: inUse, color: 'text-blue-600' },
            { label: '整備中', value: maintenance, color: 'text-yellow-600' },
            { label: '警告（期限間近）', value: warnCount, color: warnCount > 0 ? 'text-red-600' : 'text-slate-400' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-slate-500 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Expiry Alert Banner */}
        {warnList.length > 0 && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-orange-700 font-medium text-sm mb-2">
              <AlertTriangle className="w-4 h-4" />
              点検期限が近い・超過している車両 ({warnList.length}台)
            </div>
            {warnList.map(v => (
              <div key={v.id} className={`text-sm flex items-center gap-2 ${isInspectionOverdue(v.nextInspectionAt) ? 'text-red-600' : 'text-orange-600'}`}>
                <Car className="w-3 h-3" />
                <span className="font-medium">{v.plateNumber}</span>
                <span>{v.name}</span>
                <span>— 次回点検: {v.nextInspectionAt ? new Date(v.nextInspectionAt).toLocaleDateString('ja-JP') : '未設定'}</span>
                {isInspectionOverdue(v.nextInspectionAt) && (
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">期限超過</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">すべてのステータス</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            車両を追加
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">読み込み中...</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">車両名</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">ナンバー</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">種別</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">ステータス</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">担当者</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">現場</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">次回車検日</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">車両が登録されていません</td>
                  </tr>
                )}
                {vehicles.map(v => {
                  const overdue = isInspectionOverdue(v.nextInspectionAt)
                  const warn = isInspectionWarning(v.nextInspectionAt)
                  const rowBg = overdue ? 'bg-red-50' : warn ? 'bg-orange-50' : ''
                  const dateCls = overdue ? 'text-red-600 font-medium' : warn ? 'text-orange-500 font-medium' : 'text-slate-600'
                  return (
                    <tr
                      key={v.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${rowBg}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{v.name}</td>
                      <td className="px-4 py-3 text-slate-600">{v.plateNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{v.vehicleType}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[v.status] || 'bg-slate-100 text-slate-600'}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.driver?.name || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{v.project ? `${v.project.projectNumber} ${v.project.name}` : '-'}</td>
                      <td className={`px-4 py-3 ${dateCls}`}>
                        <span className="flex items-center gap-1">
                          {warn && <AlertTriangle className="w-3 h-3" />}
                          {v.nextInspectionAt ? new Date(v.nextInspectionAt).toLocaleDateString('ja-JP') : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(v.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold">{editingVehicle ? '車両を編集' : '車両を追加'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">車両名 *</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ナンバー *</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.plateNumber}
                    onChange={e => setForm({ ...form, plateNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">種別 *</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.vehicleType}
                    onChange={e => setForm({ ...form, vehicleType: e.target.value })}
                  >
                    {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当者</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.assignedTo}
                    onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                  >
                    <option value="">-</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">現場</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.projectId}
                    onChange={e => setForm({ ...form, projectId: e.target.value })}
                  >
                    <option value="">-</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber} {p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">最終車検日</label>
                  <input
                    type="date"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.lastInspectedAt}
                    onChange={e => setForm({ ...form, lastInspectedAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">次回車検日</label>
                  <input
                    type="date"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.nextInspectionAt}
                    onChange={e => setForm({ ...form, nextInspectionAt: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">走行距離 (km)</label>
                  <input
                    type="number"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.mileage}
                    onChange={e => setForm({ ...form, mileage: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">燃料種別</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="例: ガソリン / 軽油"
                    value={form.fuelType}
                    onChange={e => setForm({ ...form, fuelType: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">備考</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
