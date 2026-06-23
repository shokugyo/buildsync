import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy/MM/dd')
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy/MM/dd HH:mm')
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '-'
  return `¥${amount.toLocaleString('ja-JP')}`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    '施工中': 'bg-blue-100 text-blue-800',
    '完工': 'bg-green-100 text-green-800',
    '検査中': 'bg-yellow-100 text-yellow-800',
    '是正中': 'bg-orange-100 text-orange-800',
    '着工前': 'bg-gray-100 text-gray-800',
    '商談中': 'bg-purple-100 text-purple-800',
    '引合': 'bg-gray-100 text-gray-600',
    '完了': 'bg-green-100 text-green-800',
    '進行中': 'bg-blue-100 text-blue-800',
    '作業中': 'bg-blue-100 text-blue-800',
    '未着手': 'bg-gray-100 text-gray-600',
    '遅延': 'bg-red-100 text-red-800',
    '延期': 'bg-orange-100 text-orange-800',
    '中止': 'bg-red-100 text-red-800',
    '要確認': 'bg-yellow-100 text-yellow-800',
    '合格': 'bg-green-100 text-green-800',
    '不合格': 'bg-red-100 text-red-800',
    '未実施': 'bg-gray-100 text-gray-600',
    '実施済': 'bg-blue-100 text-blue-800',
    '対応済': 'bg-green-100 text-green-800',
    '対応中': 'bg-yellow-100 text-yellow-800',
    '未対応': 'bg-red-100 text-red-800',
    '発注済': 'bg-blue-100 text-blue-800',
    '納品済': 'bg-green-100 text-green-800',
    '下書き': 'bg-gray-100 text-gray-600',
    'キャンセル': 'bg-red-100 text-red-800',
    '請求済': 'bg-blue-100 text-blue-800',
    '入金済': 'bg-green-100 text-green-800',
    '未作成': 'bg-gray-100 text-gray-600',
    '期限超過': 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-600'
}

export const PROJECT_STATUSES = ['引合', '商談中', '着工前', '施工中', '検査中', '是正中', '完工']
export const WORK_TYPES = ['新築工事', '改修工事', 'リノベーション', '内装工事', '外装工事', '塗装工事', '設備工事', '解体工事', 'その他']
