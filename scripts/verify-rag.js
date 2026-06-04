const fs = require("fs");
const path = require("path");
const http = require("http");
const { createClient } = require("@supabase/supabase-js");

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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Helper to make POST request to Next.js API route
function postChat(message, history) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ message, history });
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

async function runTests() {
  console.log("--- STARTING RAG & PRIVACY VERIFICATION TESTS ---");

  // 1. Insert temporary test data
  console.log("Inserting test inquiries...");
  const { data: savanInq, error: err1 } = await supabase.from("inquiries").insert({
    name: "Savan Kumar",
    email: "savan@example.com",
    product_interest: "Solar Inverters",
    status: "new",
    message: "I want to purchase high quality solar inverters for my warehouse.",
  }).select().single();

  const { data: aliceInq, error: err2 } = await supabase.from("inquiries").insert({
    name: "Alice Smith",
    email: "alice@example.com",
    product_interest: "Solar Batteries",
    status: "assigned",
    message: "Need quote for 10 solar batteries.",
  }).select().single();

  if (err1 || err2) {
    console.error("Failed to insert test inquiries:", { err1, err2 });
    process.exit(1);
  }
  console.log("Test data inserted successfully.", { savanId: savanInq.id, aliceId: aliceInq.id });

  let registeredCode = null;

  try {
    // TEST 1: Uniform initial interaction flow - Ask for 6-digit customer ID first
    console.log("\n[TEST 1] Querying without stating name or ID...");
    const res1 = await postChat("Who is the distributor in Karnataka?", []);
    console.log("Query: 'Who is the distributor in Karnataka?'");
    const resp1 = res1.data?.response;
    console.log("Response:", resp1);
    const askedCode = resp1.toLowerCase().includes("id") || resp1.toLowerCase().includes("code") || resp1.toLowerCase().includes("digit");
    console.log("Result:", askedCode ? "PASSED (Asked for customer ID)" : "FAILED");

    // TEST 2: Stating we don't have a code ("No")
    console.log("\n[TEST 2] Stating we do not have an ID...");
    const history2 = [
      "User: Who is the distributor in Karnataka?",
      `Agent: ${resp1}`
    ];
    const res2 = await postChat("No, I don't have a code", history2);
    console.log("Query: 'No, I don't have a code'");
    const resp2 = res2.data?.response;
    console.log("Response:", resp2);
    const askedName = resp2.toLowerCase().includes("name");
    console.log("Result:", askedName ? "PASSED (Asked for name)" : "FAILED");

    // TEST 3: Providing name to register and receive 6-digit code
    console.log("\n[TEST 3] Providing the name to register...");
    const history3 = [
      ...history2,
      "User: No, I don't have a code",
      `Agent: ${resp2}`
    ];
    const res3 = await postChat("My name is Savan Kumar", history3);
    console.log("Query: 'My name is Savan Kumar'");
    const resp3 = res3.data?.response;
    console.log("Response:", resp3);
    
    // Extract code
    const codeMatch = resp3.match(/(\d{6})/);
    registeredCode = codeMatch ? codeMatch[1] : null;
    console.log("Extracted Customer Code:", registeredCode);
    console.log("Result:", registeredCode ? "PASSED (Code registered successfully)" : "FAILED");

    if (!registeredCode) {
      throw new Error("Unable to proceed: Registration failed to return 6-digit code.");
    }

    // TEST 4: RAG lookup for owned inquiries using the code
    console.log("\n[TEST 4] Querying owned inquiry status using the new code...");
    const history4 = [
      ...history3,
      "User: My name is Savan Kumar",
      `Agent: ${resp3}`
    ];
    const res4 = await postChat("What is the status and product interest of my inquiry?", history4);
    console.log("Query: 'What is the status and product interest of my inquiry?'");
    const resp4 = res4.data?.response;
    console.log("Response:", resp4);
    const hasStatus = resp4.toLowerCase().includes("new") || resp4.toLowerCase().includes("inverter");
    console.log("Result:", hasStatus ? "PASSED (Retrieved owned inquiry details)" : "FAILED");

    // TEST 5: Privacy Guardrail - Refuse access to Alice's inquiry
    console.log("\n[TEST 5] Requesting non-owned personal data (Alice's inquiry)...");
    const history5 = [
      ...history4,
      "User: What is the status and product interest of my inquiry?",
      `Agent: ${resp4}`
    ];
    const res5 = await postChat("What is the status of Alice Smith's inquiry?", history5);
    console.log("Query: 'What is the status of Alice Smith's inquiry?'");
    const resp5 = res5.data?.response;
    console.log("Response:", resp5);
    const refusedAlice = resp5.toLowerCase().includes("cannot disclose") || resp5.toLowerCase().includes("sorry") || resp5.toLowerCase().includes("other customer");
    console.log("Result:", refusedAlice ? "PASSED (Refused access to non-owned data)" : "FAILED");

    // TEST 6: RAG lookup for public distributor info
    console.log("\n[TEST 6] Querying public distributor details...");
    const res6 = await postChat("Who is the distributor in Karnataka?", history5);
    console.log("Query: 'Who is the distributor in Karnataka?'");
    const resp6 = res6.data?.response;
    console.log("Response:", resp6);
    const hasDistributor = resp6.toLowerCase().includes("kumar") || resp6.toLowerCase().includes("bangalore");
    console.log("Result:", hasDistributor ? "PASSED (Retrieved public distributor data)" : "FAILED");

  } finally {
    // Clean up temporary test data
    console.log("\nCleaning up test inquiries...");
    await supabase.from("inquiries").delete().in("id", [savanInq.id, aliceInq.id]);
    if (registeredCode) {
      console.log(`Cleaning up customer code: ${registeredCode}`);
      await supabase.from("customer_codes").delete().eq("code", registeredCode);
    }
    console.log("Clean up finished. Test run complete.");
  }
}

runTests();

