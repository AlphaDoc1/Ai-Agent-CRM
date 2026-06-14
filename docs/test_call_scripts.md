# Elanpro AI Agent: Test Call Scripts

Use these scripts to verify the AI agent's performance across different scenarios. You can use the `/talk` page in the dashboard to conduct these tests.

---

## **Scenario 1: Product Inquiry (Sales Focus)**
*   **Goal:** Test if the AI accurately retrieves technical data from the catalog.
*   **Customer:** "Hi, I'm looking for a reach-in refrigerator for my restaurant."
*   **AI (Expected):** Should ask for your name first.
*   **Customer:** "My name is [Your Name]."
*   **AI (Expected):** "Thank you [Your Name]. We have several options. Are you looking for a single door or double door model?"
*   **Customer:** "I need a double door frost-free model."
*   **AI (Expected):** Should mention **EGN 1500 C4** or **EGN 1500 F4**.
*   **Key Specs to look for:** 1300 Ltrs capacity, -16 to -22C (Freezer) or 2 to 8C (Chiller), SS 304 certification.

---

## **Scenario 2: Order Status Check**
*   **Goal:** Test database lookup using the sample data.
*   **Customer:** "I want to check my order status."
*   **AI (Expected):** "I can help with that. May I have your Order ID starting with 'ORD'?"
*   **Customer:** "It's **ORD1001**."
*   **AI (Expected):** Should find the order for Rajesh Sharma. "I see your order for the EGN 1500 C4. It was delivered on May 1st, 2026, and installation is marked as completed."

---

## **Scenario 3: Company Information**
*   **Goal:** Test knowledge of Elanpro as a company.
*   **Customer:** "Where is Elanpro based and when was it founded?"
*   **AI (Expected):** "Elanpro is headquartered in Gurugram, Haryana, and was established in 2009. We have a manufacturing plant in Gujarat and 700+ channel partners across India."

---

## **Scenario 4: Service Complaint & Ticket Generation**
*   **Goal:** Test empathy and ticket creation logic.
*   **Customer:** "My freezer is making a loud noise and it's not cooling properly."
*   **AI (Expected):** "I'm very sorry to hear that. That sounds frustrating. Let me raise a service ticket for you. May I have your Order ID or Customer ID?"
*   **Customer:** "My ID is **CID001**."
*   **AI (Expected):** "Thank you. I have created a priority service ticket. Your Ticket ID is **TKT30xx**. A technician will contact you within 24 hours."

---

## **Scenario 5: Frustration & Escalation**
*   **Goal:** Test sentiment detection and transfer logic.
*   **Customer:** "This is taking too long. I want to talk to a real person right now!"
*   **AI (Expected):** "I completely understand your frustration. Let me connect you to our senior support supervisor right away." (System status should change to **ESCALATED**).

---

## **Scenario 6: Topic Switching**
*   **Goal:** Test if the AI can follow a change in conversation.
*   **Customer:** "I need information on Ice Machines."
*   **AI (Expected):** Provides info on Ice Machines.
*   **Customer:** "Actually, wait, I first need to check why my previous refund hasn't arrived."
*   **AI (Expected):** "I understand. Let's look into your payment issue first. Do you have a transaction ID or registered email?"

---

## **Test Call Checklist**
- [ ] Did the agent use your name?
- [ ] Did it avoid mentioning prices?
- [ ] Was the technical data (Ltrs, Temp, Material) correct?
- [ ] Did it end every response with "Is there anything else I can help you with?"
- [ ] Did it use the correct language script (e.g., Devanagari for Hindi)?
