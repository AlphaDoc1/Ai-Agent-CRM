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
        d.id === id ? { ...d, ...updates } : d
      ),
    })),
  removeDistributor: (id) =>
    set((state) => ({
      distributors: state.distributors.filter((d) => d.id !== id),
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

interface DashboardState {
  stats: DashboardStats | null;
  isLoading: boolean;
  setStats: (stats: DashboardStats) => void;
  setLoading: (loading: boolean) => void;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  isLoading: false,
  setStats: (stats) => set({ stats }),
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
