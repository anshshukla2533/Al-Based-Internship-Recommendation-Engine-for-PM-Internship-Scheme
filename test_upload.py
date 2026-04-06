import requests
from reportlab.pdfgen import canvas
import traceback
c = canvas.Canvas("dummy.pdf")
c.drawString(100, 100, "I am a resume Python developer")
c.save()
url = "http://localhost:8001/analyze-resume"
files = {'file': ('dummy.pdf', open('dummy.pdf', 'rb'), 'application/pdf')}
data = {'location': 'Test', 'education': 'Test', 'preferred_sector': 'Test'}
try:
    response = requests.post(url, files=files, data=data)
    print("STATUS:", response.status_code)
    print("TEXT:", response.text)
except Exception as e:
    traceback.print_exc()