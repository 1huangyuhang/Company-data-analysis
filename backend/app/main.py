from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers.companies import router as companies_router
from .routers.imports import router as imports_router
from .routers.auth import router as auth_router
from .routers.exports import router as exports_router
from .routers.analytics import router as analytics_router
from .security import get_current_user, get_admin_user


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Enterprise Data Intelligence API", version="0.1.0")

# JWT 走 Authorization 头，无需携带 Cookie；allow_credentials=True 时浏览器不允许
# Access-Control-Allow-Origin: *，会导致跨域预检失败，表现为前端 “Failed to fetch”。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 公共路由
app.include_router(auth_router)

# 受保护的路由
app.include_router(imports_router)
app.include_router(companies_router)
app.include_router(exports_router)
app.include_router(analytics_router)


@app.get("/healthz")
def healthz():
    return {"ok": True, "data": {"status": "healthy"}}
