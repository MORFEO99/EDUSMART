import urllib.request
import json
import urllib.error

url = 'http://127.0.0.1:8000/api/auth/login/'
data = json.dumps({'demo_role':'estudiante'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    response = urllib.request.urlopen(req)
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.read().decode('utf-8'))
