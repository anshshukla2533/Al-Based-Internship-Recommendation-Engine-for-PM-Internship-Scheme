import pdfplumber
import pytesseract
from pdf2image import convert_from_path
import docx
from PIL import Image
import re
import requests
import json
import tkinter as tk
from tkinter import filedialog
import os

TESSERACT_CMD = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

if os.path.exists(TESSERACT_CMD):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# Categorized and expanded skills
TARGET_SKILLS = {
    "Core_Languages": ["python", "c++", "c", "java", "javascript", "typescript", "go", "rust"],
    "Databases": ["sql", "postgresql", "mongodb", "mysql", "redis", "cassandra"],
    "AI_ML": ["pytorch", "tensorflow", "scikit-learn", "keras", "pandas", "numpy", "opencv", "llm"],
    "Frameworks": ["fastapi", "flask", "django", "react", "node", "express", "spring"],
    "Daily_Tooling": ["git", "github", "docker", "kubernetes", "jenkins", "jira", "aws", "azure"]
}

def read_file_smart(file_path):
    """Handles PDF, DOCX, and Image files"""
    text = ""
    print(f"📄 Scanning file: {os.path.basename(file_path)}")
    
    try:
        if file_path.lower().endswith('.pdf'):
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted: text += extracted + "\n"
            
            if len(text.strip()) < 50:
                print("⚠️ Switching to OCR (Image Mode)...")
                images = convert_from_path(file_path, poppler_path=None) 
                for img in images:
                    text += pytesseract.image_to_string(img) + "\n"
                    
        elif file_path.lower().endswith('.docx'):
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
                
        elif file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
            img = Image.open(file_path)
            text += pytesseract.image_to_string(img) + "\n"
            
    except Exception as e:
        print(f"❌ File Read Error: {e}")
        
    return text

def extract_urls(text):
    """Extracts and categorizes URLs"""
    all_urls = re.findall(r'(?:https?://|www\.)[^\s]+', text)
    lazy_urls = re.findall(r'(?:linkedin\.com/in/[a-zA-Z0-9\-_%]+|github\.com/[a-zA-Z0-9\-_]+)', text)
    for url in lazy_urls: all_urls.append("https://" + url)
    
    categorized_links = {"linkedin": None, "github": None, "portfolio": [], "other": []}
    
    for url in set(all_urls):
        url_clean = url.strip().rstrip('.,)')
        if "linkedin.com" in url_clean and not categorized_links["linkedin"]:
            categorized_links["linkedin"] = url_clean
        elif "github.com" in url_clean and not categorized_links["github"]:
            if not any(x in url_clean for x in ["/pricing", "/about", "/features"]):
                categorized_links["github"] = url_clean
        elif any(x in url_clean for x in ["kaggle.com", "medium.com", "dev.to", ".dev", "portfolio"]):
            categorized_links["portfolio"].append(url_clean)
        else:
            categorized_links["other"].append(url_clean)
            
    return categorized_links

def extract_contact_and_meta(text):
    """Extracts email, phone, location, and evaluates email professionalism"""
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    phone_match = re.search(r'(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}', text)
    
    email = email_match.group(0) if email_match else "Not Found"
    
    email_type = "Unknown"
    if email != "Not Found":
        domain = email.split('@')[-1].lower()
        if domain in ['gmail.com', 'yahoo.com', 'hotmail.com']: email_type = "Generic"
        elif '.edu' in domain: email_type = "Academic"
        else: email_type = "Custom/Professional"
        
    relocation_open = bool(re.search(r'\b(willing to relocate|remote|open to remote)\b', text.lower()))
    
    return {
        "email": email,
        "email_professionalism": email_type,
        "phone": phone_match.group(0) if phone_match else "Not Found",
        "open_to_remote_or_relocate": relocation_open
    }

def deep_resume_analysis(text):
    """Extracts institutions, honors, and leadership metrics directly from resume"""
    analysis = {
        "institutions_detected": [],
        "educational_honors": [],
        "leadership_and_impact": []
    }
    
    lines = text.split('\n')
    for line in lines:
        if re.search(r'\b(University|College|Institute|Academy|Polytechnic)\b', line, re.IGNORECASE):
            if len(line.split()) < 10: 
                analysis["institutions_detected"].append(line.strip())
                
        if re.search(r'\b(GPA|Cum Laude|Dean\'s List|Valedictorian|Scholarship)\b', line, re.IGNORECASE):
            analysis["educational_honors"].append(line.strip())
            
        if re.search(r'\b(managed|led|spearheaded|architected)\b.*(?:team|budget|project)', line, re.IGNORECASE) or \
           re.search(r'(\$|\b\d+%\b)', line):
             if len(line.split()) > 4: 
                analysis["leadership_and_impact"].append(line.strip())
                
    analysis["institutions_detected"] = list(set(analysis["institutions_detected"]))
    return analysis

def extract_resume_skills_categorized(text, skill_db):
    """Categorizes skills found in the text"""
    found_categories = {}
    text_lower = text.lower()
    
    for category, skills in skill_db.items():
        found = []
        for skill in skills:
            if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
                found.append(skill)
        if found:
            found_categories[category] = list(set(found))
            
    return found_categories

