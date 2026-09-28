import urllib.request
import json
import urllib.error
import re

url = 'http://127.0.0.1:8000/api/auth/login/'
data = json.dumps({'demo_role':'estudiante'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    response = urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    html = e.read().decode('utf-8')
    match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    print("Title:", match.group(1).strip() if match else "No title")
    
    # Let's extract the exception value too, usually in an H1 or <pre class="exception_value">
    val = re.search(r'<pre class="exception_value">(.*?)</pre>', html, re.IGNORECASE | re.DOTALL)
    if val:
        print("Exception:", val.group(1).strip())
    else:
        # Fallback to h2
        h2 = re.search(r'<h2>(.*?)</h2>', html, re.IGNORECASE | re.DOTALL)
        if h2:
             print("Subtitle:", h2.group(1).strip())
