# ShopEasy AI Support Agent: Client Overview & Business Pitch

Welcome to the **ShopEasy AI Support Agent**! This document provides a high-level overview of the product, its key features, how it works in practice, and the strategic value it brings to your business.

---

## 1. What is the ShopEasy AI Support Agent?

The ShopEasy AI Support Agent is an intelligent, voice-and-chat customer service representative that integrates directly with your store database and phone networks. It is designed to act just like a human support agent—answering phone calls, looking up orders, resolving delivery issues, checking stock, and answering questions 24 hours a day, 7 days a week, with zero wait times.

---

## 2. Key Features (The "Wow" Factors)

* **Personalized Greeting**: The AI agent asks for the customer's name and greets them personally throughout the call.
* **Database Integration (RAG)**: The agent has a direct link to your store database. If a customer provides an Order ID, the agent automatically looks up order dates, item descriptions, shipping status, and prior tickets.
* **Topic Switching**: If a customer changes their mind mid-call (e.g. starts inquiring about a refund, but then says *"actually my order is wrong"*), the AI handles the shift smoothly without getting stuck or repeating itself.
* **Automated Escalation & Real-Time Tickets**: If the AI cannot solve an issue (like if the customer's account can't be found after 2 attempts) or if the customer expresses frustration (e.g. asking for a manager), the AI automatically files an official support ticket (e.g. `TKT3002`) and bridges them to a human agent.
* **Post-Call Summaries**: As soon as a call ends, the AI categorizes the call, writes a 2-sentence summary note, and pushes a notification directly to the support team dashboard.

---

## 3. How the Live Demo Works (How to Show the Client)

Here is a step-by-step path to demonstrate the system to your client:

### Option A: Testing via the Web Dashboard (Mic)
1. Open the dashboard and click the **Web Mic** tab.
2. Click **Start Call** and allow microphone access.
3. Speak out loud to the AI: *"Hi, my name is Rajesh Sharma. I have a question about my refund."*
4. Introduce a topic switch: *"Actually, my order is wrong. It was damaged."*
5. Provide the Order ID: *"My order ID is ORD1002."*
6. Say *"ok bye"* to end the call, and watch the session save and close automatically.

### Option B: Testing via Phone Call (Real Telephony)
1. Go to the dashboard, and under the **Outbound** panel, enter your phone number.
2. Choose **Customer Service** as the route.
3. Click **Call My Phone Now**.
4. The system will trigger Twilio to ring your physical cell phone. Answer it and talk directly to the AI!

---

## 4. Business Value & Return on Investment (ROI)

* **70%+ Automation Rate**: The AI resolves standard repetitive queries (stock check, order status, basic FAQs) without any human intervention.
* **Zero Hold Times**: Customers get instant responses on their phones, drastically improving Customer Satisfaction (CSAT).
* **Supercharged Human Agents**: When issues are escalated, human support staff receive the call accompanied by a pre-written AI summary and ticket details. They don't waste time asking for name/order IDs again.
* **Reduced Support Costs**: Lower call volume means you save on staffing and support operations, especially during sales spikes or holiday rush periods.
