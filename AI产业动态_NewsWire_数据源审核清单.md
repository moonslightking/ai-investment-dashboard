# AI 产业动态 · News Wire 数据源审核清单

> 日期：2026-04-30
> 目的：冻结 News Wire 第一阶段 P0 数据源边界，后续翻译、摘要、去重、分类和前端显示只基于这份白名单设计。

## 结论先行

News Wire 第一阶段只做 P0 事实源，不纳入 P1、付费媒体、投研 newsletter、中文源和社媒线索。更直接的路径是：

1. 首批用官方 feed/API + 可公开读取的行业 RSS，做事实流。
2. Microsoft 官方新闻、Tesla 官网新闻、SpaceX 官网更新进入 P0；Tesla/SpaceX 先按官方页面源处理，不假设有稳定 RSS。
3. 只存标题、链接、摘要/短 snippet、发布时间、来源和抓取时间；不抓全文。
4. News Wire 只保留最近 30 天，避免和研究知识库混在一起。
5. 当前 `src/industry-board/data.js` 里的 `NEWS` 是 demo 数据，不能作为真实内容保留。

## 已确认边界

| 决策项 | 结果 |
|---|---|
| 第一阶段来源范围 | 只接 P0 |
| 新增 P0 | Microsoft News、Tesla Blog、SpaceX Updates |
| P1/人工源 | 暂不纳入 |
| 中文源 | 暂不纳入 |
| 保留窗口 | 30 天 |
| 正文抓取 | 不抓全文，只存标题 + 链接 + 摘要/短 snippet |
| 翻译与摘要 | 采用服务端/离线批处理生成，便于缓存、重试、去重和稳定控制 |
| SpaceX 展示 | 单独弱提示，只在命中 Starlink/AI infra 等关键词时展示 |
| Tesla/SpaceX 接入 | 接受浏览器 adapter，不强行伪装成稳定 RSS |
| SEC EDGAR watchlist | 只维护 AI 私有/上市相关公司，不把核心持仓或全市场公司塞进去 |
| 代码白名单 | 已固化在 `src/industry-board/newsWireSources.js` |
| 同步脚本 | `npm run sync:news` |
| 强制翻译同步 | `DEEPL_API_KEY=... npm run sync:news:translate` |
| 生成数据 | `src/industry-board/generatedNewsWire.js` |

## 当前状态

| 项目 | 状态 | 处理意见 |
|---|---|---|
| 前端组件 | `NewsFeed` 已支持分类 tab、严重度、来源、摘要 | 先保留，不改 UI |
| 数据位置 | `src/industry-board/data.js` 的 `NEWS` 静态数组 | 后续应替换为外部数据生成物或 adapter 输出 |
| 当前内容 | 多条未验证/疑似虚构事件 | 接入真实源前应隔离或删除 |
| 旧版来源 | `src/App.jsx.bak` 有 25 个 source 配置 | 可作为候选池，但不等于自动抓取白名单 |
| 既有研究文档 | L0/L2/L3/D1/D2/D3 文档已有分层数据源 | 可复用其“必读/选读”判断，但要重新按 News Wire 可接入性筛选 |

## 源分级规则

| 等级 | 定义 | 是否进入自动 News Wire | 规则 |
|---|---|---:|---|
| A0 | 官方 feed/API/新闻页，事实强、授权风险低 | 是 | 只存标题、链接、发布时间、来源、机器摘要 |
| A1 | 专业行业媒体公开 RSS/列表页，事实密度高 | 是，但需关键词过滤 | 不抓全文，不把媒体判断当事实 |
| B | 付费媒体、投研、newsletter、深度观点 | 否，先人工 | 只作为验证/背景，不做自动正文入库 |
| C | 中文行业媒体/公众号/聚合源，质量不一或授权不清 | 第一阶段不纳入 | 可作为后续人工 watchlist |
| X | 社媒、传闻、论坛、二手搬运 | 否 | 只可作为线索，不进入 News Wire |

## P0 已批准接入源

