const fs = require("fs");
const path = require("path");
const http = require("http");

// Read .env manually from the project root
const envPath = path.join(__dirname, "../.env");
if (!fs.existsSync(envPath)) {
  console.error("Could not find .env file at:", envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

// Helper to make POST request to Next.js API route
function postChat(message, history, callLogId = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ message, history, callLogId });
    const req = http.request("http://localhost:3000/api/voice/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runScenario(name, turns, assertions = {}) {
  console.log(`\n========================================`);
  console.log(`RUNNING SCENARIO: ${name}`);
  console.log(`========================================`);
  
  let history = [];
  let callLogId = null;
  let lastResponse = null;

  for (let i = 0; i < turns.length; i++) {
    const userMsg = turns[i];
    console.log(`\n[Turn ${i+1}] User: "${userMsg}"`);
    
    // Add small delay to prevent rate limits
    if (i > 0) {
      console.log("Waiting 3.5s to prevent rate limits...");
      await sleep(3500);
    }
    
    try {
      const start = Date.now();
      const res = await postChat(userMsg, history, callLogId);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      
      if (!res.success) {
        console.error(`API Error (after ${elapsed}s):`, res.error);
        return false;
      }
      
      const agentReply = res.data?.response;
      callLogId = res.data?.callLogId;
      lastResponse = res.data;
      
      console.log(`Agent (after ${elapsed}s): "${agentReply}"`);
      console.log(`Status: ${res.data?.status}`);
      console.log(`Metadata: ${JSON.stringify(res.data?.metadata)}`);
      
      // Update history for the next turn
      history.push(`User: ${userMsg}`);
      history.push(`Agent: ${agentReply}`);

      // Check turn-specific assertions
      if (assertions[i]) {
        const assertResult = assertions[i](res.data);
        if (assertResult !== true) {
          console.error(`\n❌ Turn ${i+1} Assertion failed: ${assertResult}`);
          return false;
        }
      }
    } catch (err) {
      console.error(`Request failed:`, err.message);
      return false;
    }
  }

  // Check final assertions if any
  if (assertions.final) {
    const assertResult = assertions.final(lastResponse);
    if (assertResult !== true) {
      console.error(`\n❌ Final assertion failed: ${assertResult}`);
      return false;
    }
  }
  
  console.log(`\n✅ Scenario PASSED!`);
  return true;
}

async function runTests() {
  console.log("--- STARTING E-COMMERCE CONVERSATION FLOW TESTS ---");

  // Scenario 1: Product query check
  const scenario1 = [
    "Hello",
    "I am doing good",
    "My name is Rajesh",
    "Is the OnePlus Nord CE 4 available?",
    "No, that's all. Thank you."
  ];
  const assert1 = {
    final: (res) => {
      if (res.status !== "ENDED") return `Expected status to be ENDED, got: ${res.status}`;
      return true;
    }
  };

  // Scenario 2: Order issue (damaged item ORD1002)
  const scenario2 = [
    "Hi there",
    "I'm fine",
    "Rajesh Sharma",
    "I have an issue with my order. It's damaged.",
    "My order ID is ORD1002",
    "No, that is all. Thank you!"
  ];
  const assert2 = {
    4: (res) => {
      const details = res.metadata;
      if (details.order_id !== "ORD1002") return `Expected order_id metadata to be ORD1002, got: ${details.order_id}`;
      if (details.issue_type !== "ORDER_ISSUE") return `Expected issue_type ORDER_ISSUE, got: ${details.issue_type}`;
      return true;
    },
    final: (res) => {
      if (res.status !== "ENDED") return `Expected status to be ENDED, got: ${res.status}`;
      return true;
    }
  };

  // Scenario 3: Payment/Refund issue (CID003 / ORD1005 with 2-strikes unresolvable lookup)
  const scenario3 = [
    "Hello",
    "I am doing great, how about you?",
    "Amit Verma",
    "I have a question about my refund",
    "I don't know my customer ID or email",
    "I don't have it either",
    "No, thank you."
  ];
  const assert3 = {
    5: (res) => {
      // Escalated due to lookup failures
      if (res.status !== "ESCALATED") return `Expected status to be ESCALATED, got: ${res.status}`;
      return true;
    },
    6: (res) => {
      if (res.status !== "ENDED") return `Expected status to be ENDED, got: ${res.status}`;
      return true;
    }
  };

  // Scenario 4: Customer frustration escalation
  const scenario4 = [
    "Hello",
    "I am doing okay",
    "Priya Patel",
    "This is useless, connect me to a human agent right now"
  ];
  const assert4 = {
    3: (res) => {
      if (res.status !== "ESCALATED") return `Expected status to be ESCALATED, got: ${res.status}`;
      return true;
    }
  };

  // Scenario 5: Damaged order classification (TEST_01)
  const scenario5 = [
    "Hello",
    "I am doing good",
    "My name is Rajesh",
    "no I have a damaged order"
  ];
  const assert5 = {
    3: (res) => {
      if (res.status !== "ACTIVE") return `Expected status to be ACTIVE, got: ${res.status}`;
      const reply = res.response.toLowerCase();
      if (!reply.includes("order id") && !reply.includes("order number")) {
        return `Expected agent to ask for order ID, got reply: "${res.response}"`;
      }
      return true;
    }
  };

  // Scenario 6: Name Greeting (TEST_02)
  const scenario6 = [
    "Hello",
    "I am doing good",
    "My name is Rajesh Sharma"
  ];
  const assert6 = {
    2: (res) => {
      if (res.status !== "ACTIVE") return `Expected status to be ACTIVE, got: ${res.status}`;
      const reply = res.response.toLowerCase();
      if (!reply.includes("rajesh sharma")) {
        return `Expected reply to greet Rajesh Sharma by name, got: "${res.response}"`;
      }
      if (res.metadata.issue_type) {
        return `Expected name introduction NOT to be classified as an issue, got issue_type: ${res.metadata.issue_type}`;
      }
      return true;
    }
  };

  // Scenario 7: Topic Switching (TEST_03)
  const scenario7 = [
    "Hello",
    "I am doing great",
    "Rajesh",
    "I want to request a refund",
    "actually my order is wrong"
  ];
  const assert7 = {
    3: (res) => {
      const reply = res.response.toLowerCase();
      if (!reply.includes("email") && !reply.includes("customer id")) {
        return `Expected agent to ask for email or customer ID for refund query, got: "${res.response}"`;
      }
      return true;
    },
    4: (res) => {
      const reply = res.response.toLowerCase();
      if (!reply.includes("order id") && !reply.includes("order number")) {
        return `Expected agent to switch topic and ask for order ID, got: "${res.response}"`;
      }
      if (reply.includes("email") || reply.includes("customer id")) {
        return `Expected agent NOT to ask for email again, got: "${res.response}"`;
      }
      if (res.metadata.issue_type !== "ORDER_ISSUE") {
        return `Expected issue_type to switch to ORDER_ISSUE, got: ${res.metadata.issue_type}`;
      }
      return true;
    }
  };

  // Scenario 8: Call end with exact goodbye (TEST_04)
  const scenario8 = [
    "Hello",
    "I am doing good",
    "Rajesh Sharma",
    "I have an issue with my order. It's damaged.",
    "My order ID is ORD1002",
    "ok bye"
  ];
  const assert8 = {
    final: (res) => {
      if (res.status !== "ENDED") return `Expected status to be ENDED, got: ${res.status}`;
      const reply = res.response.toLowerCase();
      if (!reply.includes("thank you for calling shopeasy support")) {
        return `Expected exact goodbye message containing "Thank you for calling ShopEasy support", got: "${res.response}"`;
      }
      return true;
    }
  };

  // Run all scenarios
  const scenarios = [
    { name: "Scenario 1: Product Query (OnePlus availability & goodbye)", turns: scenario1, assert: assert1 },
    { name: "Scenario 2: Order Issue (Damaged item ORD1002 & goodbye)", turns: scenario2, assert: assert2 },
    { name: "Scenario 3: Payment Refund Query (Customer CID003 2-strikes lookup & escalation)", turns: scenario3, assert: assert3 },
    { name: "Scenario 4: Customer Frustration (Escalation to human)", turns: scenario4, assert: assert4 },
    { name: "Scenario 5: Damaged Order Classification (TEST_01)", turns: scenario5, assert: assert5 },
    { name: "Scenario 6: Name Greeting (TEST_02)", turns: scenario6, assert: assert6 },
    { name: "Scenario 7: Topic Switching (TEST_03)", turns: scenario7, assert: assert7 },
    { name: "Scenario 8: Call end with exact goodbye (TEST_04)", turns: scenario8, assert: assert8 },
  ];

  for (const scen of scenarios) {
    const passed = await runScenario(scen.name, scen.turns, scen.assert);
    if (!passed) {
      console.error(`\n❌ SCENARIO FAILED: ${scen.name}`);
      process.exit(1);
    }
    console.log("\nWaiting 5s before next scenario...");
    await sleep(5000);
  }

  console.log("\n========================================");
  console.log("🎉 ALL E-COMMERCE SCENARIOS TESTED SUCCESSFULLY!");
  console.log("========================================");
}

// Small delay to make sure dev server is up if run concurrently
setTimeout(runTests, 2000);
