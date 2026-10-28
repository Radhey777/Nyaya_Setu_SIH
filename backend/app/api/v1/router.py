"""API v1 router — includes all endpoint routers."""
from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.bureaus import router as bureaus_router
from app.api.v1.endpoints.institutions import router as institutions_router
from app.api.v1.endpoints.cases import router as cases_router
from app.api.v1.endpoints.relationships import router as relationships_router
from app.api.v1.endpoints.coordination import router as coordination_router
from app.api.v1.endpoints.notifications import router as notifications_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.reports import router as reports_router
from app.api.v1.endpoints.imports import router as imports_router
from app.api.v1.endpoints.audit import router as audit_router
from app.api.v1.endpoints.deadline_extensions import router as deadline_ext_router
from app.api.v1.endpoints.applications import router as applications_router
from app.api.v1.endpoints.evc import router as evc_router
from app.api.v1.endpoints.undertakings import router as undertakings_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.deadline_intelligence import router as deadline_intel_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(bureaus_router)
api_router.include_router(institutions_router)
api_router.include_router(cases_router)
api_router.include_router(deadline_ext_router)
api_router.include_router(relationships_router)
api_router.include_router(coordination_router)
api_router.include_router(notifications_router)
api_router.include_router(analytics_router)
api_router.include_router(reports_router)
api_router.include_router(imports_router)
api_router.include_router(audit_router)
api_router.include_router(applications_router)
api_router.include_router(evc_router)
api_router.include_router(undertakings_router)
api_router.include_router(documents_router)
api_router.include_router(deadline_intel_router)
