# Implementation Plan — AICTE C³ Frontend: 9 Stub Pages

Project root: `d:\SIH NEW PROJECT\frontend` (repo root: `d:\SIH NEW PROJECT`).
Stack: React 18 + TypeScript 5.7 + Vite 6, `@tanstack/react-query` v5 (object-form API), `react-hook-form` v7 + `zod` v3 (`zodResolver` from `@hookform/resolvers/zod`), `recharts` v2, `date-fns` v4, `lucide-react`, `clsx` + `tailwind-merge`, Tailwind 3.

Build command: `cd "d:\SIH NEW PROJECT\frontend" && npm run build` → runs `tsc -b && vite build`. `tsc` is `strict: true`, `noUnusedLocals: false`, `noUnusedParameters: false` (unused vars do NOT fail the build; null-safety DOES). Path alias `@/* → ./src/*` exists in tsconfig but the whole codebase uses **relative imports** — keep using relative imports.

> IMPORTANT — VERBATIM signatures below are the source of truth. Several shapes assumed in the task brief are WRONG; the corrections are flagged inline. Always trust the verbatim signature, not the task brief.

---

## 0. Deviations from the task brief (READ FIRST — these prevent build/runtime failures)

1. **Coordination statuses do NOT include `detected`/`under_review`/`acknowledged`/`follow_up`/`dismissed`.** The real `CoordinationStatus` enum is: `draft`, `pending_acknowledgement`, `active`, `overdue`, `resolved`, `closed`. Action-bar gating must use these. Mapping used below:
   - "Record Decision" gate → `status === 'draft' || status === 'pending_acknowledgement'`.
   - "Add Task" gate → `status === 'active' || status === 'overdue'`.
   - "Close Coordination" gate → `status !== 'closed'` (and `status !== 'resolved'` is optional; closing a resolved item is allowed, so gate on `!== 'closed'`).
   Compare against `CoordinationStatus` enum members imported from `../../types` (e.g. `item.status === CoordinationStatus.draft`). Do NOT use the brief's literal status strings.

2. **Account status is `pending_approval`, NOT `pending`.** `AccountStatus` enum: `pending_approval`, `active`, `suspended`, `rejected`. Pending-approvals filter: `u.account_status === AccountStatus.pending_approval`.

3. **`CoordinationParticipant` has `bureau?: Bureau` and `user?: User` — there is NO `user_id` field.** "Current user matches an unacknowledged participant" → `participant.user?.id === user?.id && !participant.acknowledged`. Name display → `participant.bureau?.name ?? participant.user?.full_name ?? '—'`.

4. **`CoordinationTask` has `assigned_to?: User` (NOT `assigned_to_id`), `is_completed`, `due_date?`.** Assignee → `task.assigned_to?.full_name ?? 'Unassigned'`. "Complete" button shows when `!task.is_completed`.

5. **`completeTask` EXISTS and matches — use it directly.** Signature: `completeTask(coordId: number, taskId: number, data: { completion_notes?: string }): Promise<CoordinationItem>` → `POST /coordination/${coordId}/tasks/${taskId}/complete`. The brief's "PUT via apiClient.put" fallback is NOT needed; the imported function is correct. Call `completeTask(Number(id), task.id, { completion_notes: 'Completed' })`.

6. **`closeCoordination(id, data: ClosurePayload)` where `ClosurePayload = { closure_notes: string; is_exception?: boolean }` — it has NO `exception_reason` field.** To still send `exception_reason` to the backend when `is_exception` is true, build the object and cast `as ClosurePayload` (the `as` bypasses TS excess-property checks; the runtime object keeps the field). Example: `closeCoordination(Number(id), { closure_notes, is_exception, ...(is_exception ? { exception_reason } : {}) } as ClosurePayload)`.

