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

async function listTables() {
  console.log("Querying database tables from pg_catalog...");
  const { data, error } = await supabase.rpc("get_tables"); // Check if there is an rpc
  if (error) {
    console.log("RPC get_tables failed. Trying direct SQL query via Postgres...");
    // Let's run a query to select table names using a select on pg_tables
    // Wait, does Supabase JS client allow running arbitrary SQL directly without RPC?
    // No, but we can query standard tables if we have read access, or we can check with RPC.
  }
  
  // Let's try to query public.call_logs directly or inspect pg_catalog.pg_tables
  // Wait, let's try to select from information_schema.tables
  try {
    const { data: data2, error: error2 } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public");
    if (error2) {
      console.error("Error querying information_schema:", error2.message);
    } else {
      console.log("Tables in public schema:", data2.map(t => t.table_name));
    }
  } catch (e) {
    console.error("Exception listing tables:", e.message);
  }
}

listTables();
