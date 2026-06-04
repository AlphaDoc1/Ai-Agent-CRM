# ============================================
# Outbound Click-to-Call API Test Utility
# Usage: python scripts/test_call.py
# ============================================
import urllib.request
import urllib.parse
import json
import sys

def test_click_to_call():
    print("--- CRM Click-to-Call API Terminal Tester ---")
    
    # 1. Inputs
    default_name = "Hemanth"
    default_phone = "+919999999999"
    
    name = input(f"Enter Caller Name [default: {default_name}]: ").strip() or default_name
    phone = input(f"Enter Phone Number (with country code) [default: {default_phone}]: ").strip() or default_phone
    
    print("\nSelect Call Type:")
    print("1. AI Sales & Inquiry Bot (default)")
    print("2. Customer Service Support")
    choice = input("Enter choice (1 or 2): ").strip()
    
    call_type = "service" if choice == "2" else "ai"
    
    payload = {
        "name": name,
        "phone": phone,
        "type": call_type
    }
    
    print(f"\nSending click-to-call request to Next.js API...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    # 2. Call local Next.js click-to-call API
    api_url = "http://localhost:3000/api/voice/click-to-call"
    data = json.dumps(payload).encode("utf-8")
    
    req = urllib.request.Request(
        api_url, 
        data=data, 
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            res_data = json.loads(res_body)
            print("\n🎉 Success! API responded:")
            print(json.dumps(res_data, indent=2))
            print("\nYour phone should ring shortly.")
            print("Since it is a Twilio Trial account, answer and press any key to connect the call.")
    except urllib.error.HTTPError as e:
        print(f"\n❌ API Error: {e.code} - {e.reason}", file=sys.stderr)
        try:
            err_body = e.read().decode("utf-8")
            print(json.dumps(json.loads(err_body), indent=2), file=sys.stderr)
        except Exception:
            print(err_body, file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Connection Error: {str(e)}", file=sys.stderr)
        print("Please check that your Next.js local server is running on http://localhost:3000", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    test_click_to_call()