这些源是第一阶段唯一白名单。后续翻译、摘要、分类和显示设计只能读取这些源的输出。

| 分类 | 来源 | 语言 | 接入方式 | 等级 | 用途 | 审核备注 |
|---|---|---|---|---|---|---|
| 模型 | OpenAI News | EN | `https://openai.com/news/rss.xml` | A0 | OpenAI 产品、模型、合作、政策 | RSS 已验证可用 |
| 模型 | Anthropic Newsroom | EN | `https://www.anthropic.com/news` | A0 | Claude、Anthropic 合作和算力合同 | 官方页可读；RSS 待确认，先做页面 adapter 或手动 |
| 模型 | Google AI / The Keyword | EN | `https://blog.google/feed/` + AI category filter | A0 | Gemini、Google AI 产品和研究 | 全站 feed，需要关键词/分类过滤 |
| 模型 | Google DeepMind Blog | EN | `https://deepmind.google/blog/` | A0 | DeepMind 模型、研究、产品化 | 官方页可读；feed 待确认 |
| 模型 | Meta AI Blog | EN | `https://ai.meta.com/blog/` | A0 | Llama、Meta AI research/product | 官方页入口，页面结构需单独适配 |
| 云/应用 | Microsoft News | EN | `https://news.microsoft.com/feed/` | A0 | Microsoft AI、Copilot、Azure、OpenAI 生态 | RSS 已验证可用；全站 feed 需 AI 关键词过滤 |
| 芯片/机器人 | NVIDIA Blog | EN | `https://blogs.nvidia.com/feed/` | A0 | GPU、平台、机器人、产业合作 | RSS 已验证可用 |
| 芯片/机器人 | NVIDIA Developer Blog | EN | `https://developer.nvidia.com/blog/feed/` | A0 | CUDA、推理、机器人、数据中心架构 | Atom feed 已验证可用 |
| 云/应用 | AWS Machine Learning Blog | EN | `https://aws.amazon.com/blogs/machine-learning/feed/` | A0 | Bedrock、Trainium、企业应用案例 | RSS 已验证可用 |
| 云/应用 | Azure Blog | EN | `https://azure.microsoft.com/en-us/blog/feed/` | A0 | Azure AI、OpenAI 服务、云基础设施 | RSS 已验证可用 |
| 机器人/电力/应用 | Tesla Blog | EN | `https://www.tesla.com/blog` | A0 | Optimus、FSD/Robotaxi、Dojo、Megapack、充电网络 | 官网页面可读；直接 `curl` 返回 403，使用浏览器 adapter |
| 应用 | SpaceX Updates | EN | `https://www.spacex.com/updates/` | A0 | Starlink、Starship、卫星基础设施 | 官网源；直接 `curl` 返回 403，使用浏览器 adapter；AI 相关性弱，单独弱提示 + 严格关键词过滤 |
| 电力/IDC | Data Center Dynamics | EN | `https://www.datacenterdynamics.com/en/rss/` | A1 | 数据中心、供电、液冷、AI infra 项目 | RSS 已验证可用，信噪比高 |
| 政策 | Federal Register API | EN | `https://www.federalregister.gov/api/v1/` | A0 | 美国 AI、芯片、出口管制规则 | 无 API key；需 query 过滤 |
| 政策 | U.S. Commerce Press Releases | EN | `https://www.commerce.gov/news/press-releases` | A0 | BIS、AI、半导体、出口管制 | 官方页有 RSS feeds 入口，适合政策 watch |
| 投资/并购 | SEC EDGAR API | EN | `https://data.sec.gov/submissions/CIK##########.json` | A0 | IPO、8-K、重大并购、财报事件 | API 无 key；只维护 AI 私有/上市相关公司 CIK watchlist |

## 暂不纳入源

这些源有价值，但第一阶段明确不接入。不要在后续代码里把它们作为 hidden fallback。

