FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ENVIRONMENT=production \
    PORT=8080
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home --uid 10001 agribridge
COPY --chown=agribridge:agribridge app ./app
COPY --chown=agribridge:agribridge migrations ./migrations
COPY --chown=agribridge:agribridge run.py gunicorn.conf.py ./
RUN mkdir -p /app/instance && chown agribridge:agribridge /app/instance
USER agribridge
EXPOSE 8080
CMD ["gunicorn", "--config", "gunicorn.conf.py", "run:app"]
