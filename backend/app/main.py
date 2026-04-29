from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers.companies import router as companies_router
from .routers.imports import router as imports_router


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Enterprise Data Intelligence API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(imports_router)
app.include_router(companies_router)


@app.get("/healthz")
def healthz():
    return {"ok": True, "data": {"status": "healthy"}}
