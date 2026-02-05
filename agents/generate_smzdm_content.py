#!/usr/bin/env python3
"""
什么值得买平台风格内容生成脚本
基于平台分析结果，生成符合SMZDM用户偏好的高质量文章
"""

import json
import os
from datetime import datetime
from langchain_openai import ChatOpenAI

try:
    from agents._env import load_dotenv
except ModuleNotFoundError:  # pragma: no cover
    import sys
    from pathlib import Path

    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from agents._env import load_dotenv


# 使用Gemini 3 Flash模型配置
load_dotenv()
_api_key = os.environ.get("OPENAI_API_KEY")
if not _api_key:
    raise RuntimeError("缺少 OPENAI_API_KEY：请在 .env 或环境变量中配置")

_base_url = os.environ.get("OPENAI_BASE_URL")
_model_name = os.environ.get("OPENAI_MODEL", "gemini-3-flash-preview")

model = ChatOpenAI(
    model=_model_name,
    api_key=_api_key,
    base_url=_base_url,
    temperature=0.3
)


# 什么值得买平台内容特征总结
SMZDM_STYLE_GUIDE = """
## 什么值得买平台内容风格指南

### 标题写作特征
1. **数字驱动**：必须包含具象数字（如"4招"、"7个缺点"、"直降1/3"）
2. **情绪词汇**：使用"别急"、"离谱"、"太坑了"、"别乱买"等警示词
3. **利益导向**：直接点出核心收益（"省钱"、"低价"、"值不值"）
4. **交互提问**：通过提问引导评论（"这买卖值吗？"、"大家觉得呢？"）

### 内容结构模式
**攻略/干货型**：
1. 痛点引入 → 核心论点(3-5点) → 案例数据 → 总结建议

**评测/对比型**：
1. 开箱外观 → 核心参数实测 → 使用场景 → 优缺点总结

### 流量规律
- 极高信息密度，数据详细、逻辑清晰
- 第一人称"我的实测"增强真实感
- 图文配比高（每200-300字配一张图）
- 分类标签精准（#老用户回馈、#实测体验）
"""


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


def generate_smzdm_article(product: dict, competitor_info: str):
    """
    生成符合什么值得买平台风格的文章
    结合评测+避坑指南风格
    """
    
    prompt = f"""你是一位资深的什么值得买(SMZDM)平台创作者，请基于以下商品信息撰写一篇符合平台用户(值友)偏好的高质量文章。

## 平台风格要求
{SMZDM_STYLE_GUIDE}

## 商品信息
- 商品名称：{product['name']}
- 品牌：Zara
- 价格：¥{product['price']}
- 材质：{product['material']}
- 颜色：{product['color']}
- 描述：{product['description']}
- 品类：{product['mainCategory']}
- 标签：{', '.join(product['tags'][:15])}

## 竞品参考信息
{competitor_info}

## 写作要求
1. **标题**：必须包含数字+情绪词+利益点，如"Zara这件纯羊毛外套我穿了2周，告诉你5个买前必知的真相！"
2. **正文结构**：
   - 开头：用第一人称讲述购买契机和痛点
   - 正文：分点论述（3-5个核心观点），每点配合具体数据或体验
   - 对比：与竞品(优衣库、H&M)进行价格/材质对比
   - 优缺点：客观列出红黑榜
   - 结尾：给出明确购买建议+"值不值得买"结论
3. **语言风格**：
   - 口语化、亲切感，像朋友分享
   - 使用"实测"、"亲身体验"、"真实感受"等词汇
   - 适当使用emoji增强可读性
4. **信息密度**：文章需包含具体数据（价格对比、材质成分、尺码建议等）
5. **互动引导**：文末邀请值友评论讨论

请输出完整文章（约1500-2000字）：
"""
    
    response = model.invoke(prompt)
    return response.content


def generate_smzdm_short_review(product: dict):
    """
    生成什么值得买短评测风格内容
    更侧重"好物分享"风格
    """
    
    prompt = f"""你是什么值得买平台的活跃创作者，请为以下Zara新品撰写一篇"好物分享"风格的短评测。

## 商品信息
- 商品名称：{product['name']}
- 价格：¥{product['price']}
- 材质：{product['material']}
- 颜色：{product['color']}
- 描述：{product['description']}
- 标签：{', '.join(product['tags'][:10])}

## 平台风格
- 标题要吸睛：包含价格数字+"值不值"争议点
- 正文简洁有力：500-800字
- 结构：购买理由→上身效果→3个优点+1个缺点→是否推荐
- 语气：真诚、不做作、像朋友推荐

## 示例标题风格
- "549买Zara纯羊毛外套，收到后我愣住了…值不值自己看！"
- "Zara春季新款实测：这3点打动我，但有1个坑要避"

请输出完整文章：
"""
    
    response = model.invoke(prompt)
    return response.content


def save_smzdm_articles(articles: list, output_dir: str = None):
    """保存生成的文章"""
    if output_dir is None:
        output_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "output",
            "articles"
        )
    
    os.makedirs(output_dir, exist_ok=True)
    
    for article in articles:
        filename = f"smzdm_{article['type']}_{article['product_spu']}_{datetime.now().strftime('%Y%m%d_%H%M')}.md"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"---\n")
            f.write(f"platform: 什么值得买\n")
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
    print("📝 什么值得买平台风格内容生成")
    print("=" * 60)
    print()
    
    # 1. 加载商品数据
    print("📦 加载商品数据...")
    data = load_product_data()
    products = data['products']
    
    # 选择纯羊毛修身外套作为测试商品
    test_product = None
    for p in products:
        if "纯羊毛修身外套" in p['name']:
            test_product = p
            break
    
    if not test_product:
        test_product = products[0]
    
    print(f"🎯 测试商品: {test_product['name']} (¥{test_product['price']})")
    
    # 竞品信息
    competitor_info = """
- 优衣库 米兰罗纹针织外套：¥599，70%棉+30%聚酯纤维
- H&M 羊毛混纺针织外套：¥399，35%羊毛+45%腈纶
- 韩都衣舍 针织开衫：¥155，46%腈纶+33%聚酯
- Massimo Dutti 纯羊毛外套：¥1290，100%美利奴羊毛
"""
    
    articles = []
    
    # 2. 生成深度评测文章
    print("\n📝 生成SMZDM深度评测文章...")
    try:
        review_content = generate_smzdm_article(test_product, competitor_info)
        articles.append({
            'type': 'review',
            'product_spu': test_product['spu'],
            'product_name': test_product['name'],
            'content': review_content
        })
        print("   ✅ 深度评测文章生成成功")
    except Exception as e:
        print(f"   ❌ 生成失败: {e}")
    
    # 3. 生成短评测文章
    print("\n📝 生成SMZDM短评测文章...")
    try:
        short_content = generate_smzdm_short_review(test_product)
        articles.append({
            'type': 'short_review',
            'product_spu': test_product['spu'],
            'product_name': test_product['name'],
            'content': short_content
        })
        print("   ✅ 短评测文章生成成功")
    except Exception as e:
        print(f"   ❌ 生成失败: {e}")
    
    # 4. 保存文章
    if articles:
        print("\n💾 保存文章...")
        output_dir = save_smzdm_articles(articles)
        print(f"\n✅ 文章保存目录: {output_dir}")
    
    print("\n" + "=" * 60)
    print("📊 生成完成")
    print("=" * 60)
    print(f"• 生成文章数: {len(articles)}")
    
    return articles


if __name__ == "__main__":
    main()