| 分类 | 来源 | 语言 | 接入方式 | 等级 | 用途 | 风险 |
|---|---|---|---|---|---|---|
| 模型/生态 | Hugging Face Blog | EN | `https://huggingface.co/blog` | A1 | 开源模型、推理服务、生态事件 | 页面可读，但本地 feed 请求不稳定；第一阶段暂不接 |
| 电力/IDC | Data Center Frontier | EN | `https://www.datacenterfrontier.com/` | A1 | DC 建设、选址、电力 | feed 访问被 Cloudflare challenge；先人工或浏览器 adapter |
| 电力 | Utility Dive | EN | `https://www.utilitydive.com/` | A1 | 电网、PPA、核电、监管 | 需要关键词过滤，避免泛电力新闻过载 |
| 机器人 | The Robot Report | EN | `https://www.therobotreport.com/` | A1 | 人形机器人、自动化、融资 | feed 访问被 Cloudflare challenge；先人工 |
| 泛 AI | TechCrunch AI | EN | `https://techcrunch.com/category/artificial-intelligence/feed/` | A1/C | AI 创业、融资、产品 | 噪声高，需只留融资/并购/产品发布 |
| 泛 AI | VentureBeat AI | EN | `https://venturebeat.com/category/ai/feed` | A1/C | 企业 AI、产品和融资 | 噪声高，标题党风险 |
| 芯片/云 | The Next Platform | EN | 官网列表页/RSS 待确认 | A1/B | HPC、AI 服务器、网络深度技术 | 更像深度阅读，不宜高频推送 |
| 芯片 | Dell'Oro Group | EN | 新闻稿/LinkedIn/RSS 待确认 | A0/B | DC CapEx、服务器、交换机市场数据 | 低频但高价值，适合事件源 |
| 芯片 | TrendForce / 集邦 | EN/ZH | 新闻页/RSS 待确认 | A1/B | HBM、DRAM、AI server 价格和预测 | 免费摘要可用，报告口径需标注 |

## 只做人工确认源

这些源不是不好，而是不适合直接变成自动 News Wire。自动化会制造版权和事实边界问题。

| 来源 | 类型 | 适合用途 | 不自动接入原因 |
|---|---|---|---|
| The Information | 付费媒体 | OpenAI/Anthropic 内部财务、融资、组织变化 | 付费内容，不能抓全文；很多数字为消息源估算 |
| Bloomberg / FT / WSJ | 付费媒体 | 融资、并购、政策、供应链大事件确认 | 授权风险高；适合手动引用标题和链接 |
| Reuters | 新闻社 | 大事件二次确认 | 可作为验证源，但不应复制正文 |
| SemiAnalysis | 深度投研 | AI 芯片/算力架构判断 | 观点和模型多，不是事实流 |
| Fabricated Knowledge | 投研 newsletter | 半导体投资跟踪 | 付费/观点源 |
| Stratechery | 策略分析 | 平台竞争判断 | 观点源，不是新闻源 |
| Sacra | 私有公司估算 | ARR/估值/融资估算 | 估算口径需人工标注 |
| Gartner / IDC / CB Insights | 研究机构 | 市场规模、采用率、企业调查 | 报告付费，摘要可用但不可自动展开 |
| Mobile Dev Memo | newsletter | 广告技术、AppLovin 生态 | 深度观点源，适合人工阅读 |

## 中文源候选池：第一阶段不纳入

中文源本阶段不接入。主要问题不是技术，而是授权、转载、标题党和二手信息密度。后续如要接，也应按单独白名单处理。

