#!/usr/bin/env python3
"""测试Zara API返回内容"""

import requests
import json

# API配置
SEARCH_API = "https://search.moechat.cn/api/search/mixed"
RECALL_TOKEN = "Bearer 7aB3rT9kLp2XqW8vZ1yN4oM5cD6eF7gH8jK9lP0"

# 测试搜索
data = {
    "keyword": "外套",
    "pageSize": 5,
    "pageNum": 1,
    "handletype": "200",
    "filters": [{
        "dimensionName": "gender",
        "tagNames": ["WOMAN"]
    }]
}

print("请求数据:")
print(json.dumps(data, ensure_ascii=False, indent=2))
print()

response = requests.post(SEARCH_API, json=data, headers={"Authorization": RECALL_TOKEN})

print(f"状态码: {response.status_code}")
print()
print("响应内容:")
print(json.dumps(response.json(), ensure_ascii=False, indent=2)[:2000])
