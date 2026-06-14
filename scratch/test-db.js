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

async function checkDatabase() {
  console.log("Checking tables in database...");
  
  const tables = ["customers", "products", "orders", "support_tickets", "inquiries", "distributors", "customer_codes", "call_analysis", "call_turns", "notifications", "call_logs"];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: 'exact', head: true });
      if (error) {
        console.log(`Table '${table}': ERROR/DOES NOT EXIST (${error.message})`);
      } else {
        console.log(`Table '${table}': EXISTS with ${count} rows`);
      }
    } catch (e) {
      console.log(`Table '${table}': EXCEPTION (${e.message})`);
    }
  }
}

checkDatabase();
