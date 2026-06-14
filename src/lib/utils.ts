// ============================================
// Utility Functions
// ============================================
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind CSS classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date string for display */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a date with time */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Capitalize first letter */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Truncate text to a max length */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}

/** Get status color for badges */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    ai_processed: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    assigned: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    converted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    closed: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    escalated: "bg-red-500/15 text-red-400 border-red-500/30",
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    accepted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return colors[status] || "bg-gray-500/15 text-gray-400 border-gray-500/30";
}

/** Get priority color */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return colors[priority] || "bg-gray-500/15 text-gray-400 border-gray-500/30";
}

/** Debounce function */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/** Resolve public URL dynamically, handling ngrok in localhost */
export async function resolvePublicUrl(request: Request): Promise<string> {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  let publicUrl = `${proto}://${host}`;

  // If localhost, try to resolve ngrok tunnel
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    try {
      // Use a timeout for the ngrok query to avoid hanging if ngrok isn't running
      const ngrokResponse = await fetch("http://127.0.0.1:4040/api/tunnels", { 
        signal: AbortSignal.timeout(1000) 
      });
      if (ngrokResponse.ok) {
        const ngrokData = await ngrokResponse.json();
        const publicTunnel = ngrokData.tunnels?.[0]?.public_url;
        if (publicTunnel) {
          publicUrl = publicTunnel;
          console.log(`[Telephony] Detected localhost. Resolved public Ngrok tunnel: ${publicUrl}`);
        }
      }
    } catch (err) {
      // ngrok not running or port 4040 not responding
      console.warn("[Telephony] Localhost detected but could not query Ngrok agent API on port 4040. Using fallback.");
    }
  }

  // Final check: if we're still on localhost but have a NEXT_PUBLIC_APP_URL, use that as last resort
  if (publicUrl.includes("localhost") && process.env.NEXT_PUBLIC_APP_URL) {
    publicUrl = process.env.NEXT_PUBLIC_APP_URL;
  }

  return publicUrl.replace(/\/$/, ""); // Remove trailing slash
}

/** Sleep utility */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wraps a promise with a timeout. Rejects with an Error if the promise does not resolve within the specified milliseconds. */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`DB_TIMEOUT: Operation timed out after ${ms}ms`)),
      ms
    );
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}
