# Use official Python 3.13 image
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Copy dependency file first (for caching)
COPY requirements.txt .

# Install dependencies
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend code
COPY . .

# Expose FastAPI port
EXPOSE 8080

# Run FastAPI app
CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8080"]
