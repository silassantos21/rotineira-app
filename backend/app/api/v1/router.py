from fastapi import APIRouter
from app.api.v1 import health, auth, family, plans, notifications, webhooks

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(family.router, prefix="/family", tags=["family"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
