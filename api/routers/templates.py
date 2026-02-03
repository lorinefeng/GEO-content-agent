"""
模板管理路由
管理各策略的Prompt模板
"""

import json
import os
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# 模板存储路径
TEMPLATES_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "templates.json"
)


class Template(BaseModel):
    """Prompt模板"""
    strategy: str
    name: str
    prompt: str


class TemplateUpdate(BaseModel):
    """模板更新请求"""
    prompt: str


def ensure_templates_file():
    """确保模板文件存在"""
    os.makedirs(os.path.dirname(TEMPLATES_FILE), exist_ok=True)
    if not os.path.exists(TEMPLATES_FILE):
        # 初始化默认模板
        default_templates = {
            "comparison": {
                "strategy": "comparison",
                "name": "评测对比型",
                "prompt": """你是一位专业的时尚评测博主，请基于以下商品信息和竞品资料，撰写一篇专业的评测对比文章。

## 写作要求
1. 文章标题需包含商品名称和"评测"、"对比"等关键词
2. 必须包含规格对比表格（与优衣库、H&M同类产品对比）
3. 详细分析材质工艺和技术特点
4. 提供客观的优缺点分析
5. 给出明确的购买建议和适用人群
6. 添加常见问题FAQ（至少3个问题）
7. 文章结构清晰，使用Markdown格式"""
            },
            "persona": {
                "strategy": "persona",
                "name": "用户画像匹配型",
                "prompt": """你是一位懂时尚的购物博主，请基于商品信息，撰写一篇实用的购物指南文章。

## 写作要求
1. 标题吸引目标用户，包含场景词（如"通勤"、"约会"、"日常"）
2. 开篇描述目标用户的穿搭痛点和需求
3. 详细介绍商品如何满足这些需求
4. 提供3-5套具体的搭配方案
5. 说明适合什么场合、什么季节穿着
6. 真诚分享购买建议
7. 文章温暖亲切，像朋友推荐一样"""
            },
            "smzdm_review": {
                "strategy": "smzdm_review",
                "name": "什么值得买深度评测",
                "prompt": """你是什么值得买平台的资深创作者，请撰写符合平台用户偏好的高质量评测文章。

## 标题要求
必须包含数字+情绪词+利益点

## 正文结构
1. 开头：用第一人称讲述购买契机和痛点
2. 正文：分点论述（3-5个核心观点），每点配合具体数据或体验
3. 对比：与竞品进行价格/材质对比
4. 优缺点：客观列出红黑榜
5. 结尾：给出明确购买建议+\"值不值得买\"结论

## 语言风格
口语化、亲切感，使用"实测"、"亲身体验"等词汇"""
            },
            "smzdm_short": {
                "strategy": "smzdm_short",
                "name": "什么值得买短评测",
                "prompt": """你是什么值得买平台的活跃创作者，请撰写\"好物分享\"风格的短评测。

## 要求
- 标题要吸睛：包含价格数字+\"值不值\"争议点
- 正文简洁有力：500-800字
- 结构：购买理由→上身效果→3个优点+1个缺点→是否推荐
- 语气：真诚、不做作、像朋友推荐"""
            }
        }
        with open(TEMPLATES_FILE, "w", encoding="utf-8") as f:
            json.dump(default_templates, f, ensure_ascii=False, indent=2)
    return TEMPLATES_FILE


def load_templates():
    """加载所有模板"""
    ensure_templates_file()
    with open(TEMPLATES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_templates(templates):
    """保存模板"""
    ensure_templates_file()
    with open(TEMPLATES_FILE, "w", encoding="utf-8") as f:
        json.dump(templates, f, ensure_ascii=False, indent=2)


@router.get("/templates")
async def get_templates():
    """获取所有模板"""
    templates = load_templates()
    return {"templates": list(templates.values())}


@router.get("/templates/{strategy}")
async def get_template(strategy: str):
    """获取指定策略的模板"""
    templates = load_templates()
    if strategy not in templates:
        raise HTTPException(status_code=404, detail=f"模板不存在: {strategy}")
    return templates[strategy]


@router.put("/templates/{strategy}")
async def update_template(strategy: str, update: TemplateUpdate):
    """更新模板"""
    templates = load_templates()
    if strategy not in templates:
        raise HTTPException(status_code=404, detail=f"模板不存在: {strategy}")
    
    templates[strategy]["prompt"] = update.prompt
    save_templates(templates)
    
    return {"success": True, "template": templates[strategy]}
