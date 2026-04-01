FROM python:3.11-slim

WORKDIR /app

COPY backend_notes_app/requirements.txt /app/backend_notes_app/requirements.txt
RUN pip install --no-cache-dir -r /app/backend_notes_app/requirements.txt

COPY backend_notes_app /app/backend_notes_app

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend_notes_app.main:app", "--host", "0.0.0.0", "--port", "8000"]
