# Python 3.12 pinned on purpose: stable with SQLAlchemy and asyncpg.
FROM python:3.12-slim

# No .pyc clutter; logs appear immediately in `docker compose logs`.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copy requirements first: Docker caches this layer, so rebuilds are fast
# unless requirements.txt itself changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as a normal user, not root (safer if the container is ever compromised).
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
