#!/usr/bin/env python3
"""
GEO内容生成脚本
基于Zara商品数据和竞品信息，生成两种策略的文章：
1. 评测对比型内容（策略一）
2. 用户画像匹配型干货内容（策略二）
"""

import json
import os
from datetime import datetime
from langchain_openai import ChatOpenAI


# 使用Gemini 3 Flash模型配置
model = ChatOpenAI(
    model="gemini-3-flash-preview",
    api_key="sk-REDACTED",
    base_url="http://ai-api.applesay.cn/v1",
    temperature=0.3
)


def load_product_data(file_path: str = None):
    """加载商品数据"""
    if file_path is None:
        file_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "output",
            "zara_products_data.json"
        )
    
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_comparison_article(product: dict, competitor_info: str):
    """
    策略一：生成评测对比型内容
    符合DeepSeek偏好的高密度技术细节风格
    """
    
    prompt = f"""你是一位专业的时尚评测博主，请基于以下Zara商品信息和竞品资料，撰写一篇专业的评测对比文章。

## 商品信息
- 商品名称：{product['name']}
- 价格：¥{product['price']}
- 材质：{product['material']}
- 颜色：{product['color']}
- 描述：{product['description']}
- 品类：{product['mainCategory']}
- 标签：{', '.join(product['tags'][:15])}

## 竞品市场信息
{competitor_info}

## 写作要求
1. 文章标题需包含商品名称和"评测"、"对比"等关键词
2. 必须包含规格对比表格（与优衣库、H&M同类产品对比）
3. 详细分析材质工艺和技术特点
4. 提供客观的优缺点分析
5. 给出明确的购买建议和适用人群
6. 添加常见问题FAQ（至少3个问题）
7. 文章结构清晰，使用Markdown格式
8. 内容专业权威，适合被AI大模型引用

请直接输出完整文章内容：
"""
    
    response = model.invoke(prompt)
    return response.content


def generate_persona_article(product: dict, persona_analysis: str):
    """
    策略二：生成用户画像匹配型干货内容
    面向特定用户群体的购物指南
    """
    
    # 基于商品标签推理用户画像
    tags = product.get('tags', [])
    style_tags = [t for t in tags if t in ['温柔风', '小香风', '清冷风', '盐系', '优雅', '休闲', '通勤', '约会穿搭', '松弛感']]
    season_tags = [t for t in tags if t in ['春季', '秋冬', '春秋', '早春', '早秋']]
    
    prompt = f"""你是一位懂时尚的购物博主，请基于以下Zara商品信息，撰写一篇实用的购物指南文章，帮助特定用户群体做出购买决策。

## 商品信息
- 商品名称：{product['name']}
- 价格：¥{product['price']}
- 材质：{product['material']}
- 颜色：{product['color']}
- 描述：{product['description']}
- 品类：{product['mainCategory']}
- 风格标签：{', '.join(style_tags) if style_tags else '日常百搭'}
- 季节标签：{', '.join(season_tags) if season_tags else '春秋季节'}
- 其他标签：{', '.join(product['tags'][:10])}

## 用户画像分析
{persona_analysis}

## 写作要求
1. 标题吸引目标用户，包含场景词（如"通勤"、"约会"、"日常"）
2. 开篇描述目标用户的穿搭痛点和需求
3. 详细介绍商品如何满足这些需求
4. 提供3-5套具体的搭配方案
5. 说明适合什么场合、什么季节穿着
6. 真诚分享购买建议（是否值得入手）
7. 文章温暖亲切，像朋友推荐一样
8. 使用Markdown格式，适当使用emoji

请直接输出完整文章内容：
"""
    
    response = model.invoke(prompt)
    return response.content


