const fs = require("fs");
const path = require("path");
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

async function checkCallLogs() {
  console.log("Fetching last 5 call logs...");
  const { data, error } = await supabase
    .from("call_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching call logs:", error.message);
  } else {
    console.log(`Retrieved ${data.length} logs:`);
    console.stringify = (obj) => JSON.stringify(obj, null, 2);
    data.forEach((log, index) => {
      console.log(`\n--- LOG ${index + 1} ---`);
      console.log(`Caller Phone: ${log.caller_phone}`);
      console.log(`Caller Name: ${log.caller_name}`);
      console.log(`Status: ${log.status}`);
      console.log(`Duration: ${log.duration_seconds}s`);
      console.log(`AI Summary: ${log.ai_summary}`);
      console.log(`Transcript Length: ${log.transcript ? log.transcript.length : 0} chars`);
    });
  }
}

checkCallLogs();
