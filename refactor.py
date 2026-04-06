import re
def refactor_main():
    with open('main.py', 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(
        r"client = genai\.Client\(api_key=GEMINI_API_KEY\)(.*?)response = client\.models\.generate_content\(\s*model='gemini-2\.5-flash',\s*contents=prompt,\s*\)",
        r"genai.configure(api_key=GEMINI_API_KEY)\1model = genai.GenerativeModel('gemini-1.5-flash')\n        response = model.generate_content(prompt)",
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r"client = genai\.Client\(api_key=api_key\)(.*?)response = client\.models\.generate_content\(\s*model='gemini-2\.5-flash',\s*contents=prompt,\s*\)",
        r"genai.configure(api_key=api_key)\1model = genai.GenerativeModel('gemini-1.5-flash')\n        response = model.generate_content(prompt)",
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r"client = genai\.Client\(api_key=api_key\)(.*?)response = client\.models\.generate_content\(\s*model='gemini-2\.5-flash',\s*contents=prompt,\s*\)",
        r"genai.configure(api_key=api_key)\1model = genai.GenerativeModel('gemini-1.5-flash')\n        response = model.generate_content(prompt)",
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r"client = genai\.Client\(api_key=GEMINI_API_KEY\)(.*?)response = client\.models\.generate_content\(\s*model='gemini-2\.5-flash',\s*contents=prompt,\s*\)",
        r"genai.configure(api_key=GEMINI_API_KEY)\1model = genai.GenerativeModel('gemini-1.5-flash')\n        response = model.generate_content(prompt)",
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r"client = genai\.Client\(api_key=GEMINI_API_KEY\)(.*?)response = client\.models\.generate_content\(\s*model='gemini-2\.5-flash',\s*contents=prompt,\s*\)",
        r"genai.configure(api_key=GEMINI_API_KEY)\1model = genai.GenerativeModel('gemini-1.5-flash')\n        response = model.generate_content(prompt)",
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r"client = genai\.Client\(api_key=GEMINI_API_KEY\)(.*?)response = client\.models\.generate_content\(\s*model='gemini-2\.5-flash',\s*contents=final_prompt,\s*\)",
        r"genai.configure(api_key=GEMINI_API_KEY)\1model = genai.GenerativeModel('gemini-1.5-flash')\n        response = model.generate_content(final_prompt)",
        content,
        flags=re.DOTALL
    )
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(content)
if __name__ == '__main__':
    refactor_main()
    print("Refactor complete.")