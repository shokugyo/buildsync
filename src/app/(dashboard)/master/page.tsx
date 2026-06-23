'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, FileText, X, Upload, Building, Percent, Edit2, Package, Tag } from 'lucide-react'

interface MasterItem {
  id: string
  type: string
  value: string
  label: string
  sortOrder: number
}

interface InspectionTemplate {
  id: string
  name: string
  items: string[]
}

interface Department {
  id: string
  name: string
  createdAt: string
}

interface TaxRate {
  id: string
  name: string
  rate: number
  isDefault: boolean
  enabled: boolean
}

interface MaterialMasterItem {
  id: string
  code: string | null
  name: string
  unit: string
  unitPrice: number
  category: string | null
  enabled: boolean
  supplier: { id: string; name: string } | null
}

const MASTER_TYPES = [
  { key: 'workType', label: '工種マスタ', description: '案件の工事種別' },
  { key: 'projectStatus', label: '案件ステータスマスタ', description: '案件の進捗状態' },
  { key: 'scheduleStatus', label: '工程ステータスマスタ', description: '工程の進捗状態' },
  { key: 'supplierCategory', label: '協力会社区分マスタ', description: '発注先・協力会社の分類' },
  { key: 'costCategory', label: '原価科目マスタ', description: '原価管理の科目分類' },
  { key: 'drawingType', label: '図面種別マスタ', description: '図面の分類' },
  { key: 'documentCategory', label: '資料カテゴリマスタ', description: '資料の分類' },
  { key: 'inspectionType', label: '検査種別マスタ', description: '検査の種類' },
  { key: 'inspectionCheckItem', label: '検査項目マスタ', description: '検査チェックリストの標準項目' },
  { key: 'photoType', label: '写真種別マスタ', description: '工事写真の種類' },
  { key: 'taxRate', label: '税率マスタ', description: '消費税率の管理' },
]

const DEFAULT_VALUES: Record<string, string[]> = {
  workType: ['新築', '改修', 'リフォーム', '修繕', '解体', '設備工事', '内装工事', '外構工事'],
  projectStatus: ['引合', '見積中', '受注', '着工前', '施工中', '検査中', '完工', '失注', 'キャンセル'],
  scheduleStatus: ['未着手', '作業中', '完了', '遅延', '保留'],
  supplierCategory: ['総合建設業', '土工事', '躯体工事', '仕上工事', '設備工事', '電気工事', '外構工事', '専門工事', 'その他'],
  costCategory: ['材料費', '労務費', '外注費', '機械費', '経費', '共通費'],
  drawingType: ['平面図', '立面図', '断面図', '詳細図', '設備図', '構造図', 'その他'],
  documentCategory: ['契約書', '仕様書', '工程表', '見積書', '注文書', '請求書', '安全書類', '施工要領書', 'その他'],
  inspectionType: ['中間検査', '完了検査', '社内検査', '施主検査', '行政検査'],
  inspectionCheckItem: [
    '施工図面と現場の整合確認', '材料・資材の品質確認', '寸法・位置の確認',
    '施工精度の確認', '防水処理の確認', '安全設備の設置確認',
    '仕上げ状態の確認', '設備機器の動作確認', '清掃・片付けの完了確認',
  ],
  photoType: ['着工前', '施工中', '完成', '詳細', '問題箇所', 'その他'],
  taxRate: ['0%', '8%', '10%'],
}


interface CostCategoryItem {
  id: string
  name: string
  code: string | null
  sortOrder: number
  enabled: boolean
}

type ActiveTab = 'master' | 'templates' | 'import' | 'departments' | 'taxrates' | 'materialmaster' | 'costcategories'

