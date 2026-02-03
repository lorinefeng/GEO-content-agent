#!/usr/bin/env python3
"""
Zara商品数据获取与分析脚本（独立版本）
用于GEO内容Agent的商品数据采集阶段
不依赖外部BrandMessage模块
"""

import requests
import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional


class ZaraAPI:
    """Zara API 封装（独立版本）"""
    
    def __init__(self):
        self._search_api = "https://search.moechat.cn/api/search/mixed"
        self._product_list_api = "https://admin.moechat.cn/admin-api/search/product/list"
        self._recall_token = "Bearer 7aB3rT9kLp2XqW8vZ1yN4oM5cD6eF7gH8jK9lP0"
        self._token = "Bearer e4e8b345b4474c7b906590b9664e94c5"
        self._tag_api = "https://admin.moechat.cn/admin-api/search/product/showTag"
    
    def search_products(self, keyword: str, category: str = "女士", page_size: int = 10) -> Dict[str, Any]:
        """
        搜索商品
        
        Args:
            keyword: 搜索关键词
            category: 品类（女士/男士/儿童/家居）
            page_size: 每页数量
        """
        category_map = {
            "男士": "MAN",
            "女士": "WOMAN", 
            "儿童": "KID",
            "家居": "HOME"
        }
        
        data = {
            "keyword": keyword,
            "pageSize": page_size,
            "pageNum": 1,
            "handletype": "200",
        }
        
        if category:
            data["filters"] = [{
                "dimensionName": "gender",
                "tagNames": [category_map.get(category, "WOMAN")]
            }]
        
        response = requests.post(
            self._search_api, 
            json=data, 
            headers={"Authorization": self._recall_token}
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"搜索失败: {response.status_code} - {response.text}")
    
    def get_product_details(self, spu: str) -> Dict[str, Any]:
        """获取商品详情"""
        data = {
            "spu": spu,
            "pageNo": 1,
            "pageSize": 10
        }
        
        response = requests.post(
            self._product_list_api,
            json=data,
            headers={"Authorization": self._token}
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"获取详情失败: {response.status_code}")
    
    def get_tag_info(self, product_id: str) -> Dict[str, Any]:
        """获取商品标签信息"""
        params = {"productId": f"zara-new_{product_id}"}
        
        response = requests.get(
            self._tag_api,
            params=params,
            headers={"Authorization": self._token}
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"获取标签失败: {response.status_code}")


def fetch_zara_products(category: str = "女士", keywords: List[str] = None, limit_per_keyword: int = 3):
    """
    获取Zara商品数据
    
    Args:
        category: 品类
        keywords: 搜索关键词列表
        limit_per_keyword: 每个关键词获取的商品数量
        
    Returns:
        商品列表，每个商品包含基本信息、详情和标签
    """
    if keywords is None:
        keywords = ["春季", "外套", "新款", "连衣裙"]
    
    api = ZaraAPI()
    all_products = []
    seen_ids = set()  # 去重
    
    print(f"🔍 开始获取Zara {category} 商品数据...")
    print(f"   关键词: {keywords}")
    print()
    
    for keyword in keywords:
        print(f"📦 搜索关键词: {keyword}")
        
        try:
            result = api.search_products(keyword=keyword, category=category, page_size=limit_per_keyword)
            
            if result.get("code") == 200 and "data" in result:
                # 注意：API返回的是 rows 不是 products
                products = result["data"].get("rows", [])
                print(f"   找到 {len(products)} 个商品")
                
                for product in products:
                    # 使用正确的字段名：spuId 或 productId
                    spu = product.get("spuId") or product.get("productId", "")
                    
                    # 去重
                    if spu in seen_ids:
                        continue
                    seen_ids.add(spu)
                    
                    # 商品数据（使用API返回的正确字段名）
                    product_data = {
                        "spu": spu,
                        "name": product.get("productName", ""),
                        "price": product.get("price", ""),
                        "discountPrice": product.get("discountPrice", ""),
                        "image": product.get("mainImage", ""),
                        "description": product.get("description", ""),
                        "material": product.get("material", ""),
                        "color": product.get("color", ""),
                        "categories": product.get("categories", []),
                        "tags": product.get("tags", []),
                        "isNew": product.get("isNew", 0),
                        "releaseDate": product.get("releaseDate", ""),
                        "mainCategory": product.get("mainCategory", ""),
                        "search_keyword": keyword,
                    }
                    
                    # 获取更详细的AI标签信息
                    try:
                        tag_info = api.get_tag_info(spu)
                        if tag_info.get("code") == 0 and "data" in tag_info:
                            tag_data = tag_info["data"]
                            product_data["ai_tags"] = {
                                "mainCategory": tag_data.get("mainCategory", ""),
                                "mainCategoryAi": tag_data.get("mainCategoryAi", ""),
                                "whiteList": tag_data.get("whiteList", ""),
                                "whiteListAi": tag_data.get("whiteListAi", ""),
                            }
                            print(f"   ✅ {product_data['name'][:20]}... - AI标签获取成功")
                    except Exception as e:
                        print(f"   ⚠️ {product_data['name'][:20]}... - AI标签获取失败")
                    
                    all_products.append(product_data)
                    
        except Exception as e:
            print(f"   ❌ 搜索失败: {e}")
        
        print()
    
    return all_products


def save_products_data(products: List[Dict], output_dir: str = None):
    """保存商品数据到JSON文件"""
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output")
    
    os.makedirs(output_dir, exist_ok=True)
    
    output_data = {
        "fetch_time": datetime.now().isoformat(),
        "total_count": len(products),
        "products": products
    }
    
    output_file = os.path.join(output_dir, "zara_products_data.json")
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    return output_file


def main():
    """主函数"""
    print("=" * 60)
    print("🛍️  Zara 商品数据获取脚本")
    print("=" * 60)
    print()
    
    # 获取商品数据
    products = fetch_zara_products(
        category="女士",
        keywords=["春季新款", "外套", "连衣裙", "针织"],
        limit_per_keyword=3
    )
    
    print("=" * 60)
    print(f"📊 数据获取完成")
    print("=" * 60)
    print(f"• 共获取 {len(products)} 个商品")
    
    # 保存数据
    output_file = save_products_data(products)
    print(f"• 数据已保存到: {output_file}")
    
    # 打印商品摘要
    print()
    print("📋 商品列表预览：")
    print("-" * 60)
    
    for i, product in enumerate(products[:5], 1):
        tags_count = len(product.get("tags", []))
        is_new = "🆕" if product.get("isNew") == 1 else ""
        print(f"{i}. {is_new} {product['name'][:40]}...")
        print(f"   SPU: {product['spu']} | ¥{product['price']} | {tags_count}个标签")
    
    if len(products) > 5:
        print(f"... 还有 {len(products) - 5} 个商品")
    
    return products


if __name__ == "__main__":
    main()
