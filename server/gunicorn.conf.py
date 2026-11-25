"""Production API process; the durable worker is a separate Railway service."""
import os

# Dual-stack binding supports Railway private DNS and public health checks.
bind = os.getenv('GUNICORN_BIND', f"[::]:{os.getenv('PORT', '8080')}")
workers = int(os.getenv('WEB_CONCURRENCY', '2'))
worker_class = 'gthread'
threads = int(os.getenv('GUNICORN_THREADS', '4'))
timeout = 120
graceful_timeout = 30
keepalive = 5
max_requests = 1000
max_requests_jitter = 50
accesslog = '-'
errorlog = '-'
# Do not log query strings: private media URLs carry short-lived bearer tokens.
access_log_format = '%(h)s %(m)s %(U)s %(s)s %(L)s'
capture_output = True