7. **ReportsPage analytics shapes are arrays, NOT the wrapped objects the brief describes.** Use the typed functions from `../../api/analytics`:
   - `getAgeing()` → `AgeingBucket[]` = `{ range: string; count: number }[]`. (NOT `{ageing_buckets, generated_at}`.) Pie data = `data.map(b => ({ name: b.range, value: b.count }))`.
   - `getTrends()` → `TrendPoint[]` = `{ date: string; received: number; resolved: number }[]`. (NOT `{monthly_trends, generated_at}`.) LineChart X=`date`, two lines: `received` + `resolved`.
   - `getInstitutionBreakdown()` → `InstitutionBreakdownItem[]` = `{ institution_id; institution_name; case_count; overdue_count }[]`. (NOT `{breakdown:[{name,...}], generated_at}`.) BarChart: sort desc by `case_count`, `.slice(0,10)`, X=`institution_name` (truncate 15), Y=`case_count`.
   - `getCoordinationBacklog()` → `CoordinationBacklogItem[]` = `{ status: string; count: number; oldest_days: number }[]`. (NOT `apiClient.get('/analytics/coordination/backlog')` returning `{by_status, generated_at}`.) BarChart: X=`status`, Y=`count`. **Use the typed `getCoordinationBacklog()` function — do NOT call apiClient.get directly.**
   - None of these four return `generated_at`, so do NOT render a timestamp under those charts (the brief's "show generated_at below each chart" does not apply to these endpoints).

8. **`listImports()` returns `ImportJob[]` directly (NOT paginated) and `ImportJob` has NO `filename` field.** History columns → use `job_type` (as the type/label), `status`, `total_rows`, `processed_rows` (as "valid"), `error_rows`, `created_at`. `ImportPreviewResult` has `errors: Array<{ row: number; message: string }>` and `preview: Record<string,unknown>[]` — there is NO `preview_rows` with per-row Status/Warnings. Show the summary counts and render the `errors` array as the error table (Row #, Message); the per-row status/warnings columns in the brief do not exist.

9. **`AuditEvent.detail` is `Record<string, unknown>` (an object), NOT a string.** "Description" column → `event.detail ? JSON.stringify(event.detail) : '—'` (or extract a known field). Rendering `event.detail` directly prints `[object Object]`.

10. **`useAuth` is exported from `../../contexts/AuthContext`** (there is no `hooks/useAuth`). `user: User | null`; `hasRole(roles: string[]): boolean` checks `roles.includes(user.role)`.

11. **All "already-built" pages in the brief (Dashboard, CoordinationList, Cases, Institutions, Auth) are also empty stubs.** There are NO in-repo page patterns to copy — follow the UI component prop types and the patterns in this plan. The infrastructure (App.tsx routing for all 20 routes, 13 api clients, AuthContext, useToast, 21 UI components, types) is real and complete.

---

## 1. Exact Signatures (VERBATIM from source)

### 1.1 UI components — `src/components/ui/index.ts` (all exports)
```
export { Button } from './Button'                      // type ButtonVariant='primary'|'secondary'|'danger'|'ghost'; type ButtonSize='sm'|'md'|'lg'
export type { ButtonVariant, ButtonSize } from './Button'
export { Input } from './Input'                        // extends InputHTMLAttributes; +label?,error?,required?
export { Select } from './Select'                      // type SelectOption={value:string;label:string}; extends SelectHTMLAttributes; +label?,error?,required?,options: SelectOption[]
export type { SelectOption } from './Select'
export { Textarea } from './Textarea'                   // extends TextareaHTMLAttributes; +label?,error?,required?,rows?(=4)
export { Badge } from './Badge'
export type { BadgeColor, BadgeSize } from './Badge'
export { Card } from './Card'                          // {title?,action?,children,className?}
export { Modal } from './Modal'                        // type ModalSize='sm'|'md'|'lg'|'xl'; {isOpen,onClose,title,children,size?}
export type { ModalSize } from './Modal'
export { Table } from './Table'                        // type SortDir='asc'|'desc'; interface TableColumn{key:string;header:string;sortable?:boolean;render?:(value:unknown,row:Record<string,unknown>)=>React.ReactNode}; {columns,data:Record<string,unknown>[],onSort?,sortKey?,sortDir?,emptyMessage?}
export type { TableColumn, SortDir } from './Table'
export { Pagination } from './Pagination'              // {total,skip,limit,onPageChange:(newSkip:number)=>void}
export { SearchBar } from './SearchBar'
export { SkeletonLine, SkeletonCard, TableSkeleton } from './LoadingSkeleton'  // SkeletonCard(): no props; TableSkeleton({rows?=5,cols?=4})
export { EmptyState } from './EmptyState'             // {icon?:LucideIcon,title,description?,action?:{label,onClick}}
export { ErrorState } from './ErrorState'             // {message?,onRetry?:()=>void}
export { StatusBadge } from './StatusBadge'           // {status:string} — maps CASE statuses only (coordination/account statuses fall back to 'gray')
export { PriorityBadge } from './PriorityBadge'        // {priority:string} — maps low/medium/high/urgent/critical
export { ConfirmDialog } from './ConfirmDialog'
export { DataNote } from './DataNote'                  // {message?:string} default 'DEMO DATA — ...'
export { Tooltip } from './Tooltip'
export { Tabs } from './Tabs'                          // see 1.2
export type { TabItem } from './Tabs'
export { Timeline } from './Timeline'                  // see 1.3
export type { TimelineEvent } from './Timeline'
```

### 1.2 Tabs — `src/components/ui/Tabs.tsx`
```
export interface TabItem { id: string; label: string; count?: number }
interface TabsProps { tabs: TabItem[]; activeTab: string; onTabChange: (id: string) => void }
export function Tabs({ tabs, activeTab, onTabChange }: TabsProps)
```
Usage: `<Tabs tabs={[{id:'institutions',label:'Institutions'},{id:'cases',label:'Cases'}]} activeTab={tab} onTabChange={setTab} />`. `count` is optional and renders a pill.

### 1.3 Timeline — `src/components/ui/Timeline.tsx`
```
import type { LucideIcon } from 'lucide-react'
export interface TimelineEvent { id: number | string; type: string; description: string; performedBy?: string; createdAt: string; icon?: LucideIcon }
interface TimelineProps { events: TimelineEvent[] }
export function Timeline({ events }: TimelineProps)
```
Note: `createdAt` (camelCase) and `performedBy` (camelCase) — NOT `created_at`/`performed_by`. `id` may be number or string.

### 1.4 Badge — `src/components/ui/Badge.tsx`
```
export type BadgeColor = 'gray' | 'blue' | 'indigo' | 'yellow' | 'orange' | 'purple' | 'green' | 'red' | 'cyan'
export type BadgeSize = 'sm' | 'md'
interface BadgeProps { color?: BadgeColor; size?: BadgeSize; children: React.ReactNode; className?: string }
export function Badge({ color = 'gray', size = 'sm', children, className }: BadgeProps)
```
**Only those 9 BadgeColor values are valid.** Role colors below all map to valid colors.

### 1.5 Button — `src/components/ui/Button.tsx`
```
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; children: React.ReactNode
}
export function Button(...)   // default type="button"; `loading` shows a spinner and disables.
```

### 1.6 Input / Textarea / Select — form components
- `Input`: `extends InputHTMLAttributes<HTMLInputElement>` + `label?: string; error?: string; required?: boolean`. Spreads `...rest` (so `type="datetime-local"`, `type="checkbox"`, `type="file"` work) and accepts RHF `register()` output (`{...register('x')}` — name/onChange/onBlur/ref all flow through `...rest`).
- `Textarea`: `extends TextareaHTMLAttributes<HTMLTextAreaElement>` + `label?; error?; required?; rows?(=4)`.
- `Select`: `extends SelectHTMLAttributes<HTMLSelectElement>` + `label?; error?; required?; options: SelectOption[]` where `SelectOption = { value: string; label: string }`. **`value` is a `string`** — for numeric ids use `String(user.id)` and `Number(selectValue)` on submit.

### 1.7 Modal — `src/components/ui/Modal.tsx`
```
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'
interface ModalProps { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: ModalSize }
export function Modal(...)
```
Renders nothing when `!isOpen`. Has a backdrop, Escape-to-close, and body-scroll lock built in.

### 1.8 Card / Pagination / Display components
- `Card`: `{ title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }`.
- `Pagination`: `{ total: number; skip: number; limit: number; onPageChange: (newSkip: number) => void }`.
- `EmptyState`: `{ icon?: LucideIcon; title: string; description?: string; action?: { label: string; onClick: () => void } }`.
- `ErrorState`: `{ message?: string; onRetry?: () => void }`.
- `DataNote`: `{ message?: string }` (inline amber banner; default demo-data message). Render as `<DataNote />`.
- `SkeletonCard()`: no props. `TableSkeleton({ rows?, cols? })` default 5×4. `SkeletonLine({ width?, height?, className? })`.

### 1.9 PageHeader — `src/components/layout/PageHeader.tsx`
```
export interface Breadcrumb { label: string; href?: string }
interface PageHeaderProps { title: string; breadcrumbs?: Breadcrumb[]; actions?: React.ReactNode }
export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps)
```
Usage: `<PageHeader title="Coordination" breadcrumbs={[{label:'Coordination',href:'/coordination'},{label:'Details'}]} actions={<Button>...</Button>} />`. Last breadcrumb is rendered as plain text (the current page). Use `actions` for the page-level buttons.

### 1.10 Layouts — `src/components/layout/`
- `AppLayout`: wraps protected routes, renders `<Outlet />` inside the sidebar + topbar shell. Already wired in App.tsx.
- `AuthLayout`: `{ children: React.ReactNode }` — centered card shell for public auth pages (not used by the 9 pages here, which render inside AppLayout).

### 1.11 `src/api/coordination.ts` (VERBATIM)
```
export interface ListCoordinationParams { skip?: number; limit?: number; status?: string }
export interface DecisionPayload { decision: string; rationale: string }
export interface ClosurePayload { closure_notes: string; is_exception?: boolean }   // NO exception_reason

export async function listCoordination(params?: ListCoordinationParams): Promise<PaginatedResponse<CoordinationItem>>
export async function getCoordination(id: number): Promise<CoordinationItem>
export async function createCoordination(data: Record<string, unknown>): Promise<CoordinationItem>
export async function addParticipant(id: number, data: Record<string, unknown>): Promise<CoordinationItem>
export async function acknowledge(id: number): Promise<CoordinationItem>
export async function recordDecision(id: number, data: DecisionPayload): Promise<CoordinationItem>
export async function addTask(id: number, data: Record<string, unknown>): Promise<CoordinationItem>
export async function completeTask(coordId: number, taskId: number, data: { completion_notes?: string }): Promise<CoordinationItem>
export async function closeCoordination(id: number, data: ClosurePayload): Promise<CoordinationItem>
```

### 1.12 `src/api/users.ts` (VERBATIM)
```
export interface ListUsersParams { skip?: number; limit?: number; role?: string; account_status?: string }
export async function listUsers(params?: ListUsersParams): Promise<PaginatedResponse<User>>   // use .items
export async function getUser(id: number): Promise<User>
export async function updateUser(id: number, data: Record<string, unknown>): Promise<User>
export async function approveUser(id: number): Promise<User>
export async function rejectUser(id: number): Promise<User>
export async function suspendUser(id: number): Promise<User>
```

### 1.13 `src/api/bureaus.ts` (VERBATIM)
```
export async function listBureaus(): Promise<Bureau[]>        // ARRAY directly — NOT paginated
export async function getBureau(id: number): Promise<Bureau>
```

### 1.14 `src/api/notifications.ts` (VERBATIM)
```
export interface ListNotificationsParams { skip?: number; limit?: number; unread_only?: boolean }
export interface UnreadCountResponse { count: number }
export async function listNotifications(params?: ListNotificationsParams): Promise<PaginatedResponse<Notification>>  // use .items
export async function getUnreadCount(): Promise<UnreadCountResponse>
export async function markRead(id: number): Promise<Notification>
export async function markAllRead(): Promise<{ updated: number }>
```

### 1.15 `src/api/reports.ts` (VERBATIM)
```
export interface ExportCasesParams { status?: string; bureau_id?: number; institution_id?: number }
export async function exportCasesCSV(params?: ExportCasesParams): Promise<Blob>     // responseType:'blob'
export async function exportCoordinationCSV(): Promise<Blob>
export async function getSummaryReport(): Promise<SummaryReport>
```

### 1.16 `src/api/analytics.ts` (VERBATIM) — used by ReportsPage charts
```
export interface AgeingBucket { range: string; count: number }
export interface TrendPoint { date: string; received: number; resolved: number }
export interface InstitutionBreakdownItem { institution_id: number; institution_name: string; case_count: number; overdue_count: number }
export interface CoordinationBacklogItem { status: string; count: number; oldest_days: number }
export async function getAgeing(): Promise<AgeingBucket[]>
export async function getTrends(): Promise<TrendPoint[]>
export async function getInstitutionBreakdown(): Promise<InstitutionBreakdownItem[]>
export async function getCoordinationBacklog(): Promise<CoordinationBacklogItem[]>
export async function getDashboard(params?: { bureau_id?: number }): Promise<DashboardStats>
```

### 1.17 `src/api/client.ts` (VERBATIM)
```
export const apiClient = axios.create({ baseURL: 'http://localhost:8000/api/v1', headers: {'Content-Type':'application/json'} })
// request interceptor adds Bearer from localStorage 'aicte_token'; response interceptor clears on 401 → /login
```
Use `apiClient.put('/auth/me', { full_name, designation })` for ProfilePage edit (no dedicated helper exists).

### 1.18 `src/api/imports.ts` (VERBATIM)
```
export interface ImportPreviewResult {
  job_id: number; total_rows: number; valid_rows: number; error_rows: number;
  errors: Array<{ row: number; message: string }>;
  preview: Record<string, unknown>[]
}
export interface ImportJob {
  id: number; job_type: string; status: string; total_rows: number; processed_rows: number;
  error_rows: number; created_at: string; completed_at?: string; created_by?: { id: number; full_name: string }
}
export interface CommitResult { job_id: number; status: string; committed_rows: number }
export async function previewInstitutions(file: File): Promise<ImportPreviewResult>
export async function commitInstitutions(jobId: number): Promise<CommitResult>
export async function previewCases(file: File): Promise<ImportPreviewResult>
export async function commitCases(jobId: number): Promise<CommitResult>
export async function listImports(): Promise<ImportJob[]>   // ARRAY directly — NOT paginated
```

### 1.19 `src/api/audit.ts` (VERBATIM)
```
export interface AuditEvent {
  id: number; user_id?: number; user?: { id: number; full_name: string; email: string };
  action: string; resource_type: string; resource_id?: number;
  detail?: Record<string, unknown>; ip_address?: string; created_at: string
}
export interface ListAuditParams { skip?: number; limit?: number; resource_type?: string; action?: string; user_id?: number }
export async function listAudit(params?: ListAuditParams): Promise<PaginatedResponse<AuditEvent>>  // use .items + .total
```

### 1.20 `src/types/index.ts` — relevant types (VERBATIM)
```
export enum UserRole { system_admin, senior_management, bureau_officer, regional_officer, data_admin, coordination_reviewer }
export enum CaseStatus { received, assigned, under_process, disposed, escalated, overdue, transferred, closed }
export enum CasePriority { low, medium, high, critical }
export enum CoordinationStatus { draft, pending_acknowledgement, active, overdue, resolved, closed }
export enum AccountStatus { pending_approval, active, suspended, rejected }

export interface Bureau { id: number; code: string; name: string; description?: string; head_name?: string; is_active: boolean }
export interface User {
  id: number; email: string; full_name: string; role: UserRole; account_status: AccountStatus;
  bureau_id?: number; bureau?: Bureau; designation?: string; is_active: boolean; created_at: string
}
export interface CoordinationParticipant {
  id: number; coordination_item_id: number; bureau?: Bureau; user?: User;
  role_in_coordination: string; acknowledged: boolean; acknowledged_at?: string
}
export interface CoordinationTask {
  id: number; coordination_item_id: number; title: string; description?: string;
  assigned_to?: User; due_date?: string; is_completed: boolean; completed_at?: string
}
export interface CoordinationItem {
  id: number; reference_number: string; title: string; description?: string;
  status: CoordinationStatus; decision?: string; owner?: User;
  participants: CoordinationParticipant[]; tasks: CoordinationTask[];
  acknowledge_by?: string; action_due_date?: string; created_at: string
}
export interface Notification {
  id: number; user_id: number; title: string; message: string;
  notification_type: string; priority: string; is_read: boolean; created_at: string; link_url?: string
}
export interface PaginatedResponse<T> { items: T[]; total: number; skip: number; limit: number }
```
Note: `User` has `full_name` (NOT `name`). `role` is a `UserRole` enum (= string). `account_status` is an `AccountStatus` enum (= string).

### 1.21 `src/hooks/useToast.ts` (VERBATIM)
```
export type ToastType = 'success' | 'error' | 'warning' | 'info'
export const toast = {
  success: (msg: string, duration?: number) => void,
  error:   (msg: string, duration?: number) => void,
  warning: (msg: string, duration?: number) => void,
  info:    (msg: string, duration?: number) => void,
  dismiss: (id: number) => void,
}
export function useToast(): { toasts: ToastItem[]; dismiss: (id: number) => void }
```
Import the singleton: `import { toast } from '../../hooks/useToast'` and call `toast.success('...')`. (Import `useToast` only if you render the toast container — not needed in these pages.)

### 1.22 `src/contexts/AuthContext.tsx` (VERBATIM)
```
interface AuthContextValue {
  user: User | null; token: string | null; isLoading: boolean; isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean   // returns roles.includes(user.role); false if no user
}
export function useAuth(): AuthContextValue   // import from '../../contexts/AuthContext'
export function AuthProvider({ children })   // already wraps the app in App.tsx
```
Current user id: `user?.id`. Note `user` is nullable — guard with `?.` or null-check before use.

---

## 2. Per-page implementation

Common react-query v5 pattern (used everywhere): object form.
```tsx
const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['coordination', Number(id)],
  queryFn: () => getCoordination(Number(id)),
})
const queryClient = useQueryClient()
// invalidate:
queryClient.invalidateQueries({ queryKey: ['coordination', Number(id)] })
```
Mutations (cleaner + gives `isPending` for button loading):
```tsx
const ackMut = useMutation({
  mutationFn: () => acknowledge(Number(id)),
  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['coordination', Number(id)] }); toast.success('Acknowledged'); setShowAck(false) },
  onError: () => toast.error('Failed to acknowledge'),
})
```
Date guard helper (use everywhere a date may be undefined):
```tsx
const fmt = (v?: string, p = 'dd MMM yyyy') => (v ? format(new Date(v), p) : '—')
const fmtTime = (v?: string) => (v ? format(new Date(v), 'dd MMM yyyy HH:mm') : '—')
const isOverdue = (v?: string) => (v ? isPast(new Date(v)) : false)
```

---

### PAGE 1 — `src/pages/coordination/CoordinationDetailPage.tsx` (full CCP workflow)

**Imports:**
```tsx
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isPast } from 'date-fns'
import { AlertTriangle, CheckCircle, XCircle, Plus } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Badge, Modal, Select, Textarea, Input, SkeletonCard, ErrorState, EmptyState } from '../../components/ui'
import { getCoordination, acknowledge, recordDecision, addTask, completeTask, closeCoordination } from '../../api/coordination'
import { listUsers } from '../../api/users'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from '../../hooks/useToast'
import { CoordinationStatus } from '../../types'
import { useState } from 'react'
```

**Queries/hooks:**
- `const { id } = useParams()`; `const coordId = Number(id)`.
- `useQuery({ queryKey:['coordination',coordId], queryFn:()=>getCoordination(coordId) })` → `data: item`.
- `const { user, hasRole } = useAuth()`.
- `const queryClient = useQueryClient()`.
- `useQuery({ queryKey:['users','limit50'], queryFn:()=>listUsers({limit:50}) })` → for AddTaskModal assignee options (data?.items).
- Mutations: `ackMut` (acknowledge), `decisionMut` (recordDecision), `addTaskMut` (addTask), `completeMut` (completeTask), `closeMut` (closeCoordination). Each `onSuccess` → invalidate `['coordination',coordId]` + toast + close its modal; `onError` → toast.error.
- Modal open state: `const [showDecision,setShowDecision]=useState(false)`, same for `showAddTask`, `showClose`.

**JSX structure:**
1. `<DataNote />` banner at top.
2. `<PageHeader title={item.reference_number + ' — ' + item.title ... }>` — actually: title = `${item.reference_number} — ${item.title}`; breadcrumbs `[{label:'Coordination',href:'/coordination'},{label:item.reference_number}]`. Back link via the breadcrumb to `/coordination`.
3. Amber warning box: `<div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Closing this coordination item does NOT affect the status or ownership of underlying complaint cases.</div>`
4. Status badge prominent: `<StatusBadge status={item.status} />` OR a custom coordination color map (draft→gray, pending_acknowledgement→yellow, active→indigo, overdue→red, resolved→green, closed→green) using `<Badge color={...}>{formatStatus}</Badge>`.
5. **Section 1 — Overview Card** (`<Card title="Overview">`): rows for Status, Decision (`item.decision ?? '—'`), Decision rationale (`item.decision ? item.decision : '—'` — note: there is no separate rationale field on CoordinationItem; if decision text itself is the rationale, show it; otherwise show `item.decision ?? '—'`), Owner (`item.owner?.full_name ?? '—'`), created_at (`fmt(item.created_at,'dd MMM yyyy')`). Acknowledge-by: when `item.acknowledge_by` and `isOverdue(item.acknowledge_by)` and `item.status !== 'closed' && item.status !== 'resolved'` → render the date in red with `<AlertTriangle className="h-4 w-4 text-red-500" />`. Same red+AlertTriangle treatment for `action_due_date` when overdue and not closed/resolved. Use a small helper `OverdueDate({v,status})`.
6. **Section 2 — Participants Panel** (`<Card title={'Participants ('+item.participants.length+')'}>`): for each participant: name = `p.bureau?.name ?? p.user?.full_name ?? '—'`; role = `p.role_in_coordination`; acknowledged badge = `p.acknowledged ? <Badge color="green">Acknowledged</Badge> : <Badge color="red">Pending</Badge>`; Acknowledge button visible only when `p.user?.id === user?.id && !p.acknowledged` → `<Button size="sm" onClick={()=>ackMut.mutate()} loading={ackMut.isPending}>Acknowledge</Button>`. (Note: `acknowledge(coordId)` acknowledges for the current user — call once; no per-participant id needed.) Empty: `<EmptyState title="No participants" />` if length 0.
7. **Section 3 — Tasks Panel** (`<Card title={'Tasks ('+item.tasks.length+')'} action={<Button size="sm" onClick={()=>setShowAddTask(true)}><Plus className="h-4 w-4"/>Add Task</Button>}>`): each task row: title (`task.title`), assignee (`task.assigned_to?.full_name ?? 'Unassigned'`), due_date (`fmt(task.due_date)`), completion = `task.is_completed ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-gray-300"/>`; "Complete" button when `!task.is_completed` → `<Button size="sm" variant="secondary" onClick={()=>completeMut.mutate({taskId:task.id})} loading={completeMut.isPending}>Complete</Button>` where `completeMut` calls `completeTask(coordId, taskId, {completion_notes:'Completed'})`.
8. **Action Bar** (bottom, role-gated):
   - If `(item.status === CoordinationStatus.draft || item.status === CoordinationStatus.pending_acknowledgement) && hasRole(['coordination_reviewer','system_admin'])` → `<Button onClick={()=>setShowDecision(true)}>Record Decision</Button>`.
   - If `item.status === CoordinationStatus.active || item.status === CoordinationStatus.overdue` → `<Button variant="secondary" onClick={()=>setShowAddTask(true)}><Plus/>Add Task</Button>`.
   - If `hasRole(['coordination_reviewer','system_admin']) && item.status !== CoordinationStatus.closed` → `<Button variant="danger" onClick={()=>setShowClose(true)}>Close Coordination</Button>`.

**Modals (inline, using `<Modal>`):**
- **DecisionModal** (size md): state `decision` (default `'coordinate'`), `rationale`. `<Select label="Decision" required options={[{value:'coordinate',label:'Coordinate'},{value:'link_related',label:'Link Related'},{value:'keep_separate',label:'Keep Separate'},{value:'dismiss',label:'Dismiss'},{value:'escalate',label:'Escalate'}]} value={decision} onChange={e=>setDecision(e.target.value)} />`; `<Textarea label="Rationale" required value={rationale} onChange={...} error={!rationale?'Rationale is required':undefined} />`; submit button disabled if `!rationale` → `recordDecision(coordId, {decision, rationale})` via `decisionMut`. Close on success.
- **AddTaskModal** (size md): state `title`, `description`, `due_date` (datetime-local string), `assignedToId` (string). `<Input label="Title" required value={title} onChange=... error={!title?'Required':undefined} />`; `<Textarea label="Description" value={description} onChange=... />`; `<input type="datetime-local" value={due_date} onChange=... className="..."/>` (native input, styled like Input); `<Select label="Assignee" options={(usersData?.items ?? []).map(u=>({value:String(u.id),label:u.full_name}))} value={assignedToId} onChange={e=>setAssignedToId(e.target.value)} />`; submit disabled if `!title` → `addTask(coordId, { title, description: description||undefined, due_date: due_date||undefined, assigned_to_id: assignedToId?Number(assignedToId):undefined })` via `addTaskMut`. Note: payload is `Record<string,unknown>` so extra/undefined fields are fine; omit empty strings.
- **CloseModal** (size md): state `closureNotes`, `isException` (boolean), `exceptionReason`. `<Textarea label="Closure Notes" required value={closureNotes} onChange=... error={!closureNotes?'Required':undefined} />`; `<label><input type="checkbox" checked={isException} onChange={e=>setIsException(e.target.checked)}/> Exception closure</label>` (native checkbox); if `isException` → `<Textarea label="Exception Reason" value={exceptionReason} onChange=... />`; submit disabled if `!closureNotes` → `closeCoordination(coordId, { closure_notes: closureNotes, is_exception: isException, ...(isException ? { exception_reason: exceptionReason } : {}) } as ClosurePayload)` via `closeMut`. (Cast `as ClosurePayload` because the type lacks `exception_reason` — see deviation #6.)

**Loading/error/empty:** loading → `<SkeletonCard />` (one or two). error → `<ErrorState message="Failed to load coordination" onRetry={()=>refetch()} />`. No empty (item always exists if id valid).

---

### PAGE 2 — `src/pages/coordination/CreateCoordinationPage.tsx`

**Imports:**
```tsx
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Input, Textarea, Card } from '../../components/ui'
import { listBureaus } from '../../api/bureaus'
import { listUsers } from '../../api/users'
import { createCoordination } from '../../api/coordination'
import { toast } from '../../hooks/useToast'
import { useState } from 'react'
```

**Schema + form:**
```tsx
const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  acknowledge_by: z.string().optional(),
  action_due_date: z.string().optional(),
})
type FormValues = z.infer<typeof schema>
const { register, handleSubmit, formState:{errors} } = useForm<FormValues>({ resolver: zodResolver(schema) })
```
- `const [bureauIds,setBureauIds]=useState<number[]>([])`, `const [userIds,setUserIds]=useState<number[]>([])`.
- `useQuery({queryKey:['bureaus'],queryFn:listBureaus})` → `bureaus` (Bureau[]).
- `useQuery({queryKey:['users','limit50'],queryFn:()=>listUsers({limit:50})})` → `usersData?.items`.
- `const navigate = useNavigate()`.
- `createMut = useMutation({ mutationFn:(v)=>createCoordination(v), onSuccess:(res)=>{ toast.success('Coordination created'); navigate(`/coordination/${res.id}`) }, onError:()=>toast.error('Failed to create') })`.

**JSX:**
1. `<PageHeader title="New Coordination Item" breadcrumbs={[{label:'Coordination',href:'/coordination'},{label:'New'}]} />`
2. `<DataNote />`
3. `<Card>` with `<form onSubmit={handleSubmit(onSubmit)}>`:
   - `<Input label="Title" required error={errors.title?.message} {...register('title')} />`
   - `<Textarea label="Description" {...register('description')} />`
   - `<Input label="Acknowledge By" type="datetime-local" {...register('acknowledge_by')} />`
   - `<Input label="Action Due Date" type="datetime-local" {...register('action_due_date')} />`
   - Bureau checkboxes: map `bureaus`; each `<label><input type="checkbox" checked={bureauIds.includes(b.id)} onChange={e=>setBureauIds(prev=>e.target.checked?[...prev,b.id]:prev.filter(x=>x!==b.id))}/> {b.name}</label>`.
   - User checkboxes: map `usersData?.items`; same pattern for `userIds`.
   - `<Button type="submit" loading={createMut.isPending}>Create Coordination</Button>`
4. `onSubmit`: `createMut.mutate({ title, description, acknowledge_by, action_due_date, bureau_ids: bureauIds, participant_user_ids: userIds })` (omit empty optional strings or leave them — `createCoordination` accepts `Record<string,unknown>`).

**Loading/error:** submit button `loading` state; mutation error → toast.error. Bureau/user loading → checkboxes simply not rendered until loaded (optional: a tiny skeleton). Keep minimal.

---

### PAGE 3 — `src/pages/notifications/NotificationsPage.tsx`

**Imports:**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Bell } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Badge, SkeletonCard, EmptyState } from '../../components/ui'
import { listNotifications, markRead, markAllRead } from '../../api/notifications'
import { toast } from '../../hooks/useToast'
import type { BadgeColor } from '../../components/ui'
```

**Hooks:**
- `const queryClient = useQueryClient()`.
- `useQuery({queryKey:['notifications'],queryFn:()=>listNotifications({limit:100})})` → `data?.items`.
- `markAllMut = useMutation({ mutationFn:markAllRead, onSuccess:()=>{ toast.success('All marked read'); queryClient.invalidateQueries({queryKey:['notifications']}) }, onError:()=>toast.error('Failed') })`.
- `markReadMut = useMutation({ mutationFn:(id:number)=>markRead(id), onSuccess:()=>queryClient.invalidateQueries({queryKey:['notifications']}), onError:()=>toast.error('Failed') })`.
- Priority → BadgeColor helper: `const priColor=(p:string):BadgeColor => p==='high'||p==='urgent'||p==='critical'?'red':p==='medium'?'orange':p==='low'?'gray':'blue'`.

**JSX:**
1. `<PageHeader title="Notifications" actions={<Button onClick={()=>markAllMut.mutate()} loading={markAllMut.isPending}>Mark All Read</Button>} />`
2. `<DataNote />`
3. Loading → `<>` with 3× `<SkeletonCard />`.
4. Empty → `<EmptyState icon={Bell} title="No notifications yet" />`.
5. List → `data.items.map(n => <div className={'rounded-lg border p-4 ' + (n.is_read?'bg-white border-gray-200':'bg-indigo-50 border-indigo-200')} key={n.id}>`: title (`<p className={'text-sm '+(n.is_read?'':'font-semibold')}>{n.title}</p>`), message (`<p className="text-sm text-gray-600">{n.message}</p>`), timestamp (`format(new Date(n.created_at),'dd MMM yyyy HH:mm')`), priority badge (`<Badge color={priColor(n.priority)}>{n.priority}</Badge>`), and a "Mark as Read" button only when `!n.is_read` → `<Button size="sm" variant="secondary" onClick={()=>markReadMut.mutate(n.id)}>Mark as Read</Button>`.

---

### PAGE 4 — `src/pages/reports/ReportsPage.tsx`

**Imports:**
```tsx
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts'
import { Download } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Card, SkeletonCard, ErrorState } from '../../components/ui'
import { getAgeing, getTrends, getInstitutionBreakdown, getCoordinationBacklog } from '../../api/analytics'
import { exportCasesCSV, exportCoordinationCSV } from '../../api/reports'
import { toast } from '../../hooks/useToast'
import { useState } from 'react'

const PIE_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981']
```

**Queries (4 independent useQuery):**
- `const ageingQ = useQuery({queryKey:['analytics','ageing'],queryFn:getAgeing})`
- `const trendsQ = useQuery({queryKey:['analytics','trends'],queryFn:getTrends})`
- `const breakdownQ = useQuery({queryKey:['analytics','institution-breakdown'],queryFn:getInstitutionBreakdown})`
- `const backlogQ = useQuery({queryKey:['analytics','coordination-backlog'],queryFn:getCoordinationBacklog})`

**Export handlers:**
```tsx
async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}
const [exporting,setExporting] = useState<'cases'|'coord'|null>(null)
async function doExportCases(){ try{ setExporting('cases'); await downloadBlob(await exportCasesCSV(),'cases.csv'); toast.success('Exported cases.csv') } catch{ toast.error('Export failed') } finally{ setExporting(null) } }
async function doExportCoord(){ try{ setExporting('coord'); await downloadBlob(await exportCoordinationCSV(),'coordination.csv'); toast.success('Exported coordination.csv') } catch{ toast.error('Export failed') } finally{ setExporting(null) } }
```

**JSX:**
1. `<PageHeader title="Reports" />`
2. `<DataNote message="All figures from live DB queries. Synthetic demo data only." />`
3. **Section 1 — Case Analytics**: `<Card title="Case Ageing">`. If `ageingQ.isLoading` → `<SkeletonCard />`; if `ageingQ.isError` → `<ErrorState />`; else `<ResponsiveContainer width="100%" height={300}><PieChart><Pie data={ageingQ.data.map(b=>({name:b.range,value:b.count}))} dataKey="value" nameKey="name" outerRadius={100} label>{ageingQ.data.map((_,i)=><Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>`. Then a sibling `<Card title="Case Trends (monthly)">` with `<ResponsiveContainer width="100%" height={300}><LineChart data={trendsQ.data ?? []}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Line type="monotone" dataKey="received" stroke="#6366f1"/><Line type="monotone" dataKey="resolved" stroke="#10b981"/></LineChart></ResponsiveContainer>` (guard loading/error).
4. **Section 2 — Institution Breakdown**: `<Card title="Institution Breakdown (top 10)">`. data = `(breakdownQ.data ?? []).slice().sort((a,b)=>b.case_count-a.case_count).slice(0,10)`. `<ResponsiveContainer width="100%" height={300}><BarChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="institution_name" tickFormatter={(v:string)=>v.length>15?v.slice(0,15)+'…':v}/><YAxis/><Tooltip/><Bar dataKey="case_count" fill="#6366f1"/></BarChart></ResponsiveContainer>` (guard loading/error).
5. **Section 3 — Coordination Backlog**: `<Card title="Coordination Backlog by Status">`. `<ResponsiveContainer width="100%" height={300}><BarChart data={backlogQ.data ?? []}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="status"/><YAxis/><Tooltip/><Bar dataKey="count" fill="#f59e0b"/></BarChart></ResponsiveContainer>` (guard loading/error).
6. **Section 4 — Export**: `<Card title="Export">` with `<Button onClick={doExportCases} loading={exporting==='cases'}><Download className="h-4 w-4"/>Export Cases CSV</Button>` and `<Button variant="secondary" onClick={doExportCoord} loading={exporting==='coord'}>Export Coordination CSV</Button>`, plus a note `<p className="text-xs text-gray-500">Exports are logged in the audit trail.</p>`.
- No `generated_at` is rendered under charts (the four analytics endpoints return arrays without a timestamp — see deviation #7).

**Typing notes:** recharts data props accept the typed arrays directly. `tickFormatter={(v:string)=>...}` — keep the param typed `string` (recharts passes unknown; a `string` annotation compiles). If TS complains about the formatter param, annotate as `(v: string | number)`.

---

### PAGE 5 — `src/pages/imports/ImportsPage.tsx`

**Imports:**
```tsx
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Card, Tabs, Badge, SkeletonCard, TableSkeleton } from '../../components/ui'
import { previewInstitutions, commitInstitutions, previewCases, commitCases, listImports } from '../../api/imports'
import { toast } from '../../hooks/useToast'
import type { ImportPreviewResult } from '../../api/imports'
import type { TabItem } from '../../components/ui'
```

**Hooks/state:**
- `const queryClient = useQueryClient()`.
- `const [tab,setTab]=useState<'institutions'|'cases'>('institutions')`.
- Per-tab state (two sets, or a small object keyed by tab): `selectedFile: File|null`, `previewResult: ImportPreviewResult|null`, `previewLoading`, `commitLoading`. Use `const [fileInst,setFileInst]=useState<File|null>(null)` etc. (or a `useRef`/state object).
- `const fileRef = useRef<HTMLInputElement>(null)`.
- `const importsQ = useQuery({queryKey:['imports'],queryFn:listImports})`.
- `previewMut = useMutation({ mutationFn:(f:File)=> tab==='institutions'?previewInstitutions(f):previewCases(f), onSuccess:(r)=>{ setPreviewResult(r); toast.info(`${r.valid_rows} valid rows, ${r.error_rows} errors`) }, onError:()=>toast.error('Preview failed') })`.
- `commitMut = useMutation({ mutationFn:(jobId:number)=> tab==='institutions'?commitInstitutions(jobId):commitCases(jobId), onSuccess:(r)=>{ toast.success(`Imported ${r.committed_rows} rows`); setPreviewResult(null); setSelectedFile(null); if(fileRef.current) fileRef.current.value=''; queryClient.invalidateQueries({queryKey:['imports']}) }, onError:()=>toast.error('Commit failed') })`.

**JSX:**
1. `<PageHeader title="Data Import" />`
2. `<DataNote />`
3. `<Tabs tabs={[{id:'institutions',label:'Institutions'},{id:'cases',label:'Cases'}] as TabItem[]} activeTab={tab} onTabChange={(t)=>{ setTab(t as 'institutions'|'cases'); setPreviewResult(null); setSelectedFile(null) }} />`
4. Tab content (same pattern for both): `<input type="file" accept=".csv" ref={fileRef} onChange={e=>setSelectedFile(e.target.files?.[0] ?? null)} />` + a "Choose File" label/display showing `selectedFile?.name ?? 'No file chosen'`; `<Button onClick={()=>selectedFile&&previewMut.mutate(selectedFile)} loading={previewMut.isPending} disabled={!selectedFile}>Preview</Button>`.
5. Preview result: when `previewResult` set → summary `<p>{previewResult.valid_rows} valid rows, {previewResult.error_rows} errors</p>`; error table = `previewResult.errors.map(e => <tr><td>{e.row}</td><td><Badge color="red">{e.message}</Badge></td></tr>)` inside a plain `<table>` with header Row #/Message. (There are no Status/Warnings columns — see deviation #8.) `<Button onClick={()=>commitMut.mutate(previewResult.job_id)} loading={commitMut.isPending} disabled={!previewResult || previewResult.valid_rows===0}>Commit Import</Button>`.
6. Import History (below, outside tabs): `<Card title="Import History">`. If `importsQ.isLoading` → `<TableSkeleton />`; else plain `<table>`: columns Type (`j.job_type`), Status (`<Badge>{j.status}</Badge>`), Total (`j.total_rows`), Processed/Valid (`j.processed_rows`), Errors (`j.error_rows`), Created (`format(new Date(j.created_at),'dd MMM yyyy HH:mm')`). (No filename field exists.)

---

### PAGE 6 — `src/pages/admin/UserManagementPage.tsx`

**Imports:**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Users } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Badge, TableSkeleton, ErrorState, EmptyState, Card } from '../../components/ui'
import { listUsers, approveUser, rejectUser, suspendUser } from '../../api/users'
import { toast } from '../../hooks/useToast'
import type { BadgeColor } from '../../components/ui'
import type { User } from '../../types'
import { AccountStatus } from '../../types'
```

**Hooks:**
- `const queryClient = useQueryClient()`.
- `useQuery({queryKey:['users','limit200'],queryFn:()=>listUsers({limit:200})})` → `data?.items` (User[]).
- `approveMut = useMutation({ mutationFn:(id:number)=>approveUser(id), onSuccess:()=>{ toast.success('Account approved'); queryClient.invalidateQueries({queryKey:['users']}) }, onError:()=>toast.error('Failed') })` — similar `rejectMut`, `suspendMut`.

**Helpers:**
- `const roleColor=(r:string):BadgeColor => r==='system_admin'?'red':r==='senior_management'?'purple':r==='bureau_officer'?'blue':r==='regional_officer'?'indigo':r==='data_admin'?'orange':r==='coordination_reviewer'?'green':'gray'`.
- `const statusColor=(s:AccountStatus):BadgeColor => s==='active'?'green':s==='pending_approval'?'yellow':s==='suspended'?'red':'gray'`.
- `const fmtRole=(r:string)=>r.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())`.

**JSX:**
1. `<PageHeader title="User Management" />`
2. `const pending = (users ?? []).filter(u=>u.account_status===AccountStatus.pending_approval)`.
3. **Section 1 — Pending Approvals**: if `pending.length>0` → amber banner `<div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">{pending.length} account(s) pending approval</div>`; a plain `<table>` with columns Name (`u.full_name`), Email (`u.email`), Designation (`u.designation ?? '—'`), Role (`<Badge color={roleColor(u.role)}>{fmtRole(u.role)}</Badge>`), Requested At (`format(new Date(u.created_at),'dd MMM yyyy')`), Actions → `<Button size="sm" onClick={()=>approveMut.mutate(u.id)} loading={approveMut.isPending}>Approve</Button>` and `<Button size="sm" variant="danger" onClick={()=>rejectMut.mutate(u.id)} loading={rejectMut.isPending}>Reject</Button>`. If `pending.length===0` → a green-ish note "No pending approvals" (or skip the section).
4. **Section 2 — All Users**: `<Card title={'All Users ('+ (users?.length ?? 0) +')'}>`. If `isLoading` → `<TableSkeleton />`; if `isError` → `<ErrorState onRetry={()=>refetch()} />`; if empty → `<EmptyState icon={Users} title="No users" />`; else plain `<table>` columns: Name, Email, Role badge (`roleColor`), Bureau ID (`u.bureau_id ?? '—'`), Status badge (`statusColor(u.account_status)` + label), Active (`u.is_active ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-gray-300"/>`), Actions → "Suspend" button only if `u.is_active` → `<Button size="sm" variant="secondary" onClick={()=>suspendMut.mutate(u.id)} loading={suspendMut.isPending}>Suspend</Button>`.

**Typing notes:** `u.role` is `UserRole` (= string) → pass to `roleColor(u.role)` which expects `string` (UserRole is assignable to string). `u.account_status` is `AccountStatus` → `statusColor(u.account_status)`. Import `CheckCircle, XCircle` from lucide-react.

---

### PAGE 7 — `src/pages/admin/AuditLogPage.tsx`

**Imports:**
```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Select, Card, Pagination, TableSkeleton, ErrorState, EmptyState } from '../../components/ui'
import { listAudit } from '../../api/audit'
import type { AuditEvent } from '../../api/audit'
```

**Hooks/state:**
- `const LIMIT=50; const [skip,setSkip]=useState(0); const [action,setAction]=useState('all')`.
- `const auditQ = useQuery({ queryKey:['audit',skip,action], queryFn:()=>listAudit({ skip, limit:LIMIT, ...(action!=='all'?{action}:{}) }) })` → `data?.items` (AuditEvent[]), `data?.total`.

**JSX:**
1. `<PageHeader title="Audit Log" />`
2. `<DataNote />`
3. Filter row: `<Select label="Action" options={[{value:'all',label:'All'},{value:'case_created',label:'Case Created'},{value:'status_changed',label:'Status Changed'},{value:'case_assigned',label:'Case Assigned'},{value:'coordination_created',label:'Coordination Created'},{value:'coordination_closed',label:'Coordination Closed'},{value:'import_committed',label:'Import Committed'}]} value={action} onChange={e=>{ setAction(e.target.value); setSkip(0) }} />`
4. `<Card>`: loading → `<TableSkeleton cols={6} />`; error → `<ErrorState onRetry={()=>auditQ.refetch()} />`; empty → `<EmptyState title="No audit events" />`; else plain `<table>` columns: Timestamp (`format(new Date(e.created_at),'dd MMM yyyy HH:mm')`), User (`e.user?.full_name ?? (e.user_id? 'User #'+e.user_id : '—')`), Action (`<span className="font-mono text-xs">{e.action}</span>`), Resource Type (`e.resource_type`), Resource ID (`e.resource_id ?? '—'`), Description (`e.detail ? JSON.stringify(e.detail) : '—'` — see deviation #9).
5. `<Pagination total={auditQ.data?.total ?? 0} skip={skip} limit={LIMIT} onPageChange={setSkip} />`.

**Typing notes:** `e.detail` is `Record<string,unknown> | undefined`; `JSON.stringify` returns string; fallback `'—'`. `e.resource_id` is `number | undefined` — render with `?? '—'`.

---

### PAGE 8 — `src/pages/profile/ProfilePage.tsx`

**Imports:**
```tsx
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Input, Card, Badge } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../api/client'
import { toast } from '../../hooks/useToast'
import type { BadgeColor } from '../../components/ui'
import { useState } from 'react'
```

**Hooks:**
- `const { user } = useAuth()` (may be null — guard).
- `const { register, handleSubmit, formState:{errors} } = useForm<{ full_name: string; designation: string }>({ defaultValues: { full_name: user?.full_name ?? '', designation: user?.designation ?? '' } })`.
- `const [saving,setSaving]=useState(false)`.
- role/status color helpers (same as UserManagementPage): `roleColor`, `statusColor` (import AccountStatus if used; or compare to string literals — `user.account_status` is `AccountStatus`).

**JSX:**
1. `<PageHeader title="My Profile" />`
2. `<DataNote />`
3. **Info card** (`<Card title="Profile">`): name (`user?.full_name`), email (`user?.email`), role badge (`<Badge color={roleColor(user?.role ?? '')}>{fmtRole(user?.role ?? '')}</Badge>`), designation (`user?.designation ?? '—'`), bureau_id (`user?.bureau_id ?? '—'`), account_status badge (`<Badge color={statusColor(user?.account_status ?? ('' as AccountStatus))}>{user?.account_status}</Badge>`), last_login (note: `User` type has NO `last_login` field — render `'—'` or omit; see note).
4. **Edit form** (`<Card title="Edit Profile">`): `<form onSubmit={handleSubmit(onSubmit)}>` with `<Input label="Full Name" required error={errors.full_name?.message} {...register('full_name')} />`, `<Input label="Designation" {...register('designation')} />`, `<Button type="submit" loading={saving}>Save</Button>`. `onSubmit`: `setSaving(true); try{ await apiClient.put('/auth/me', { full_name, designation }); toast.success('Profile updated') } catch{ toast.error('Update failed') } finally{ setSaving(false) }`.
5. **Change Password** (`<Card title="Change Password">`): static note `<p className="text-sm text-gray-600">Contact your system administrator to change your password.</p>`.

**Typing notes:** `User` has no `last_login` field — render `'—'` and do NOT reference `user.last_login` (it would be a TS error under strict mode). `user?.role` is `UserRole | undefined` → pass to `roleColor` which expects `string` (UserRole is assignable to string, but `UserRole | undefined` is not assignable to `string`; pass `user?.role ?? ''`). `user?.account_status` is `AccountStatus | undefined` → `statusColor(user?.account_status ?? ('' as AccountStatus))` or handle undefined inside `statusColor`.

---

### PAGE 9 — `src/pages/help/HelpPage.tsx` (static, public route)

**Imports:**
```tsx
import { Shield, CheckCircle, XCircle } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'   // optional; page is public but PageHeader works standalone
```
Note: HelpPage is a PUBLIC route (renders outside AppLayout per App.tsx). Do NOT call `useAuth()` (user may be null and that is fine, but the page needs no user). Keep it self-contained; wrap in a centered container.

**JSX:** a max-w-3xl centered column.
1. `<PageHeader title="Help & Information" />` (works standalone; if layout looks odd outside AppLayout, use a plain `<h1>` — but PageHeader is fine, it only uses react-router `Link` which is available).
2. Amber warning card: `<div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800">⚠ DEMO PROTOTYPE — All data is synthetic demo data. Not official AICTE records. Built for SIH Grand Finale demonstration only.</div>`
3. **Demo Credentials** (`<Card title="Demo Credentials">`) — plain `<table>`:
   | Role | Email | Password |
   | System Admin | admin@aicte.demo | Admin@123456 |
   | Bureau Officer | officer1@aicte.demo | Demo@123456 |
   | Coord. Reviewer | reviewer@aicte.demo | Demo@123456 |
   | Senior Management | management@aicte.demo | Demo@123456 |
   | Data Admin | datamgr@aicte.demo | Demo@123456 |
   | Regional Officer | regional@aicte.demo | Demo@123456 |
4. **User Roles** (`<Card title="User Roles">`) — `<table>` columns Role / Description / Key Actions (content: System Admin—full access—manage users, audit; Senior Management—oversight—view reports, audit; Bureau Officer—case handling—assign/update cases; Regional Officer—regional cases—handle regional cases; Data Admin—data—imports; Coordination Reviewer—CCP—record decisions, close).
5. **What's Implemented** (`<Card title="What's Implemented">`) — `<ul>` with `<CheckCircle className="h-4 w-4 text-green-500"/>` bullets: Dashboard, Institutions, Cases + relationships, Coordination (CCP) with tasks/acknowledge/decisions, Notifications, Reports + CSV export, Imports, User management, Audit log, Profile.
6. **Limitations** (`<Card title="Limitations">`) — `<ul>` with `<XCircle className="h-4 w-4 text-gray-400"/>` bullets: synthetic data, no real auth persistence beyond JWT, password change via admin only, no email notifications, prototype for SIH demo.
7. **SIH Demo Walkthrough (5–7 min)** (`<Card title="SIH Demo Walkthrough (5-7 min)">`) — `<ol>` numbered steps exactly:
   1. Login as admin → Dashboard overview
   2. Search institution → view linked cases
   3. Open case → change status → add note
   4. Go to Relationships → review a pending relationship candidate
   5. Go to Coordination → open active CCP item → acknowledge → add follow-up task
   6. Show overdue coordination item
   7. Reports → case ageing chart → export CSV

**Typing notes:** pure static JSX; no API/queries. Ensure every `<table>` is valid JSX. No date formatting needed.

---

## 3. Build Verification

Command (run from the repo root after each page is implemented):
```
cd "d:\SIH NEW PROJECT\frontend" && npm run build
```
This runs `tsc -b && vite build`. Success = exit code 0, no TS errors, vite produces `dist/`. Run it after every page and fix iteratively.

### Common-fix checklist (apply when `tsc -b` errors)
- **Missing imports:** add the named import. All UI components come from `../../components/ui`; layout from `../../components/layout/PageHeader`; APIs from `../../api/<name>`; `useAuth` from `../../contexts/AuthContext`; `toast` from `../../hooks/useToast`; `apiClient` from `../../api/client`.
- **Null safety (strict mode is ON):** use optional chaining `?.` and nullish coalescing `??` on `user?.`, `item?.`, `task.assigned_to?.`, `participant.user?.`, `data?.items`. Guard `format(new Date(v), ...)` with `v ? format(new Date(v), '...') : '—'` for every optional date (acknowledge_by, action_due_date, due_date, created_at, completed_at, acknowledged_at).
- **BadgeColor:** only `'gray'|'blue'|'indigo'|'yellow'|'orange'|'purple'|'green'|'red'|'cyan'`. Role/account-status maps above all use valid values.
- **TabItem:** `{ id: string; label: string; count?: number }` — `id` MUST be a string. Cast `as TabItem[]` if TS widens.
- **TimelineEvent (if used):** `{ id: number|string; type: string; description: string; performedBy?: string; createdAt: string; icon?: LucideIcon }` — camelCase `performedBy`/`createdAt`. (Not required by these 9 pages, but exported.)
- **Recharts:** wrap EVERY chart in `<ResponsiveContainer width="100%" height={300}>`. Pass typed arrays directly. For `tickFormatter` params, annotate as `(v: string)` or `(v: string|number)` if TS complains.
- **Enum comparisons:** compare `item.status` to `CoordinationStatus.draft` etc. (import from `../../types`), NOT to the brief's non-existent strings. Compare `u.account_status` to `AccountStatus.pending_approval`.
- **Select values are strings:** for numeric ids use `String(id)` in options and `Number(value)` on submit.
- **`listBureaus()` → `Bureau[]`** (array). **`listUsers`/`listCoordination`/`listNotifications`/`listAudit` → `PaginatedResponse<T`** → use `.items` (and `.total` for pagination). **`listImports()` → `ImportJob[]`** (array, no filename).
- **`completeTask(coordId, taskId, { completion_notes })`** — use the imported function (POST …/complete). Do NOT use a raw PUT.
- **`closeCoordination` with `exception_reason`:** cast the payload `as ClosurePayload` (the type lacks the field; the cast is required to avoid excess-property errors).
- **`AuditEvent.detail`** is an object → `JSON.stringify(event.detail)` for the Description column.
- **`User` has `full_name` (not `name`)** and NO `last_login` field — render `'—'`, do not reference it.
- **`createCoordination` / `addTask`** take `Record<string, unknown>` — passing extra/optional fields is fine; pass `undefined` for empty optionals or omit them.

Keep running `npm run build` after each fix until `tsc -b` reports nothing and vite emits `dist/`.

---

## 4. Success criteria (restated)
- `npm run build` exits 0, zero TypeScript errors.
- All 9 pages are real implementations (not the original stubs).
- CoordinationDetailPage has working DecisionModal, AddTaskModal, CloseModal with the role-gated action bar.
- ReportsPage has 4 Recharts charts wired to `getAgeing`, `getTrends`, `getInstitutionBreakdown`, `getCoordinationBacklog` + two CSV export buttons.
- ImportsPage has the preview + commit flow with import history.
- HelpPage has the demo-credentials table and walkthrough.
