import { Shield, CheckCircle, XCircle } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui'

const DEMO_CREDENTIALS = [
  { role: 'System Admin', email: 'admin@aicte.demo', password: 'Admin@123456' },
  { role: 'Bureau Officer', email: 'officer1@aicte.demo', password: 'Demo@123456' },
  { role: 'Coord. Reviewer', email: 'reviewer@aicte.demo', password: 'Demo@123456' },
  { role: 'Senior Management', email: 'management@aicte.demo', password: 'Demo@123456' },
  { role: 'Data Admin', email: 'datamgr@aicte.demo', password: 'Demo@123456' },
  { role: 'Regional Officer', email: 'regional@aicte.demo', password: 'Demo@123456' },
]

const USER_ROLES = [
  {
    role: 'System Admin',
    description: 'Full system access',
    actions: 'Manage users, view audit log, all features',
  },
  {
    role: 'Senior Management',
    description: 'Oversight and reporting',
    actions: 'View reports, audit log, coordination',
  },
  {
    role: 'Bureau Officer',
    description: 'Case handling',
    actions: 'Assign and update cases, coordination',
  },
  {
    role: 'Regional Officer',
    description: 'Regional case handling',
    actions: 'Handle regional cases',
  },
  {
    role: 'Data Admin',
    description: 'Data management',
    actions: 'Imports, institution data',
  },
  {
    role: 'Coordination Reviewer',
    description: 'CCP workflow',
    actions: 'Record decisions, close coordination items',
  },
]

const IMPLEMENTED = [
  'Dashboard with statistics overview',
  'Institutions — search, filter, view linked cases',
  'Cases — full lifecycle: status changes, assignments, notes',
  'Coordination (CCP) — tasks, acknowledge, decisions, close',
  'Notifications — per-notification and bulk mark-read',
  'Reports — case ageing, trends, institution breakdown, backlog charts + CSV export',
  'Imports — institution and case CSV preview/commit workflow',
  'User Management — pending approvals, approve/reject/suspend',
  'Audit Log — filterable, paginated',
  'Profile — view and edit own profile',
]

const LIMITATIONS = [
  'All data is synthetic demo data — not official AICTE records',
  'No real auth persistence beyond JWT token in localStorage',
  'Password change must be done via system administrator',
  'No email notifications sent — prototype only',
  'Built exclusively for SIH Grand Finale demonstration',
]

const WALKTHROUGH_STEPS = [
  'Login as admin (admin@aicte.demo / Admin@123456) → view Dashboard overview',
  'Navigate to Institutions → search for an institution → view linked cases',
  'Open a case → change status → add a note or action',
  'Go to Relationships → review a pending relationship candidate',
  'Go to Coordination → open an active CCP item → acknowledge → add a follow-up task',
  'Show an overdue coordination item and its timeline',
  'Go to Reports → view the case ageing chart → export cases CSV',
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader title="Help & Information" />

        {/* Amber warning */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>DEMO PROTOTYPE</strong> — All data is synthetic demo data. Not official AICTE records.
            Built for SIH Grand Finale demonstration only.
          </p>
        </div>

        {/* Demo Credentials */}
        <Card title="Demo Credentials">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DEMO_CREDENTIALS.map(c => (
                  <tr key={c.email}>
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{c.role}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">{c.email}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* User Roles */}
        <Card title="User Roles">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Key Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {USER_ROLES.map(r => (
                  <tr key={r.role}>
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{r.role}</td>
                    <td className="px-4 py-2">{r.description}</td>
                    <td className="px-4 py-2 text-gray-600">{r.actions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* What's Implemented */}
        <Card title="What's Implemented">
          <ul className="space-y-2">
            {IMPLEMENTED.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Limitations */}
        <Card title="Limitations">
          <ul className="space-y-2">
            {LIMITATIONS.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* SIH Demo Walkthrough */}
        <Card title="SIH Demo Walkthrough (5-7 min)">
          <ol className="space-y-3 list-decimal list-inside">
            {WALKTHROUGH_STEPS.map((step, i) => (
              <li key={i} className="text-sm text-gray-700 leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  )
}
