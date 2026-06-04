# Step-by-Step AI Agent Call Flow Walkthrough

This guide explains the step-by-step lifecycle of a support call handled by the ShopEasy AI Agent. It details exactly what is happening behind the scenes from the moment the line is answered until the post-call processing completes.

---

## Step 1: Call Initiation & The Greeting
* **What the Customer Hears**: *"Hello! Thank you for contacting our customer service department. How can I assist you with your support inquiry today?"*
* **Under the Hood**:
  1. The user triggers the call. Twilio sends an HTTP POST webhook request to `/api/voice/incoming`.
  2. The server inserts a new record in the `call_logs` table (`status = 'in_progress'`, `source = 'voice'`).
  3. The server inserts Turn 0 (Agent Greeting) into the `call_turns` database table.
  4. The server creates an initial tracking record in the `call_analysis` table (`resolution_status = 'ACTIVE'`).
  5. The server returns XML (TwiML) instructing Twilio to speak the greeting using Polly's natural neural voice and gather speech response.

---

## Step 2: Name Introduction & Synchronization
* **Customer**: *"Hi, my name is Rajesh Sharma."*
* **Agent**: *"Thank you, Rajesh Sharma! How can I help you today? Please describe your issue."*
* **Under the Hood**:
  1. Twilio records the customer's answer, transcribes it in real-time, and sends the text to `/api/voice/respond`.
  2. The server queries the LLM engine to analyze the statement.
  3. The LLM extracts the customer name (`Rajesh Sharma`) and classifies the turn as an introduction (`OTHER`), not an issue.
  4. The server writes the User Turn to `call_turns` and appends it to the transcript log.
  5. The server updates the `call_logs` table, syncing the official caller name field to *"Rajesh Sharma"*.
  6. The agent writes Turn 2 (asking for issue description) and returns the TwiML speech response.

---

## Step 3: Intent Classification
* **Customer**: *"I have an issue with my order. It's wrong."*
* **Agent**: *"I understand, Rajesh Sharma. Could you please share your Order ID so I can look into this for you?"*
* **Under the Hood**:
  1. The customer's message is sent to `/api/voice/respond`.
  2. The LLM processes the message and classifies the intent:
     `[AI Agent] Classified issue as: ORDER_ISSUE`
  3. The server logs the turns, and updates the `call_analysis` table with the detected issue type (`ORDER_ISSUE`).
  4. Recognizing that order issues require an Order ID, the agent prompts the customer for their ID.

---

## Step 4: State Collection & Database Lookup (RAG)
* **Customer**: *"My order ID is ORD1002."*
* **Agent**: *"I see that your order ORD1002 was placed on 2026-05-15 and has been marked as delivered..."*
* **Under the Hood**:
  1. The customer speaks the Order ID.
  2. The AI agent extracts the Order ID (`ORD1002`) and triggers a direct query to the PostgreSQL `orders` table in Supabase.
  3. **Database Timeout Protection**: The query is wrapped in a 5-second timeout wrapper. If the database stalls, the agent will politely ask for a moment and retry, ensuring the line never goes silent.
  4. Once fetched, the database returns order details ( Levi's jeans, price 3299, delivered status, associated support ticket `TKT2001`).
  5. The server updates the `call_analysis` table (saving the detected order ID `ORD1002`).
  6. The agent synthesizes this data into a conversational explanation and asks if the customer needs anything else.

---

## Step 5: Topic Switching (Dynamic Intent Change)
* **Customer**: (Change of mind mid-flow) *"Actually, I want to change my account email first."*
* **Agent**: *"I understand, Rajesh Sharma. Let me help you with your account details. What is the new email address you'd like to use?"*
* **Under the Hood**:
  1. When the agent is expecting an Order ID or a confirmation, but the user says something matching a different flow, the intent classifier flags a topic switch:
     `[AI Agent] Topic switch detected! New topic: ACCOUNT_ISSUE. Resetting collected data.`
  2. The agent clears previously collected temporary values (such as order items or strikes) and updates the current state to `ACCOUNT_ISSUE`.
  3. It begins asking questions relative to the new flow.

---

## Step 6: Resolution or Escalation
* **Path A: Resolution (Call Ends)**:
  - **Customer**: *"No, that is all. Thank you!"*
  - **Agent**: *"Thank you for calling ShopEasy support, Rajesh Sharma. I hope your issue has been resolved. Have a great day! Goodbye!"*
  - **Under the Hood**: The status is flagged as `ENDED`, Twilio gets a `<Hangup/>` instruction, and the call disconnects.
* **Path B: Escalation (Lookup Failures or Frustration)**:
  - **Customer**: *"This is useless, connect me to a human."*
  - **Agent**: *"I completely understand your frustration, Rajesh Sharma. Let me connect you to a human agent right away."*
  - **Under the Hood**: The agent detects frustration, marks status as `ESCALATED`, pulls a real sequential Ticket ID from the DB sequence (`TKT3002`), inserts an urgent support ticket into the database, and triggers immediate transfer/hangup.

---

## Step 7: Post-Call Pipeline
* **What the Support Team Sees**: A notification alert pops up on the dashboard with a 2-sentence summary and classification of the call.
* **Under the Hood**:
  1. Once the call disconnects, a background task executes `processPostCall(callLogId)`.
  2. It compiles all conversation turns from `call_turns`.
  3. The LLM summarizes the transcript and classifies the category (e.g. `ORDER`).
  4. The server inserts a live notification alert into the `notifications` table.
  5. The server updates the call logs table, overwriting `call_logs.ai_summary` with the final, concise summary.
