from typing import Any, Dict, List, Optional
from BrandMessage.base import BaseShopAPI
import requests
import pymysql
from pymysql.cursors import DictCursor
from auth.exceptions import BrandSearchException, BrandProductDetailException


class ZaraShopAPI(BaseShopAPI):
    """Zara 电商平台 API 实现"""

    def __init__(self):
        """
        初始化 Zara API

        Args:
        """
        self._search_api = "https://search.moechat.cn/api/search/mixed"
        self._product_list_api = "https://admin.moechat.cn/admin-api/search/product/list"
        # 召回 token
        self._recall_token = "Bearer 7aB3rT9kLp2XqW8vZ1yN4oM5cD6eF7gH8jK9lP0"
        # 后台 token
        self._token = "Bearer e4e8b345b4474c7b906590b9664e94c5"
        self._tag_api = "https://admin.moechat.cn/admin-api/search/product/showTag"
        self._update_message_api = "https://admin.moechat.cn/admin-api/search/tag/update"
        self._config = {
            "db": {
                "host": "REDACTED_HOST",
                "user": "memor",
                "password": "#7Dp9@zM",
                "port": 26462,
                "database": "data"
            }
        }

    @property
    def search_api(self) -> str:
        """搜索接口地址"""
        return self._search_api

    @property
    def product_list_api(self) -> str:
        """商品列表接口地址"""
        return self._product_list_api

    @property
    def token(self) -> str:
        """令牌"""
        return self._token
    
    @property
    def recall_token(self) -> str:
        """召回令牌"""
        return self._recall_token
    
    @property
    def tag_api(self) -> str:
        """标签接口地址"""
        return self._tag_api

    @property
    def update_message_api(self) -> str:
        """标签更新接口地址"""
        return self._update_message_api

    def get_search_results(self, keyword: str, category : str , pageSize=5, **kwargs) -> Dict[str, Any]:
        """
        获取 Zara 搜索结果

        Args:
            keyword: 搜索关键词
            pageSize: 每页数量
            **kwargs: 其他搜索参数

        Returns:
            JSON 对象（dict）
        """
        mapped = {
            "男士" : "MAN",
            "女士" : "WOMAN",
            "儿童" : "KID",
            "家居" : "HOME"
        }
        # TODO: 实现具体搜索逻辑
        data = {
            "keyword": keyword,
            "pageSize": pageSize,
            "pageNum": 1,
            "handletype": "200",
        }
        if category:
            data["filters"] = [{
                "dimensionName" : "gender" ,
                "tagNames" : [mapped[category]]
            }]
        
        print(data)
        result = requests.post(self.search_api, json=data, headers={"Authorization": self.recall_token})
        if result.status_code == 200:
            return result.json()
        else:
            raise BrandSearchException(
                brand="zara",
                keyword=keyword,
                status_code=result.status_code,
                response_text=result.text
            )

    def get_product_details(self, product_id: str, **kwargs) -> Dict[str, Any]:
        """
        获取 Zara 商品详情

        Args:
            product_id: 商品 ID
            **kwargs: 其他参数

        Returns:
            JSON 对象（dict）
        """
        # TODO: 实现具体详情获取逻辑
        data = {
            "spu": product_id,
            "pageNo" : 1,
            "pageSize" : 10
        }
        result = requests.post(self.product_list_api, json=data, headers={"Authorization": self.token})
        if result.status_code == 200:
            return result.json()
        else:
            raise BrandProductDetailException(
                brand="zara",
                product_id=product_id,
                status_code=result.status_code,
                response_text=result.text
            )
    
    def get_tag_info(self, product_id: str, **kwargs) -> Dict[str, Any]:
        data = {
            "productId": "zara-new_" + product_id,
        }
        headers = {
            "Authorization": self.token,
        }
        result = requests.get(self.tag_api, params=data, headers=headers)
        if result.status_code == 200:
            return result.json()
        else:
            raise BrandProductDetailException(
                brand="zara",
                product_id=product_id,
                status_code=result.status_code,
                response_text=result.text
            )

    def update_blackList(self, tag : str, product_id : str, delete : bool = False,**kwargs) -> Dict[str, Any]:
        """
        更新商品黑名单
        """
        pass

    def update_multi_category(
        self,
        spu: str,
        multi_category: str,
        field_name: str,
        main_category: Optional[str] = None,
        process_flag: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        spu_value = str(spu or "").strip()
        if spu_value.startswith("zara-new_"):
            spu_value = spu_value[len("zara-new_") :]
        product_id = f"zara-new_{spu_value}"

        tag_resp = {}
        try:
            tag_resp = self.get_tag_info(spu_value) or {}
        except Exception:
            tag_resp = {}
        tag_data = (tag_resp.get("data") or {}) if isinstance(tag_resp, dict) else {}

        payload: Dict[str, Any] = {
            "productId": tag_data.get("productId") or product_id,
            "blackList": tag_data.get("blackList") or "",
            "blackListAi": tag_data.get("blackListAi"),
            "whiteList": tag_data.get("whiteList") or "",
            "whiteListAi": tag_data.get("whiteListAi"),
            "mainCategory": (main_category if main_category is not None else (tag_data.get("mainCategory") or "")),
            "mainCategoryAi": tag_data.get("mainCategoryAi"),
            "processFlag": process_flag,
            "score": tag_data.get("score") or 0,
        }
        payload[field_name] = multi_category or ""

        headers = {
            "Authorization": self.token,
            "Content-Type": "application/json",
            "tenant-id": "169",
        }
        result = requests.put(self.update_message_api, json=payload, headers=headers)
        if result.status_code == 200:
            return result.json()
        raise BrandProductDetailException(
            brand="zara",
            product_id=spu_value,
            status_code=result.status_code,
            response_text=result.text
        )

    def get_top_words(self, weekly : bool = False, start : int = 0,category: str = "女士", **kwargs) -> List[Dict[str, Any]]:
        """
        获取优衣库热门搜索词列表
        
        从数据库中查询昨天的热门搜索词，按搜索PV降序排列  ------   外部数据库
        
        Args:
            **kwargs: 可选参数
                - limit: 返回结果数量限制（默认不限制）
                - search_date: 指定查询日期（默认查询昨天）
        
        Returns:
            List[Dict[str, Any]]: 搜索词字典列表，每个字典包含 search 和 search_pv 字段，按搜索PV降序排列
        """
        sql = """
            SELECT 
                `date`,
                `搜索PV` AS search_pv,
                CASE 
                    WHEN category = '其他' THEN TRIM(audiocontent)
                    ELSE TRIM(
                        SUBSTRING_INDEX(
                            SUBSTRING_INDEX(audiocontent, category, LENGTH(audiocontent) - LENGTH(REPLACE(audiocontent, category, '')) / LENGTH(category)),
                            category,
                            1
                        )
                    )
                END AS search_text,
                category
            FROM ads_pbi_shixin_words_zara
            WHERE DATE(`date`) = CURDATE() - INTERVAL 1 DAY
            AND category=%s
            ORDER BY `搜索PV` DESC LIMIT %s , 100
        """

        if weekly:
            sql = """
                SELECT
                SUM(`搜索PV`) AS search_pv,
                search_text,
                category
                FROM (
                SELECT
                    `搜索PV`,
                    CASE
                    WHEN category = '其他' THEN
                        TRIM(audiocontent)
                    ELSE
                        TRIM(
                        SUBSTRING_INDEX(
                            SUBSTRING_INDEX(audiocontent, category, 
                            LENGTH(audiocontent) - LENGTH(REPLACE(audiocontent, category, '')) / LENGTH(category)
                            ),
                            category,
                            1
                        )
                        )
                    END AS search_text,
                    category
                FROM
                    ads_pbi_shixin_words_zara
                WHERE
                    DATE(`date`) >= CURDATE() - INTERVAL 7 DAY
                    AND DATE(`date`) < CURDATE()
                    AND category = %s
                ) AS subquery
                GROUP BY search_text, category
                ORDER BY search_pv DESC
                LIMIT %s , 200
            """
        
        db_config = self._config["db"]
        conn = None
        try:
            # 连接数据库
            conn = pymysql.connect(
                host=db_config["host"],
                user=db_config["user"],
                password=db_config["password"],
                port=db_config["port"],
                database=db_config["database"],
                charset='utf8mb4'
            )
            
            with conn.cursor(DictCursor) as cursor:

                cursor.execute(sql, (category, start))
                results = cursor.fetchall()
                
                        
                words_list = [
                    {
                        "search": row["search_text"],
                        "search_pv": row["search_pv"]
                    }
                    for row in results
                ]
                
                # 如果指定了limit参数，则限制返回数量
                limit = kwargs.get("limit")
                if limit and isinstance(limit, int) and limit > 0:
                    words_list = words_list[:limit]
                
                return words_list
                
        except Exception as e:
            raise BrandSearchException(
                brand="zara",
                keyword="get_top_words",
                status_code=500,
                response_text=f"数据库查询失败: {str(e)}"
            )
        finally:
            if conn:
                conn.close()

if __name__ == "__main__":
    zara = ZaraShopAPI()
    # result = zara.get_search_results("针织衫")
    result = zara.get_tag_info("C00761335641")
    print(result)
