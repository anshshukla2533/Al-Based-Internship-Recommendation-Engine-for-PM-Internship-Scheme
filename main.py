from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import pdfplumber
import re
import json
import os
from io import BytesIO
from dotenv import load_dotenv

# Google's updated GenAI library
from google import genai
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ==========================================
# 🔐 SECURITY UPDATE: Load API key from .env
# ==========================================
load_dotenv(".env.txt")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = FastAPI(title="PM Internship Recommendation API")

# Allow frontend to connect securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS ---
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
    company: str
    skills: List[str]

class DynamicJobsRequest(BaseModel):
    skills: List[str]
    location: str
    education: str
    preferred_sector: str
    target_language: str

# --- REFINED TARGET SKILLS ---
TARGET_SKILLS = {
    "Digital_Basics": ["data entry", "typing", "ms office", "excel", "word", "internet", "email"],
    "Vocational": ["agriculture", "wiring", "hardware", "plumbing", "mechanic", "welding", "carpentry", "solar"],
    "Logistics_Retail": ["inventory", "dispatch", "customer service", "packaging", "supply chain"],
    "Core_IT": ["python", "c++", "c", "java", "sql", "html", "networking", "troubleshooting"],
    "Healthcare_Basics": ["first aid", "sanitation", "patient care", "health records"]
}

def extract_skills_with_gemini(text: str, api_key: str) -> List[str]:
    if not api_key:
        return ["communication", "general computer skills"]
        
    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
        Analyze the following resume text and extract the top 5 most relevant practical skills. 
        Focus on technical, vocational, or digital literacy skills.
        Return ONLY a valid JSON array of strings. Example: ["Data Entry", "Python", "Inventory Management"]
        
        RESUME TEXT:
        {text[:3000] if text else "No resume provided. Return generic digital skills."} 
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        clean_json = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"LLM Extraction Error: {e}")
        return ["general skills", "communication"]

def generate_dynamic_questions(skills: List[str], api_key: str, num_questions=3):
    if not api_key:
        return [{"q": "What is the primary function of an operating system?", "options": ["Manage hardware", "Compile code", "Design UI", "Browse web"], "a": "Manage hardware"}] * num_questions

    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
        You are a technical interviewer. The candidate has these skills: {', '.join(skills) if skills else "general"}.
        Generate {num_questions} UNIQUE multiple-choice interview questions testing these specific skills.
        Return ONLY a valid JSON array of objects. Format: [{{"q": "Question?", "options": ["A", "B", "C", "D"], "a": "Correct answer"}}]
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        clean_json = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"LLM Error: {e}")
        return []

def rag_semantic_search(user_profile: dict, user_skills: List[str], top_n=5):
    try:
        with open("jobs.json", "r") as f:
            db_jobs = json.load(f)
    except Exception as e:
        print(f"Error loading jobs.json: {e}")
        return []

    corpus = [f"{j['sector']} {j['location']} {j['title']} {' '.join(j['skills'])} {j['description']}" for j in db_jobs]
    query = f"{user_profile.get('preferred_sector', '')} {user_profile.get('location', '')} {user_profile.get('education', '')} {' '.join(user_skills)}"
    
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(corpus + [query])
    cosine_similarities = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten()
    
    ranked = []
    for idx, score in enumerate(cosine_similarities):
        intern_data = db_jobs[idx].copy()
        intern_data['match_score'] = min(int(score * 100) + 15, 99) 
        ranked.append(intern_data)
        
    ranked.sort(key=lambda x: x['match_score'], reverse=True)
    return ranked[:top_n]

def generate_interview_prep(job_title: str, company: str, skills: List[str], api_key: str):
    if not api_key:
        return [{"q": f"Why do you want to work at {company}?", "options": ["Option A", "Option B", "Option C", "Option D"], "a": "Option A"}] * 3

    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
        You are an expert technical interviewer at {company} interviewing a candidate for the '{job_title}' role.
        The candidate has the following skills: {', '.join(skills)}.
        Generate 5 UNIQUE, company-specific and role-specific multiple-choice interview questions.
        Return ONLY a valid JSON array of objects. Format: [{{"q": "Question?", "options": ["A", "B", "C", "D"], "a": "Correct answer"}}]
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        clean_json = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"LLM Error: {e}")
        return []

def fetch_learning_recommendations(company: str, skills: List[str], api_key: str):
    if not api_key:
        return [{"title": "Two Sum", "difficulty": "Easy", "acceptance": "50%", "topic": "Arrays"}]

    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
        You are a career advisor. Based on the target company '{company}' and the candidate's skills: {', '.join(skills)},
        recommend 6 specific 'Leetcode-style' coding problems or core technical concepts they should master to pass the interview at {company}.
        Return ONLY a valid JSON array of objects. Format: [{{"title": "Problem Title", "difficulty": "Easy/Medium/Hard", "acceptance": "Percentage", "topic": "Core Topic"}}]
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        clean_json = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"LLM Error: {e}")
        return []

# --- API ENDPOINTS ---

@app.get("/")
def health_check():
    return {"status": "Engine is running smoothly."}

