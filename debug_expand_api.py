import requests
import json

url = "http://127.0.0.1:8000/api/expand"
payload = {
    "type": "udt",
    "udt_type": "Motor_Basic",
    "name": "Test",
    "cluster": "Cluster1",
    "address": "40001",
    "description": "Test Motor",
    "isTrend": True,
    "isAlarm": True
}

try:
    print(f"Sending to {url}...")
    print(json.dumps(payload, indent=2))
    r = requests.post(url, json=payload)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"Received {len(data)} children.")
        print(json.dumps(data[:2], indent=2)) # Print first 2
    else:
        print(r.text)
except Exception as e:
    print(e)
