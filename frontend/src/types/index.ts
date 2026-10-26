// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  system_admin = 'system_admin',
  senior_management = 'senior_management',
  bureau_officer = 'bureau_officer',
  regional_officer = 'regional_officer',
  data_admin = 'data_admin',
  coordination_reviewer = 'coordination_reviewer',
}

export enum CaseStatus {
  received = 'received',
  assigned = 'assigned',
  under_process = 'under_process',
  disposed = 'disposed',
  escalated = 'escalated',
  overdue = 'overdue',
  transferred = 'transferred',
  closed = 'closed',
}

export enum CasePriority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical',
}

export enum RelationshipType {
  duplicate = 'duplicate',
  related = 'related',
  parent_child = 'parent_child',
  transferred_from = 'transferred_from',
  transferred_to = 'transferred_to',
}

export enum ReviewStatus {
  pending = 'pending',
  confirmed = 'confirmed',
  rejected = 'rejected',
  escalated = 'escalated',
  corrected = 'corrected',
}

export enum CoordinationStatus {
  draft = 'draft',
  pending_acknowledgement = 'pending_acknowledgement',
  active = 'active',
  overdue = 'overdue',
  resolved = 'resolved',
  closed = 'closed',
}

export enum AccountStatus {
  pending_approval = 'pending_approval',
  active = 'active',
  suspended = 'suspended',
  rejected = 'rejected',
}

// ─── Core Models ──────────────────────────────────────────────────────────────

export interface Bureau {
  id: number;
  code: string;
  name: string;
  description?: string;
  head_name?: string;
  is_active: boolean;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  account_status: AccountStatus;
  bureau_id?: number;
  bureau?: Bureau;
  designation?: string;
  is_active: boolean;
  created_at: string;
}

export interface InstitutionIdentifier {
  id: number;
  id_type: string;
  id_value: string;
  source_system: string;
  is_primary: boolean;
  is_verified: boolean;
}

export interface Institution {
  id: number;
  canonical_name: string;
  short_name?: string;
  institution_type: string;
  status: string;
  state?: string;
  district?: string;
  city?: string;
  region?: string;
  identifiers: InstitutionIdentifier[];
  created_at: string;
  updated_at: string;
}

export interface CaseAction {
  id: number;
  case_id: number;
  action_type: string;
  description: string;
  old_status?: CaseStatus;
  new_status?: CaseStatus;
  performed_by?: User;
  created_at: string;
}

export interface Case {
  id: number;
  case_number: string;
  title: string;
  summary?: string;
  category: string;
  status: CaseStatus;
  priority: CasePriority;
  institution_id?: number;
  institution?: Institution;
  bureau_id?: number;
  bureau?: Bureau;
  assigned_officer_id?: number;
  assigned_officer?: User;
  received_date: string;
  due_date?: string;
  next_action?: string;
  created_at: string;
  updated_at: string;
}

export interface CaseRelationship {
  id: number;
  case_a_id: number;
  case_b_id: number;
  case_a?: Case;
  case_b?: Case;
  relationship_type: RelationshipType;
  score: number;
  reasons: string[];
  matching_evidence: Record<string, unknown>[];
  algorithm_version?: string;
  review_status: ReviewStatus;
  reviewed_by?: User;
  review_notes?: string;
  created_at: string;
}

export interface CoordinationParticipant {
  id: number;
  coordination_item_id: number;
  bureau?: Bureau;
  user?: User;
  role_in_coordination: string;
  acknowledged: boolean;
  acknowledged_at?: string;
}

export interface CoordinationTask {
  id: number;
  coordination_item_id: number;
  title: string;
  description?: string;
  assigned_to?: User;
  due_date?: string;
  is_completed: boolean;
  completed_at?: string;
}

export interface CoordinationItem {
  id: number;
  reference_number: string;
  title: string;
  description?: string;
  status: CoordinationStatus;
  decision?: string;
  owner?: User;
  participants: CoordinationParticipant[];
  tasks: CoordinationTask[];
  acknowledge_by?: string;
  action_due_date?: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
  link_url?: string;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface DashboardStats {
  total_cases: number;
  cases_by_status: Record<string, number>;
  cases_by_bureau: Record<string, number>;
  overdue_cases: number;
  unreviewed_relationships: number;
  pending_coordination: number;
  pending_transfers: number;
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  email: string;
  full_name: string;
  password: string;
  confirm_password: string;
  designation?: string;
}

export interface CreateCaseForm {
  title: string;
  summary?: string;
  category: string;
  priority: CasePriority;
  institution_id?: number;
  bureau_id?: number;
  source_case_id?: string;
  due_date?: string;
}