def audit_github_deep(url):
    """Fetches ACTUAL repos and languages from GitHub API"""
    if not url or "github.com/" not in url: 
        return {"valid": False, "languages": [], "repos": []}

    try:
        username = url.split("github.com/")[1].split("/")[0]
        api_url = f"https://api.github.com/users/{username}/repos"
        
        print(f"👨‍💻 Auditing GitHub Codebase for: {username}...")
        resp = requests.get(api_url, headers=HEADERS, timeout=5)
        
        if resp.status_code == 200:
            repos = resp.json()
            lang_count = {}
            repo_names = []
            
            for repo in repos:
                lang = repo.get('language')
                if lang: lang_count[lang] = lang_count.get(lang, 0) + 1
                if repo.get('name'): repo_names.append(repo.get('name'))
            
            top_langs = sorted(lang_count, key=lang_count.get, reverse=True)
            
            return {
                "valid": True,
                "languages": [l.lower() for l in top_langs],
                "repos": repo_names,
                "public_repo_count": len(repos)
            }
    except Exception as e:
        print(f"⚠️ GitHub Audit Error: {e}")
        
    return {"valid": False, "languages": [], "repos": []}

def check_link(url):
    """Pings URLs to ensure they are live"""
    if not url: return "Missing"
    try:
        r = requests.head(url, headers=HEADERS, timeout=3)
        return "Active ✅" if r.status_code < 400 else "Broken ❌"
    except:
        return "Unreachable ⚠️"

if __name__ == "__main__":
    root = tk.Tk(); root.withdraw()
    print("📂 Select Resume (PDF, DOCX, or Image)...")
    file_path = filedialog.askopenfilename(filetypes=[("Documents", "*.pdf *.docx *.png *.jpg")])
    
    if file_path:
        print("\n--- 🕵️ RUNNING RESUME VALIDATOR ---")
        
        # 1. Parse Document & Extract Resume Data
        raw_text = read_file_smart(file_path)
        links = extract_urls(raw_text)
        meta_info = extract_contact_and_meta(raw_text)
        categorized_skills = extract_resume_skills_categorized(raw_text, TARGET_SKILLS)
        deep_insights = deep_resume_analysis(raw_text)
        
        # 2. Extract External Data
        li_status = check_link(links['linkedin'])
        github_data = audit_github_deep(links['github'])
        
        # 3. Cross-Verify Skills (Resume vs. GitHub)
        flat_resume_skills = [skill for cat in categorized_skills.values() for skill in cat]
        verified_skills = []
        unverified_skills = []
        
        for skill in flat_resume_skills:
            if skill in github_data['languages']:
                verified_skills.append(skill)
            elif any(skill in r.lower() for r in github_data['repos']):
                 verified_skills.append(skill)
            else:
                unverified_skills.append(skill)
        
        # 4. Calculate Unified Trust Score
        score = 20 # Base score
        if li_status.startswith("Active"): score += 10
        if github_data['valid']: score += 20
        
        # Reward verified skills
        if len(flat_resume_skills) > 0: 
            score += (len(verified_skills) / len(flat_resume_skills)) * 20
            
        # Reward quantified impact & education from Resume
        impact_count = len(deep_insights["leadership_and_impact"])
        if impact_count > 0: score += min(15, impact_count * 5) 
        if len(deep_insights["institutions_detected"]) > 0: score += 10
        if meta_info["email_professionalism"] in ["Academic", "Custom/Professional"]: score += 5
        
        trust_score = min(100, round(score))
        
        # 5. Build Final Unified Output
        full_audit = {
            "summary": {
                "trust_score": f"{trust_score}%",
                "readability_status": "Passed" if len(raw_text) > 200 else "Failed - Too little text",
                "integrity_level": "High" if trust_score > 80 else "Medium" if trust_score > 50 else "Low"
            },
            "contact_and_metadata": meta_info,
            "digital_footprint": {
                "linkedin": {"url": links['linkedin'], "status": li_status},
                "github": {"url": links['github'], "valid_api_fetch": github_data['valid']},
                "other_portfolios": links['portfolio']
            },
            "resume_deep_dive": {
                "skills_by_category": categorized_skills,
                "institutions_detected": deep_insights["institutions_detected"],
                "educational_honors": deep_insights["educational_honors"],
                "quantified_impact_and_leadership": deep_insights["leadership_and_impact"]
            },
            "github_deep_dive": {
                "total_public_repos": github_data.get('public_repo_count', 0),
                "top_languages_used": github_data.get('languages', []),
                "list_of_repos": github_data.get('repos', [])
            },
            "skill_verification_breakdown": {
                "verified_by_github": verified_skills,
                "unverified_skills": unverified_skills
            }
        }
        
        with open("candidate_full_audit.json", "w") as f:
            json.dump(full_audit, f, indent=4)

        print("\n✅ SUCCESS! Unified report generated: candidate_full_audit.json")
        print(f"Total Trust Score: {trust_score}%")
        print(f"Skills verified by GitHub: {len(verified_skills)} / {len(flat_resume_skills)}")
        
    else:
        print("❌ No file selected.")