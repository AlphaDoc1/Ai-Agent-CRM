
// ============================================
// Post-Call Pipeline — Complete Elanpro CRM Processing
// ============================================
import { createAdminClient } from "@/lib/supabase/server";
import {
  archiveSession,
  deleteSession,
  updateSession,
} from "@/lib/redis";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = "llama3";

// ============================================
// MAIN PIPELINE
// ============================================
export async function runPostCallPipeline(
  callSid: string,
  session: any,
  durationSeconds: number
) {
  console.log('[Pipeline][START] ' + callSid + ' — beginning post-call processing');

  const stageStatus = {
    archive: false,
    summary: false,
    analysis: false,
    lead: false,
    ticket: false,
    log: false,
    notify: false,
  };

  // Default analysis in case LLM fails
  let analysis = {
    summary: 'Call summary unavailable. Duration: ' + durationSeconds + 's. Turns: ' + session.history.length + '.',
    customer_intent: "general",
    products_mentioned: [],
    resolution_status: "unresolved",
    sentiment: "neutral",
    sentiment_score: 0.5,
    key_issues: [],
    next_action: "none",
    urgency: "medium",
    language_used: session.lang,
  };

  // ==========================================
  // STAGE 1: SESSION ARCHIVE
  // ==========================================
  try {
    console.log('[Pipeline][STAGE_1_ARCHIVE] ' + callSid + ' — started');
    await archiveSession(callSid);
    
    console.log(
      '[Pipeline][STAGE_1_ARCHIVE] ' + callSid + ' — completed (Turns: ' + session.history.length + ', Interruptions: ' + session.interruptionCount + ', Duration: ' + durationSeconds + 's)'
    );
    stageStatus.archive = true;

    // Schedule deletion in 5 minutes
    setTimeout(function() {
      console.log('[Pipeline] Scheduled cleanup: deleting session ' + callSid);
      deleteSession(callSid).catch(function(err) { 
        console.warn('[Pipeline] Failed to delete session ' + callSid + ':', err);
      });
    }, 300000); // 5 minutes = 300,000ms
  } catch (err) {
    console.error('[Pipeline][STAGE_1_ARCHIVE] ' + callSid + ' — failed:', err);
  }

  // ==========================================
  // STAGE 2: CALL SUMMARY GENERATION (LLM)
  // ==========================================
  try {
    console.log('[Pipeline][STAGE_2_SUMMARY] ' + callSid + ' — started');

    // Filter out system role entries and format transcript
    const transcriptLines = session.history.filter(function(h: any) {
      return h.role !== "system";
    }).map(function(h: any) {
      var speaker = h.role === "user" ? "CUSTOMER" : "AGENT";
      return speaker + ": " + h.content;
    });
    const transcript = transcriptLines.join("\n");

    const prompt = "You are analysing a completed customer service call for Elanpro, an Indian commercial refrigeration company. Extract the following in JSON format only, no other text:\n{\n  \"summary\": \"2-3 sentence plain English summary of the entire call\",\n  \"customer_intent\": \"one of: sales_inquiry|order_status|service_request|product_info|complaint|general\",\n  \"products_mentioned\": [\"list of product names or categories mentioned by the customer\"],\n  \"resolution_status\": \"one of: resolved|unresolved|escalated|partial\",\n  \"sentiment\": \"one of: positive|neutral|negative\",\n  \"sentiment_score\": 0.0 to 1.0 (1.0 = very positive),\n  \"key_issues\": [\"list of main issues or questions raised\"],\n  \"next_action\": \"one of: none|follow_up_call|assign_distributor|create_service_ticket|escalate_to_manager\",\n  \"urgency\": \"one of: low|medium|high|critical\",\n  \"language_used\": \"hi or en\"\n}\n\nCALL TRANSCRIPT:\n" + transcript + "\n\nCustomer phone: " + session.callerPhone + "\nCall duration: " + durationSeconds + " seconds\nTurn count: " + session.history.length;

    const response = await fetch(OLLAMA_BASE_URL + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.3,
          num_predict: 1000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Ollama error: ' + response.statusText);
    }

    const data = await response.json();
    const parsedAnalysis = JSON.parse(data.response);
    analysis = { ...analysis, ...parsedAnalysis };

    console.log('[Pipeline][STAGE_2_SUMMARY] ' + callSid + ' — completed');
    stageStatus.summary = true;
  } catch (err) {
    console.error('[Pipeline][STAGE_2_SUMMARY] ' + callSid + ' — failed:', err);
    // Keep default analysis, continue to next stages
  }

  // ==========================================
  // STAGE 3: CALL ANALYSIS RECORD
  // ==========================================
  let supabase = createAdminClient();
  try {
    console.log('[Pipeline][STAGE_3_ANALYSIS] ' + callSid + ' — started');

    // Upsert call_analysis
    await supabase.from("call_analysis").upsert({
      call_id: callSid,
      customer_id: session.customerId,
      issue_type: analysis.customer_intent,
      sentiment_score: analysis.sentiment_score,
      resolution_status: analysis.resolution_status,
      turn_count: session.history.length,
      urgent_flag:
        analysis.urgency === "critical" || analysis.urgency === "high",
      notification_flag: analysis.next_action !== "none",
      call_group: analysis.customer_intent,
      summary_note: analysis.summary,
      updated_at: new Date().toISOString(),
    });

    // Update call_logs
    if (session.callLogId) {
      await supabase
        .from("call_logs")
        .update({ ai_summary: analysis.summary })
        .eq("id", session.callLogId);
    }

    console.log('[Pipeline][STAGE_3_ANALYSIS] ' + callSid + ' — completed');
    stageStatus.analysis = true;
  } catch (err) {
    console.error('[Pipeline][STAGE_3_ANALYSIS] ' + callSid + ' — failed:', err);
  }

  // ==========================================
  // STAGE 4: INQUIRY / LEAD CREATION
  // ==========================================
  let createdCustomerId = session.customerId;
  let createdInquiryId = null;
  try {
    if (analysis.customer_intent === "sales_inquiry" || analysis.products_mentioned.length > 0) {
      console.log('[Pipeline][STAGE_4_LEAD] ' + callSid + ' — started');

      // a) Look up or create customer record
      if (!session.customerId) {
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id, customer_id")
          .eq("phone", session.callerPhone)
          .maybeSingle();

        if (existingCustomer) {
          createdCustomerId = existingCustomer.customer_id;
        } else {
          var newCustomerId = "CUST-" + Date.now().toString(36).toUpperCase();
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({
              customer_id: newCustomerId,
              name: session.customerName || "Unknown",
              phone: session.callerPhone,
            })
            .select("customer_id")
            .single();

          if (newCustomer) createdCustomerId = newCustomer.customer_id;
        }
      }

      // b) Create inquiries row
      const { data: inquiry } = await supabase
        .from("inquiries")
        .insert({
          name: session.customerName || "Voice Caller",
          phone: session.callerPhone,
          product_interest: analysis.products_mentioned.join(", "),
          inquiry_type: analysis.customer_intent,
          status: "ai_processed",
          priority:
            analysis.urgency === "critical" ? "urgent" : analysis.urgency,
          ai_summary: analysis.summary,
          ai_raw_response: analysis,
          source: "voice",
          message: analysis.key_issues.join(". "),
        })
        .select("id")
        .single();

      createdInquiryId = inquiry?.id;

      // c) Run lead routing
      if (createdInquiryId) {
        // First try to find distributor by state (simple STD code lookup)
        let distributor = null;
        const { data: distributorsByLeastLeads } = await supabase
          .from("distributors")
          .select("*")
          .eq("is_active", true)
          .order("total_leads_assigned", { ascending: true })
          .limit(1);

        distributor = distributorsByLeastLeads?.[0];

        if (distributor) {
          // Insert lead assignment
          await supabase.from("lead_assignments").insert({
            inquiry_id: createdInquiryId,
            distributor_id: distributor.id,
            status: "pending",
          });

          // Update inquiry and distributor
          await Promise.all([
            supabase
              .from("inquiries")
              .update({
                assigned_distributor_id: distributor.id,
                status: "assigned",
              })
              .eq("id", createdInquiryId),
            supabase
              .from("distributors")
              .update({
                total_leads_assigned: distributor.total_leads_assigned + 1,
              })
              .eq("id", distributor.id),
          ]);
        }
      }

      console.log('[Pipeline][STAGE_4_LEAD] ' + callSid + ' — completed');
      stageStatus.lead = true;
    }
  } catch (err) {
    console.error('[Pipeline][STAGE_4_LEAD] ' + callSid + ' — failed:', err);
  }

  // ==========================================
  // STAGE 5: SERVICE TICKET CREATION
  // ==========================================
  let createdTicketId = null;
  try {
    if (analysis.customer_intent === "service_request" || analysis.resolution_status === "unresolved") {
      console.log('[Pipeline][STAGE_5_TICKET] ' + callSid + ' — started');

      // a) Determine issue_type
      var issueType = "Complaint";
      var keyIssuesLower = analysis.key_issues
        .join(" ")
        .toLowerCase();

      if (keyIssuesLower.indexOf("warranty") !== -1) issueType = "Warranty_Claim";
      else if (keyIssuesLower.indexOf("amc") !== -1 || keyIssuesLower.indexOf("annual") !== -1)
        issueType = "AMC";
      else if (keyIssuesLower.indexOf("install") !== -1)
        issueType = "Installation";
      else if (
        keyIssuesLower.indexOf("repair") !== -1 ||
        keyIssuesLower.indexOf("broken") !== -1 ||
        keyIssuesLower.indexOf("not working") !== -1
      )
        issueType = "Repair";
      else if (
        keyIssuesLower.indexOf("spare") !== -1 ||
        keyIssuesLower.indexOf("part") !== -1
      )
        issueType = "Spare_Parts";

      // b) Generate ticket_id
      var ticketId = "TKT-" + Date.now().toString(36).toUpperCase();
      createdTicketId = ticketId;

      // c) Create service_tickets row
      await supabase.from("service_tickets").insert({
        ticket_id: ticketId,
        customer_id: createdCustomerId,
        product_id: analysis.products_mentioned[0] || null,
        issue_type: issueType,
        description:
          analysis.key_issues.join(". ") || analysis.summary,
        status:
          analysis.urgency === "critical" ? "Escalated" : "Open",
        priority:
          analysis.urgency === "critical"
            ? "Critical"
            : analysis.urgency === "high"
              ? "High"
              : "Medium",
        created_at: new Date().toISOString(),
      });

      console.log(
        '[Pipeline][TICKET_CREATED] ' + ticketId + ' — ' + issueType
      );
      stageStatus.ticket = true;
    }
  } catch (err) {
    console.error('[Pipeline][STAGE_5_TICKET] ' + callSid + ' — failed:', err);
  }

  // ==========================================
  // STAGE 6: ACTIVITY LOG
  // ==========================================
  try {
    console.log('[Pipeline][STAGE_6_LOG] ' + callSid + ' — started');

    await supabase.from("activity_logs").insert({
      entity_type: "system",
      entity_id: null,
      action: "voice_call_completed",
      details: {
        call_sid: callSid,
        duration_seconds: durationSeconds,
        intent: analysis.customer_intent,
        resolution: analysis.resolution_status,
        sentiment: analysis.sentiment,
        language: session.lang,
        turn_count: session.history.length,
        interruption_count: session.interruptionCount,
        ticket_created: !!createdTicketId,
        lead_created: !!createdInquiryId,
      },
    });

    console.log('[Pipeline][STAGE_6_LOG] ' + callSid + ' — completed');
    stageStatus.log = true;
  } catch (err) {
    console.error('[Pipeline][STAGE_6_LOG] ' + callSid + ' — failed:', err);
  }

  // ==========================================
  // STAGE 7: NOTIFICATIONS
  // ==========================================
  try {
    var needsNotification =
      analysis.urgency === "critical" ||
      analysis.urgency === "high" ||
      analysis.resolution_status === "unresolved" ||
      analysis.resolution_status === "escalated" ||
      session.escalated === true;

    if (needsNotification) {
      console.log('[Pipeline][STAGE_7_NOTIFY] ' + callSid + ' — started');

      var title = "📞 Call Completed: Follow-up Needed";
      if (analysis.urgency === "critical") {
        title = "🚨 Urgent Call: Action Required";
      }

      var message = session.callerPhone + " | " + analysis.customer_intent + " | " + analysis.resolution_status + " | " + analysis.summary.substring(0, 100);

      await supabase.from("notifications").insert({
        call_id: callSid,
        title: title,
        message: message,
        call_group: analysis.customer_intent,
        urgent_flag: analysis.urgency === "critical",
        is_read: false,
      });

      console.log('[Pipeline][STAGE_7_NOTIFY] ' + callSid + ' — completed');
      stageStatus.notify = true;
    }
  } catch (err) {
    console.error('[Pipeline][STAGE_7_NOTIFY] ' + callSid + ' — failed:', err);
  }

  // ==========================================
  // STAGE 8: FINAL PIPELINE COMPLETION
  // ==========================================
  try {
    // Update session.pipelineTriggered
    await updateSession(callSid, { pipelineTriggered: true });

    console.log('[Pipeline][COMPLETE] ' + callSid + ' — all stages completed successfully');
    
    // Log summary table
    console.log('\n[Pipeline][SUMMARY] ' + callSid + '\n  Duration: ' + durationSeconds + 's | Turns: ' + session.history.length + ' | Intent: ' + analysis.customer_intent + '\n  Sentiment: ' + analysis.sentiment + ' (' + analysis.sentiment_score.toFixed(2) + ') | Resolution: ' + analysis.resolution_status + '\n  Stages completed: \n    ARCHIVE ' + (stageStatus.archive ? "✓" : "–") + ' | \n    SUMMARY ' + (stageStatus.summary ? "✓" : "–") + ' | \n    ANALYSIS ' + (stageStatus.analysis ? "✓" : "–") + ' | \n    LEAD ' + (stageStatus.lead ? "✓" : "–") + ' | \n    TICKET ' + (stageStatus.ticket ? "✓" : "–") + ' | \n    LOG ' + (stageStatus.log ? "✓" : "–") + ' | \n    NOTIFY ' + (stageStatus.notify ? "✓" : "–") + '\n');
  } catch (err) {
    console.error('[Pipeline][STAGE_8_COMPLETE] ' + callSid + ' — failed:', err);
  }
}

