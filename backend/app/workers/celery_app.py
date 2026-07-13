import ssl
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "rotineira",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

_ssl_opts = {"ssl_cert_reqs": ssl.CERT_NONE} if settings.REDIS_URL.startswith("rediss://") else {}

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_use_ssl=_ssl_opts or None,
    redis_backend_use_ssl=_ssl_opts or None,
)
