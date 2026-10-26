import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts'
import { Download } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Card, SkeletonCard, ErrorState } from '../../components/ui'
import {
  getAgeing,
  getTrends,
  getInstitutionBreakdown,
  getCoordinationBacklog,
} from '../../api/analytics'
import { exportCasesCSV, exportCoordinationCSV } from '../../api/reports'
import { toast } from '../../hooks/useToast'

const PIE_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981']

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const ageingQ = useQuery({ queryKey: ['analytics', 'ageing'], queryFn: getAgeing })
  const trendsQ = useQuery({ queryKey: ['analytics', 'trends'], queryFn: getTrends })
  const breakdownQ = useQuery({
    queryKey: ['analytics', 'institution-breakdown'],
    queryFn: getInstitutionBreakdown,
  })
  const backlogQ = useQuery({
    queryKey: ['analytics', 'coordination-backlog'],
    queryFn: getCoordinationBacklog,
  })

  const [exporting, setExporting] = useState<'cases' | 'coord' | null>(null)

  async function doExportCases() {
    try {
      setExporting('cases')
      await downloadBlob(await exportCasesCSV(), 'cases.csv')
      toast.success('Exported cases.csv')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(null)
    }
  }

  async function doExportCoord() {
    try {
      setExporting('coord')
      await downloadBlob(await exportCoordinationCSV(), 'coordination.csv')
      toast.success('Exported coordination.csv')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(null)
    }
  }

  const breakdownData = (breakdownQ.data ?? [])
    .slice()
    .sort((a, b) => b.case_count - a.case_count)
    .slice(0, 10)

  return (
    <>
      <PageHeader title="Reports" />
      <DataNote message="All figures from live DB queries. Synthetic demo data only." />

      {/* Section 1 — Case Analytics */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Case Ageing">
          {ageingQ.isLoading ? (
            <SkeletonCard />
          ) : ageingQ.isError ? (
            <ErrorState message="Failed to load ageing data" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={(ageingQ.data ?? []).map((b) => ({
                    name: b.range,
                    value: b.count,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {(ageingQ.data ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Case Trends (monthly)">
          {trendsQ.isLoading ? (
            <SkeletonCard />
          ) : trendsQ.isError ? (
            <ErrorState message="Failed to load trends data" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsQ.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="received" stroke="#6366f1" />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Section 2 — Institution Breakdown */}
      <div className="mt-4">
        <Card title="Institution Breakdown (top 10)">
          {breakdownQ.isLoading ? (
            <SkeletonCard />
          ) : breakdownQ.isError ? (
            <ErrorState message="Failed to load institution breakdown" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={breakdownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="institution_name"
                  tickFormatter={(v: string | number) => {
                    const s = String(v)
                    return s.length > 15 ? s.slice(0, 15) + '…' : s
                  }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="case_count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Section 3 — Coordination Backlog */}
      <div className="mt-4">
        <Card title="Coordination Backlog by Status">
          {backlogQ.isLoading ? (
            <SkeletonCard />
          ) : backlogQ.isError ? (
            <ErrorState message="Failed to load coordination backlog" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={backlogQ.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Section 4 — Export */}
      <div className="mt-4">
        <Card title="Export">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={doExportCases} loading={exporting === 'cases'}>
              <Download className="h-4 w-4" />
              Export Cases CSV
            </Button>
            <Button variant="secondary" onClick={doExportCoord} loading={exporting === 'coord'}>
              Export Coordination CSV
            </Button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Exports are logged in the audit trail.
          </p>
        </Card>
      </div>
    </>
  )
}
