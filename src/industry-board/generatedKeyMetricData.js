export const KEY_METRIC_DATA_SOURCE = {
  "status": "verified-snapshot",
  "generatedAt": "2026-05-01T02:24:44.994Z",
  "coverage": { "verified": 4, "total": 11 },
  "updateMode": "local-schema-validation",
  "note": "由 scripts/sync_key_metrics.js 根据已校验来源快照生成。当前值是真实来源快照，不是实时数据。"
};

export const KEY_METRIC_DATA = {
  "api_effective_price": {
    "status": "verified",
    "updatedAt": "2026-05-01",
    "cadence": "定价页刷新",
    "headline": { "label": "前沿模型输出价格差", "value": "107x", "subvalue": "$30.00 对 $0.28 / 百万输出 token", "tone": "neutral" },
    "delta": { "label": "批处理折扣仍然关键", "value": "50%", "tone": "neutral" },
    "chart": {
      "type": "bar",
      "title": "各模型输出 token 价格",
      "unit": "美元/百万输出 token",
      "items": [
        { "label": "OpenAI GPT-5.5", "value": 30, "displayValue": "$30.00", "tone": "high" },
        { "label": "Claude Opus 4.7 / 4.6", "value": 25, "displayValue": "$25.00", "tone": "high" },
        { "label": "Claude Sonnet 4.6", "value": 15, "displayValue": "$15.00", "tone": "mid" },
        { "label": "Gemini 3.1 Pro", "value": 12, "displayValue": "$12.00", "tone": "mid" },
        { "label": "Claude Haiku 4.5", "value": 5, "displayValue": "$5.00", "tone": "low" },
        { "label": "Gemini 3.1 Flash-Lite", "value": 1.5, "displayValue": "$1.50", "tone": "low" },
        { "label": "DeepSeek V4 Pro 优惠价", "value": 0.87, "displayValue": "$0.87", "tone": "low" },
        { "label": "DeepSeek V4 Flash", "value": 0.28, "displayValue": "$0.28", "tone": "low" }
      ]
    },
    "rows": [
      { "label": "OpenAI GPT-5.5", "value": "输入 $5.00 / 缓存 $0.50 / 输出 $30.00" },
      { "label": "Claude Opus 4.7 / 4.6", "value": "输入 $5.00 / 缓存命中 $0.50 / 输出 $25.00" },
      { "label": "Gemini 3.1 Pro", "value": "输入 $2.00 / 输出 $12.00，标准上下文 <=200k" },
      { "label": "DeepSeek V4 Pro", "value": "输入 $0.435 / 缓存命中 $0.003625 / 输出 $0.87，优惠至 2026-05-31" }
    ],
    "sourceNote": "这是公开报价的横截面快照，还不是历史时间序列。",
    "sources": [
      { "label": "OpenAI 定价", "url": "https://openai.com/api/pricing/" },
      { "label": "Anthropic 定价", "url": "https://platform.claude.com/docs/en/docs/about-claude/pricing" },
      { "label": "Gemini 定价", "url": "https://ai.google.dev/gemini-api/docs/pricing" },
      { "label": "DeepSeek 定价", "url": "https://api-docs.deepseek.com/quick_start/pricing" }
    ],
    "generatedAt": "2026-05-01T02:24:44.994Z"
  },
  "gpu_cloud_availability": {
    "status": "verified",
    "updatedAt": "2026-05-01",
    "cadence": "云厂商报价页刷新",
    "headline": { "label": "公开 H200 报价", "value": "$3.50-$6.31", "subvalue": "每 GPU 小时，Nebius 至 CoreWeave", "tone": "up" },
    "delta": { "label": "公开 B200 报价区间", "value": "$5.50-$8.60", "tone": "up" },
    "chart": {
      "type": "bar",
      "title": "GPU 云公开报价",
      "unit": "美元/GPU 小时",
      "items": [
        { "label": "CoreWeave B200", "value": 8.6, "displayValue": "$8.60", "tone": "high" },
        { "label": "Lambda B200", "value": 6.69, "displayValue": "$6.69", "tone": "mid" },
        { "label": "CoreWeave H200", "value": 6.31, "displayValue": "$6.31", "tone": "mid" },
        { "label": "CoreWeave H100", "value": 6.16, "displayValue": "$6.16", "tone": "mid" },
        { "label": "Nebius B200", "value": 5.5, "displayValue": "$5.50", "tone": "mid" },
        { "label": "Lambda H100", "value": 3.99, "displayValue": "$3.99", "tone": "low" },
        { "label": "Nebius H200", "value": 3.5, "displayValue": "$3.50", "tone": "low" },
        { "label": "Nebius H100", "value": 2.95, "displayValue": "$2.95", "tone": "low" }
      ]
    },
    "rows": [
      { "label": "CoreWeave", "value": "HGX B200 每 8 卡每小时 $68.80；H200 每 8 卡每小时 $50.44" },
      { "label": "Lambda", "value": "B200 每 GPU 小时 $6.69；8 卡 H100 每 GPU 小时 $3.99" },
      { "label": "Nebius", "value": "B200 每 GPU 小时 $5.50；H200 $3.50；H100 $2.95" }
    ],
    "sourceNote": "不同厂商的可得性、最低租期、区域和集群规模不同；这些报价不能直接当成完全可比的市场指数。",
    "sources": [
      { "label": "CoreWeave 定价", "url": "https://www.coreweave.com/pricing" },
      { "label": "Lambda 定价", "url": "https://lambda.ai/pricing" },
      { "label": "Nebius 定价", "url": "https://nebius.com/prices" }
    ],
    "generatedAt": "2026-05-01T02:24:44.994Z"
  },
  "ai_infra_capex": {
    "status": "verified",
    "updatedAt": "2026-05-01",
    "cadence": "季度财报",
    "headline": { "label": "最近季度总资本开支代理值", "value": "$130.6B", "subvalue": "MSFT + Alphabet + Amazon + Meta", "tone": "up" },
    "delta": { "label": "可比口径同比增长", "value": "+80%", "tone": "up" },
    "chart": {
      "type": "bar",
      "title": "最近季度与去年同期对比",
      "unit": "十亿美元",
      "items": [
        {
          "label": "Amazon Q1 2026",
          "value": 44.203,
          "displayValue": "$44.2B",
          "previousValue": 25.019,
          "previousDisplayValue": "$25.0B",
          "tone": "high"
        },
        {
          "label": "Alphabet Q1 2026",
          "value": 35.674,
          "displayValue": "$35.7B",
          "previousValue": 17.197,
          "previousDisplayValue": "$17.2B",
          "tone": "high"
        },
        {
          "label": "Microsoft FY26 Q3",
          "value": 30.876,
          "displayValue": "$30.9B",
          "previousValue": 16.745,
          "previousDisplayValue": "$16.7B",
          "tone": "high"
        },
        {
          "label": "Meta Q1 2026",
          "value": 19.84,
          "displayValue": "$19.8B",
          "previousValue": 13.692,
          "previousDisplayValue": "$13.7B",
          "tone": "mid"
        }
      ]
    },
    "rows": [
      { "label": "Amazon", "value": "购买 PP&E $44.203B；过去 12 个月净 PP&E 支出同比 +67%，主要来自 AI" },
      { "label": "Alphabet", "value": "购买 PP&E $35.674B；Google Cloud 收入同比 +63%" },
      { "label": "Microsoft", "value": "新增物业与设备 $30.876B；AI 基础设施压低云业务毛利率" },
      { "label": "Meta", "value": "资本开支含融资租赁 $19.840B；2026 指引上调至 $125B-$145B" }
    ],
    "sourceNote": "这个指标有意混合不同公司财年日历。Meta 包含融资租赁本金支付；其余柱状值使用购买或新增 PP&E。",
    "sources": [
      { "label": "Microsoft FY26 Q3 现金流", "url": "https://www.microsoft.com/en-us/investor/earnings/fy-2026-q3/cash-flows" },
      { "label": "Alphabet Q1 2026 SEC 附件", "url": "https://www.sec.gov/Archives/edgar/data/1652044/000165204426000043/googexhibit991q12026.htm" },
      { "label": "Amazon Q1 2026 业绩", "url": "https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-First-Quarter-Results/default.aspx" },
      { "label": "Meta Q1 2026 业绩", "url": "https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-First-Quarter-2026-Results/default.aspx" }
    ],
    "generatedAt": "2026-05-01T02:24:44.994Z"
  },
  "server_cpu": {
    "status": "mixed-proxy",
    "updatedAt": "2026-05-01",
    "cadence": "季度 + 事件触发",
    "headline": { "label": "CPU 需求信号", "value": "偏强", "subvalue": "Intel DCAI +22%；AMD 数据中心 +39%；AWS Graviton 核心数扩张", "tone": "up" },
    "delta": { "label": "AWS 芯片业务年化收入", "value": ">$20B", "tone": "up" },
    "chart": {
      "type": "bar",
      "title": "最新披露的 CPU 相关代理指标",
      "unit": "十亿美元 / 信号",
      "items": [
        { "label": "AWS 芯片年化收入", "value": 20, "displayValue": ">$20B", "tone": "high" },
        { "label": "AMD 数据中心", "value": 5.4, "displayValue": "$5.4B", "tone": "mid" },
        { "label": "Intel DCAI", "value": 5.1, "displayValue": "$5.1B", "tone": "mid" }
      ]
    },
    "events": [
      { "date": "2026-04-24", "label": "Meta 开始部署数千万个 AWS Graviton 核心，用于智能体 AI 工作负载。" },
      { "date": "2026-04-23", "label": "Intel 披露 DCAI 收入 $5.1B，同比增长 22%。" },
      { "date": "2026-02-03", "label": "AMD 披露 Q4 数据中心收入 $5.4B，同比增长 39%；Q1 2026 财报安排在 5 月 1 日之后。" }
    ],
    "rows": [
      { "label": "Intel DCAI", "value": "Q1 2026 收入 $5.1B，同比 +22%" },
      { "label": "AMD 数据中心", "value": "Q4 2025 收入 $5.4B，同比 +39%，由 EPYC 和 Instinct 推动" },
      { "label": "AWS Graviton", "value": "Meta 部署从数千万个 Graviton 核心开始" },
      { "label": "AWS 芯片", "value": "年化收入 >$20B，包含 Graviton、Trainium 和 Nitro" }
    ],
    "sourceNote": "这不是纯 CPU 收入指数：AMD 数据中心收入包含 GPU，AWS 芯片收入也包含 Trainium/Nitro。在更干净的纯 CPU 披露出现前，只能作为需求代理卡片。",
    "sources": [
      { "label": "Intel Q1 2026 业绩", "url": "https://www.intc.com/news-events/press-releases/detail/1767/intel-reports-first-quarter-2026-financial-results" },
      { "label": "AMD Q4 2025 业绩", "url": "https://www.amd.com/en/newsroom/press-releases/2026-2-3-amd-reports-fourth-quarter-and-full-year-2025-fina.html" },
      { "label": "Amazon Q1 2026 业绩", "url": "https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-First-Quarter-Results/default.aspx" },
      { "label": "AWS Graviton / Meta", "url": "https://press.aboutamazon.com/2026/4/meta-signs-agreement-with-aws-to-power-agentic-ai-on-aws-graviton-chips" }
    ],
    "generatedAt": "2026-05-01T02:24:44.994Z"
  }
};
