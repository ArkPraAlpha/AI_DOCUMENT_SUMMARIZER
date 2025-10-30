import os
from PyPDF2 import PdfReader
from langchain.text_splitter import CharacterTextSplitter
from langchain_chroma import Chroma
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv
from langchain_nvidia_ai_endpoints import ChatNVIDIA

load_dotenv()
# HuggingFace local cache
os.environ["HF_HOME"] = r"D:\Gen AI\Code\CACHE"

from dotenv import load_dotenv
load_dotenv()

def get_llm(temperature=0.3):
  
    return ChatNVIDIA(
        model="meta/llama-3.3-70b-instruct",
        api_key=os.getenv("NVIDIA_API_KEY"),
        temperature=temperature,
        top_p=0.7,
        max_tokens=1024
    )


def get_embeddings():
    return HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")


def get_pdf_text(file_paths):
    """Read one or more PDFs from file paths and return full text"""
    text = ""
    for p in file_paths:
        reader = PdfReader(p)
        for page in reader.pages:
            page_text = page.extract_text() or ""
            text += page_text + "\n"
    return text


def get_text_chunks(text):
    splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=1500,
        chunk_overlap=200,
        length_function=len
    )
    return splitter.split_text(text)



def get_vectorstore(text_chunks, persist_directory="db/chroma_store"):
    """
    Creates or loads a persistent Chroma vectorstore.
    """
    os.makedirs(persist_directory, exist_ok=True)

    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # Create persistent Chroma vectorstore
    vectorstore = Chroma.from_texts(
        texts=text_chunks,
        embedding=embeddings,
        persist_directory=persist_directory
    )

    # Ensure data is saved
    vectorstore.persist()

    return vectorstore

def get_conversation_chain(vectorstore):
    llm = get_llm(temperature=0)
    memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
    return ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vectorstore.as_retriever(),
        memory=memory
    )

def generate_summary(text):
    llm = get_llm(temperature=0.3)
    prompt = f"Summarize the following document in a concise and structured way:\n\n{text[:4000]}"
    response = llm.invoke(prompt)
    return response.content if hasattr(response, "content") else str(response)


def generate_mcqs(text):
    llm = get_llm(temperature=0.3)
    prompt = f"""
    From the following study material, create **10 multiple-choice questions**.
    Each question must include 4 options labeled A), B), C), D),
    and clearly mark the correct answer on a new line like:
    "Answer: B) ..."
    
    Keep the format clean for parsing.

    Text:
    {text[:6000]}
    """
    response = llm.invoke(prompt)
    return response.content.strip()
