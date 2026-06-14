
import Redis from 'ioredis';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null;
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
});

let isRedisAvailable = false;
let hasLoggedError = false;

redis.on('error', function(err) {
  isRedisAvailable = false;
  if (!hasLoggedError) {
    console.log('[Redis] Not available. Switching to local in-memory fallback.');
    hasLoggedError = true;
  }
});

redis.on('connect', function() {
  isRedisAvailable = true;
  hasLoggedError = false;
  console.log('[Redis] Connected successfully');
});

// Isolated memory Map for when Redis is unavailable
// We use globalThis to persist the Map across hot-reloads in Next.js dev mode
const globalMemoryKey = '_elanpro_call_sessions';
if (!(globalThis as any)[globalMemoryKey]) {
  (globalThis as any)[globalMemoryKey] = new Map();
}
const localMemory: Map<string, CallSession> = (globalThis as any)[globalMemoryKey];

export interface CallSession {
  callSid: string;
  callLogId: string | null;
  callerPhone: string;
  lang: 'hi' | 'en' | 'ta' | 'te' | 'kn' | 'mr' | 'bn' | 'gu';
  startTime: number;
  lastActivityTime: number;
  lastAgentTurnTime: number;
  customerId: string | null;
  customerName: string | null;
  customerBusinessType: string | null;
  previousOrders: Array<{
    orderId: string;
    productId: string;
    deliveryStatus: string;
    installationStatus: string | null;
    warrantyExpiry: string | null;
  }>;
  openTickets: Array<{
    ticketId: string;
    issueType: string;
    description: string;
    status: string;
    priority: string;
  }>;
  intent: string | null;
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  turnIndex: number;
  escalated: boolean;
  farewellSent: boolean;
  interruptionBuffer: string | null;
  interruptionCount: number;
  pipelineTriggered: boolean;
  archived: boolean;
}

function getRedisKey(callSid: string): string {
  return 'elanpro:call:' + callSid + ':session';
}

export function createDefaultSession(callSid: string, callerPhone: string): CallSession {
  const now = Date.now();
  return {
    callSid,
    callLogId: null,
    callerPhone,
    lang: 'en',
    startTime: now,
    lastActivityTime: now,
    lastAgentTurnTime: now,
    customerId: null,
    customerName: null,
    customerBusinessType: null,
    previousOrders: [],
    openTickets: [],
    intent: null,
    history: [],
    turnIndex: 0,
    escalated: false,
    farewellSent: false,
    interruptionBuffer: null,
    interruptionCount: 0,
    pipelineTriggered: false,
    archived: false,
  };
}

function deepMergeSession(existing: CallSession, patch: Partial<CallSession>): CallSession {
  const merged = { ...existing, ...patch };
  if (patch.previousOrders) merged.previousOrders = [...patch.previousOrders];
  if (patch.openTickets) merged.openTickets = [...patch.openTickets];
  if (patch.history) merged.history = [...patch.history];
  return merged;
}

export async function initSession(callSid: string, callerPhone: string): Promise<CallSession> {
  const session = createDefaultSession(callSid, callerPhone);
  const key = getRedisKey(callSid);

  // Insert call log entry in Supabase
  const supabase = createAdminClient();
  try {
    const { data: insertData, error: insertError } = await supabase.from("call_logs").insert({
      call_sid: callSid,
      caller_phone: callerPhone,
      status: "in_progress",
      transcript: "",
      source: "voice"
    }).select('id');

    if (insertError) {
      console.warn("[Memory][INIT] Failed to create call log in database:", insertError.message);
    } else {
      const callLogId = insertData?.[0]?.id;
      if (callLogId) {
        session.callLogId = callLogId;
      }
    }
  } catch (dbErr) {
    console.warn("[Memory][INIT] Supabase call log insertion failed (non-blocking):", dbErr);
  }

  if (isRedisAvailable) {
    try {
      await redis.setex(key, 7200, JSON.stringify(session));
      console.log('[Memory][INIT] ' + callSid + ' — new isolated session created');
      return session;
    } catch (err) {
      isRedisAvailable = false;
      console.warn('[Redis] initSession failed, switching to local fallback');
    }
  }

  localMemory.set(key, session);
  console.log('[Memory][INIT] ' + callSid + ' — new isolated session created');
  return session;
}

