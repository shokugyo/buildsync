'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { PROJECT_STATUSES, WORK_TYPES } from '@/lib/utils'

interface Customer {
  id: string
  name: string
}

interface User {
  id: string
  name: string
}

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [form, setForm] = useState({
    name: '',
    status: '引合',
    customerId: '',
    address: '',
    workType: '',
    managerId: '',
    salesId: '',
    contractAmount: '',
    estimatedCost: '',
    startDate: '',
    endDate: '',
    deliveryDate: '',
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ]).then(([c, u]) => {
      setCustomers(Array.isArray(c) ? c : [])
      setUsers(Array.isArray(u) ? u : [])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const project = await res.json()
        router.push(`/projects/${project.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  return (
    <div>
      <Header title="新規案件登録" />
      <div className="p-6">
        <div className="mb-6">
          <Link href="/projects" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> 案件一覧に戻る
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="max-w-3xl">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
            <h2 className="font-semibold text-slate-900 pb-3 border-b border-slate-100">基本情報</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  案件名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="例: 新宿オフィスビル改修工事"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">状態</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">工種</label>
                <select
                  name="workType"
                  value={form.workType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">選択してください</option>
                  {WORK_TYPES.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">顧客</label>
                <select
                  name="customerId"
                  value={form.customerId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">選択してください</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">担当者</label>
                <select
                  name="managerId"
                  value={form.managerId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">選択してください</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">現場住所</label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="例: 東京都新宿区西新宿2-8-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">契約金額（円）</label>
                <input
                  type="number"
                  name="contractAmount"
                  value={form.contractAmount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">予算原価（円）</label>
                <input
                  type="number"
                  name="estimatedCost"
                  value={form.estimatedCost}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">着工日</label>
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">竣工日</label>
                <input
                  type="date"
                  name="deliveryDate"
                  value={form.deliveryDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">備考</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="特記事項など"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {loading ? '登録中...' : '登録する'}
              </button>
              <Link
                href="/projects"
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                キャンセル
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
