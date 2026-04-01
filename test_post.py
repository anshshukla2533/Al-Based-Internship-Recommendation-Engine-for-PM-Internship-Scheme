import requests
import traceback

with open("dummy.pdf", "w") as f:
    f.write("Broken PDF content")

url = "http://localhost:8001/analyze-resume"
try:
    with open("dummy.pdf", "rb") as f:
        files = {'file': ('dummy.pdf', f, 'application/pdf')}
        # no data passed!
        response = requests.post(url, files=files)
    print("STATUS:", response.status_code)
    print("TEXT:", response.text)
except Exception as e:
    traceback.print_exc()
