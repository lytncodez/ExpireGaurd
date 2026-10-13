"""API routers. Each router is thin: validate input, call a service, shape the response."""

from fastapi import APIRouter

from app.routes import (
    ai,
    alerts,
    analytics,
    auth,
    barcode,
    batches,
    categories,
    companies,
    dashboard,
    expiry,
    health,
    imports,
    insights,
    inventory,
    items,
    notifications,
    products,
    sales,
    settings,
    users,
)

api_router = APIRouter()
for module in (
    health, auth, users, companies, settings, items, categories, products, batches, inventory, sales, imports,
    barcode, expiry, alerts, notifications, analytics, dashboard, insights, ai,
):
    api_router.include_router(module.router)
