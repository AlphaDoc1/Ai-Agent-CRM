const fs = require("fs");
const path = require("path");
const http = require("http");

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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  console.log("--- STARTING SINGLE SCENARIO VOICE AGENT TEST ---");
  
  const turns = [
    "Hello",
    "I am doing good",
    "My name is Rajesh Sharma",
    "I have an issue with my order. The pocket is torn.",
    "My order ID is ORD1002",
    "No, that is all. Thank you!"
  ];

  let history = [];
  for (let i = 0; i < turns.length; i++) {
    const userMsg = turns[i];
    console.log(`\n[Turn ${i+1}] You say: "${userMsg}"`);
    
    if (i > 0) {
      console.log("Waiting 3.5 seconds to bypass API rate limits...");
      await sleep(3500);
    }
    
    try {
      const res = await postChat(userMsg, history);
      if (!res.success) {
        console.error("API error:", res.error);
        process.exit(1);
      }
      
      const agentReply = res.data?.response;
      console.log(`Agent replies: "${agentReply}"`);
      
      history.push(`User: ${userMsg}`);
      history.push(`Agent: ${agentReply}`);
    } catch (err) {
      console.error("Request failed:", err.message);
      process.exit(1);
    }
  }
  
  console.log("\n--- TEST RUN COMPLETE: ALL STEPS VERIFIED ---");
}

runTest();
