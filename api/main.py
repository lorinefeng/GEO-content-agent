"""
FastAPI 后端服务入口
封装现有GEO内容生成Agent，提供RESTful API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import generate, templates, articles

app = FastAPI(
    title="GEO Content Agent API",
    description="商品内容生成API服务",
    version="1.0.0"
)

# CORS配置（允许前端访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(generate.router, prefix="/api", tags=["内容生成"])
app.include_router(templates.router, prefix="/api", tags=["模板管理"])
app.include_router(articles.router, prefix="/api", tags=["历史记录"])


@app.get("/")
def root():
    return {"message": "GEO Content Agent API", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