@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...), location: str = "Amaravati", education: str = "Graduate", preferred_sector: str = "Any"):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        file_bytes = await file.read()
        text = ""
        try:
            with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                text = "\n".join([p.extract_text() or "" for p in pdf.pages])
        except Exception as e:
            print(f"PDF Parsing Warning: {e}")
            text = "" # Fallback to empty text
        
        # USE THE NEW GEMINI FUNCTION HERE
        extracted_skills = extract_skills_with_gemini(text, GEMINI_API_KEY)
            
        quiz = generate_dynamic_questions(extracted_skills, GEMINI_API_KEY, num_questions=5)
        
        return {
            "extracted_skills": extracted_skills,
            "assessment_quiz": quiz,
            "profile_dict": {"location": location, "education": education, "preferred_sector": preferred_sector}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")

@app.post("/manual-profile")
def process_manual_profile(profile: ManualProfile):
    quiz = generate_dynamic_questions(profile.manual_skills, GEMINI_API_KEY, num_questions=5)
    
    profile_dict = {
        "location": profile.location,
        "education": profile.education,
        "preferred_sector": profile.preferred_sector
    }
    
    return {
        "status": "Profile registered successfully",
        "verified_skills": profile.manual_skills,
        "assessment_quiz": quiz,
        "profile_dict": profile_dict
    }

@app.post("/recommended-jobs")
def get_recommended_jobs(request: DynamicJobsRequest):
    profile_dict = {
        "location": request.location,
        "education": request.education,
        "preferred_sector": request.preferred_sector
    }
    jobs = rag_semantic_search(profile_dict, request.skills, top_n=5)
    return {"top_matches": jobs}

class JobTipRequest(BaseModel):
    title: str
    company: str
    language: str

@app.post("/job-tips")
def get_job_tips(request: JobTipRequest):
    if not GEMINI_API_KEY:
        return {"tips": ["Be confident", "Arrive on time", "Research the company"]}
        
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = f"""
        Provide exactly 3 short, actionable interview or application tips for the '{request.title}' role at '{request.company}'.
        Translate the tips into {request.language}.
        Return ONLY a JSON array of 3 strings.
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        clean_json = response.text.replace("```json", "").replace("```", "").strip()
        return {"tips": json.loads(clean_json)}
    except Exception:
        return {"tips": ["Prepare thoroughly", "Communicate clearly", "Review your resume"]}

@app.post("/translate")
def translate_content(request: TranslationRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="API Key missing")
        
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = f"""
        You are an expert localization engine designing interfaces for first-generation digital learners in India.
        Translate the following JSON UI text and job descriptions into {request.target_language}.
        
        RULES:
        1. Use simple, everyday colloquial vocabulary. Avoid highly formalized or academic terms.
        2. Maintain an 8th-grade reading level.
        3. If a technical term (like "API", "Python", "Data Entry") is universally understood in English, transliterate it rather than inventing a complex native translation.
        4. Return ONLY a valid JSON object with the exact same keys, but translated values.
        
        PAYLOAD TO TRANSLATE:
        {json.dumps(request.payload)}
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        clean_json = response.text.replace("```json", "").replace("```", "").strip()
        return {"translated_payload": json.loads(clean_json)}
        
    except Exception as e:
        print(f"Translation Error: {e}")
        # Fallback: return the original English payload if AI fails
        return {"translated_payload": request.payload, "warning": "Translation failed, defaulting to English."}

@app.post("/agent-chat")
def agent_chat(request: AgentChatRequest):
    if not GEMINI_API_KEY:
        return {"reply": "I'm offline because my API key is missing. But keep practicing those skills! You've got this!"}
        
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        system_instruction = f"""
        You are a highly empathetic, encouraging Career Mentor for rural Indian youth applying to the PM Internship Scheme.
        The user has these verified skills: {', '.join(request.user_skills)}.
        Their preferred language for responses is: {request.target_language}. You MUST reply ONLY in this language. Use simple, colloquial, 8th-grade vocabulary.
        
        YOUR ROLE:
        1. Acknowledge their skills and build confidence.
        2. Give them 1 specific, practical interview tip based on their skills.
        3. Suggest 1 free learning step to improve.
        4. Keep responses extremely short (max 3-4 sentences). Use emojis!
        """
        
        conversation_context = "Conversation History:\n"
        for msg in request.messages[:-1]:
            role_name = "User" if msg.role == "user" else "Mentor"
            conversation_context += f"{role_name}: {msg.content}\n"
            
        current_msg = request.messages[-1].content if request.messages else "Hello!"
        final_prompt = f"{system_instruction}\n\n{conversation_context}\nUser: {current_msg}\nMentor:"
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=final_prompt,
        )
        
        return {"reply": response.text.strip()}
    except Exception as e:
        return {"reply": "I'm having a little trouble connecting, but you are doing great! Let's try again in a moment."}

@app.post("/interview-prep")
def interview_prep_endpoint(request: InterviewPrepRequest):
    questions = generate_interview_prep(request.job_title, request.company, request.skills, GEMINI_API_KEY)
    return {"questions": questions}

@app.post("/learning-recommendations")
def learning_recommendations_endpoint(request: LearningRecommendationRequest):
    recommendations = fetch_learning_recommendations(request.company, request.skills, GEMINI_API_KEY)
    return {"recommendations": recommendations}