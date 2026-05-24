FROM python:3.11-slim

# LightGBM needs libgomp at runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py model.py schemas.py ./

ENV PORT=8081
EXPOSE 8081

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8081}"]
