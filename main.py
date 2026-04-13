from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from omnidimension import Client
from omnidimension.client import APIError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
try:

    import pdfplumber

except ImportError:

    pdfplumber = None

try:

    from pypdf import PdfReader as ModernPdfReader

except ImportError:

    ModernPdfReader = None

try:

    from PyPDF2 import PdfReader as LegacyPdfReader

except ImportError:

    LegacyPdfReader = None
import re
import json
import html
import os
import random
import hashlib
import requests
from io import BytesIO
from contextlib import contextmanager
from urllib.parse import urljoin
from dotenv import load_dotenv
try:
    from groq import Groq
except ImportError:
    Groq = None
from deep_translator import GoogleTranslator
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
DEFAULT_JOBS_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jobs.json")
try:
    from fetch_internships import (
        JOBS_JSON_PATH as SCRAPED_JOBS_JSON_PATH,
        PM_PORTAL_URL as SCRAPED_PM_PORTAL_URL,
        SOURCE_NAME as PM_SOURCE_NAME,
        fetch_and_save_internships,
        infer_skills as infer_pm_job_skills,
    )
except ImportError:
    SCRAPED_JOBS_JSON_PATH = DEFAULT_JOBS_JSON_PATH
    SCRAPED_PM_PORTAL_URL = "https://pminternship.mca.gov.in/"
    PM_SOURCE_NAME = "PM Internship Portal"
    fetch_and_save_internships = None
    infer_pm_job_skills = None
PM_PORTAL_URL = SCRAPED_PM_PORTAL_URL
JOBS_JSON_PATH = SCRAPED_JOBS_JSON_PATH
INTERNSHALA_BASE_URL = "https://internshala.com"
INTERNSHALA_SOURCE = "Internshala"
LANG_MAP = {
    "en": "English",
    "hi": "Hindi",
    "te": "Telugu",
    "mr": "Marathi",
    "ta": "Tamil",
}
DEFAULT_GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
]
DEFAULT_GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-8b-8192",
]
RESUME_ANALYSIS_CACHE: Dict[str, Dict[str, Any]] = {}
QUIZ_CACHE: Dict[str, List[Dict[str, Any]]] = {}
PM_JOBS_CACHE: Dict[str, Any] = {"mtime": None, "items": []}
EXTERNAL_INTERNSHIP_CACHE: Dict[str, List[Dict[str, Any]]] = {}
load_dotenv(".env.txt")
gemini_api_key = os.getenv("GEMINI_API_KEY")
groq_api_key = os.getenv("GROQ_API_KEY")
omnidim_api_key = os.getenv("OMNIDIMENSION_API_KEY")
agent_id = os.getenv("OMNIDIMENSION_AGENT_ID")
class ProxySafeOmniClient(Client):
    """Ignore broken machine-level proxy variables for OmniDimension requests."""
    def request(self, method, endpoint, params=None, headers=None, data=None, json_data=None):
        headers = headers or {}
        params = params or {}
        method = method.upper()
        headers.setdefault("Authorization", f"Bearer {self.api_key}")
        headers.setdefault("Content-Type", "application/json")
        headers.setdefault("Accept", "application/json")
        url = self.base_url + "/" + endpoint.lstrip("/")
        session = requests.Session()
        session.trust_env = False
        try:
            response = session.request(
                method=method,
                url=url,
                params=params,
                headers=headers,
                data=data,
                json=json_data,
                timeout=30,
            )
            response.raise_for_status()
            if method == "DELETE":
                json_response = {}
            else:
                json_response = response.json() if response.content else {}
            return {
                "status": response.status_code,
                "json": json_response,
            }
        except requests.exceptions.HTTPError as e:
            error_message = "Unknown error"
            error_data = {}
            try:
                error_data = e.response.json()
                error_message = error_data.get("error_description", error_data.get("error", str(e)))
            except (ValueError, AttributeError, KeyError):
                error_message = str(e)
            raise APIError(
                status_code=e.response.status_code,
                message=error_message,
                response=error_data,
            )
        except requests.exceptions.RequestException as e:
            raise APIError(status_code=0, message=f"Network error: {str(e)}")
omnidim_client = None
if omnidim_api_key:
    try:
        omnidim_client = ProxySafeOmniClient(api_key=omnidim_api_key)
    except TypeError:
        omnidim_client = ProxySafeOmniClient(omnidim_api_key)
groq_client = None
if groq_api_key and Groq is not None:
    groq_client = Groq(api_key=groq_api_key)
    print("[STARTUP] Groq client initialized.")
elif groq_api_key and Groq is None:
    print("[STARTUP] WARNING: GROQ_API_KEY is present but the groq package is not installed.")
else:
    print("[STARTUP] WARNING: No GROQ_API_KEY found in .env.txt")
if gemini_api_key:
    print("[STARTUP] Gemini fallback key loaded.")
else:
    print("[STARTUP] WARNING: No GEMINI_API_KEY found in .env.txt")
