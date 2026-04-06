import re
def main():
    with open('main.py', 'r', encoding='utf-8') as f:
        content = f.read()
    if "from deep_translator import GoogleTranslator" not in content:
        content = content.replace("import google.generativeai as genai", "import google.generativeai as genai\nfrom deep_translator import GoogleTranslator")
    old_translate = """def translate_text_lightweight(text: str, dest_lang: str) -> str:
    \"\"\"Translate text using Gemini. Falls back to original on error.\"\"\"
    if not text or dest_lang == "en":
        return text
    if not GEMINI_API_KEY:
        return text
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        lang_name = LANG_MAP.get(dest_lang, dest_lang)
        prompt = f"Translate the following text to {lang_name}. Return ONLY the translated text, nothing else.\\n\\nText: {text}"
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Translation error: {e}")
    return text"""
    new_translate = """def translate_text_lightweight(text: str, dest_lang: str) -> str:
    \"\"\"Translate text using deep_translator for offline/free translations.\"\"\"
    if not text or dest_lang == "en":
        return text
    try:
        translated = GoogleTranslator(source='auto', target=dest_lang).translate(text)
        return translated if translated else text
    except Exception as e:
        print(f"Translation error: {e}")
    return text"""
    old_translate_content_re = r"def translate_content\(request: TranslationRequest\):.*?return \{\"translated_payload\": request\.payload, \"warning\": \"Translation failed, defaulting to English\.\"}"
    new_translate_content = """def translate_content(request: TranslationRequest):
    try:
        target = request.target_language
        if target == "en":
            return {"translated_payload": request.payload}
        translator = GoogleTranslator(source='auto', target=target)
        translated_payload = {}
        for k, v in request.payload.items():
            if isinstance(v, str):
                translated_payload[k] = translator.translate(v)
            else:
                translated_payload[k] = v
        return {"translated_payload": translated_payload}
    except Exception as e:
        print(f"Translation Error: {e}")
        return {"translated_payload": request.payload, "warning": "Translation failed, defaulting to English."}"""
    old_generate_dynamic = r"def generate_dynamic_questions\(skills: List\[str\], api_key: str, num_questions=3\):(.*?)last_error: Optional\[Exception\] = None"
    new_generate_dynamic = """def generate_dynamic_questions(skills: List[str], api_key: str, num_questions=3):
    OFFLINE_BANK = {
        "python": {"q": "What is a decorator in Python?", "options": ["A function modifying another", "A class", "A loop", "Data type"], "a": "A function modifying another"},
        "java": {"q": "What is the JVM?", "options": ["Java Virtual Machine", "Java Version", "Java Variable", "Java Void"], "a": "Java Virtual Machine"},
        "sql": {"q": "What does SQL JOIN do?", "options": ["Combines rows from tables", "Deletes data", "Sorts data", "Encrypts data"], "a": "Combines rows from tables"},
        "html": {"q": "What does HTML stand for?", "options": ["HyperText Markup Language", "Hyperlinks Text", "Home Tool", "Hyper Transfer"], "a": "HyperText Markup Language"},
        "communication": {"q": "What is active listening?", "options": ["Fully concentrating on what is being said", "Ignoring the speaker", "Talking constantly", "Writing emails"], "a": "Fully concentrating on what is being said"},
        "css": {"q": "What is CSS used for?", "options": ["Styling web pages", "Database Queries", "Server logic", "Machine Learning"], "a": "Styling web pages"},
        "excel": {"q": "What is a VLOOKUP?", "options": ["A formula to find data in a table", "A typing tool", "A spell checker", "A database system"], "a": "A formula to find data in a table"},
        "data entry": {"q": "Which is most important for Data Entry?", "options": ["Accuracy", "Complex coding", "Graphic design", "Video editing"], "a": "Accuracy"}
    }
    normalized_skills = _normalize_skills(skills)
    fallback_questions = []
    if normalized_skills:
        for sk in normalized_skills:
            for k, v in OFFLINE_BANK.items():
                if k in sk.lower():
                    if v not in fallback_questions:
                        fallback_questions.append(v)
    general_pool = [
        {"q": "What is the primary function of an operating system?", "options": ["Manage hardware", "Compile code", "Design UI", "Browse web"], "a": "Manage hardware"},
        {"q": "What is version control?", "options": ["Code tracking system", "Antivirus software", "Web browser", "Database"], "a": "Code tracking system"},
        {"q": "What does a database index do?", "options": ["Speeds up queries", "Encrypts data", "Deletes records", "Styles web pages"], "a": "Speeds up queries"}
    ]
    for g in general_pool:
        if len(fallback_questions) < num_questions:
            if g not in fallback_questions:
                fallback_questions.append(g)
    fallback_questions = fallback_questions[:num_questions]
    if not api_key:
        return fallback_questions
    if not normalized_skills:
        return fallback_questions
    last_error: Optional[Exception] = None"""
    content = content.replace(old_translate, new_translate)
    content = re.sub(old_translate_content_re, new_translate_content, content, flags=re.DOTALL)
    content = re.sub(old_generate_dynamic, new_generate_dynamic, content, flags=re.DOTALL)
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(content)
if __name__ == '__main__':
    main()