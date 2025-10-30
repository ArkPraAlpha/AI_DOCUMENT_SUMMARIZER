from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil, os, uuid

from pdf_service import (
    get_pdf_text,
    get_text_chunks,
    get_vectorstore,
    get_conversation_chain,
    generate_summary,
    generate_mcqs,
)

app = FastAPI()

# Allow frontend (React) to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev; restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
conversations = {}


@app.post("/process")
async def process_pdf(files: list[UploadFile] = File(...)):
    """
    Upload one or more PDFs, extract text, create embeddings, and conversation chain.
    """
    import io, uuid
    import fitz  


    text = ""
    for file in files:
        contents = await file.read()
        pdf = fitz.open(stream=io.BytesIO(contents), filetype="pdf")
        for page in pdf:
            text += page.get_text()

    # ✅ Generate unique session ID
    session_id = str(uuid.uuid4())

    # ✅ --- ADD THESE LINES BELOW ---
    chunks = get_text_chunks(text)
    vectorstore = get_vectorstore(chunks, persist_directory=f"chroma_{session_id}")
    chain = get_conversation_chain(vectorstore)
    conversations[session_id] = {"chain": chain, "text": text}
    # ✅ ------------------------------

    return {"session_id": session_id, "message": "PDF processed successfully!"}

@app.post("/chat/")
async def chat(session_id: str = Form(...), question: str = Form(...)):
    """Ask a question to the chatbot based on uploaded PDF context."""
    if session_id not in conversations:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    chain = conversations[session_id]["chain"]
    response = chain.invoke({"question": question})

    return {
        "answer": response["answer"],
        "chat_history": [
            {"role": m.type, "content": m.content}
            for m in response["chat_history"]
        ],
    }


@app.get("/summary/{session_id}")
async def summary(session_id: str):
    """Generate summary of the uploaded PDF."""
    if session_id not in conversations:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    text = conversations[session_id]["text"]
    summary = generate_summary(text)
    return {"summary": summary}


@app.get("/mcqs/{session_id}")
async def mcqs(session_id: str):
    """Generate MCQs from the uploaded PDF."""
    if session_id not in conversations:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    text = conversations[session_id]["text"]
    mcq_text = generate_mcqs(text)

    # Parse text to structured list (optional improvement)
    mcq_list = []
    current_q = {}
    for line in mcq_text.splitlines():
        line = line.strip()
        if line.startswith(tuple(str(i) + "." for i in range(1, 21))):
            if current_q:
                mcq_list.append(current_q)
            current_q = {"question": line, "options": [], "answer": ""}
        elif line.startswith(("A)", "B)", "C)", "D)")):
            current_q.setdefault("options", []).append(line)
        elif "Answer" in line or "Correct" in line:
            current_q["answer"] = line
    if current_q:
        mcq_list.append(current_q)

    return {"mcqs": mcq_list or [{"error": "No MCQs parsed"}, {"raw_text": mcq_text}]}