| 分类 | 来源 | 语言 | 等级 | 用途 | 审核意见 |
|---|---|---|---|---|---|
| 模型 | 机器之心 | ZH | C/A1 | 模型发布、论文、中文技术跟踪 | 可作为中文摘要源，但需要链接到原始英文/官方来源 |
| 芯片 | 集微网 | ZH | C/A1 | 国产半导体、供应链、政策 | 保留人工 watch |
| 芯片 | 半导体行业观察 | ZH | C | 半导体产业新闻 | 转载较多，需追溯原始来源 |
| 电力 | 北极星电力网 | ZH | A1/C | 电力项目、招标、政策 | L0 国内项目源有价值，可二批做关键词抓取 |
| IDC | 中国IDC圈 | ZH | C | 国内 IDC 项目和政策 | 保留人工 watch |
| 机器人 | 高工机器人 | ZH | A1/C | 国内机器人订单、供应链 | 可二批做关键词抓取 |
| 应用 | 36氪 | ZH | C | 创业融资、应用产品 | 噪声高，仅留融资/并购事件 |
| 应用/广告 | 白鲸出海 | ZH | C | 出海应用、广告、小游戏 | 对 D1/D6 有用，但不应泛化到全局 News Wire |
| 政策 | 工信部 / 网信办 / 国家能源局 | ZH | A0 | AI、算力、能源政策 | 官方源，适合做政策 adapter |
| A股公告 | 巨潮资讯网 | ZH | A0 | A股公司公告、年报、调研纪要 | 更适合公告/财报流，不是普通新闻流 |

## 分类到来源映射

| News Wire 分类 | P0 源 | P1/人工补充 | 过滤关键词 |
|---|---|---|---|
| 模型 | OpenAI, Anthropic, Google AI, DeepMind, Meta AI, Microsoft News | 无 | model, GPT, Claude, Gemini, Llama, API, agent, reasoning, open source |
| 芯片 | NVIDIA Blog, NVIDIA Developer, SEC EDGAR | 无 | GPU, ASIC, HBM, CoWoS, Blackwell, Rubin, rack, interconnect |
| 投资 | SEC EDGAR | 无 | funding, IPO, S-1, 8-K, acquisition, investment, partnership |
| 并购 | SEC EDGAR | 无 | merger, acquire, acquisition, tender, definitive agreement |
| 政策 | Federal Register, Commerce/BIS | 无 | export control, Entity List, AI Act, chip controls, safety, regulation |
| 电力 | DCD, Tesla Blog | 无 | data center, power, grid, PPA, nuclear, transformer, substation, Megapack |
| 机器人 | NVIDIA Developer, NVIDIA Blog, Tesla Blog | 无 | humanoid, robotics, robotaxi, Isaac, GR00T, Optimus, FSD |
| 应用 | AWS ML, Azure Blog, Microsoft News, Google AI, SpaceX Updates | 无 | agent, enterprise AI, coding, SaaS, workflow, Starlink |

## 采集边界

| 字段 | 建议 |
|---|---|
| 可存储 | 标题、URL、发布时间、来源、语言、分类、原始摘要或短 snippet、抓取时间 |
| 可生成 | 中文标题、中文摘要、影响标签、相关层级、严重度、去重 key |
| 不存储 | 付费正文、完整转载正文、未经确认的社媒传闻 |
| 事实标记 | `official`, `industry_media`, `paid_media_manual`, `research_manual`, `policy`, `filing` |
| 默认保留窗口 | 30 天，避免 News Wire 变成长期知识库 |
| 去重主键 | canonical URL + title hash + source family |

## 处理口径

| 环节 | 决策 |
|---|---|
| 翻译/摘要 | 默认服务端或离线批处理生成，不放到浏览器运行时即时生成；默认 provider 为 DeepL API，目标语言 `ZH-HANS`，可用 `DEEPL_API_KEY` / `DEEPL_API_URL` / `DEEPL_TARGET_LANG` 配置；如需回退 OpenAI，可显式设置 `NEWS_WIRE_TRANSLATION_PROVIDER=openai_responses_api` |
| 翻译/摘要输入 | 只基于标题、链接、来源、发布时间和原始摘要/短 snippet，不抓全文 |
| 失败处理 | adapter 抓取失败不阻塞页面；保留上一次成功结果和抓取状态 |
| SpaceX | 单独弱提示，不和 OpenAI/NVIDIA/Microsoft 等核心 AI 源同权重展示 |
| 浏览器 adapter | Tesla/SpaceX 接受浏览器 adapter；仍只抽取列表页标题、链接、日期和短摘要 |
| SEC EDGAR | watchlist 只覆盖 AI 私有/上市相关公司，避免把 News Wire 变成泛持仓公告流 |

