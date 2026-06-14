// ============================================
// Zustand Store — Global Application State
// ============================================
import { create } from "zustand";
import {
  Inquiry,
  Distributor,
  LeadAssignment,
  DashboardStats,
  ApiResponse,
} from "@/lib/types";

// ---------- Auth Store ----------

interface AuthState {
  user: { id: string; email: string; role: string } | null;
  isLoading: boolean;
  setUser: (user: AuthState["user"]) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  clearUser: () => set({ user: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// ---------- Inquiry Store ----------

interface InquiryState {
  inquiries: Inquiry[];
  selectedInquiry: Inquiry | null;
  isLoading: boolean;
  filters: {
    status: string;
    priority: string;
    search: string;
  };
  setInquiries: (inquiries: Inquiry[]) => void;
  addInquiry: (inquiry: Inquiry) => void;
  updateInquiry: (id: string, updates: Partial<Inquiry>) => void;
  setSelectedInquiry: (inquiry: Inquiry | null) => void;
  setLoading: (loading: boolean) => void;
  setFilter: (key: keyof InquiryState["filters"], value: string) => void;
  fetchInquiries: () => Promise<void>;
}

export const useInquiryStore = create<InquiryState>((set, get) => ({
  inquiries: [],
  selectedInquiry: null,
  isLoading: false,
  filters: { status: "", priority: "", search: "" },
  setInquiries: (inquiries) => set({ inquiries }),
  addInquiry: (inquiry) =>
    set((state) => ({ inquiries: [inquiry, ...state.inquiries] })),
  updateInquiry: (id, updates) =>
    set((state) => ({
      inquiries: state.inquiries.map((inq) =>
        inq.id === id ? { ...inq, ...updates } : inq
      ),
    })),
  setSelectedInquiry: (inquiry) => set({ selectedInquiry: inquiry }),
  setLoading: (isLoading) => set({ isLoading }),
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  fetchInquiries: async () => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(`/api/inquiries?${params.toString()}`);
      const json: ApiResponse<Inquiry[]> = await res.json();

      if (json.success && json.data) {
        set({ inquiries: json.data });
      }
    } catch (error) {
      console.error("Failed to fetch inquiries:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));

// ---------- Distributor Store ----------

interface DistributorState {
  distributors: Distributor[];
  selectedDistributor: Distributor | null;
  isLoading: boolean;
  setDistributors: (distributors: Distributor[]) => void;
  addDistributor: (distributor: Distributor) => void;
  updateDistributor: (id: string, updates: Partial<Distributor>) => void;
  removeDistributor: (id: string) => void;
  setSelectedDistributor: (distributor: Distributor | null) => void;
  setLoading: (loading: boolean) => void;
  fetchDistributors: () => Promise<void>;
}

export const useDistributorStore = create<DistributorState>((set) => ({
  distributors: [],
  selectedDistributor: null,
  isLoading: false,
  setDistributors: (distributors) => set({ distributors }),
  addDistributor: (distributor) =>
    set((state) => ({ distributors: [distributor, ...state.distributors] })),
  updateDistributor: (id, updates) =>
    set((state) => ({
      distributors: state.distributors.map((d) =>
        d.distributor_id === id ? { ...d, ...updates } : d
      ),
    })),
  removeDistributor: (id) =>
    set((state) => ({
      distributors: state.distributors.filter((d) => d.distributor_id !== id),
    })),
  setSelectedDistributor: (distributor) =>
    set({ selectedDistributor: distributor }),
  setLoading: (isLoading) => set({ isLoading }),
  fetchDistributors: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/distributors");
      const json: ApiResponse<Distributor[]> = await res.json();
      if (json.success && json.data) {
        set({ distributors: json.data });
      }
    } catch (error) {
      console.error("Failed to fetch distributors:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));

// ---------- Dashboard Store ----------

export interface Notification {
  id: string;
  call_id: string;
  title: string;
  message: string;
  call_group: string;
  urgent_flag: boolean;
  is_read: boolean;
  created_at: string;
}

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
  // Joined data
  call_logs?: {
    created_at: string;
    transcript: string | null;
    caller_name: string | null;
    caller_phone: string | null;
    duration_seconds: number;
  };
}

interface DashboardState {
  stats: DashboardStats | null;
  notifications: Notification[];
  callAnalyses: CallAnalysis[];
  isLoading: boolean;
  setStats: (stats: DashboardStats) => void;
  setNotifications: (notifications: Notification[]) => void;
  setCallAnalyses: (analyses: CallAnalysis[]) => void;
  addNotification: (notification: Notification) => void;
  addCallAnalysis: (analysis: CallAnalysis) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  fetchStats: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchCallAnalyses: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: null,
  notifications: [],
  callAnalyses: [],
  isLoading: false,
  setStats: (stats) => set({ stats }),
  setNotifications: (notifications) => set({ notifications }),
  setCallAnalyses: (analyses) => set({ callAnalyses: analyses }),
  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications] })),
  addCallAnalysis: (analysis) =>
    set((state) => ({ callAnalyses: [analysis, ...state.callAnalyses] })),
  markAsRead: async (id) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
    }));

    try {
      await fetch("/api/dashboard/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id, is_read: true }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  },
  markAllAsRead: async () => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
    }));

    try {
      await fetch("/api/dashboard/notifications/mark-all-read", {
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  },
  setLoading: (isLoading) => set({ isLoading }),
  fetchStats: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/dashboard/stats");
      const json: ApiResponse<DashboardStats> = await res.json();
      if (json.success && json.data) {
        set({ stats: json.data });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      set({ isLoading: false });
    }
  },
  fetchNotifications: async () => {
    try {
      const res = await fetch("/api/dashboard/notifications");
      const json: ApiResponse<Notification[]> = await res.json();
      if (json.success && json.data) {
        set({ notifications: json.data });
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  },
  fetchCallAnalyses: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/dashboard/analysis");
      const json: ApiResponse<CallAnalysis[]> = await res.json();
      if (json.success && json.data) {
        set({ callAnalyses: json.data });
      }
    } catch (error) {
      console.error("Failed to fetch call analyses:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));

// ---------- Voice Agent Store ----------

interface VoiceAgentState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  transcript: string[];
  currentTranscript: string;
  callDuration: number;
  setListening: (listening: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  addToTranscript: (entry: string) => void;
  setCurrentTranscript: (text: string) => void;
  setCallDuration: (duration: number) => void;
  resetCall: () => void;
}

export const useVoiceAgentStore = create<VoiceAgentState>((set) => ({
  isListening: false,
  isProcessing: false,
  isSpeaking: false,
  transcript: [],
  currentTranscript: "",
  callDuration: 0,
  setListening: (isListening) => set({ isListening }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  addToTranscript: (entry) =>
    set((state) => ({ transcript: [...state.transcript, entry] })),
  setCurrentTranscript: (currentTranscript) => set({ currentTranscript }),
  setCallDuration: (callDuration) => set({ callDuration }),
  resetCall: () =>
    set({
      isListening: false,
      isProcessing: false,
      isSpeaking: false,
      transcript: [],
      currentTranscript: "",
      callDuration: 0,
    }),
}));
