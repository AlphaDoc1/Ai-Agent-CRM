# ============================================
# Outbound Call Trigger Utility
# Usage: python scripts/make_call.py <your_ngrok_url>
# ============================================
import sys
import os
import urllib.request
import urllib.parse
import base64

def make_call(ngrok_url):
    # Parse .env file manually to get credentials
    env_vars = {}
    env_path = os.path.join(os.getcwd(), ".env")
    if not os.path.exists(env_path):
        print("Error: .env file not found. Ensure you have created it in your project folder.")
        sys.exit(1)

    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                env_vars[key.strip()] = val.strip()

    account_sid = env_vars.get("TWILIO_ACCOUNT_SID")
    auth_token = env_vars.get("TWILIO_AUTH_TOKEN")
    twilio_number = env_vars.get("TWILIO_PHONE_NUMBER")

    # Hardcoded verified destination phone number from your console (Replace with your number)
    to_number = "+919999999999" 

    if not account_sid or not auth_token or not twilio_number:
        print("Error: Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER in .env file.")
        sys.exit(1)

    # Clean the input Ngrok URL and append the webhook path
    ngrok_url = ngrok_url.strip().rstrip("/")
    if not ngrok_url.startswith("http"):
        ngrok_url = "https://" + ngrok_url
    webhook_url = f"{ngrok_url}/api/voice/incoming"

    print(f"Initiating call from {twilio_number} to {to_number}...")
    print(f"Using Webhook URL: {webhook_url}")

    # Prepare Twilio REST API request
    api_url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls.json"
    
    data = urllib.parse.urlencode({
        "To": to_number,
        "From": twilio_number,
        "Url": webhook_url
    }).encode("utf-8")

    req = urllib.request.Request(api_url, data=data, method="POST")
    
    # Configure Basic Authentication
    auth_str = f"{account_sid}:{auth_token}"
    encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    req.add_header("Authorization", f"Basic {encoded_auth}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            print("\nSuccess! Call triggered successfully.")
            print("Your phone should start ringing in a few seconds.")
    except urllib.error.HTTPError as e:
        print(f"\nAPI Error: {e.code} - {e.reason}", file=sys.stderr)
        print(e.read().decode("utf-8"), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\nConnection Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # Get ngrok URL from arguments or ask user
    if len(sys.argv) < 2:
        ngrok_input = input("Enter your public Ngrok URL (e.g., https://xxxx.ngrok-free.dev): ")
        if not ngrok_input.strip():
            print("Error: Ngrok URL is required.")
            sys.exit(1)
        make_call(ngrok_input)
    else:
        make_call(sys.argv[1])