export default function MasterPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<MasterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string>('workType')
  const [newValues, setNewValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('master')

  // Inspection template state
  const [templates, setTemplates] = useState<InspectionTemplate[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<InspectionTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateItemInput, setTemplateItemInput] = useState('')
  const [templateItems, setTemplateItems] = useState<string[]>([])
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)

  // Department state
  const [departments, setDepartments] = useState<Department[]>([])
  const [newDeptName, setNewDeptName] = useState('')
  const [deptSaving, setDeptSaving] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [editDeptName, setEditDeptName] = useState('')

  // Tax rate state
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [showTaxRateModal, setShowTaxRateModal] = useState(false)
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null)
  const [taxRateForm, setTaxRateForm] = useState({ name: '', rate: '', isDefault: false })
  const [taxRateSaving, setTaxRateSaving] = useState(false)

  // Cost category state
  const [costCategories, setCostCategories] = useState<CostCategoryItem[]>([])
  const [showCostCatModal, setShowCostCatModal] = useState(false)
  const [editingCostCat, setEditingCostCat] = useState<CostCategoryItem | null>(null)
  const [costCatForm, setCostCatForm] = useState({ name: '', code: '', sortOrder: '0' })
  const [costCatSaving, setCostCatSaving] = useState(false)

  // Material master state
  const [materialMasters, setMaterialMasters] = useState<MaterialMasterItem[]>([])
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<MaterialMasterItem | null>(null)
  const [materialForm, setMaterialForm] = useState({ code: '', name: '', unit: '', unitPrice: '', category: '', enabled: true })
  const [materialSaving, setMaterialSaving] = useState(false)
  const [materialSearch, setMaterialSearch] = useState('')
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState('')

  // CSV import state
  const [importEntity, setImportEntity] = useState<string>('customers')
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [importError, setImportError] = useState<string>('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) { setImportError('ファイルを選択してください'); return }
    setImporting(true)
    setImportError('')
    setImportResult(null)
    try {
      const text = await file.text()
      const res = await fetch(`/api/import?type=${importEntity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text,
      })
      const data = await res.json()
      if (!res.ok) { setImportError(data.error || 'インポートに失敗しました'); return }
      setImportResult(data)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setImportError('インポートに失敗しました')
    } finally {
      setImporting(false)
    }
  }

  const role = (session?.user as any)?.role

  const fetchItems = async () => {
    const res = await fetch('/api/master')
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const fetchTemplates = async () => {
    const res = await fetch('/api/inspection-templates')
    const data = await res.json()
    setTemplates(Array.isArray(data) ? data : [])
  }

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments')
    const data = await res.json()
    setDepartments(Array.isArray(data) ? data : [])
  }

  const fetchTaxRates = async () => {
    const res = await fetch('/api/tax-rates')
    const data = await res.json()
    setTaxRates(Array.isArray(data) ? data : [])
  }

  const fetchCostCategories = async () => {
    const res = await fetch('/api/cost-categories')
    const data = await res.json()
    setCostCategories(Array.isArray(data) ? data : [])
  }

  const fetchMaterialMasters = async (search = '', category = '') => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    const res = await fetch(`/api/material-master?${params}`)
    const data = await res.json()
    setMaterialMasters(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    fetchItems()
    fetchTemplates()
    fetchDepartments()
    fetchTaxRates()
    fetchMaterialMasters()
    fetchCostCategories()
  }, [])

  const getTypeItems = (type: string) => items.filter(i => i.type === type).sort((a, b) => a.sortOrder - b.sortOrder)

  const handleAdd = async (type: string) => {
    const val = newValues[type]?.trim()
    if (!val) return
    setSaving(type)
    const existing = getTypeItems(type)
    await fetch('/api/master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value: val, label: val, sortOrder: existing.length }),
    })
    setNewValues(v => ({ ...v, [type]: '' }))
    setSaving(null)
    fetchItems()
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`「${label}」を削除しますか？`)) return
    await fetch(`/api/master/${id}`, { method: 'DELETE' })
    fetchItems()
  }

  const handleInitialize = async (type: string) => {
    const defaults = DEFAULT_VALUES[type]
    if (!defaults || !confirm(`「${MASTER_TYPES.find(t => t.key === type)?.label}」をデフォルト値で初期化しますか？既存のデータは削除されます。`)) return
    setInitializing(true)
    const existing = getTypeItems(type)
    await Promise.all(existing.map(i => fetch(`/api/master/${i.id}`, { method: 'DELETE' })))
    await Promise.all(defaults.map((v, idx) =>
      fetch('/api/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value: v, label: v, sortOrder: idx }),
      })
    ))
    setInitializing(false)
    fetchItems()
  }

  // --- Template handlers ---

  const openNewTemplateModal = () => {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateItems([])
    setTemplateItemInput('')
    setShowTemplateModal(true)
  }

  const openEditTemplateModal = (tpl: InspectionTemplate) => {
    setEditingTemplate(tpl)
    setTemplateName(tpl.name)
    setTemplateItems([...tpl.items])
    setTemplateItemInput('')
    setShowTemplateModal(true)
  }

  const handleAddTemplateItem = () => {
    const val = templateItemInput.trim()
    if (!val) return
    setTemplateItems(prev => [...prev, val])
    setTemplateItemInput('')
  }

  const handleRemoveTemplateItem = (idx: number) => {
    setTemplateItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSaveTemplate = async () => {
    const name = templateName.trim()
    if (!name) return
    if (editingTemplate) {
      await fetch(`/api/inspection-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, items: templateItems }),
      })
    } else {
      await fetch('/api/inspection-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, items: templateItems }),
      })
    }
    await fetchTemplates()
    setShowTemplateModal(false)
  }

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`テンプレート「${name}」を削除しますか？`)) return
    await fetch(`/api/inspection-templates/${id}`, { method: 'DELETE' })
    await fetchTemplates()
    if (expandedTemplate === id) setExpandedTemplate(null)
  }

  // --- Department handlers ---

  const handleAddDepartment = async () => {
    const name = newDeptName.trim()
    if (!name) return
    setDeptSaving(true)
    const res = await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      setNewDeptName('')
      await fetchDepartments()
    } else {
      const data = await res.json()
      alert(data.error || '追加に失敗しました')
    }
    setDeptSaving(false)
  }

  const handleUpdateDepartment = async () => {
    if (!editingDept) return
    const name = editDeptName.trim()
    if (!name) return
    setDeptSaving(true)
    const res = await fetch(`/api/departments/${editingDept.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      setEditingDept(null)
      setEditDeptName('')
      await fetchDepartments()
    } else {
      const data = await res.json()
      alert(data.error || '更新に失敗しました')
    }
    setDeptSaving(false)
  }

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch(`/api/departments/${id}`, { method: 'DELETE' })
    await fetchDepartments()
  }

  const openNewTaxRateModal = () => {
    setEditingTaxRate(null)
    setTaxRateForm({ name: '', rate: '', isDefault: false })
    setShowTaxRateModal(true)
  }

  const openEditTaxRateModal = (tr: TaxRate) => {
    setEditingTaxRate(tr)
    setTaxRateForm({ name: tr.name, rate: String(tr.rate * 100), isDefault: tr.isDefault })
    setShowTaxRateModal(true)
  }

  const handleSaveTaxRate = async () => {
    const name = taxRateForm.name.trim()
    if (!name || !taxRateForm.rate) return
    setTaxRateSaving(true)
    const rateValue = parseFloat(taxRateForm.rate) / 100
    if (editingTaxRate) {
      await fetch(`/api/tax-rates/${editingTaxRate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rate: rateValue, isDefault: taxRateForm.isDefault }),
      })
    } else {
      await fetch('/api/tax-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rate: rateValue, isDefault: taxRateForm.isDefault }),
      })
    }
    setTaxRateSaving(false)
    setShowTaxRateModal(false)
    await fetchTaxRates()
  }

  const handleDeleteTaxRate = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch(`/api/tax-rates/${id}`, { method: 'DELETE' })
    await fetchTaxRates()
  }

  const openNewCostCatModal = () => {
    setEditingCostCat(null)
    setCostCatForm({ name: '', code: '', sortOrder: String(costCategories.length) })
    setShowCostCatModal(true)
  }

  const openEditCostCatModal = (c: CostCategoryItem) => {
    setEditingCostCat(c)
    setCostCatForm({ name: c.name, code: c.code || '', sortOrder: String(c.sortOrder) })
    setShowCostCatModal(true)
  }

  const handleSaveCostCat = async () => {
    const name = costCatForm.name.trim()
    if (!name) return
    setCostCatSaving(true)
    if (editingCostCat) {
      await fetch(`/api/cost-categories/${editingCostCat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code: costCatForm.code || null, sortOrder: parseInt(costCatForm.sortOrder) || 0 }),
      })
    } else {
      await fetch('/api/cost-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code: costCatForm.code || null, sortOrder: parseInt(costCatForm.sortOrder) || 0 }),
      })
    }
    setCostCatSaving(false)
    setShowCostCatModal(false)
    await fetchCostCategories()
  }

  const handleToggleCostCat = async (c: CostCategoryItem) => {
    await fetch(`/api/cost-categories/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !c.enabled }),
    })
    await fetchCostCategories()
  }

  const handleDeleteCostCat = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch(`/api/cost-categories/${id}`, { method: 'DELETE' })
    await fetchCostCategories()
  }

  const openNewMaterialModal = () => {
    setEditingMaterial(null)
    setMaterialForm({ code: '', name: '', unit: '', unitPrice: '', category: '', enabled: true })
    setShowMaterialModal(true)
  }

  const openEditMaterialModal = (m: MaterialMasterItem) => {
    setEditingMaterial(m)
    setMaterialForm({ code: m.code || '', name: m.name, unit: m.unit, unitPrice: String(m.unitPrice), category: m.category || '', enabled: m.enabled })
    setShowMaterialModal(true)
  }

  const handleSaveMaterial = async () => {
    if (!materialForm.name || !materialForm.unit || !materialForm.unitPrice) return
    setMaterialSaving(true)
    if (editingMaterial) {
      await fetch(`/api/material-master/${editingMaterial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialForm),
      })
    } else {
      await fetch('/api/material-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialForm),
      })
    }
    setMaterialSaving(false)
    setShowMaterialModal(false)
    fetchMaterialMasters(materialSearch, materialCategoryFilter)
  }

  const handleDeleteMaterial = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch(`/api/material-master/${id}`, { method: 'DELETE' })
    fetchMaterialMasters(materialSearch, materialCategoryFilter)
  }

  const materialCategories = Array.from(new Set(materialMasters.map(m => m.category).filter(Boolean) as string[]))

  if (role !== '管理者') {
    return (
      <div>
        <Header title="マスタ管理" />
        <div className="p-6 text-center text-slate-500">管理者のみアクセスできます</div>
      </div>
    )
  }

  return (
    <div>
      <Header title="マスタ管理" />
      <div className="p-6 max-w-3xl">
        <p className="text-sm text-slate-500 mb-4">各種マスタデータを管理します。設定値は案件・図面・資料・検査等の選択肢として使用されます。</p>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'master' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            マスタデータ
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'templates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText className="w-4 h-4" />
            検査テンプレート
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'import' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Upload className="w-4 h-4" />
            CSVインポート
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'departments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Building className="w-4 h-4" />
            部門
          </button>
          <button
            onClick={() => setActiveTab('taxrates')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'taxrates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Percent className="w-4 h-4" />
            税率マスタ
          </button>
          <button
            onClick={() => setActiveTab('materialmaster')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'materialmaster' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Package className="w-4 h-4" />
            材料単価
          </button>
          <button
            onClick={() => setActiveTab('costcategories')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'costcategories' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Tag className="w-4 h-4" />
            原価科目
          </button>
        </div>

        {/* Master data tab */}
        {activeTab === 'master' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-slate-500">読み込み中...</div>
            ) : (
              MASTER_TYPES.map(({ key, label, description }) => {
                const typeItems = getTypeItems(key)
                const isExpanded = expanded === key
                return (
                  <div key={key} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <button
                      onClick={() => setExpanded(isExpanded ? '' : key)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        <div className="text-left">
                          <p className="font-medium text-slate-900">{label}</p>
                          <p className="text-xs text-slate-500">{description} · {typeItems.length}件</p>
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleInitialize(key) }}
                        disabled={initializing}
                        className="text-xs text-slate-400 hover:text-blue-600 px-2 py-1 rounded border border-slate-200 hover:border-blue-300 transition-colors disabled:opacity-50"
                      >
                        デフォルトで初期化
                      </button>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 p-4 space-y-3">
                        {typeItems.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-2">データがありません。「デフォルトで初期化」か下のフォームから追加してください。</p>
                        ) : (
                          <div className="space-y-1">
                            {typeItems.map((item, idx) => (
                              <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 group">
                                <GripVertical className="w-4 h-4 text-slate-300" />
                                <span className="text-sm text-slate-400 w-6 text-right">{idx + 1}</span>
                                <span className="flex-1 text-sm text-slate-800">{item.label}</span>
                                <button
                                  onClick={() => handleDelete(item.id, item.label)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <input
                            type="text"
                            value={newValues[key] || ''}
                            onChange={e => setNewValues(v => ({ ...v, [key]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleAdd(key)}
                            placeholder="新しい項目を入力..."
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleAdd(key)}
                            disabled={saving === key || !newValues[key]?.trim()}
                            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                            追加
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* CSV import tab */}
        {activeTab === 'import' && (
          <div className="max-w-lg">
            <p className="text-sm text-slate-500 mb-6">顧客・協力会社・案件データをCSVファイルから一括インポートします。</p>
            <form onSubmit={handleImport} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">インポート対象</label>
                <select
                  value={importEntity}
                  onChange={(e) => { setImportEntity(e.target.value); setImportResult(null); setImportError('') }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="customers">顧客</option>
                  <option value="suppliers">協力会社</option>
                  <option value="projects">案件</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CSVファイル</label>
                {importEntity === 'customers' && (
                  <p className="text-xs text-slate-400 mb-2">列順: 顧客名, 顧客種別, 郵便番号, 住所, 電話番号, メールアドレス, 担当者</p>
                )}
                {importEntity === 'suppliers' && (
                  <p className="text-xs text-slate-400 mb-2">列順: 会社名, 住所, 電話番号, メールアドレス, 適格請求書番号, 担当者名</p>
                )}
                {importEntity === 'projects' && (
                  <p className="text-xs text-slate-400 mb-2">列順: 案件名, ステータス, 住所, 工事種別, 契約金額, 予定原価, 着工日, 完工予定日, 備考</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {importError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{importError}</p>
              )}

              {importResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
                  <p className="font-medium text-green-800">インポート完了</p>
                  <p className="text-green-700 mt-1">登録: {importResult.imported}件 / スキップ: {importResult.skipped}件</p>
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {importResult.errors.map((err, i) => (
                        <li key={i} className="text-red-600 text-xs">{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={importing}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'インポート中...' : 'インポート'}
              </button>
            </form>
          </div>
        )}

        {/* Inspection templates tab */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">検査チェックリストのテンプレートを管理します。</p>
              <button
                onClick={openNewTemplateModal}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                新規テンプレート
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">テンプレートがありません。</p>
                <p className="text-slate-400 text-xs mt-1">「新規テンプレート」から作成してください。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(tpl => {
                  const isExp = expandedTemplate === tpl.id
                  return (
                    <div key={tpl.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                      <button
                        onClick={() => setExpandedTemplate(isExp ? null : tpl.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExp ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          <div className="text-left">
                            <p className="font-medium text-slate-900">{tpl.name}</p>
                            <p className="text-xs text-slate-500">チェック項目 {tpl.items.length}件</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openEditTemplateModal(tpl)}
                            className="text-xs text-slate-400 hover:text-blue-600 px-2 py-1 rounded border border-slate-200 hover:border-blue-300 transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                            className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded border border-slate-200 hover:border-red-300 transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </button>

                      {isExp && (
                        <div className="border-t border-slate-100 p-4">
                          {tpl.items.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-2">チェック項目がありません。</p>
                          ) : (
                            <ul className="space-y-1">
                              {tpl.items.map((item, idx) => (
                                <li key={idx} className="flex items-center gap-3 py-1.5 px-3 text-sm text-slate-700">
                                  <span className="text-slate-400 w-5 text-right text-xs">{idx + 1}</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Departments tab */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">社内の部門を管理します。ユーザーの所属部門として使用されます。</p>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">部門一覧 <span className="text-sm font-normal text-slate-500">({departments.length}件)</span></h3>
              </div>

              {departments.length === 0 ? (
                <div className="p-8 text-center">
                  <Building className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">部門がありません。</p>
                  <p className="text-slate-400 text-xs mt-1">下のフォームから追加してください。</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {departments.map((dept) => (
                    <div key={dept.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-slate-50">
                      {editingDept?.id === dept.id ? (
                        <>
                          <input
                            type="text"
                            value={editDeptName}
                            onChange={(e) => setEditDeptName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateDepartment()
                              if (e.key === 'Escape') { setEditingDept(null); setEditDeptName('') }
                            }}
                            autoFocus
                            className="flex-1 border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleUpdateDepartment}
                            disabled={deptSaving || !editDeptName.trim()}
                            className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded border border-blue-300 hover:border-blue-400 transition-colors disabled:opacity-50"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => { setEditingDept(null); setEditDeptName('') }}
                            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded border border-slate-200 transition-colors"
                          >
                            キャンセル
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-slate-800">{dept.name}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingDept(dept); setEditDeptName(dept.name) }}
                              className="text-xs text-slate-400 hover:text-blue-600 px-2 py-1 rounded border border-slate-200 hover:border-blue-300 transition-colors"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                              className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded border border-slate-200 hover:border-red-300 transition-colors"
                            >
                              削除
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-100 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
                    placeholder="新しい部門名を入力..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddDepartment}
                    disabled={deptSaving || !newDeptName.trim()}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    追加
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tax rates tab */}
        {activeTab === 'taxrates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">消費税率を管理します。見積・請求・発注時の税率として使用されます。</p>
              <button
                onClick={openNewTaxRateModal}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                新規税率
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {taxRates.length === 0 ? (
                <div className="p-8 text-center">
                  <Percent className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">税率が登録されていません。</p>
                  <p className="text-slate-400 text-xs mt-1">「新規税率」から追加してください。</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">名称</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">税率</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">デフォルト</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {taxRates.map((tr) => (
                      <tr key={tr.id} className="hover:bg-slate-50 group">
                        <td className="px-5 py-3 font-medium text-slate-800">{tr.name}</td>
                        <td className="px-5 py-3 text-slate-700">{(tr.rate * 100).toFixed(0)}%</td>
                        <td className="px-5 py-3">
                          {tr.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              デフォルト
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button
                              onClick={() => openEditTaxRateModal(tr)}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                              title="編集"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTaxRate(tr.id, tr.name)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'materialmaster' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">材料の標準単価を管理します。見積・原価管理で活用できます。</p>
              <button
                onClick={openNewMaterialModal}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                材料を追加
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={materialSearch}
                onChange={(e) => { setMaterialSearch(e.target.value); fetchMaterialMasters(e.target.value, materialCategoryFilter) }}
                placeholder="材料名・コードで検索..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={materialCategoryFilter}
                onChange={(e) => { setMaterialCategoryFilter(e.target.value); fetchMaterialMasters(materialSearch, e.target.value) }}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全カテゴリ</option>
                {materialCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {materialMasters.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">材料単価マスタがありません。</p>
                  <p className="text-slate-400 text-xs mt-1">「材料を追加」から登録してください。</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">コード</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">材料名</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">単位</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">標準単価</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">カテゴリ</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">有効</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materialMasters.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 group">
                        <td className="px-4 py-3 text-slate-500 text-xs">{m.code || '-'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                        <td className="px-4 py-3 text-slate-600">{m.unit}</td>
                        <td className="px-4 py-3 text-slate-800 text-right">¥{m.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-600">{m.category || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {m.enabled ? '有効' : '無効'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button onClick={() => openEditMaterialModal(m)} className="text-slate-400 hover:text-blue-600 transition-colors" title="編集">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteMaterial(m.id, m.name)} className="text-slate-400 hover:text-red-500 transition-colors" title="削除">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'costcategories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">原価管理で使用する科目を管理します。</p>
              <button
                onClick={openNewCostCatModal}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                新規科目
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {costCategories.length === 0 ? (
                <div className="p-8 text-center">
                  <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">原価科目が登録されていません。</p>
                  <p className="text-slate-400 text-xs mt-1">「新規科目」から追加してください。</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">コード</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">科目名</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">並び順</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">有効/無効</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {costCategories.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 group">
                        <td className="px-5 py-3 text-slate-500">{c.code || '—'}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                        <td className="px-5 py-3 text-slate-700">{c.sortOrder}</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => handleToggleCostCat(c)}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {c.enabled ? '有効' : '無効'}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button
                              onClick={() => openEditCostCatModal(c)}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                              title="編集"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCostCat(c.id, c.name)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cost category create/edit modal */}
      {showCostCatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingCostCat ? '原価科目を編集' : '新規原価科目を追加'}
              </h2>
              <button onClick={() => setShowCostCatModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">科目名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={costCatForm.name}
                  onChange={(e) => setCostCatForm({ ...costCatForm, name: e.target.value })}
                  placeholder="例：材料費"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">コード</label>
                <input
                  type="text"
                  value={costCatForm.code}
                  onChange={(e) => setCostCatForm({ ...costCatForm, code: e.target.value })}
                  placeholder="例：MAT"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">並び順</label>
                <input
                  type="number"
                  value={costCatForm.sortOrder}
                  onChange={(e) => setCostCatForm({ ...costCatForm, sortOrder: e.target.value })}
                  min="0"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowCostCatModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveCostCat}
                disabled={costCatSaving || !costCatForm.name.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {costCatSaving ? '保存中...' : (editingCostCat ? '更新' : '追加')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material master modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingMaterial ? '材料を編集' : '材料を追加'}
              </h2>
              <button onClick={() => setShowMaterialModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">コード</label>
                  <input
                    type="text"
                    value={materialForm.code}
                    onChange={(e) => setMaterialForm({ ...materialForm, code: e.target.value })}
                    placeholder="例：M-001"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ</label>
                  <input
                    type="text"
                    value={materialForm.category}
                    onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })}
                    placeholder="例：木材"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">材料名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={materialForm.name}
                  onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                  placeholder="例：構造用合板 12mm"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">単位 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={materialForm.unit}
                    onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                    placeholder="例：枚"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">標準単価 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={materialForm.unitPrice}
                    onChange={(e) => setMaterialForm({ ...materialForm, unitPrice: e.target.value })}
                    placeholder="0"
                    min="0"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={materialForm.enabled}
                  onChange={(e) => setMaterialForm({ ...materialForm, enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">有効</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button onClick={() => setShowMaterialModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                キャンセル
              </button>
              <button
                onClick={handleSaveMaterial}
                disabled={materialSaving || !materialForm.name.trim() || !materialForm.unit.trim() || !materialForm.unitPrice}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {materialSaving ? '保存中...' : (editingMaterial ? '更新' : '追加')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax rate create/edit modal */}
      {showTaxRateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingTaxRate ? '税率を編集' : '新規税率を追加'}
              </h2>
              <button onClick={() => setShowTaxRateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={taxRateForm.name}
                  onChange={(e) => setTaxRateForm({ ...taxRateForm, name: e.target.value })}
                  placeholder="例：標準税率"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">税率（%） <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={taxRateForm.rate}
                  onChange={(e) => setTaxRateForm({ ...taxRateForm, rate: e.target.value })}
                  placeholder="例：10"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxRateForm.isDefault}
                  onChange={(e) => setTaxRateForm({ ...taxRateForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">デフォルト税率に設定する</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowTaxRateModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveTaxRate}
                disabled={taxRateSaving || !taxRateForm.name.trim() || !taxRateForm.rate}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {taxRateSaving ? '保存中...' : (editingTaxRate ? '更新' : '追加')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template create/edit modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingTemplate ? 'テンプレートを編集' : '新規テンプレートを作成'}
              </h2>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">テンプレート名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="例：中間検査チェックリスト"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">チェック項目</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={templateItemInput}
                    onChange={e => setTemplateItemInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTemplateItem()}
                    placeholder="チェック項目を入力してEnter"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddTemplateItem}
                    disabled={!templateItemInput.trim()}
                    className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    追加
                  </button>
                </div>

                {templateItems.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">チェック項目を追加してください。</p>
                ) : (
                  <ul className="space-y-1 max-h-56 overflow-y-auto">
                    {templateItems.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-slate-50 group">
                        <span className="text-slate-400 text-xs w-4 text-right">{idx + 1}</span>
                        <span className="flex-1 text-sm text-slate-800">{item}</span>
                        <button
                          onClick={() => handleRemoveTemplateItem(idx)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {editingTemplate ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