export async function getSession(callSid: string): Promise<CallSession | null> {
  const key = getRedisKey(callSid);

  if (isRedisAvailable) {
    try {
      const data = await redis.get(key);
      if (!data) return null;

      let session: CallSession;
      try {
        session = JSON.parse(data);
      } catch (parseErr) {
        return null;
      }

      session.lastActivityTime = Date.now();
      const ttl = await redis.ttl(key);
      await redis.setex(key, Math.max(ttl > 0 ? ttl : 7200, 3600), JSON.stringify(session));
      return session;
    } catch (err) {
      isRedisAvailable = false;
      console.warn('[Redis] getSession failed, switching to local fallback');
    }
  }

  const session = localMemory.get(key);
  if (!session) return null;
  session.lastActivityTime = Date.now();
  localMemory.set(key, session);
  return session;
}

export async function updateSession(callSid: string, patch: Partial<CallSession>): Promise<CallSession | null> {
  const key = getRedisKey(callSid);
  const existing = await getSession(callSid);
  if (!existing) {
    console.warn('[Memory][UPDATE] ' + callSid + ' — session not found');
    return null;
  }

  const updated = deepMergeSession(existing, patch);

  if (isRedisAvailable) {
    try {
      const ttl = await redis.ttl(key);
      await redis.setex(key, Math.max(ttl > 0 ? ttl : 7200, 3600), JSON.stringify(updated));
      return updated;
    } catch (err) {
      isRedisAvailable = false;
      console.warn('[Redis] updateSession failed, switching to local fallback');
    }
  }

  localMemory.set(key, updated);
  return updated;
}

export async function pushHistory(
  callSid: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<void> {
  const session = await getSession(callSid);
  if (!session) return;

  const newHistory = [...session.history, { role, content }];
  if (newHistory.length > 20) {
    newHistory.shift();
  }

  const update: Partial<CallSession> = { history: newHistory };
  if (role === 'assistant') {
    update.lastAgentTurnTime = Date.now();
  }

  await updateSession(callSid, update);
}

export async function enrichSessionWithCustomer(
  callSid: string,
  supabaseClient: SupabaseClient
): Promise<void> {
  const session = await getSession(callSid);
  if (!session) return;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase timeout')), 3000)
    );

    const customerQueryPromise = supabaseClient
      .from('customers')
      .select('*')
      .eq('phone', session.callerPhone)
      .single();

    const customerResult = await Promise.race([
      customerQueryPromise,
      timeoutPromise,
    ]);

    const customer = customerResult.data;
    const customerError = customerResult.error;

    if (customerError || !customer) {
      console.log('[Memory][NEW_CALLER] ' + callSid);
      return;
    }

    const [ordersResult, ticketsResult] = await Promise.all([
      supabaseClient
        .from('orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabaseClient
        .from('service_tickets')
        .select('*')
        .eq('customer_id', customer.id)
        .in('status', ['Open', 'In Progress']),
    ]);

    await updateSession(callSid, {
      customerId: customer.customer_id,
      customerName: customer.name,
      customerBusinessType: customer.business_type,
      previousOrders: (ordersResult.data || []).map((o: any) => ({
        orderId: o.order_id,
        productId: o.product_id,
        deliveryStatus: o.delivery_status,
        installationStatus: o.installation_status,
        warrantyExpiry: o.warranty_expiry,
      })),
      openTickets: (ticketsResult.data || []).map((t: any) => ({
        ticketId: t.ticket_id,
        issueType: t.issue_type,
        description: t.description,
        status: t.status,
        priority: t.priority,
      })),
    });

    console.log('[Memory][ENRICHED] ' + callSid + ' — customer ' + customer.name + ' loaded');
  } catch (e) {
    console.warn('[Memory][ENRICH] ' + callSid + ' — timeout or error, skipping');
  }
}

