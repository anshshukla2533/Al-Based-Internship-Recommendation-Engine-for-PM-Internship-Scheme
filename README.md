# Step-by-Step Guide: How to Run Your Project

Follow these exact steps to get your AI Internship Recommendation Engine running correctly on **Windows with Python 3.10.11**.

---

### Step 1: System Requirements (OCR & PDF)

The app uses **OCR** to read images/PDFs. You must install these on your Windows system first:

1.  **Tesseract OCR**:

    - Download the Windows installer from [UB Mannheim's Tesseract page](https://github.com/UB-Mannheim/tesseract/wiki).

    - Install it.

    

2.  **Poppler (for PDF processing)**:

    - Download Poppler from [this release page](https://github.com/oschwartz10612/poppler-windows/releases).

    - Extract it and add the `bin` folder to your Windows **Environment PATH**.

---

### Step 2: Backend Setup (Python)

Open a terminal in your project root (`python project` folder) and run:

1.  **Uninstall the old AI library**:

    ```powershell

    pip uninstall -y google-genai

    ```

2.  **Install all required libraries**:

    ```powershell

    pip install -r requirements.txt

    ```

3.  **Check your `.env.txt`**:

    - Ensure it contains your API key like this: `GEMINI_API_KEY=AIzaSy...`

---

### Step 3: Start the Backend (FastAPI)

Run this command from the project root:

```powershell

uvicorn main:app --reload

```

- Wait until you see `[STARTUP] Gemini API key is VALID.`

- Keep this terminal open!

---

### Step 4: Start the Frontend (React/Vite)

Open a **new terminal** and go into the `frontend` folder:

1.  **Navigate and Install**:

    ```powershell

    cd frontend

    npm install

    ```

2.  **Run Dev Server**:

    ```powershell

    npm run dev

    ```

- Open the URL shown (usually `http://localhost:5173`) in your browser.

---

### ✅ Verification

- Try uploading a PDF resume.

- If it works, you will see your skills extracted and an interview quiz generated.

- If you see `LLM Extraction Error (falling back to defaults)`, it means your Gemini API quota is full, but the app **will still provide generic results** and won't crash!
