CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(255),
    location VARCHAR(255),
    education VARCHAR(100),
    preferred_sector VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    file_hash VARCHAR(64) NOT NULL,
    raw_text TEXT,
    extracted_skills TEXT[],
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quiz_type VARCHAR(50) NOT NULL DEFAULT 'skill_assessment',
    skills TEXT[],
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    score_percent INTEGER NOT NULL,
    cheating_score INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'Low',
    answers JSONB,
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coding_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    challenge_id VARCHAR(64),
    challenge_title VARCHAR(255),
    code TEXT NOT NULL,
    language VARCHAR(20) DEFAULT 'python',
    stdout TEXT,
    stderr TEXT,
    execution_error BOOLEAN DEFAULT FALSE,
    time_taken_seconds INTEGER,
    cheating_score INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL,
    skill_scores JSONB NOT NULL,
    strengths TEXT[],
    weaknesses TEXT[],
    ats_score INTEGER,
    keyword_matches TEXT[],
    missing_keywords TEXT[],
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    job_title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    location VARCHAR(255),
    sector VARCHAR(255),
    match_score INTEGER,
    source VARCHAR(100),
    apply_url TEXT,
    matched_skills TEXT[],
    recommended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skill VARCHAR(100) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    platform VARCHAR(100),
    url_hint TEXT,
    difficulty VARCHAR(50),
    description TEXT,
    recommended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_quiz_results_user ON quiz_results(user_id);
CREATE INDEX idx_analytics_user ON analytics(user_id);
CREATE INDEX idx_recommendations_user ON recommendations(user_id);
CREATE INDEX idx_resumes_hash ON resumes(file_hash);
