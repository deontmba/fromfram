import urllib.request
import urllib.error
import json

data = json.dumps({"week_start_date": "2026-05-25"}).encode('utf-8')
req = urllib.request.Request("http://127.0.0.1:8001/forecast", data=data, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req)
    print("SUCCESS")
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"ERROR: {e}")
