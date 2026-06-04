// ============================================
// TypeScript Types — Database & Application
// ============================================

// ---------- Database Row Types ----------

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "distributor" | "agent";
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Distributor {
  id: string;
  name: string;
  state: string;
  region: string | null;
  city: string | null;
  phone: string;
  email: string;
  address: string | null;
  is_active: boolean;
  total_leads_assigned: number;
  total_conversions: number;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type InquiryStatus =
  | "new"
  | "ai_processed"
  | "assigned"
  | "in_progress"
  | "converted"
  | "closed"
  | "escalated";

export type InquiryPriority = "low" | "medium" | "high" | "urgent";
export type InquirySource = "web" | "voice" | "api" | "manual";

export interface Inquiry {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  state: string | null;
  city: string | null;
  message: string | null;
  product_interest: string | null;
  inquiry_type: string | null;
  status: InquiryStatus;
  priority: InquiryPriority;
  ai_summary: string | null;
  ai_raw_response: AIAnalysisResponse | null;
  source: InquirySource;
  assigned_distributor_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  distributor?: Distributor;
}

export type AssignmentStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "converted"
  | "rejected";

export interface LeadAssignment {
  id: string;
  inquiry_id: string;
  distributor_id: string;
  assigned_by: string;
  status: AssignmentStatus;
  notes: string | null;
  assigned_at: string;
  updated_at: string;
  // Joined fields
  inquiry?: Inquiry;
  distributor?: Distributor;
}

export interface ActivityLog {
  id: string;
  entity_type: "inquiry" | "distributor" | "assignment" | "user" | "system";
  entity_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
}

export type CallStatus = "in_progress" | "completed" | "failed" | "escalated";

export interface CallLog {
  id: string;
  inquiry_id: string | null;
  caller_name: string | null;
  caller_phone: string | null;
  duration_seconds: number;
  transcript: string | null;
  ai_summary: string | null;
  status: CallStatus;
  escalated: boolean;
  created_at: string;
}

// ---------- AI Response Types ----------

export interface AIAnalysisResponse {
  customer_name: string;
  state: string;
  city: string;
  product_interest: string;
  inquiry_type: string;
  lead_priority: string;
  inquiry_summary: string;
  recommended_distributor: string;
}

// ---------- API Request/Response Types ----------

export interface CreateInquiryPayload {
  name: string;
  phone?: string;
  email?: string;
  state?: string;
  city?: string;
  message?: string;
  product_interest?: string;
  source?: InquirySource;
}

export interface CreateDistributorPayload {
  name: string;
  state: string;
  region?: string;
  city?: string;
  phone: string;
  email: string;
  address?: string;
}

export interface UpdateDistributorPayload {
  name?: string;
  state?: string;
  region?: string;
  city?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active?: boolean;
}

export interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  assignedLeads: number;
  convertedLeads: number;
  totalDistributors: number;
  activeDistributors: number;
  leadsByStatus: { status: string; count: number }[];
  leadsByPriority: { priority: string; count: number }[];
  leadsTrend: { date: string; count: number }[];
  topDistributors: { name: string; leads: number; conversions: number }[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---------- Voice Agent V2 Types ----------

/** Return type for generateVoiceResponse (FIX 6) */
export interface VoiceAgentResponse {
  reply: string;
  status: 'ACTIVE' | 'ENDED' | 'ESCALATED';
  metadata: {
    issue_type: string | null;
    customer_id: string | null;
    order_id: string | null;
    sentiment_score: number;
    customer_name: string | null;
    ticket_id: string | null;
    db_timeout: boolean;
  };
}

/** Post-call pipeline result (FIX B) */
export interface PostCallPipelineResult {
  success: boolean;
  error?: string;
}

/** Call turn record (FIX 8) */
export interface CallTurn {
  id: string;
  call_id: string;
  turn_index: number;
  speaker: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  text: string;
  created_at: string;
}

/** Call analysis record (FIX 2) */
export interface CallAnalysis {
  id: string;
  call_id: string;
  issue_type: string | null;
  customer_id: string | null;
  order_id: string | null;
  sentiment_score: number;
  resolution_status: string;
  turn_count: number;
  db_timeout: boolean;
  notification_flag: boolean;
  urgent_flag: boolean;
  call_group: string | null;
  summary_note: string | null;
  pipeline_error: string | null;
  updated_at: string;
}

/** Notification record (FIX 5) */
export interface Notification {
  id: string;
  call_id: string | null;
  title: string;
  message: string;
  call_group: string | null;
  is_read: boolean;
  urgent_flag: boolean;
  created_at: string;
}