app = FastAPI(title="PM Internship Recommendation API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class ManualProfile(BaseModel):
    education: str
    location: str
    preferred_sector: str
    manual_skills: List[str]
class TranslationRequest(BaseModel):
    target_language: str
    payload: Dict[str, Any]
class AgentMessage(BaseModel):
    role: str
    content: str
class AgentChatRequest(BaseModel):
    messages: List[AgentMessage]
    user_skills: List[str]
    target_language: str
class InterviewPrepRequest(BaseModel):
    job_title: str
    company: str
    skills: List[str]
class LearningRecommendationRequest(BaseModel):
    job_title: Optional[str] = None
    company: str
    skills: List[str]
class DynamicJobsRequest(BaseModel):
    skills: List[str]
    location: str
    education: str
    preferred_sector: str
    target_language: str
    lang: Optional[str] = "en"
class VoiceRecommendRequest(BaseModel):
    """Payload from OmniDimension Voice AI.
    All fields are optional — the user may not mention every detail.
    `skills` can be a single comma-separated string or a list."""
    location: Optional[str] = None
    sector: Optional[str] = None
    skills: Optional[Any] = None
    education: Optional[str] = None
    lang: Optional[str] = "en"
class ResumeSkillsResponse(BaseModel):
    skills: List[str]
class QuizQuestionDraft(BaseModel):
    question: str
    correct_answer: str
    distractors: List[str]
class QuizQuestionsResponse(BaseModel):
    questions: List[QuizQuestionDraft]
class ResumeAnalysisResponse(BaseModel):
    skills: List[str]
    questions: List[QuizQuestionDraft]
class LearningRecommendationDraft(BaseModel):
    title: str
    difficulty: str
    acceptance: str
    topic: str
class LearningRecommendationsResponse(BaseModel):
    recommendations: List[LearningRecommendationDraft]
class JobTipsResponse(BaseModel):
    tips: List[str]
TARGET_SKILLS = {
    "Digital_Basics": ["data entry", "typing", "ms office", "excel", "word", "internet", "email"],
    "Vocational": ["agriculture", "wiring", "hardware", "plumbing", "mechanic", "welding", "carpentry", "solar"],
    "Logistics_Retail": ["inventory", "dispatch", "customer service", "packaging", "supply chain"],
    "Core_IT": ["python", "c++", "c", "java", "sql", "html", "networking", "troubleshooting"],
    "Healthcare_Basics": ["first aid", "sanitation", "patient care", "health records"]
}
COMMON_RESUME_SKILLS = [

    "python",

    "java",

    "c++",

    "c",

    "sql",

    "html",

    "css",

    "javascript",

    "react",

    "node.js",

    "excel",

    "ms office",

    "powerpoint",

    "word",

    "data entry",

    "typing",

    "basic computer",

    "customer service",

    "sales",

    "financial analysis",

    "accounting",

    "banking",

    "research",

    "field work",

    "teaching",

    "design",

    "canva",

    "photoshop",

    "video editing",

    "communication",

    "inventory",

    "dispatch",

    "supply chain",

    "packaging",

    "networking",

    "troubleshooting",

    "agriculture",

    "patient care",

    "health records",

]

def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()
def _dedupe_preserve(items: List[str]) -> List[str]:
    seen = set()
    result = []
    for item in items:
        key = item.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result

def _fallback_resume_skill_candidates() -> List[str]:

    candidates: List[str] = []

    for skills in TARGET_SKILLS.values():

        candidates.extend(skills)

    candidates.extend(COMMON_RESUME_SKILLS)

    try:

        for job in _load_pm_jobs():

            candidates.extend(_normalize_skills(job.get("skills", [])))

    except Exception as e:

        print(f"Resume skill fallback warning: {e}")

    return _dedupe_preserve([_clean_text(skill) for skill in candidates if _clean_text(skill)])

def _extract_resume_skills_fallback(text: str, limit: int = 8) -> List[str]:

    source_text = text or ""

    lowered = _clean_text(source_text).casefold()

    if not lowered:

        return []

    detected: List[str] = []

    explicit_blocks = re.findall(

        r"(?:technical skills|core skills|key skills|skills|tools|technologies)\s*[:\-]\s*([^\n\r]{10,400})",

        source_text,

        flags=re.IGNORECASE,

    )

    for block in explicit_blocks:

        for piece in re.split(r"[,|/;•]+", block):

            candidate = _clean_text(piece).strip(":-")

            if 2 <= len(candidate) <= 40:

                detected.append(candidate)

    for skill in _fallback_resume_skill_candidates():

        tokens = [token for token in re.split(r"[^a-z0-9+#.]+", skill.casefold()) if token]

        if not tokens:

            continue

        pattern = r"\b" + r"(?:[\s/&,+.-]+)".join(re.escape(token) for token in tokens) + r"\b"

        if re.search(pattern, lowered) or (len(tokens) > 1 and all(token in lowered for token in tokens)):

            detected.append(skill)

        if len(detected) >= limit * 3:

            break

    blocked = {

        "resume",

        "curriculum vitae",

        "skills",

        "technical skills",

        "key skills",

        "tools",

    }

    normalized = _normalize_skills(detected)

    return [skill for skill in normalized if skill.casefold() not in blocked][:limit]

def _fallback_resume_questions(skills: List[str], num_questions: int = 5, used_prompts: Optional[set[str]] = None) -> List[Dict[str, Any]]:

    prompts = used_prompts or set()

    normalized_skills = _normalize_skills(skills) or ["workplace communication"]

    generated: List[Dict[str, Any]] = []

    generic_wrong_answers = [

        "Skip the instructions and guess",

        "Wait for someone else to finish the task",

        "Ignore accuracy checks and submit quickly",

        "Avoid using the required tools",

    ]

    for idx in range(num_questions * 3):

        skill = normalized_skills[idx % len(normalized_skills)]

        question = f"Which option best shows practical knowledge of {skill}?"

        question_key = question.casefold()

        if question_key in prompts:

            continue

        prompts.add(question_key)

        correct = f"Use {skill} correctly to complete the assigned internship task"

        options = [correct, *generic_wrong_answers[:3]]

        random.SystemRandom().shuffle(options)

        generated.append({

            "q": question,

            "options": options,

            "a": correct,

        })

        if len(generated) >= num_questions:

            break

    return generated
def _strip_code_fences(text: str) -> str:
    return (text or "").replace("```json", "").replace("```", "").strip()
@contextmanager
def _disable_proxy_env():
    proxy_keys = [
        "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY",
        "http_proxy", "https_proxy", "all_proxy",
    ]
    previous_values = {key: os.environ.get(key) for key in proxy_keys}
    try:
        for key in proxy_keys:
            os.environ.pop(key, None)
        yield
    finally:
        for key, value in previous_values.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
def _has_llm_provider() -> bool:
    return bool(groq_client or gemini_api_key)
def _candidate_gemini_models() -> List[str]:
    configured = _clean_text(os.getenv("GEMINI_MODEL"))
    ordered: List[str] = []
    if configured:
        ordered.append(configured)
    ordered.extend(DEFAULT_GEMINI_MODELS)
    result: List[str] = []
    for model_name in ordered:
        if model_name and model_name not in result:
            result.append(model_name)
    return result
def _candidate_groq_models() -> List[str]:
    configured = _clean_text(os.getenv("GROQ_MODEL"))
    ordered: List[str] = []
    if configured:
        ordered.append(configured)
    ordered.extend(DEFAULT_GROQ_MODELS)
    result: List[str] = []
    for model_name in ordered:
        if model_name and model_name not in result:
            result.append(model_name)
    return result
def _extract_http_error_message(error: Exception) -> str:
    response = getattr(error, "response", None)
    if response is not None:
        try:
            payload = response.json()
            if isinstance(payload, dict):
                error_obj = payload.get("error")
                if isinstance(error_obj, dict):
                    return _clean_text(error_obj.get("message") or error_obj.get("error") or str(payload))
                return _clean_text(str(payload))
        except Exception:
            pass
    return _clean_text(str(error))
def _is_groq_fatal_error(error: Exception) -> bool:
    message = _extract_http_error_message(error).casefold()
    return (
        "invalid api key" in message
        or "unauthorized" in message
        or "authentication" in message
        or "insufficient_quota" in message
        or "billing" in message
        or "credit" in message
        or "invalid api key" in message
    )
def _humanize_groq_error(error: Exception, attempted_models: List[str]) -> str:
    message = _extract_http_error_message(error)
    lowered = message.casefold()
    attempted = ", ".join(attempted_models)
    if "model not found" in lowered:
        return f"Groq rejected the configured model. Tried these models: {attempted}."
    if "credit" in lowered or "billing" in lowered or "insufficient_quota" in lowered:
        return "Groq rejected the request because the account is out of credits or billing is not enabled."
    if "invalid api key" in lowered or "unauthorized" in lowered or "authentication" in lowered:
        return "GROQ_API_KEY was rejected by Groq. Please check that the saved Groq key is correct."
    return f"Groq request failed after trying models: {attempted}. Last error: {message}"
def _humanize_gemini_error(error: Exception, attempted_models: List[str]) -> str:
    message = _extract_http_error_message(error)
    lowered = message.casefold()
    attempted = ", ".join(attempted_models)
    if "resource_exhausted" in lowered or "quota" in lowered or "429" in lowered:
        return (
            "Gemini is configured but its quota is exhausted right now. "
            f"Tried these models: {attempted}."
        )
    if "api key not valid" in lowered or "permission denied" in lowered or "403" in lowered:
        return "GEMINI_API_KEY was rejected by Google. Please check the key and API access."
    if "model" in lowered and "not found" in lowered:
        return f"Gemini rejected the configured model. Tried these models: {attempted}."
    return f"Gemini request failed after trying models: {attempted}. Last error: {message}"
def _extract_gemini_text(response_json: Dict[str, Any]) -> str:
    candidates = response_json.get("candidates") or []
    for candidate in candidates:
        content = candidate.get("content") or {}
        for part in content.get("parts") or []:
            text = part.get("text")
            if text:
                return text
    raise RuntimeError("Gemini returned no text content")

def _normalize_language(target_language: str) -> str:
    lowered = _clean_text(target_language).casefold()
    mapping = {
        "en": "en",
        "english": "en",
        "hi": "hi",
        "hindi": "hi",
        "हिंदी": "hi",
        "हिंदी (hindi)": "hi",
        "te": "te",
        "telugu": "te",
        "తెలుగు": "te",
        "తెలుగు (telugu)": "te",
        "mr": "mr",
        "marathi": "mr",
        "मराठी": "mr",
        "मराठी (marathi)": "mr",
        "ta": "ta",
        "tamil": "ta",
        "தமிழ்": "ta",
        "தமிழ் (tamil)": "ta",
    }
    return mapping.get(lowered, "en")
def _call_groq_structured(prompt: str, schema_model: type[BaseModel], *, system_instruction: Optional[str] = None, temperature: float = 0.2, max_output_tokens: int = 2048) -> BaseModel:
    if not groq_client:
        raise RuntimeError("GROQ_API_KEY is missing")
    schema_text = schema_model.schema_json()
    full_prompt = f"{prompt}\\n\\nPlease strictly follow this JSON schema for your response:\\n{schema_text}"
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": full_prompt})
    last_error: Optional[Exception] = None
    attempted_models: List[str] = []
    for model_name in _candidate_groq_models():
        attempted_models.append(model_name)
        print(f"Sending structured call to Groq model: {model_name}")
        try:
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=temperature,
                max_tokens=max_output_tokens,
            )
            content = (response.choices[0].message.content or "").strip()
            parsed = json.loads(content)
            return schema_model.model_validate(parsed)
        except Exception as e:
            print(f"Groq structured call error on {model_name}: {e}")
            last_error = e
            if _is_groq_fatal_error(e):
                break
            continue
    raise RuntimeError(_humanize_groq_error(last_error, attempted_models)) from last_error
