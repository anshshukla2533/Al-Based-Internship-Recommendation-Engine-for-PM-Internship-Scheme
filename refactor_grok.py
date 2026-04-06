import re
def refactor():
    with open('main.py', 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(r"from google import genai\nfrom google\.genai import types", "from openai import OpenAI", content)
    content = content.replace('GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")', 'xai_api_key = os.getenv("XAI_API_KEY")')
    old_startup = """if not GEMINI_API_KEY:
    print("[STARTUP] WARNING: No GEMINI_API_KEY found in .env.txt")
else:
    print("[STARTUP] Gemini API key loaded. Startup validation call skipped to avoid wasting quota.")"""
    new_startup = """grok_client = None
if xai_api_key:
    grok_client = OpenAI(
        api_key=xai_api_key,
        base_url="https://api.x.ai/v1",
    )
    print("[STARTUP] xAI Grok client initialized.")
else:
    print("[STARTUP] WARNING: No XAI_API_KEY found in .env.txt")"""
    content = content.replace(old_startup, new_startup)
    content = re.sub(r"DEFAULT_GEMINI_MODELS \= \[.*?\]\n", "", content, flags=re.DOTALL)
    content = re.sub(r"def _candidate_gemini_models\(\) -> List\[str\]:.*?(?=def _is_quota_error)", "", content, flags=re.DOTALL)
    content = re.sub(r"def _is_quota_error\(error: Exception\) -> bool:.*?(?=def _extract_pdf_text)", "", content, flags=re.DOTALL)
    old_call = r"def _call_gemini_structured\(prompt: str, schema_model: type\[BaseModel\], api_key: str, \*, system_instruction: Optional\[str\] = None, temperature: float = 0\.2, max_output_tokens: int = 2048\) -> BaseModel:.*?continue\n\n    if last_error:\n.*?raise last_error"
    new_call = """def _call_grok_structured(prompt: str, schema_model: type[BaseModel], *, system_instruction: Optional[str] = None, temperature: float = 0.2, max_output_tokens: int = 2048) -> BaseModel:
    if not grok_client:
        raise RuntimeError("XAI_API_KEY is missing")
    schema_text = schema_model.schema_json()
    full_prompt = f"{prompt}\\n\\nPlease strictly follow this JSON schema for your response:\\n{schema_text}"
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": full_prompt})
    print("Sending structured call to Grok-beta...")
    try:
        response = grok_client.chat.completions.create(
            model="grok-beta",
            messages=messages,
            response_format={"type": "json_object"},
            temperature=temperature,
            max_tokens=max_output_tokens,
        )
        content = response.choices[0].message.content.strip()
        parsed = json.loads(content)
        return schema_model.model_validate(parsed)
    except Exception as e:
        print(f"Grok API structured call error: {e}")
        raise"""
    old_call_regex = r"def _call_gemini_structured\(.*?(?=def _normalize_skills)"
    new_call_with_newline = new_call + "\n"
    content = re.sub(old_call_regex, new_call_with_newline, content, flags=re.DOTALL)
    content = content.replace("def extract_skills_with_gemini(", "def extract_skills_with_grok(")
    content = content.replace("_call_gemini_structured", "_call_grok_structured")
    content = content.replace("api_key=GEMINI_API_KEY,", "")
    old_chat_regex = r"@app\.post\(\"/agent-chat\"\)\nasync def agent_chat\(request: AgentChatRequest\):(.*?)return \{\"reply\": \"Sorry, I am facing connectivity issues. Please wait.\"}"
    new_chat = """@app.post("/agent-chat")
async def agent_chat(request: AgentChatRequest):
    if not grok_client:
        return {"reply": "Hi! Remember to set up XAI_API_KEY in .env.txt so I can help."}
    try:
        skills_str = ", ".join(request.user_skills) if request.user_skills else "none provided"
        lang_name = LANG_MAP.get(request.target_language, "English")
        system_instruction = f"You are a PM Internship scheme mentor. The applicant has skills: {skills_str}. Reply directly and strictly in {lang_name}."
        messages = [{"role": "system", "content": system_instruction}]
        for msg in request.messages[:-1]:
            role = "assistant" if msg.role == "Mentor" else "user"
            messages.append({"role": role, "content": msg.content})
        current_msg = request.messages[-1].content if request.messages else "Hello!"
        messages.append({"role": "user", "content": current_msg})
        response = grok_client.chat.completions.create(
            model="grok-beta",
            messages=messages,
        )
        return {"reply": response.choices[0].message.content.strip()}
    except Exception as e:
        print(f"[ERROR] agent-chat failed: {e}")
        return {"reply": "Sorry, I am facing connectivity issues. Please wait."}"""
    content = re.sub(old_chat_regex, new_chat, content, flags=re.DOTALL)
    content = content.replace("extract_skills_with_gemini(", "extract_skills_with_grok(")
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(content)
if __name__ == '__main__':
    refactor()