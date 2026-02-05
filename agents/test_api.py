#!/usr/bin/env python3
"""测试Zara API返回内容"""

import requests
import json
import os

try:
    from agents._env import load_dotenv
except ModuleNotFoundError:  # pragma: no cover
    import sys
    from pathlib import Path

    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from agents._env import load_dotenv

# API配置
SEARCH_API = "https://search.moechat.cn/api/search/mixed"
load_dotenv()
RECALL_TOKEN = os.environ.get("ZARA_RECALL_TOKEN", "")
if not RECALL_TOKEN:
    raise RuntimeError("缺少 ZARA_RECALL_TOKEN：请在 .env 或环境变量中配置")

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