def _call_groq_text(prompt: str, *, system_instruction: Optional[str] = None, temperature: float = 0.2, max_output_tokens: int = 2048) -> str:
    if not groq_client:
        raise RuntimeError("GROQ_API_KEY is missing")
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    last_error: Optional[Exception] = None
    attempted_models: List[str] = []
    for model_name in _candidate_groq_models():
        attempted_models.append(model_name)
        try:
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_output_tokens,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as e:
            print(f"Groq text call error on {model_name}: {e}")
            last_error = e
            if _is_groq_fatal_error(e):
                break
            continue
    raise RuntimeError(_humanize_groq_error(last_error, attempted_models)) from last_error
def _call_gemini_structured(prompt: str, schema_model: type[BaseModel], *, system_instruction: Optional[str] = None, temperature: float = 0.2, max_output_tokens: int = 2048) -> BaseModel:
    if not gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is missing")
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            f"{prompt}\n\nReturn strict JSON matching this schema:\n"
                            f"{json.dumps(schema_model.model_json_schema(), ensure_ascii=False)}"
                        )
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "response_mime_type": "application/json",
        },
    }
    if max_output_tokens:
        payload["generationConfig"]["max_output_tokens"] = max_output_tokens
    if system_instruction:
        payload["system_instruction"] = {
            "parts": [
                {
                    "text": system_instruction
                }
            ]
        }
    last_error: Optional[Exception] = None
    attempted_models: List[str] = []
    for model_name in _candidate_gemini_models():
        attempted_models.append(model_name)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        session = requests.Session()
        session.trust_env = False
        try:
            response = session.post(
                url,
                headers={
                    "x-goog-api-key": gemini_api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=60,
            )
            response.raise_for_status()
            parsed = json.loads(_strip_code_fences(_extract_gemini_text(response.json())))
            return schema_model.model_validate(parsed)
        except Exception as e:
            print(f"Gemini structured call error on {model_name}: {e}")
            last_error = e
            continue
    raise RuntimeError(_humanize_gemini_error(last_error, attempted_models)) from last_error
def _call_gemini_text(prompt: str, *, system_instruction: Optional[str] = None, temperature: float = 0.2, max_output_tokens: int = 2048) -> str:
    if not gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is missing")
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
        },
    }
    if max_output_tokens:
        payload["generationConfig"]["max_output_tokens"] = max_output_tokens
    if system_instruction:
        payload["system_instruction"] = {
            "parts": [
                {
                    "text": system_instruction
                }
            ]
        }
    last_error: Optional[Exception] = None
    attempted_models: List[str] = []
    for model_name in _candidate_gemini_models():
        attempted_models.append(model_name)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        session = requests.Session()
        session.trust_env = False
        try:
            response = session.post(
                url,
                headers={
                    "x-goog-api-key": gemini_api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=60,
            )
            response.raise_for_status()
            return _strip_code_fences(_extract_gemini_text(response.json()))
        except Exception as e:
            print(f"Gemini text call error on {model_name}: {e}")
            last_error = e
            continue
    raise RuntimeError(_humanize_gemini_error(last_error, attempted_models)) from last_error
def _call_structured(prompt: str, schema_model: type[BaseModel], *, system_instruction: Optional[str] = None, temperature: float = 0.2, max_output_tokens: int = 2048) -> BaseModel:
    provider_errors: List[str] = []
    if groq_client:
        try:
            return _call_groq_structured(
                prompt,
                schema_model,
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
        except Exception as e:
            provider_errors.append(str(e))
    if gemini_api_key:
        try:
            return _call_gemini_structured(
                prompt,
                schema_model,
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
        except Exception as e:
            provider_errors.append(str(e))
    if provider_errors:
        raise RuntimeError(" | ".join(provider_errors))
    raise RuntimeError("No AI provider configured. Add GROQ_API_KEY or GEMINI_API_KEY.")
def _call_text(prompt: str, *, system_instruction: Optional[str] = None, temperature: float = 0.2, max_output_tokens: int = 2048) -> str:
    provider_errors: List[str] = []
    if groq_client:
        try:
            return _call_groq_text(
                prompt,
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
        except Exception as e:
            provider_errors.append(str(e))
    if gemini_api_key:
        try:
            return _call_gemini_text(
                prompt,
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
        except Exception as e:
            provider_errors.append(str(e))
    if provider_errors:
        raise RuntimeError(" | ".join(provider_errors))
    raise RuntimeError("No AI provider configured. Add GROQ_API_KEY or GEMINI_API_KEY.")
def _normalize_skills(skills: List[str]) -> List[str]:
    cleaned = []
    for skill in skills:
        normalized = _clean_text(skill)
        if normalized:
            cleaned.append(normalized)
    return _dedupe_preserve(cleaned)
def _extract_omnidim_payload(response: Any) -> Dict[str, Any]:
    if isinstance(response, dict):
        payload = response.get("json")
        if isinstance(payload, dict):
            return payload
        return response
    return {}
def _humanize_omnidim_error(error: Exception) -> str:
    message = _clean_text(str(error))
    lowered = message.casefold()
    status_code = getattr(error, "status_code", None)
    if "127.0.0.1:9" in message or "unable to connect to proxy" in lowered or "proxyerror" in lowered:
        return "OmniDimension requests are blocked by a broken local proxy configuration. The backend now bypasses system proxies for OmniDimension. Restart the server and try again."
    if status_code in {401, 403} or "unauthorized" in lowered or "forbidden" in lowered:
        return "OMNIDIMENSION_API_KEY was rejected by OmniDimension. Please check that the saved API key is valid for this OmniDimension account."
    if status_code == 404 and "/agents/" in message:
        return "OMNIDIMENSION_AGENT_ID does not match any agent in this OmniDimension account."
    return f"OmniDimension request failed: {message}"
def _get_omnidim_client() -> Client:
    if not omnidim_api_key:
        raise RuntimeError("OMNIDIMENSION_API_KEY is missing.")
    if not omnidim_client:
        raise RuntimeError("OmniDimension client could not be initialized. Check OMNIDIMENSION_API_KEY.")
    return omnidim_client
def _list_omnidim_agents(client: Client) -> List[Dict[str, Any]]:
    payload = _extract_omnidim_payload(client.agent.list(page=1, page_size=100))
    bots = payload.get("bots") or []
    return [bot for bot in bots if isinstance(bot, dict)]
def _resolve_omnidim_agent(client: Client) -> tuple[int, Optional[str], List[Dict[str, Any]]]:
    configured_agent_id = _clean_text(agent_id)
    if not configured_agent_id:
        raise RuntimeError("OMNIDIMENSION_AGENT_ID is missing.")
    bots = _list_omnidim_agents(client)
    if not bots:
        raise RuntimeError("No OmniDimension agents were found for this API key.")
    matched_bot = next((bot for bot in bots if str(bot.get("id")) == configured_agent_id), None)
    if matched_bot and matched_bot.get("id") is not None:
        return int(matched_bot["id"]), None, bots
    if len(bots) == 1 and bots[0].get("id") is not None:
        resolved_agent_id = int(bots[0]["id"])
        warning = (
            f"Configured OMNIDIMENSION_AGENT_ID '{configured_agent_id}' does not match any agent in this OmniDimension account. "
            f"Automatically using the only available agent ({resolved_agent_id})."
        )
        return resolved_agent_id, warning, bots
    available_agent_ids = ", ".join(str(bot.get("id")) for bot in bots if bot.get("id") is not None)
    raise RuntimeError(
        f"Configured OMNIDIMENSION_AGENT_ID '{configured_agent_id}' does not match any agent in this OmniDimension account. "
        f"Available agent IDs: {available_agent_ids or 'none'}."
    )
def _build_quiz_question(question: QuizQuestionDraft) -> Dict[str, Any]:
    prompt = _clean_text(question.question)
    correct_answer = _clean_text(question.correct_answer)
    distractors = _normalize_skills(question.distractors)
    distractors = [item for item in distractors if item.casefold() != correct_answer.casefold()]
    if not prompt or not correct_answer or len(distractors) < 3:
        raise ValueError("AI returned an incomplete quiz question")
    options = [correct_answer, distractors[0], distractors[1], distractors[2]]
    if len(_dedupe_preserve(options)) < 4:
        raise ValueError("AI returned duplicate quiz options")
    random.SystemRandom().shuffle(options)
    return {
        "q": prompt,
        "options": options,
        "a": next(option for option in options if option.casefold() == correct_answer.casefold()),
    }
def extract_skills_with_ai(text: str, api_key: str) -> List[str]:
    if not _has_llm_provider():
        raise RuntimeError("No AI provider configured. Add GROQ_API_KEY or GEMINI_API_KEY.")
    resume_text = _clean_text(text)
    if not resume_text:
        raise RuntimeError("Could not extract readable text from the PDF")
    try:
        response = _call_structured(
            prompt=(
                "Extract the 5 to 8 strongest resume-evidenced skills from the text below.\n"
                "Rules:\n"
                "- Prefer concrete skills, tools, technologies, platforms, methods, and domain abilities.\n"
                "- Do not include generic soft skills like communication, leadership, or hardworking unless the resume has no stronger skill evidence.\n"
                "- Use the exact skill names from the resume where possible.\n"
                "- Return only skills that are clearly supported by the resume text.\n\n"
                f"RESUME TEXT:\n{resume_text[:12000]}"
            ),
            schema_model=ResumeSkillsResponse,
            system_instruction="You extract only resume-supported skills and return strict JSON.",
            temperature=0.1,
            max_output_tokens=512,
        )
        skills = _normalize_skills(response.skills)
        if not skills:
            raise RuntimeError("AI returned no usable skills")
        return skills[:8]
    except Exception as e:
        print(f"LLM Extraction Error: {e}")
        raise RuntimeError("Skill extraction failed") from e

def generate_resume_analysis(text: str, api_key: str, num_questions: int = 5) -> Dict[str, Any]:

    resume_text = _clean_text(text)

    if not resume_text:

        raise RuntimeError("We could not read text from this PDF. Please upload a text-based PDF or use manual skill selection.")

    fallback_skills = _extract_resume_skills_fallback(text)

    if not _has_llm_provider():

        if fallback_skills:

            return {

                "skills": fallback_skills,

                "questions": _fallback_resume_questions(fallback_skills, num_questions=num_questions),

            }

        raise RuntimeError("No AI provider configured. Add GROQ_API_KEY or GEMINI_API_KEY.")

    try:

        response = _call_structured(

            prompt=(

                f"Read the resume text and do two tasks in one response.\n"

                f"1. Extract 5 to 8 strong, resume-supported skills.\n"

                f"2. Generate exactly {num_questions} interview MCQs based only on those extracted skills.\n"

                "Rules:\n"

                "- Prefer concrete tools, technologies, methods, and job skills over soft skills.\n"

                "- Every question must directly test one extracted skill.\n"

                "- For each question, provide one correct answer and exactly three plausible wrong answers.\n"

                "- Do not ask generic aptitude questions.\n"

                "- Use short, distinct answer options.\n"

                "- Avoid 'all of the above' and 'none of the above'.\n\n"

                f"RESUME TEXT:\n{resume_text[:12000]}"

            ),

            schema_model=ResumeAnalysisResponse,

            system_instruction="You extract resume-supported skills and generate matching interview MCQs in strict JSON.",

            temperature=0.25,

            max_output_tokens=3072,

        )

        skills = _normalize_skills(response.skills) or fallback_skills

        if not skills:

            raise RuntimeError("AI returned no usable skills")

        questions: List[Dict[str, Any]] = []

        seen_prompts: set[str] = set()

        for item in response.questions:

            try:

                built_question = _build_quiz_question(item)

            except Exception as e:

                print(f"Resume question fallback warning: {e}")

                continue

            prompt_key = built_question["q"].casefold()

            if prompt_key in seen_prompts:

                continue

            seen_prompts.add(prompt_key)

            questions.append(built_question)

        if len(questions) < num_questions:

            questions.extend(

                _fallback_resume_questions(

                    skills,

                    num_questions=num_questions - len(questions),

                    used_prompts=seen_prompts,

                )

            )

        if len(questions) < num_questions:

            raise RuntimeError(f"AI returned only {len(questions)} valid questions")

        return {"skills": skills[:8], "questions": questions[:num_questions]}

    except Exception as e:

        print(f"Resume analysis fallback warning: {e}")

        if fallback_skills:

            return {

                "skills": fallback_skills,

                "questions": _fallback_resume_questions(fallback_skills, num_questions=num_questions),

            }

        raise RuntimeError("Resume analysis failed. Please upload a clearer text-based PDF or use manual skill selection.") from e


CITY_TO_STATE = {
    "mumbai": "maharashtra",
    "pune": "maharashtra",
    "delhi": "delhi",
    "bangalore": "karnataka",
    "bengaluru": "karnataka",
    "hyderabad": "telangana",
    "chennai": "tamil nadu",
    "kolkata": "west bengal",
    "noida": "uttar pradesh",
    "ahmedabad": "gujarat",
    "jaipur": "rajasthan",
}
def _tokenize_for_match(value: Any) -> List[str]:
    return re.findall(r"[a-z0-9\+#&]+", _clean_text(value).casefold())
def _job_search_text(job: Dict[str, Any]) -> str:
    return _clean_text(" ".join([
        _clean_text(job.get("title")),
        _clean_text(job.get("company")),
        _clean_text(job.get("sector")),
        _clean_text(job.get("field")),
        _clean_text(job.get("location")),
        _clean_text(job.get("education")),
        " ".join(_normalize_skills(job.get("skills", []))),
        _clean_text(job.get("description")),
        _clean_text(job.get("source")),
    ]))
def _is_pm_portal_job(job: Dict[str, Any]) -> bool:
    apply_url = _clean_text(job.get("apply_url")).casefold()
    source = _clean_text(job.get("source")).casefold()
    description = _clean_text(job.get("description")).casefold()
    return (
        "pminternship.mca.gov.in" in apply_url
        or "pm internship" in source
        or "pm internship" in description
    )
def _normalize_pm_job_record(job: Dict[str, Any]) -> Dict[str, Any]:
    normalized_job = dict(job)
    normalized_job["source"] = _clean_text(job.get("source")) or PM_SOURCE_NAME
    normalized_job["apply_url"] = _clean_text(job.get("apply_url")) or PM_PORTAL_URL
    normalized_job["field"] = _clean_text(job.get("field"))
    existing_skills = _normalize_skills(job.get("skills", []))
    meaningful_skills = [
        skill for skill in existing_skills
        if skill.casefold() not in {"communication", "on-the-job training", "general skills"}
    ]
    if infer_pm_job_skills is not None and len(meaningful_skills) < 2:
        rebuilt_skills = infer_pm_job_skills(
            _clean_text(job.get("title")),
            _clean_text(job.get("sector")),
            _clean_text(job.get("field")),
        )
        normalized_job["skills"] = rebuilt_skills[:6] if rebuilt_skills else existing_skills
    else:
        normalized_job["skills"] = existing_skills
    return normalized_job
def _dedupe_pm_jobs(jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    deduped: Dict[str, Dict[str, Any]] = {}
    for job in jobs:
        if not isinstance(job, dict):
            continue
        job = _normalize_pm_job_record(job)
        if not _is_pm_portal_job(job):
            continue
        key = "|".join([
            _clean_text(job.get("title")).casefold(),
            _clean_text(job.get("company")).casefold(),
            _clean_text(job.get("location")).casefold(),
        ])
        if not key.strip("|"):
            continue
        existing = deduped.get(key)
        if existing is None or len(_job_search_text(job)) > len(_job_search_text(existing)):
            deduped[key] = job
    return list(deduped.values())
def _load_pm_jobs(force_refresh: bool = False) -> List[Dict[str, Any]]:
    current_mtime = os.path.getmtime(JOBS_JSON_PATH) if os.path.exists(JOBS_JSON_PATH) else None
    if not force_refresh and PM_JOBS_CACHE["items"] and PM_JOBS_CACHE["mtime"] == current_mtime:
        return PM_JOBS_CACHE["items"]
    data: Optional[List[Dict[str, Any]]] = None
    refresh_error: Optional[Exception] = None
    if force_refresh and fetch_and_save_internships is not None:
        try:
            data = fetch_and_save_internships()
        except Exception as e:
            refresh_error = e
    if data is None:
        try:
            with open(JOBS_JSON_PATH, "r", encoding="utf-8") as f:
                loaded = json.load(f)
            if isinstance(loaded, list):
                data = loaded
        except Exception as e:
            refresh_error = refresh_error or e
    if data is None and fetch_and_save_internships is not None:
        try:
            data = fetch_and_save_internships()
        except Exception as e:
            refresh_error = refresh_error or e
    if data is None:
        raise RuntimeError(f"Could not load PM internships: {refresh_error}")
    pm_jobs = _dedupe_pm_jobs(data)
    if not pm_jobs:
        raise RuntimeError("No PM Internship Scheme listings are available in jobs.json right now.")
    PM_JOBS_CACHE["items"] = pm_jobs
    PM_JOBS_CACHE["mtime"] = os.path.getmtime(JOBS_JSON_PATH) if os.path.exists(JOBS_JSON_PATH) else current_mtime
    return pm_jobs
def _match_user_skills_to_job(user_skills: List[str], job: Dict[str, Any]) -> List[str]:
    job_text = _job_search_text(job).casefold()
    matched_skills: List[str] = []
    for skill in _normalize_skills(user_skills):
        normalized_skill = skill.casefold()
        if not normalized_skill:
            continue
        if normalized_skill in job_text:
            matched_skills.append(skill)
            continue
        tokens = [token for token in _tokenize_for_match(normalized_skill) if len(token) > 2]
        if len(tokens) > 1 and all(token in job_text for token in tokens):
            matched_skills.append(skill)
            continue
        if len(tokens) == 1 and tokens[0] in job_text:
            matched_skills.append(skill)
    return _dedupe_preserve(matched_skills)
def _preferred_sector_matches_job(preferred_sector: str, job: Dict[str, Any]) -> bool:
    normalized_sector = _clean_text(preferred_sector).casefold()
    if normalized_sector in {"", "any", "all sectors"}:
        return False
    haystack = f"{_clean_text(job.get('sector'))} {_clean_text(job.get('field'))} {_clean_text(job.get('title'))}".casefold()
    if normalized_sector in haystack:
        return True
    tokens = [token for token in _tokenize_for_match(normalized_sector) if len(token) > 2]
    return bool(tokens) and all(token in haystack for token in tokens)
def _preferred_location_matches_job(preferred_location: str, job: Dict[str, Any]) -> bool:
    normalized_location = _clean_text(preferred_location).casefold()
    if normalized_location in {"", "india", "india (any)", "any", "remote"}:
        return False
    mapped_location = CITY_TO_STATE.get(normalized_location, normalized_location)
    job_location = _clean_text(job.get("location")).casefold()
    return (
        normalized_location in job_location
        or mapped_location in job_location
        or job_location in {normalized_location, mapped_location}
    )
def _education_matches_job(education: str, job: Dict[str, Any]) -> bool:
    normalized_education = _clean_text(education).casefold()
    job_education = _clean_text(job.get("education")).casefold()
    if not normalized_education or not job_education:
        return False
    return normalized_education in job_education or job_education in normalized_education
def _slugify_term(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", _clean_text(value).casefold()).strip("-")
def _extract_html_text(fragment: str) -> str:
    cleaned = re.sub(r"<[^>]+>", " ", fragment or "")
    cleaned = html.unescape(cleaned).replace("\xa0", " ")
    cleaned = cleaned.replace("₹", "Rs ").replace("? ", "Rs ")
    return _clean_text(cleaned)
def _extract_first_match(pattern: str, text: str, flags: int = re.S) -> str:
    match = re.search(pattern, text, flags)
    return match.group(1) if match else ""
def _candidate_external_terms(user_profile: Dict[str, Any], user_skills: List[str]) -> List[str]:
    blocked = {"communication", "general skills", "on-the-job training"}
    preferred_sector = _clean_text(user_profile.get("preferred_sector"))
    terms = [skill for skill in _normalize_skills(user_skills) if skill.casefold() not in blocked]
    if preferred_sector and preferred_sector.casefold() not in {"any", "all sectors"}:
        terms.append(preferred_sector)
    if not terms:
        terms.append("internship")
    deduped = []
    seen = set()
    for term in terms:
        key = term.casefold()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(term)
    return deduped[:3]
def _candidate_internshala_urls(user_profile: Dict[str, Any], user_skills: List[str]) -> List[str]:
    location = _clean_text(user_profile.get("location"))
    location_slug = _slugify_term(location)
    if location.casefold() in {"", "india", "india (any)", "any"}:
        location_slug = ""
    terms = _candidate_external_terms(user_profile, user_skills)
    urls: List[str] = []
    for term in terms:
        term_slug = _slugify_term(term)
        if not term_slug:
            continue
        if location_slug:
            urls.append(f"{INTERNSHALA_BASE_URL}/internships/{term_slug}-internship-in-{location_slug}/")
            urls.append(f"{INTERNSHALA_BASE_URL}/internships/work-from-home-{term_slug}-internship-in-{location_slug}/")
        urls.append(f"{INTERNSHALA_BASE_URL}/internships/{term_slug}-internship/")
        urls.append(f"{INTERNSHALA_BASE_URL}/internships/work-from-home-{term_slug}-internship/")
        urls.append(f"{INTERNSHALA_BASE_URL}/internships/keywords-{term_slug}/")
    deduped_urls = []
    seen = set()
    for url in urls:
        if url in seen:
            continue
        seen.add(url)
        deduped_urls.append(url)
    return deduped_urls[:6]
def _parse_internshala_listings(page_html: str, default_sector: str = "General") -> List[Dict[str, Any]]:
    blocks = re.findall(
        r'(<div class="container-fluid individual_internship.*?)(?=<div class="container-fluid individual_internship|\Z)',
        page_html,
        flags=re.S,
    )
    listings: List[Dict[str, Any]] = []
    for idx, block in enumerate(blocks):
        title = _extract_html_text(_extract_first_match(r'<a class="job-title-href"[^>]*>(.*?)</a>', block))
        company = _extract_html_text(_extract_first_match(r'<p class="company-name">\s*(.*?)\s*</p>', block))
        href = _extract_first_match(r'data-href=[\'"]?([^\'"\s>]+)', block)
        location_block = _extract_first_match(r'<div class="row-1-item locations">(.*?)</div>\s*<!-- /location -->', block)
        location_parts = re.findall(r'<a>(.*?)</a>', location_block, flags=re.S)
        location = _clean_text(", ".join(_extract_html_text(part) for part in location_parts if _extract_html_text(part)))
        if not location:
            location = _extract_html_text(location_block) or "India"
        stipend = _extract_html_text(_extract_first_match(r"<span class='stipend'>(.*?)</span>", block))
        duration = _extract_html_text(_extract_first_match(r'<div class="row-1-item">\s*<i class="ic-16-calendar"></i>\s*<span>(.*?)</span>', block))
        description = _extract_html_text(_extract_first_match(r'<div class="about_job">.*?<div class="text">\s*(.*?)\s*</div>\s*</div>', block))
        posted = _extract_html_text(_extract_first_match(r'<div class="status-info">.*?<span>(.*?)</span>', block))
        skill_matches = re.findall(r"<div class='job_skill'>(.*?)</div>", block, flags=re.S)
        skills = _normalize_skills([_extract_html_text(skill) for skill in skill_matches if _extract_html_text(skill)])
        if not title or not company or not href:
            continue
        sector = default_sector if _clean_text(default_sector) and _clean_text(default_sector).casefold() not in {"any", "all sectors"} else "General"
        listings.append({
            "id": f"internshala-{idx + 1}",
            "title": title,
            "company": company,
            "location": location,
            "sector": sector,
            "field": duration,
            "education": "Any",
            "description": _clean_text(" ".join(part for part in [description, stipend, duration, posted] if part)),
            "skills": skills[:8],
            "apply_url": urljoin(INTERNSHALA_BASE_URL, href),
            "source": INTERNSHALA_SOURCE,
        })
    return listings
def _score_external_job(job: Dict[str, Any], user_profile: Dict[str, Any], user_skills: List[str]) -> Dict[str, Any]:
    matched_skills = _match_user_skills_to_job(user_skills, job)
    sector_match = _preferred_sector_matches_job(user_profile.get("preferred_sector", ""), job)
    location_match = _preferred_location_matches_job(user_profile.get("location", ""), job)
    education_match = _education_matches_job(user_profile.get("education", ""), job)
    score = 35 + (len(matched_skills) * 14)
    if sector_match:
        score += 12
    if location_match:
        score += 10
    if education_match:
        score += 4
    if not matched_skills and (sector_match or location_match):
        score = max(score, 48)
    job["matched_skills"] = matched_skills
    job["match_score"] = max(25, min(95, score))
    return job
def _fetch_internshala_internships(user_profile: Dict[str, Any], user_skills: List[str], max_results: int = 5) -> List[Dict[str, Any]]:
    cache_key = "|".join([
        _clean_text(user_profile.get("location")).casefold(),
        _clean_text(user_profile.get("preferred_sector")).casefold(),
        ",".join(skill.casefold() for skill in _normalize_skills(user_skills)),
    ])
    cached = EXTERNAL_INTERNSHIP_CACHE.get(cache_key)
    if cached:
        return cached[:max_results]
    urls = _candidate_internshala_urls(user_profile, user_skills)
    listings: List[Dict[str, Any]] = []
    seen = set()
    session = requests.Session()
    session.trust_env = False
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-IN,en;q=0.9",
    }
    for url in urls:
        try:
            with _disable_proxy_env():
                response = session.get(url, headers=headers, timeout=30)
            if response.status_code != 200:
                continue
            parsed = _parse_internshala_listings(response.text, _clean_text(user_profile.get("preferred_sector")) or "General")
            for listing in parsed:
                key = "|".join([
                    listing.get("title", "").casefold(),
                    listing.get("company", "").casefold(),
                    listing.get("location", "").casefold(),
                ])
                if key in seen:
                    continue
                seen.add(key)
                listings.append(_score_external_job(listing, user_profile, _normalize_skills(user_skills)))
            if len(listings) >= max_results:
                break
        except Exception as e:
            print(f"Internshala fallback warning for {url}: {e}")
    listings.sort(key=lambda item: (item.get("match_score", 0), len(item.get("matched_skills", []))), reverse=True)
    EXTERNAL_INTERNSHIP_CACHE[cache_key] = listings[:max_results]
    return listings[:max_results]
def _merge_recommendation_sets(primary_jobs: List[Dict[str, Any]], fallback_jobs: List[Dict[str, Any]], top_n: int = 5) -> List[Dict[str, Any]]:
    combined: List[Dict[str, Any]] = []
    seen = set()
    for job in primary_jobs + fallback_jobs:
        key = "|".join([
            _clean_text(job.get("title")).casefold(),
            _clean_text(job.get("company")).casefold(),
            _clean_text(job.get("location")).casefold(),
        ])
        if key in seen:
            continue
        seen.add(key)
        combined.append(job)
    combined.sort(key=lambda item: (item.get("match_score", 0), len(item.get("matched_skills", []))), reverse=True)
    return combined[:top_n]
def rag_semantic_search(user_profile: dict, user_skills: List[str], top_n=5):
    """Return only PM Internship Scheme roles that actually match the user's profile."""
    top_n = max(1, min(top_n, 5))
    try:
        db_jobs = _load_pm_jobs()
    except Exception as e:
        print(f"Error loading PM internship data: {e}")
        return []
    if not db_jobs:
        return []
    normalized_skills = _normalize_skills(user_skills)
    query = _clean_text(" ".join([
        _clean_text(user_profile.get("preferred_sector")),
        _clean_text(user_profile.get("location")),
        _clean_text(user_profile.get("education")),
        " ".join(normalized_skills),
    ]))
    corpus = [_job_search_text(job) for job in db_jobs]
    semantic_scores = [0.0] * len(db_jobs)
    if query:
        try:
            vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
            tfidf_matrix = vectorizer.fit_transform(corpus + [query])
            semantic_scores = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten().tolist()
        except Exception as e:
            print(f"Semantic ranking warning: {e}")
    ranked = []
    fallback_ranked = []
    for idx, job in enumerate(db_jobs):
        matched_skills = _match_user_skills_to_job(normalized_skills, job)
        skill_ratio = (len(matched_skills) / len(normalized_skills)) if normalized_skills else 0.0
        semantic_score = float(semantic_scores[idx]) if idx < len(semantic_scores) else 0.0
        sector_match = _preferred_sector_matches_job(user_profile.get("preferred_sector", ""), job)
        location_match = _preferred_location_matches_job(user_profile.get("location", ""), job)
        education_match = _education_matches_job(user_profile.get("education", ""), job)
        if normalized_skills and not matched_skills:
            if not sector_match and not location_match and semantic_score < 0.08:
                continue
            if not sector_match and not location_match and semantic_score < 0.14:
                continue
        composite_score = (
            (skill_ratio * 0.58)
            + (semantic_score * 0.24)
            + (0.10 if sector_match else 0.0)
            + (0.06 if location_match else 0.0)
            + (0.02 if education_match else 0.0)
        )
        if matched_skills and composite_score < 0.30:
            composite_score = 0.30 + (min(len(matched_skills), 3) * 0.02)
        match_score = max(1, min(99, int(round(composite_score * 100))))
        if not matched_skills and (sector_match or location_match) and match_score < 45:
            match_score = 50 if (sector_match and location_match) else 45
        elif not matched_skills and semantic_score >= 0.18 and match_score < 35:
            match_score = 35
        intern_data = job.copy()
        intern_data["match_score"] = match_score
        intern_data["matched_skills"] = matched_skills
        ranked_tuple = (intern_data, len(matched_skills), semantic_score, sector_match, location_match)
        fallback_ranked.append(ranked_tuple)
        if match_score >= 30 and (matched_skills or sector_match or location_match or semantic_score >= 0.18):
            ranked.append(ranked_tuple)
    pool = ranked if ranked else fallback_ranked
    pool.sort(
        key=lambda item: (
            item[1],
            item[0]["match_score"],
            item[2],
            item[3],
            item[4],
        ),
        reverse=True,
    )
    return [item[0] for item in pool[:top_n]]
def translate_text_lightweight(text: str, dest_lang: str) -> str:
    """Translate text using deep_translator for offline/free translations."""
    normalized_dest = _normalize_language(dest_lang)
    if not text or normalized_dest == "en":
        return text
    try:
        with _disable_proxy_env():
            translated = GoogleTranslator(source='auto', target=normalized_dest).translate(text)
        return translated if translated else text
    except Exception as e:
        print(f"Translation error: {e}")
    return text
def _fallback_interview_prep(job_title: str, company: str, skills: List[str], num_questions: int = 5) -> List[Dict[str, Any]]:
    themes = _normalize_skills(skills) or [_clean_text(job_title) or "workplace communication"]
    generic_distractors = [
        "Ignore the task details and move quickly",
        "Wait for someone else to solve it",
        "Skip documentation and feedback",
        "Guess without checking requirements",
    ]
    questions: List[Dict[str, Any]] = []
    for idx in range(num_questions):
        theme = themes[idx % len(themes)]
        correct = f"Use {theme} carefully to complete the task"
        wrongs = generic_distractors[idx % len(generic_distractors):] + generic_distractors[:idx % len(generic_distractors)]
        questions.append({
            "q": f"For a {job_title} internship at {company}, what is the best way to show {theme} in real work?",
            "options": [correct, wrongs[0], wrongs[1], wrongs[2]],
            "a": correct,
        })
    return questions
def _fallback_learning_recommendations(job_title: str, company: str, skills: List[str], count: int = 6) -> List[Dict[str, str]]:
    themes = _normalize_skills(skills) or [_clean_text(job_title) or "internship basics"]
    levels = ["Easy", "Easy", "Medium", "Medium", "Hard", "Hard"]
    recommendations: List[Dict[str, str]] = []
    for idx in range(count):
        theme = themes[idx % len(themes)]
        recommendations.append({
            "title": f"Practice {theme.title()} for {job_title}",
            "difficulty": levels[idx % len(levels)],
            "acceptance": f"Show one clear example of {theme} in your internship work.",
            "topic": theme.title(),
        })
    return recommendations
def generate_interview_prep(job_title: str, company: str, skills: List[str], api_key: str):
    normalized_skills = _normalize_skills(skills)
    if not _has_llm_provider():
        return _fallback_interview_prep(job_title, company, normalized_skills)
    try:
        response = _call_structured(
            prompt=(
                f"Create exactly 5 multiple-choice interview questions for the PM Internship role '{job_title}' at '{company}'.\n"
                f"Candidate skills: {', '.join(normalized_skills) if normalized_skills else 'general internship readiness'}.\n"
                "Rules:\n"
                "- Questions must fit the actual internship role, not generic coding tests.\n"
                "- Use the provided skills when relevant.\n"
                "- Include one correct answer and exactly three believable wrong answers.\n"
                "- Keep options short and practical.\n"
                "- Avoid duplicate questions."
            ),
            schema_model=QuizQuestionsResponse,
            system_instruction="You are an expert internship interviewer creating strict JSON interview MCQs.",
            temperature=0.35,
            max_output_tokens=2048,
        )
        questions: List[Dict[str, Any]] = []
        seen_prompts = set()
        for item in response.questions:
            built_question = _build_quiz_question(item)
            prompt_key = built_question["q"].casefold()
            if prompt_key in seen_prompts:
                continue
            seen_prompts.add(prompt_key)
            questions.append(built_question)
        if questions:
            return questions[:5]
    except Exception as e:
        print(f"[ERROR] generate_interview_prep failed, using fallback: {e}")
    return _fallback_interview_prep(job_title, company, normalized_skills)
def fetch_learning_recommendations(job_title: str, company: str, skills: List[str], api_key: str):
    normalized_skills = _normalize_skills(skills)
    if not _has_llm_provider():
        return _fallback_learning_recommendations(job_title, company, normalized_skills)
    try:
        response = _call_structured(
            prompt=(
                f"Create a practical 6-step learning path for the PM Internship role '{job_title}' at '{company}'.\n"
                f"Candidate skills: {', '.join(normalized_skills) if normalized_skills else 'general internship readiness'}.\n"
                "Rules:\n"
                "- Make the path relevant to the role, not just coding interview prep.\n"
                "- Each item should be a concrete learning topic, exercise, or mini-project.\n"
                "- difficulty should be Easy, Medium, or Hard.\n"
                "- acceptance should be one short outcome statement.\n"
                "- topic should be a short category label."
            ),
            schema_model=LearningRecommendationsResponse,
            system_instruction="You are a career coach creating strict JSON learning paths for internships.",
            temperature=0.3,
            max_output_tokens=2048,
        )
        recommendations = []
        for item in response.recommendations:
            recommendations.append({
                "title": _clean_text(item.title),
                "difficulty": _clean_text(item.difficulty) or "Medium",
                "acceptance": _clean_text(item.acceptance) or "Build one clear example you can discuss in interviews.",
                "topic": _clean_text(item.topic) or "Skill Building",
            })
        if recommendations:
            return recommendations[:6]
    except Exception as e:
        print(f"[ERROR] fetch_learning_recommendations failed, using fallback: {e}")
    return _fallback_learning_recommendations(job_title, company, normalized_skills)
def _extract_pdf_text(file_bytes: bytes) -> str:

    extracted_versions: List[str] = []

    if pdfplumber is not None:

        try:

            with pdfplumber.open(BytesIO(file_bytes)) as pdf:

                extracted_versions.append("\n".join([(page.extract_text() or "") for page in pdf.pages]))

        except Exception as e:

            print(f"PDF Parsing Warning (pdfplumber): {e}")

    for reader_cls, reader_name in ((ModernPdfReader, "pypdf"), (LegacyPdfReader, "PyPDF2")):

        if reader_cls is None:

            continue

        try:

            reader = reader_cls(BytesIO(file_bytes))

            extracted_versions.append("\n".join([(page.extract_text() or "") for page in reader.pages]))

        except Exception as e:

            print(f"PDF Parsing Warning ({reader_name}): {e}")

    text = max(extracted_versions, key=lambda value: len(_clean_text(value)), default="")

    if len(_clean_text(text)) >= 120:

        return text

    try:

        from pdf2image import convert_from_bytes

        import pytesseract

        images = convert_from_bytes(file_bytes, dpi=200, first_page=1, last_page=3)

        ocr_text = "\n".join([

            pytesseract.image_to_string(image) for image in images

        ])

        if len(_clean_text(ocr_text)) > len(_clean_text(text)):

            return ocr_text

    except Exception as e:

        print(f"OCR Fallback Warning: {e}")

    return text

def generate_dynamic_questions(skills: List[str], api_key: str, num_questions=3):

    normalized_skills = _normalize_skills(skills)

    if not normalized_skills:

        raise RuntimeError("No skills available for question generation")

    if not _has_llm_provider():

        return _fallback_resume_questions(normalized_skills, num_questions=num_questions)

    try:

        response = _call_structured(

            prompt=(

                f"Create exactly {num_questions} multiple-choice interview questions based only on these skills: {', '.join(normalized_skills)}.\n"

                "Rules:\n"

                "- Every question must directly test one of the provided skills.\n"

                "- Do not ask about skills that are not in the list.\n"

                "- Make the questions realistic and interview-ready, not generic aptitude questions.\n"

                "- For each question, provide one correct answer and exactly three plausible wrong answers.\n"

                "- Keep each option short and distinct.\n"

                "- Avoid 'all of the above' and 'none of the above'."

            ),

            schema_model=QuizQuestionsResponse,

            system_instruction="You create precise interview MCQs and return strict JSON.",

            temperature=0.35,

            max_output_tokens=2048,

        )

        questions: List[Dict[str, Any]] = []

        seen_prompts: set[str] = set()

        for item in response.questions:

            try:

                built_question = _build_quiz_question(item)

            except Exception as e:

                print(f"Dynamic question fallback warning: {e}")

                continue

            prompt_key = built_question["q"].casefold()

            if prompt_key in seen_prompts:

                continue

            seen_prompts.add(prompt_key)

            questions.append(built_question)

        if len(questions) < num_questions:

            questions.extend(

                _fallback_resume_questions(

                    normalized_skills,

                    num_questions=num_questions - len(questions),

                    used_prompts=seen_prompts,

                )

            )

        return questions[:num_questions]

    except Exception as e:

        print(f"Dynamic question generation fallback warning: {e}")

        return _fallback_resume_questions(normalized_skills, num_questions=num_questions)

@app.get("/")
def health_check():
    return {"status": "Engine is running smoothly."}
@app.post("/refresh-internships")
def refresh_pm_internships():
    try:
        jobs = _load_pm_jobs(force_refresh=True)
        return {
            "status": "ok",
            "count": len(jobs),
            "source": PM_SOURCE_NAME,
            "apply_url": PM_PORTAL_URL,
        }
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh PM internships: {str(e)}")
@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...), location: str = Form("Amaravati"), education: str = Form("Graduate"), preferred_sector: str = Form("Any")):
    if not (file.filename or "").casefold().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        file_bytes = await file.read()

        if not file_bytes:

            raise HTTPException(status_code=400, detail="The uploaded PDF is empty.")
        resume_cache_key = hashlib.sha256(file_bytes).hexdigest()
        cached_analysis = RESUME_ANALYSIS_CACHE.get(resume_cache_key)
        if cached_analysis:
            extracted_skills = cached_analysis["skills"]
            quiz = cached_analysis["questions"]
        else:
            text = _extract_pdf_text(file_bytes)
            analysis = generate_resume_analysis(text, groq_api_key, num_questions=5)
            extracted_skills = analysis["skills"]
            quiz = analysis["questions"]
            RESUME_ANALYSIS_CACHE[resume_cache_key] = analysis
        return {
            "extracted_skills": extracted_skills,
            "assessment_quiz": quiz,
            "profile_dict": {"location": location, "education": education, "preferred_sector": preferred_sector}
        }
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")
@app.post("/manual-profile")
def process_manual_profile(profile: ManualProfile):
    try:
        normalized_skills = _normalize_skills(profile.manual_skills)
        if not normalized_skills:
            raise HTTPException(status_code=400, detail="Please select at least one skill.")
        quiz_cache_key = "|".join(skill.casefold() for skill in normalized_skills)
        quiz = QUIZ_CACHE.get(quiz_cache_key)
        if quiz is None:
            quiz = _fallback_resume_questions(normalized_skills, num_questions=5)
            QUIZ_CACHE[quiz_cache_key] = quiz
        profile_dict = {
            "location": profile.location,
            "education": profile.education,
            "preferred_sector": profile.preferred_sector
        }
        return {
            "status": "Profile registered successfully",
            "verified_skills": normalized_skills,
            "assessment_quiz": quiz,
            "profile_dict": profile_dict
        }
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/recommended-jobs")
def get_recommended_jobs(request: DynamicJobsRequest):
    profile_dict = {
        "location": request.location,
        "education": request.education,
        "preferred_sector": request.preferred_sector
    }
    jobs = rag_semantic_search(profile_dict, request.skills, top_n=5)
    try:
        if len(jobs) < 5 or max((job.get("match_score", 0) for job in jobs), default=0) < 60:
            external_jobs = _fetch_internshala_internships(profile_dict, request.skills, max_results=5)
            jobs = _merge_recommendation_sets(jobs, external_jobs, top_n=5)
    except Exception as e:
        print(f"External internship fallback warning: {e}")
    lang = _normalize_language(getattr(request, 'lang', 'en') or request.target_language or 'en')
    if lang != "en":
        for job in jobs:
            job['title'] = translate_text_lightweight(job.get('title', ''), lang)
            job['sector'] = translate_text_lightweight(job.get('sector', ''), lang)
            job['description'] = translate_text_lightweight(job.get('description', ''), lang)
            job['field'] = translate_text_lightweight(job.get('field', ''), lang)
            job['matched_skills'] = [translate_text_lightweight(skill, lang) for skill in job.get('matched_skills', [])]
            job['skills'] = [translate_text_lightweight(skill, lang) for skill in job.get('skills', [])]
    return {"top_matches": jobs}
@app.post("/api/voice-recommend")
def voice_recommend(request: VoiceRecommendRequest):
    """
    Endpoint for OmniDimension Voice AI webhook.
    Accepts a flexible JSON payload with optional fields.
    Returns a CLEAN, flat JSON with only the top 3-5 internships.
    OmniDimension Dashboard Mapping:
      - location  → user's spoken city/state
      - sector    → user's spoken industry preference
      - skills    → extracted skill keywords (string or list)
      - education → qualification level mentioned
      - lang      → response language (en/hi/te)
    """
    user_skills = []
    if request.skills:
        if isinstance(request.skills, list):
            user_skills = [s.strip() for s in request.skills if s.strip()]
        elif isinstance(request.skills, str):
            user_skills = [s.strip() for s in request.skills.split(",") if s.strip()]
    if not user_skills:
        user_skills = ["communication", "general skills"]
    profile_dict = {
        "location": request.location or "",
        "education": request.education or "Graduate",
        "preferred_sector": request.sector or "Any",
    }
    jobs = rag_semantic_search(profile_dict, user_skills, top_n=5)
    try:
        if len(jobs) < 5 or max((job.get("match_score", 0) for job in jobs), default=0) < 60:
            external_jobs = _fetch_internshala_internships(profile_dict, user_skills, max_results=5)
            jobs = _merge_recommendation_sets(jobs, external_jobs, top_n=5)
    except Exception as e:
        print(f"Voice external internship fallback warning: {e}")
    lang = request.lang or "en"
    if lang in ("hi", "te"):
        for job in jobs:
            job["title"] = translate_text_lightweight(job.get("title", ""), lang)
            job["sector"] = translate_text_lightweight(job.get("sector", ""), lang)
    clean_results = []
    for job in jobs:
        clean_results.append({
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "location": job.get("location", ""),
            "sector": job.get("sector", ""),
            "source": job.get("source", ""),
            "match_score": job.get("match_score", 0),
            "apply_url": job.get("apply_url", PM_PORTAL_URL),
        })
    return {
        "count": len(clean_results),
        "internships": clean_results,
    }
class JobTipRequest(BaseModel):
    title: str
    company: str
    language: str
class CallRequest(BaseModel):
    phone_number: str
@app.get("/api/voice-agent/status")
async def get_agent_status():
    try:
        client = _get_omnidim_client()
        resolved_agent_id, warning, bots = _resolve_omnidim_agent(client)
        agent_details = _extract_omnidim_payload(client.agent.get(resolved_agent_id))
        widget_config = agent_details.get("widget_config") if isinstance(agent_details, dict) else {}
        return {
            "status": "success",
            "configured_agent_id": _clean_text(agent_id) or None,
            "resolved_agent_id": resolved_agent_id,
            "warning": warning,
            "widget_url": widget_config.get("iframeUrl"),
            "widget_config": widget_config,
            "available_agents": [
                {
                    "id": bot.get("id"),
                    "name": bot.get("name"),
                    "bot_call_type": bot.get("bot_call_type"),
                }
                for bot in bots
            ],
            "agent_details": agent_details,
        }
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=_humanize_omnidim_error(e))
@app.post("/api/voice-agent/call")
async def trigger_call(request: CallRequest):
    try:
        client = _get_omnidim_client()
        resolved_agent_id, warning, _ = _resolve_omnidim_agent(client)
        phone_number = _clean_text(request.phone_number)
        if not re.fullmatch(r"\+\d{10,15}", phone_number):
            raise HTTPException(status_code=400, detail="Phone number must include country code, for example +919876543210.")
        response = client.call.dispatch_call(
            agent_id=resolved_agent_id,
            to_number=phone_number
        )
        return {
            "status": "Call initiated!",
            "resolved_agent_id": resolved_agent_id,
            "warning": warning,
            "call_data": _extract_omnidim_payload(response),
        }
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=_humanize_omnidim_error(e))
@app.post("/job-tips")
def get_job_tips(request: JobTipRequest):
    if not _has_llm_provider():
        raise HTTPException(status_code=503, detail="No AI provider configured. Add GROQ_API_KEY or GEMINI_API_KEY.")
    try:
        language_name = LANG_MAP.get(_normalize_language(request.language), request.language)
        response = _call_structured(
            prompt=(
                f"Provide exactly 3 short, actionable interview or application tips for the PM Internship role '{request.title}' at '{request.company}'.\n"
                f"Write the tips in {language_name}.\n"
                "Each tip must be one sentence and practical."
            ),
            schema_model=JobTipsResponse,
            system_instruction="You are a concise career coach returning strict JSON tips.",
            temperature=0.3,
            max_output_tokens=512,
        )
        tips = [_clean_text(tip) for tip in response.tips if _clean_text(tip)]
        return {"tips": tips[:3]}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
@app.post("/translate")
def translate_content(request: TranslationRequest):
    try:
        target = _normalize_language(request.target_language)
        if target == "en":
            return {"translated_payload": request.payload}
        translated_payload = {}
        with _disable_proxy_env():
            translator = GoogleTranslator(source='auto', target=target)
            for k, v in request.payload.items():
                if isinstance(v, str):
                    translated_payload[k] = translator.translate(v)
                else:
                    translated_payload[k] = v
        return {"translated_payload": translated_payload}
    except Exception as e:
        print(f"Translation Error: {e}")
        return {"translated_payload": request.payload, "warning": "Translation failed, defaulting to English."}
@app.post("/agent-chat")
def agent_chat(request: AgentChatRequest):
    if not _has_llm_provider():
        return {"reply": "AI mentor is unavailable because no AI provider is configured."}
    try:
        preferred_language = LANG_MAP.get(_normalize_language(request.target_language), request.target_language)
        system_instruction = f"""
        You are a highly empathetic, encouraging Career Mentor for rural Indian youth applying to the PM Internship Scheme.
        The user has these verified skills: {', '.join(request.user_skills)}.
        Their preferred language for responses is: {preferred_language}. You MUST reply ONLY in this language. Use simple, colloquial, 8th-grade vocabulary.
        YOUR ROLE:
        1. Acknowledge their skills and build confidence.
        2. Give them 1 specific, practical interview tip based on their skills.
        3. Suggest 1 free learning step to improve.
        4. Keep responses extremely short (max 3-4 sentences). Do not use emojis.
        """
        conversation_context = "Conversation History:\n"
        for msg in request.messages[:-1]:
            role_name = "User" if msg.role == "user" else "Mentor"
            conversation_context += f"{role_name}: {msg.content}\n"
        current_msg = request.messages[-1].content if request.messages else "Hello!"
        final_prompt = f"{conversation_context}\nUser: {current_msg}\nMentor:"
        reply = _call_text(final_prompt, system_instruction=system_instruction, temperature=0.4, max_output_tokens=512)
        return {"reply": reply}
    except Exception as e:
        print(f"[ERROR] agent-chat failed: {e}")
        return {"reply": "AI mentor is temporarily unavailable because all configured AI providers failed. Please try again later or switch to another API key."}
@app.post("/interview-prep")
def interview_prep_endpoint(request: InterviewPrepRequest):
    try:
        questions = generate_interview_prep(request.job_title, request.company, request.skills, groq_api_key)
        return {"questions": questions}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
@app.post("/learning-recommendations")
def learning_recommendations_endpoint(request: LearningRecommendationRequest):
    try:
        recommendations = fetch_learning_recommendations(
            request.job_title or "PM Internship",
            request.company,
            request.skills,
            groq_api_key,
        )
        return {"recommendations": recommendations}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
