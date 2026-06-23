import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { isRestrictedFromCost } from '@/lib/permissions'
import CostsPrintButton from './CostsPrintButton'

export default async function CostsPrintPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  if (isRestrictedFromCost(session)) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>原価情報の閲覧権限がありません</p>
      </div>
    )
  }

  const budgets = await prisma.budget.findMany({
    where: { project: { companyId: (session.user as any).companyId } },
    include: {
      project: { select: { id: true, name: true, projectNumber: true, contractAmount: true } },
    },
    orderBy: { project: { projectNumber: 'asc' } },
  })

  const company = await prisma.company.findUnique({
    where: { id: (session.user as any).companyId },
  })

  // Aggregate by project for gross margin table
  const projectMap = new Map<
    string,
    {
      projectNumber: string
      projectName: string
      contractAmount: number
      budgetAmount: number
    }
  >()

  for (const b of budgets) {
    const pid = b.project.id
    if (!projectMap.has(pid)) {
      projectMap.set(pid, {
        projectNumber: b.project.projectNumber,
        projectName: b.project.name,
        contractAmount: b.project.contractAmount ?? 0,
        budgetAmount: 0,
      })
    }
    const row = projectMap.get(pid)!
    row.budgetAmount += b.amount
  }

  // Fetch actual ordered amounts per project
  const projectIds = Array.from(projectMap.keys())
  const ordersGrouped = projectIds.length > 0
    ? await prisma.order.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds } },
        _sum: { totalAmount: true },
      })
    : []
  const orderedByProject = new Map(ordersGrouped.map(o => [o.projectId, o._sum.totalAmount || 0]))

  const rows = Array.from(projectMap.values()).map(r => {
    const pid = Array.from(projectMap.entries()).find(([, v]) => v === r)?.[0] || ''
    return { ...r, orderedAmount: orderedByProject.get(pid) || 0 }
  })

  const totals = rows.reduce(
    (acc, r) => {
      acc.contractAmount += r.contractAmount
      acc.budgetAmount += r.budgetAmount
      acc.orderedAmount += r.orderedAmount
      return acc
    },
    { contractAmount: 0, budgetAmount: 0, orderedAmount: 0 }
  )

  const totalGrossMargin = totals.contractAmount - totals.orderedAmount
  const totalGrossMarginRate =
    totals.contractAmount > 0 ? (totalGrossMargin / totals.contractAmount) * 100 : 0

  const printDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="bg-white min-h-screen p-10 max-w-5xl mx-auto font-sans print:p-0">
      <style>{'@media print { @page { margin: 1cm } body { margin: 0; } .no-print { display: none !important; } }'}</style>

      <div className="no-print mb-6 flex gap-3">
        <CostsPrintButton />
        <a
          href="/costs"
          className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          一覧へ戻る
        </a>
      </div>

      <div className="border border-slate-200 p-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-slate-900">粗　利　管　理　表</h1>
            <p className="text-sm text-slate-500 mt-1">案件別粗利サマリー</p>
          </div>
          <div className="text-right text-sm space-y-0.5">
            <p className="font-bold text-base">{company?.name || ''}</p>
            {company?.address && <p className="text-slate-500">{company.address}</p>}
            {company?.phone && <p className="text-slate-500">TEL: {company.phone}</p>}
            <p className="text-slate-400 text-xs mt-2">出力日: {printDate}</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-8 text-sm">
          <div className="border border-slate-200 rounded p-3 text-center">
            <p className="text-slate-500 text-xs mb-1">総売上（契約額）</p>
            <p className="font-bold text-slate-900">{formatCurrency(totals.contractAmount)}</p>
          </div>
          <div className="border border-slate-200 rounded p-3 text-center">
            <p className="text-slate-500 text-xs mb-1">総発注額</p>
            <p className="font-bold text-blue-600">{formatCurrency(totals.orderedAmount)}</p>
          </div>
          <div className="border border-slate-200 rounded p-3 text-center">
            <p className="text-slate-500 text-xs mb-1">粗利合計</p>
            <p className={`font-bold ${totalGrossMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(totalGrossMargin)}
            </p>
          </div>
          <div className="border border-slate-200 rounded p-3 text-center">
            <p className="text-slate-500 text-xs mb-1">平均粗利率</p>
            <p className={`font-bold ${totalGrossMarginRate < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {totalGrossMarginRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-3 py-2 text-left font-medium text-slate-700">案件番号</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-medium text-slate-700">案件名</th>
              <th className="border border-slate-300 px-3 py-2 text-right font-medium text-slate-700">予算額</th>
              <th className="border border-slate-300 px-3 py-2 text-right font-medium text-slate-700">発注額</th>
              <th className="border border-slate-300 px-3 py-2 text-right font-medium text-slate-700">粗利</th>
              <th className="border border-slate-300 px-3 py-2 text-right font-medium text-slate-700">粗利率</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-slate-300 px-3 py-6 text-center text-slate-400">
                  データがありません
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const grossMargin = row.contractAmount - row.orderedAmount
                const grossMarginRate =
                  row.contractAmount > 0 ? (grossMargin / row.contractAmount) * 100 : 0
                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 px-3 py-2 font-mono text-xs text-slate-500">
                      {row.projectNumber}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">
                      {row.projectName}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-right text-slate-900">
                      {formatCurrency(row.budgetAmount)}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-right text-slate-900">
                      {formatCurrency(row.orderedAmount)}
                    </td>
                    <td
                      className={`border border-slate-300 px-3 py-2 text-right font-medium ${
                        grossMargin < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(grossMargin)}
                    </td>
                    <td
                      className={`border border-slate-300 px-3 py-2 text-right font-medium ${
                        grossMarginRate < 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {row.contractAmount > 0 ? `${grossMarginRate.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-bold">
              <td className="border border-slate-700 px-3 py-3" colSpan={2}>
                合計
              </td>
              <td className="border border-slate-700 px-3 py-3 text-right">
                {formatCurrency(totals.budgetAmount)}
              </td>
              <td className="border border-slate-700 px-3 py-3 text-right">
                {formatCurrency(totals.orderedAmount)}
              </td>
              <td
                className={`border border-slate-700 px-3 py-3 text-right ${
                  totalGrossMargin < 0 ? 'text-red-300' : 'text-green-300'
                }`}
              >
                {formatCurrency(totalGrossMargin)}
              </td>
              <td
                className={`border border-slate-700 px-3 py-3 text-right ${
                  totalGrossMarginRate < 0 ? 'text-red-300' : 'text-emerald-300'
                }`}
              >
                {totals.contractAmount > 0 ? `${totalGrossMarginRate.toFixed(1)}%` : '-'}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          {company?.name}
        </div>
      </div>
    </div>
  )
}
