import re
def main():
    with open('main.py', 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("import google.generativeai as genai", "from google import genai\nfrom google.genai import types")
    startup_old = """    try:
        genai.configure(api_key=GEMINI_API_KEY)
        genai.GenerativeModel('gemini-2.5-flash').generate_content('test')
        print("[STARTUP] Gemini API key is VALID.")"""
    startup_new = """    try:
        _test_client = genai.Client(api_key=GEMINI_API_KEY)
        _test_client.models.generate_content(model='gemini-2.5-flash', contents='test')
        print("[STARTUP] Gemini API key is VALID.")"""
    content = content.replace(startup_old, startup_new)
    def_structured_old = r"def _call_gemini_structured\(prompt: str, schema_model: Any, api_key: str, \*, system_instruction: Optional\[str\] = None, temperature: float = 0\.2, max_output_tokens: int = 2048\):(.*?)(def _normalize_skills)"
    def_structured_new = """def _call_gemini_structured(prompt: str, schema_model: type[BaseModel], api_key: str, *, system_instruction: Optional[str] = None, temperature: float = 0.2, max_output_tokens: int = 2048) -> BaseModel:
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is missing")
    client = genai.Client(api_key=api_key)
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema_model,
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            ),
        )
        parsed = response.parsed
        if isinstance(parsed, schema_model):
            return parsed
        if isinstance(parsed, dict):
            return schema_model.model_validate(parsed)
        raise RuntimeError("Gemini returned an unexpected structured response")
    except Exception as e:
        print(f"Gemini API structured call error: {e}")
        raise
\\2"""
    content = re.sub(def_structured_old, def_structured_new, content, flags=re.DOTALL)
    for _ in range(5):
        match = re.search(r"genai\.configure\(api_key=(api_key|GEMINI_API_KEY)\)\s*model = genai\.GenerativeModel\('gemini-2\.5-flash'\)\s*response = model\.generate_content\((.*?)\)", content)
        if match:
            var_name = match.group(1)
            prompt_var = match.group(2)
            repl = f"client = genai.Client(api_key={var_name})\n        response = client.models.generate_content(model='gemini-2.5-flash', contents={prompt_var})"
            content = content[:match.start()] + repl + content[match.end():]
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(content)
if __name__ == '__main__':
    main()