## 第一版实现状态

| 模块 | 状态 | 说明 |
|---|---|---|
| P0 白名单配置 | 已实现 | `src/industry-board/newsWireSources.js` |
| 本地同步脚本 | 已实现 | `scripts/sync_news_wire.js`；抓取 RSS/Atom/Federal Register/SEC 元数据 |
| 生成数据文件 | 已实现 | `src/industry-board/generatedNewsWire.js`；由脚本生成，不手改 |
| 前端接入 | 已实现 | `src/industry-board/data.js` 改为导出生成数据，旧 demo news 不再用于页面 |
| 30 天保留 | 已实现 | 同步阶段按 `NEWS_WIRE_RETENTION_DAYS = 30` 过滤 |
| 去重 | 已实现 | canonical host + title hash |
| 低信号过滤 | 已实现 | 过滤教程、活动条款、泛产品教育页等非产业动态 |
| 不抓全文 | 已实现 | 只写入 title/link/source/date/short snippet 和生成字段 |
| 翻译/摘要 | 已切换 DeepL API provider | 当前本机缺少 `DEEPL_API_KEY` 时会明确标记 `missing_deepl_api_key`；有 key 时生成 `titleZh/summaryZh`；OpenAI provider 仅作为显式回退 |
| 原文打开 | 已调整 | 前端点击整条新闻通过 `window.open` 打开原始 URL；SEC filing 改为 `sec.gov` viewer URL，避免直链归档 HTML |
| Tesla/SpaceX 浏览器 adapter | 口径已配置，执行未接入脚本 | 当前同步脚本不会启动浏览器，只记录 browser adapter 待执行 |
| SEC EDGAR watchlist | 已实现初版 | CoreWeave、NVIDIA、AMD、Microsoft、Alphabet、Amazon、Meta、Tesla |

当前最近一次同步结果：P0 快照 98 条，13 个源完成抓取，1 个源被站点拒绝。Tesla/SpaceX 因需要浏览器 adapter，当前记录为 accepted-but-not-executed。当前本机未配置 `DEEPL_API_KEY`，因此不能生成真实简中翻译。

## 源校验记录

| 来源 | 校验结果 | 备注 |
|---|---|---|
| OpenAI RSS | HTTP 200, `text/xml` | 可直接接 |
| Microsoft News RSS | HTTP 200, `application/rss+xml` | 可直接接 |
| NVIDIA Blog RSS | HTTP 200, `application/rss+xml` | 可直接接 |
| NVIDIA Developer feed | HTTP 200, `application/atom+xml` | 可直接接 |
| AWS ML Blog RSS | HTTP 200, `application/rss+xml` | 可直接接 |
| Azure Blog RSS | HTTP 200, `application/rss+xml` | 可直接接 |
| Data Center Dynamics RSS | HTTP 200, `application/rss+xml` | 可直接接 |
| Tesla Blog | 官方页面可读；直接 `curl` 返回 403 | P0 保留，使用浏览器 adapter |
| SpaceX Updates | 官网源；直接 `curl` 返回 403 | P0 保留，使用浏览器 adapter；AI 相关性弱，需严格关键词过滤和弱提示 |
| Data Center Frontier feed | `curl -I` 返回 Cloudflare challenge | 浏览器页可读，先不列 P0 自动 |
| The Robot Report feed | `curl -I` 返回 Cloudflare challenge | 先不列 P0 自动 |
| Hugging Face Blog | 页面可读，feed 请求本地不稳定 | 先不列 P0 自动 |

## 已关闭问题

1. 翻译与摘要：采用更便捷稳定的服务端/离线批处理方式。
2. SpaceX：单独弱提示。
3. Tesla/SpaceX：接受浏览器 adapter。
4. SEC EDGAR：只维护 AI 私有/上市相关公司。

下一步应优先补两个缺口：浏览器 adapter 的可重复执行方式，以及真正的批处理翻译/摘要 provider。
