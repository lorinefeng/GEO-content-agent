"""
历史记录路由
管理生成的文章历史
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# 历史记录存储路径
ARTICLES_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "articles.json"
)


class ArticleCreate(BaseModel):
    """创建文章请求"""
    product_name: str
    product_price: float
    strategy: str
    strategy_name: str
    content: str


class Article(BaseModel):
    """文章记录"""
    id: str
    product_name: str
    product_price: float
    strategy: str
    strategy_name: str
    content: str
    created_at: str


def ensure_articles_file():
    """确保文章文件存在"""
    os.makedirs(os.path.dirname(ARTICLES_FILE), exist_ok=True)
    if not os.path.exists(ARTICLES_FILE):
        with open(ARTICLES_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
    return ARTICLES_FILE


def load_articles():
    """加载所有文章"""
    ensure_articles_file()
    with open(ARTICLES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_articles(articles):
    """保存文章"""
    ensure_articles_file()
    with open(ARTICLES_FILE, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)


@router.get("/articles")
async def get_articles(
    strategy: Optional[str] = None,
    limit: int = 50
):
    """获取文章列表"""
    articles = load_articles()
    
    # 按策略过滤
    if strategy:
        articles = [a for a in articles if a.get("strategy") == strategy]
    
    # 按时间倒序
    articles.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"articles": articles[:limit], "total": len(articles)}


@router.get("/articles/{article_id}")
async def get_article(article_id: str):
    """获取单篇文章"""
    articles = load_articles()
    for article in articles:
        if article.get("id") == article_id:
            return article
    raise HTTPException(status_code=404, detail="文章不存在")


@router.post("/articles")
async def create_article(article: ArticleCreate):
    """保存生成的文章"""
    articles = load_articles()
    
    new_article = {
        "id": str(uuid.uuid4()),
        "product_name": article.product_name,
        "product_price": article.product_price,
        "strategy": article.strategy,
        "strategy_name": article.strategy_name,
        "content": article.content,
        "created_at": datetime.now().isoformat()
    }
    
    articles.append(new_article)
    save_articles(articles)
    
    return {"success": True, "article": new_article}


@router.delete("/articles/{article_id}")
async def delete_article(article_id: str):
    """删除文章"""
    articles = load_articles()
    
    for i, article in enumerate(articles):
        if article.get("id") == article_id:
            deleted = articles.pop(i)
            save_articles(articles)
            return {"success": True, "deleted": deleted}
    
    raise HTTPException(status_code=404, detail="文章不存在")
