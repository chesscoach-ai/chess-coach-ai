FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends stockfish \
    && stockfish_bin="$(dpkg-query -L stockfish | grep '/stockfish$' | head -n 1)" \
    && test -x "$stockfish_bin" \
    && ln -s "$stockfish_bin" /usr/local/bin/stockfish \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["sh", "-c", "if [ -n \"${DATABASE_URL:-}\" ] && ! alembic upgrade head; then echo 'database_migration_failed: backend started in degraded mode' >&2; fi; exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
