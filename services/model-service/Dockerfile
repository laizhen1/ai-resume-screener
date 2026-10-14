FROM python:3.12-slim
WORKDIR /service
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HF_HOME=/models HF_HUB_DISABLE_TELEMETRY=1
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt
ARG INSTALL_FAISS=false
RUN if [ "$INSTALL_FAISS" = "true" ]; then pip install --no-cache-dir -r requirements-faiss.txt; fi
COPY app.py models.py pipeline.py learned.py ml_data.py retrieval.py ./
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
