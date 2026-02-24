# GEO内容工作台扩展规划（决策版）

更新时间：2026-02-24

## 1. 已确认业务决策（来自你本轮反馈）
- 检索范围：全网检索。
- 策略范围：仅保留“对比评测”策略（SKU模式与品牌IP模式都只做该策略）。
- 品牌IP批量：一期不做。
- 内容风格：不在正文中暴露引用编号或来源脚注，避免“LLM痕迹”。
- 竞品数量：3-5家，中国市场优先。
- 平台适配：不区分搜狐/网易等平台版本，统一输出权威通用稿。
- 官网异常降级：若官网不可访问，自动改为“品牌名全网检索”继续流程。
- 历史记录：SKU与品牌IP需要分栏展示（模式分离）。
- 发布节奏：分批执行，里程碑A完成后先向你汇报，再继续B/C。

## 2. MCP Search Server 选型结论

### 2.1 推荐开通：Exa MCP（首选）
选择理由（贴合你当前场景）：
- 直接提供托管远程MCP地址，适合Cloudflare Pages Edge侧接入，无需你先自建MCP网关。
- 工具集合更贴近“品牌IP竞品研究”：`web_search_exa`、`web_search_advanced_exa`、`crawling_exa`、`company_research_exa`。
- 有语言与地域相关能力（语言过滤、地理偏置），便于“中国市场优先”的检索排序。
- 成本模型清晰，便于先小流量验证后扩展。

### 2.2 备选：Tavily MCP
- 优点：也有托管远程MCP，且`search + extract`组合实用。
- 何时切换：若你们后续更看重抽取成本可控和站点过滤细粒度，可作为B计划。

### 2.3 不作为首选：Brave MCP（当前阶段）
- Brave官方MCP以本地/自托管形态为主（默认STDIO，HTTP也通常需自部署），会增加你们当前上线复杂度。
- 作为搜索API本身很强，但在“你先开通我们直接集成”的要求下，不如Exa/Tavily即开即用。

## 3. 选型依据（官方信息摘要）
- MCP协议支持`Streamable HTTP`远程传输，适合服务端集成。
- Exa提供远程MCP URL `https://mcp.exa.ai/mcp`，并支持将API key附在URL参数中。
- Exa MCP工具包含`company_research_exa`与`crawling_exa`，对品牌IP研究链路更直接。
- Exa近期提供语言过滤与地理偏置能力（有利于中文与中国市场优先）。
- Tavily提供远程MCP URL `https://mcp.tavily.com/mcp/?tavilyApiKey=...`，并支持`search`与`extract`。
- Brave Search API能力与价格都优秀，但官方MCP仓库当前默认STDIO，HTTP模式仍是“运行该server”的部署形态。

## 4. 目标架构（按已确认范围收敛）
- 模式：`sku`、`brand_ip`。
- 策略：统一仅`comparison`。
- 生成流程：
- SKU：商品信息 -> MCP检索同类竞品 -> 对比评测生成。
- 品牌IP：官网抓取 -> 行业识别 -> 竞品搜索(3-5家) -> 对比评测生成。
- 品牌IP降级：官网抓取失败 -> 改用品牌名全网检索 -> 继续生成。
- 呈现要求：页面展示“流程阶段状态”，但最终文章不显示来源编号。
- 内部保障：仍保存研究快照（仅内部审计与复现使用，不前台展示引用痕迹）。

## 5. 数据与接口改造

### 5.1 数据库
- `Template`升级为复合键`(mode, strategy)`；本期只有`strategy='comparison'`。
- `TemplateRevision`增加`mode`字段。
- `Article`增加：`mode`、`subject_id`、`subject_name`、`subject_payload`、`research_snapshot_id`。
- 新增`ResearchSnapshot`保存检索过程与来源快照（内部字段，不直出正文）。
- 旧数据迁移：既有记录回填`mode='sku'`。

### 5.2 API
- `POST /api/generate`
- 入参：`mode`、`strategies=['comparison']` + `product`或`brand`。
- 品牌入参：`name`、`website`（可选行业提示/地域/关键词）。
- 返回：`articles` + `process`（阶段状态）+ `research_meta`（非正文引用数据）。
- `GET /api/strategies?mode=...`
- 两个模式都只返回comparison，但文案按模式区分。
- 模板API全部加`mode`查询维度。
- 历史API增加`mode`筛选与统计。

## 6. 前端改造
- `/generate`页面新增“模式切换”：SKU / 品牌IP。
- SKU模式保留原体验，但策略只显示“对比评测”。
- 品牌IP模式新增表单：品牌名、官网URL、行业提示、地域、关键词。
- 新增流程可视化状态条：
- `官网解析` -> `竞品检索` -> `内容生成`。
- 若官网失败，状态条显示“官网不可用，已切换品牌名检索”。
- `/templates`页面新增模式切换；SKU与品牌IP模板独立编辑与回滚。
- `/history`页面改为双栏/双Tab：SKU记录、品牌IP记录。

## 7. Prompt策略（仅comparison）
- SKU comparison模板：侧重参数对比、价格带对比、适用人群。
- 品牌IP comparison模板：模拟“权威评测博主”语气，强调行业视角、竞品对照、结论明确。
- 强约束：
- 不输出“引用编号”“来源链接小尾巴”。
- 语言更自然，减少“模板化AI口吻”。
- 即使内部证据不足，也以“审慎措辞”表达，不露检索技术细节。

## 8. 三阶段实施计划（按你的要求）

### 里程碑A（先做，完成后向你汇报）
- DB升级与兼容迁移（Template复合键、Article新字段、ResearchSnapshot表）。
- 策略收敛为comparison（前后端统一）。
- 模板管理升级为mode维度。
- 生成页支持SKU/品牌IP模式切换（品牌IP先可提交但暂不接MCP）。
- 历史页按SKU/品牌IP双栏展示。

### 里程碑B（你确认后执行）
- 接入Exa MCP客户端封装与配置。
- SKU comparison接入联网竞品检索。
- 返回流程状态与研究元信息，完善失败降级逻辑。

### 里程碑C（你确认后执行）
- 打通品牌IP全链路：官网抓取 -> 行业识别 -> 竞品检索 -> 评测生成。
- 实现“官网失败自动降级品牌名检索”。
- 优化品牌IP comparison模板到“权威评测博主”风格。

## 9. 你现在需要开通并提供的信息（仅剩这组）
请按Exa方案开通后提供：
1. `EXA_API_KEY`
2. 是否使用默认远程MCP地址 `https://mcp.exa.ai/mcp`（若你有私有网关则给你的URL）
3. 是否允许我启用这些工具：
- `web_search_exa`
- `web_search_advanced_exa`
- `crawling_exa`
- `company_research_exa`
4. 预算上限（可选）：用于我在代码里设置单次任务的检索次数与结果上限。

## 10. 里程碑A验收标准
- 页面可在SKU/品牌IP两种模式下完成comparison生成请求（即使暂为非联网版本）。
- 模板页可分别编辑`sku/comparison`与`brand_ip/comparison`。
- 历史页可分栏查看两类记录。
- 旧数据不丢失，默认归到SKU栏。

## 11. 参考资料（官方）
- MCP传输规范（Streamable HTTP）：https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- Exa MCP文档：https://exa.ai/docs/reference/exa-mcp
- Exa定价：https://exa.ai/pricing
- Tavily MCP文档：https://docs.tavily.com/documentation/mcp
- Tavily Credits与计费：https://tavilyai.mintlify.app/documentation/api-credits
- Brave Search API：https://brave.com/search/api/
- Brave官方MCP仓库：https://github.com/brave/brave-search-mcp-server