export async function archiveSession(callSid: string): Promise<CallSession | null> {
  const session = await getSession(callSid);
  if (!session) return null;

  const archived = await updateSession(callSid, { archived: true });
  if (!archived) return null;

  const key = getRedisKey(callSid);

  if (isRedisAvailable) {
    try {
      await redis.expire(key, 300);
      console.log('[Memory][ARCHIVE] ' + callSid + ' — session archived');
      return archived;
    } catch (err) {
      isRedisAvailable = false;
      console.warn('[Redis] archiveSession failed, switching to local fallback');
    }
  }

  console.log('[Memory][ARCHIVE] ' + callSid + ' — session archived');
  return archived;
}

export async function deleteSession(callSid: string): Promise<void> {
  const key = getRedisKey(callSid);

  if (isRedisAvailable) {
    try {
      await redis.del(key);
      console.log('[Memory][DELETE] ' + callSid);
      return;
    } catch (err) {
      isRedisAvailable = false;
      console.warn('[Redis] deleteSession failed, switching to local fallback');
    }
  }

  localMemory.delete(key);
  console.log('[Memory][DELETE] ' + callSid);
}

export const sessionMemory = {
  async appendHistory(callSid: string, speaker: 'User' | 'Agent', text: string) {
    const role = speaker === 'User' ? 'user' : 'assistant';
    await pushHistory(callSid, role, text);
  },

  async getHistory(callSid: string) {
    const session = await getSession(callSid);
    if (!session) return [];
    return session.history.map((h) =>
      (h.role === 'user' ? 'User' : h.role === 'assistant' ? 'Agent' : 'System') + ': ' + h.content
    );
  },

  async clearSession(callSid: string) {
    await deleteSession(callSid);
  },

  async setState(callSid: string, state: Record<string, any>) {
    const session = await getSession(callSid);
    if (!session) {
      return;
    }
    const patch: Partial<CallSession> = {};
    if (state.lang) patch.lang = state.lang as 'hi' | 'en';
    if (state.intent) patch.intent = state.intent;
    if (state.callLogId) patch.callLogId = state.callLogId;
    if (state.customerName) patch.customerName = state.customerName;
    if (state.customerId) patch.customerId = state.customerId;
    if (state.turnIndex !== undefined) patch.turnIndex = state.turnIndex;
    if (state.interruptionBuffer !== undefined)
      patch.interruptionBuffer = state.interruptionBuffer;
    if (state.interruptionCount !== undefined)
      patch.interruptionCount = state.interruptionCount;
    if (state.lastAgentTurnTime !== undefined)
      patch.lastAgentTurnTime = state.lastAgentTurnTime;
    await updateSession(callSid, patch);
  },

  async getState(callSid: string) {
    const session = await getSession(callSid);
    if (!session) return null;
    return {
      lang: session.lang,
      intent: session.intent,
      callLogId: session.callLogId,
      customerName: session.customerName,
      customerId: session.customerId,
      turnIndex: session.turnIndex,
      interruptionBuffer: session.interruptionBuffer,
      interruptionCount: session.interruptionCount,
      lastAgentTurnTime: session.lastAgentTurnTime,
      history: session.history,
    };
  },

  async setMeta(callSid: string, meta: Record<string, any>) {
    const session = await getSession(callSid);
    if (!session) {
      const newSession = await initSession(callSid, meta.callerPhone || 'Unknown');
      if (meta.callLogId) {
        await updateSession(callSid, { callLogId: meta.callLogId });
      }
      return;
    }
    const patch: Partial<CallSession> = {};
    if (meta.callLogId) patch.callLogId = meta.callLogId;
    if (meta.callerPhone) patch.callerPhone = meta.callerPhone;
    if (meta.startTime) patch.startTime = meta.startTime;
    await updateSession(callSid, patch);
  },

  async getMeta(callSid: string) {
    const session = await getSession(callSid);
    if (!session) return null;
    return {
      callLogId: session.callLogId,
      callerPhone: session.callerPhone,
      startTime: session.startTime,
    };
  },
};

export default redis;

// TEST: initSession('CA001', '+919876543210') then initSession('CA002', '+919876543211')
// getSession('CA001') must NOT return CA002's data — they are independent namespaces