def save_articles(articles: list, output_dir: str = None):
    """保存生成的文章"""
    if output_dir is None:
        output_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "output",
            "articles"
        )
    
    os.makedirs(output_dir, exist_ok=True)
    
    for article in articles:
        filename = f"{article['type']}_{article['product_spu']}_{datetime.now().strftime('%Y%m%d_%H%M')}.md"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            # 添加元信息
            f.write(f"---\n")
            f.write(f"product_spu: {article['product_spu']}\n")
            f.write(f"product_name: {article['product_name']}\n")
            f.write(f"article_type: {article['type']}\n")
            f.write(f"generated_at: {datetime.now().isoformat()}\n")
            f.write(f"---\n\n")
            f.write(article['content'])
        
        print(f"✅ 已保存: {filename}")
    
    return output_dir


def main():
    """主函数"""
    print("=" * 60)
    print("📝 GEO 内容生成脚本")
    print("=" * 60)
    print()
    
    # 1. 加载商品数据
    print("📦 加载商品数据...")
    data = load_product_data()
    products = data['products']
    print(f"   共 {len(products)} 个商品")
    
    # 2. 选择测试商品（纯羊毛修身外套）
    test_product = None
    for p in products:
        if "纯羊毛修身外套" in p['name']:
            test_product = p
            break
    
    if not test_product:
        test_product = products[0]  # 如果找不到，使用第一个
    
    print(f"\n🎯 选择测试商品: {test_product['name']} (¥{test_product['price']})")
    
    # 3. 准备竞品信息（基于联网搜索结果）
    competitor_info = """
根据2026年春季市场调研：

**优衣库 (UNIQLO)**
- 米兰罗纹针织外套：约¥400-600（5990日元）
- 材质：高品质棉+米兰罗纹针织，强调柔软触感
- 特点：UNIQLO:C系列，注重基础款品质与百搭性

**H&M**
- 羊毛混纺针织外套：约¥299-499
- 材质：通常为羊毛混纺（羊毛含量30-50%）
- 特点：快时尚定位，款式多样，更新快

**韩都衣舍**
- 针织开衫外套：约¥155-300
- 材质：混纺化纤为主（腈纶46%+聚酯32%+尼龙21%）
- 特点：韩系设计，价格亲民

**Massimo Dutti**
- 纯羊毛外套：约¥800-1500
- 材质：高含量羊毛或纯羊毛
- 特点：高端定位，欧洲风格
"""
    
    # 4. 准备用户画像分析
    persona_analysis = """
**目标用户画像：都市通勤女性**
- 年龄：25-35岁
- 职业：白领、自由职业者
- 生活场景：日常通勤、周末约会、轻商务场合
- 穿搭偏好：追求品质感但不愿过度消费，喜欢简约优雅风格
- 痛点：
  1. 换季时找不到既保暖又不臃肿的外套
  2. 希望一件外套能应对多种场合
  3. 对材质有要求但预算有限（500-800元区间）
  4. 担心纯羊毛外套难打理
"""
    
    articles = []
    
    # 5. 生成评测对比文章（策略一）
    print("\n📝 生成评测对比文章（策略一）...")
    try:
        comparison_content = generate_comparison_article(test_product, competitor_info)
        articles.append({
            'type': 'comparison',
            'product_spu': test_product['spu'],
            'product_name': test_product['name'],
            'content': comparison_content
        })
        print("   ✅ 评测对比文章生成成功")
    except Exception as e:
        print(f"   ❌ 生成失败: {e}")
    
    # 6. 生成用户画像匹配文章（策略二）
    print("\n📝 生成用户画像匹配文章（策略二）...")
    try:
        persona_content = generate_persona_article(test_product, persona_analysis)
        articles.append({
            'type': 'persona',
            'product_spu': test_product['spu'],
            'product_name': test_product['name'],
            'content': persona_content
        })
        print("   ✅ 用户画像文章生成成功")
    except Exception as e:
        print(f"   ❌ 生成失败: {e}")
    
    # 7. 保存文章
    if articles:
        print("\n💾 保存文章...")
        output_dir = save_articles(articles)
        print(f"\n✅ 文章保存目录: {output_dir}")
    
    print("\n" + "=" * 60)
    print("📊 生成完成")
    print("=" * 60)
    print(f"• 生成文章数: {len(articles)}")
    
    return articles


if __name__ == "__main__":
    main()