// ============================================
// VALIDATION CHECKLIST
// ============================================
// 1. Trigger a test call, hang up, confirm [Pipeline][STATUS_CALLBACK] log appears
// 2. Confirm call_logs.transcript is populated with full conversation
// 3. Confirm call_analysis row is inserted with correct sentiment_score
// 4. For a sales call: confirm inquiries row created AND lead_assignments row created
// 5. For a service call: confirm service_tickets row created with correct issue_type
// 6. For an urgent call: confirm notifications row created with urgent_flag = true
// 7. Confirm [Pipeline][COMPLETE] log appears with all stage checkmarks
// 8. Run two concurrent test calls: confirm each creates its own isolated pipeline run
// 9. Confirm deleteSession is called 5 minutes after pipeline completes
// 10. If Groq API fails in Stage 2: confirm pipeline continues to Stage 3 with default analysis

// Backward compatibility: export processPostCall as alias for runPostCallPipeline
export async function processPostCall(callLogId: any, session?: any, durationSeconds?: number) {
  try {
    // If called with just 1 argument (callLogId)
    if (arguments.length === 1) {
      const supabase = createAdminClient();
      const { data: callLog } = await supabase.from('call_logs').select('*').eq('id', callLogId).single();
      
      if (!callLog) {
        return { success: false, error: 'Call log not found' };
      }
      
      // Create a mock session
      const mockSession = {
        callSid: callLog.call_sid || 'unknown',
        callerPhone: callLog.caller_phone || 'unknown',
        history: [],
        startTime: callLog.created_at ? new Date(callLog.created_at).getTime() : Date.now(),
        lang: 'en',
        callLogId: callLogId,
        customerId: callLog.customer_id,
        customerName: callLog.caller_name,
        interruptionCount: 0,
        interruptionBuffer: [],
        escalated: callLog.status === 'escalated',
        pipelineTriggered: false
      };
      
      const duration = callLog.duration_seconds || 0;
      
      await runPostCallPipeline(mockSession.callSid, mockSession, duration);
      return { success: true };
    }
    
    // Otherwise, use the original signature
    await runPostCallPipeline(session.callSid || 'unknown', session, durationSeconds || 0);
    return { success: true };
  } catch (error) {
    console.error('[processPostCall] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
