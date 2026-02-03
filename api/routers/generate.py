"""
内容生成路由
调用现有Agent生成多策略内容
"""

import sys
import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# 添加agents目录到路径 (api和agents是平级目录，都在SkuGeo下)
SKUGEO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(SKUGEO_ROOT, "agents"))

from generate_content import generate_comparison_article, generate_persona_article
from generate_smzdm_content import generate_smzdm_article, generate_smzdm_short_review

router = APIRouter()


class ProductInfo(BaseModel):
    """商品信息"""
    name: str
    price: float
    material: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = []


class GenerateRequest(BaseModel):
    """生成请求"""
    product: ProductInfo
    strategies: List[str]  # comparison, persona, smzdm_review, smzdm_short
    competitor_info: Optional[str] = None


class ArticleResult(BaseModel):
    """生成结果"""
    strategy: str
    strategy_name: str
    content: str


class GenerateResponse(BaseModel):
    """生成响应"""
    success: bool
    articles: List[ArticleResult]
    errors: Optional[List[str]] = []


# 策略名称映射
STRATEGY_NAMES = {
    "comparison": "评测对比型",
    "persona": "用户画像匹配型",
    "smzdm_review": "什么值得买深度评测",
    "smzdm_short": "什么值得买短评测"
}

# 默认竞品信息
DEFAULT_COMPETITOR_INFO = """
根据2026年春季市场调研：

**优衣库 (UNIQLO)**
- 米兰罗纹针织外套：约¥400-600
- 材质：高品质棉+米兰罗纹针织

**H&M**
- 羊毛混纺针织外套：约¥299-499
- 材质：通常为羊毛混纺

**韩都衣舍**
- 针织开衫外套：约¥155-300
- 材质：混纺化纤为主
"""


@router.post("/generate", response_model=GenerateResponse)
async def generate_content(request: GenerateRequest):
    """
    生成多策略内容
    """
    articles = []
    errors = []
    
    # 构造商品数据格式（兼容现有Agent）
    product = {
        "name": request.product.name,
        "price": request.product.price,
        "material": request.product.material or "未知",
        "color": request.product.color or "未知",
        "description": request.product.description or "",
        "mainCategory": request.product.category or "服装",
        "tags": request.product.tags or [],
        "spu": f"SKU-{hash(request.product.name) % 100000:05d}"
    }
    
    competitor_info = request.competitor_info or DEFAULT_COMPETITOR_INFO
    
    # 默认用户画像
    persona_analysis = f"""
**目标用户画像：都市通勤人群**
- 年龄：25-35岁
- 生活场景：日常通勤、周末约会、轻商务场合
- 穿搭偏好：追求品质感但不愿过度消费
- 预算区间：{int(request.product.price * 0.8)}-{int(request.product.price * 1.5)}元
"""
    
    for strategy in request.strategies:
        try:
            content = ""
            if strategy == "comparison":
                content = generate_comparison_article(product, competitor_info)
            elif strategy == "persona":
                content = generate_persona_article(product, persona_analysis)
            elif strategy == "smzdm_review":
                content = generate_smzdm_article(product, competitor_info)
            elif strategy == "smzdm_short":
                content = generate_smzdm_short_review(product)
            else:
                errors.append(f"未知策略: {strategy}")
                continue
            
            articles.append(ArticleResult(
                strategy=strategy,
                strategy_name=STRATEGY_NAMES.get(strategy, strategy),
                content=content
            ))
        except Exception as e:
            errors.append(f"{strategy}: {str(e)}")
    
    return GenerateResponse(
        success=len(articles) > 0,
        articles=articles,
        errors=errors if errors else None
    )


@router.get("/strategies")
async def get_strategies():
    """获取可用策略列表"""
    return {
        "strategies": [
            {"id": "comparison", "name": "评测对比型", "description": "专业评测对比，包含规格表格和竞品分析"},
            {"id": "persona", "name": "用户画像匹配型", "description": "面向特定用户群体的购物指南"},
            {"id": "smzdm_review", "name": "什么值得买深度评测", "description": "符合SMZDM平台风格的深度评测"},
            {"id": "smzdm_short", "name": "什么值得买短评测", "description": "简洁的好物分享风格"},
        ]
    }
