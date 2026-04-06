import re
def refactor2():
    with open('main.py', 'r', encoding='utf-8') as f:
        content = f.read()
    call_grok_text_def = """def _call_grok_text(prompt: str, *, system_instruction: Optional[str] = None, temperature: float = 0.2, max_output_tokens: int = 2048) -> str:
    if not grok_client:
        raise RuntimeError("XAI_API_KEY is missing")
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    try:
        response = grok_client.chat.completions.create(
            model="grok-beta",
            messages=messages,
            temperature=temperature,
            max_tokens=max_output_tokens,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Grok API text call error: {e}")
        raise
"""
    content = re.sub(r"(def _call_grok_structured.*?raise\n)", r"\1\n" + call_grok_text_def, content, flags=re.DOTALL)
    content = re.sub(r"_call_gemini_text\((.*?), [a-zA-Z_0-9]+,\s*(system_instruction=system_instruction, )?temperature=(.*?), max_output_tokens=(.*?)\)",
                     r"_call_grok_text(\1, \2temperature=\3, max_output_tokens=\4)", content)
    content = content.replace("GEMINI_API_KEY", "xai_api_key")
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(content)
if __name__ == '__main__':
    refactor2()