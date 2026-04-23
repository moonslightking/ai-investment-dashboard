// AI Industry Chain Dashboard - Sample Data
// All numbers are illustrative. Replace freely.

// ============ INDUSTRY CHAIN STRUCTURE ============
// Three layers: 上游 (Upstream) / 中游 (Midstream) / 下游 (Downstream)
// Each layer contains sub-industries (sectors). Each sector contains companies.

export const INDUSTRY_CHAIN = [
  {
    id: "upstream",
    name: "上游 · Upstream",
    nameEn: "Infrastructure & Hardware",
    sectors: [
      {
        id: "gpu",
        name: "AI 算力芯片",
        nameEn: "AI Compute Chips",
        desc: "GPU / ASIC / 训练推理芯片",
        companies: [
          { ticker: "NVDA", name: "NVIDIA", cn: "英伟达" },
          { ticker: "AMD",  name: "AMD", cn: "超威半导体" },
          { ticker: "AVGO", name: "Broadcom", cn: "博通" },
          { ticker: "MRVL", name: "Marvell", cn: "美满电子" },
          { ticker: "INTC", name: "Intel", cn: "英特尔" },
        ],
      },
      {
        id: "hbm",
        name: "HBM 存储",
        nameEn: "HBM Memory",
        desc: "高带宽内存 HBM3/3e/4",
        companies: [
          { ticker: "000660.KS", name: "SK Hynix", cn: "SK海力士" },
          { ticker: "005930.KS", name: "Samsung", cn: "三星电子" },
          { ticker: "MU", name: "Micron", cn: "美光科技" },
        ],
      },
      {
        id: "foundry",
        name: "先进制程代工",
        nameEn: "Advanced Foundry",
        desc: "3nm/2nm 晶圆代工 + CoWoS 先进封装",
        companies: [
          { ticker: "TSM", name: "TSMC", cn: "台积电" },
          { ticker: "2330.TW", name: "TSMC TW", cn: "台积电（台）" },
          { ticker: "ASX", name: "ASE Tech", cn: "日月光" },
        ],
      },
      {
        id: "equipment",
        name: "半导体设备",
        nameEn: "Semi Equipment",
        desc: "光刻 / 刻蚀 / 沉积 / 量测",
        companies: [
          { ticker: "ASML", name: "ASML", cn: "阿斯麦" },
          { ticker: "AMAT", name: "Applied Materials", cn: "应用材料" },
          { ticker: "LRCX", name: "Lam Research", cn: "泛林" },
          { ticker: "KLAC", name: "KLA", cn: "科磊" },
          { ticker: "TOELY", name: "Tokyo Electron", cn: "东京电子" },
        ],
      },
      {
        id: "optical",
        name: "光模块/光通信",
        nameEn: "Optical Modules",
        desc: "800G / 1.6T 光模块 · CPO",
        companies: [
          { ticker: "COHR", name: "Coherent", cn: "相干光电" },
          { ticker: "LITE", name: "Lumentum", cn: "鲁门特姆" },
          { ticker: "CIEN", name: "Ciena", cn: "赛恩斯" },
          { ticker: "300308.SZ", name: "Zhongji Innolight", cn: "中际旭创" },
          { ticker: "300394.SZ", name: "Eoptolink", cn: "天孚通信" },
        ],
      },
      {
        id: "power",
        name: "电力/散热/IDC硬件",
        nameEn: "Power & Cooling",
        desc: "配电 · 液冷 · UPS · 机架",
        companies: [
          { ticker: "VRT", name: "Vertiv", cn: "维谛技术" },
          { ticker: "ETN", name: "Eaton", cn: "伊顿" },
          { ticker: "SMCI", name: "Super Micro", cn: "超微电脑" },
          { ticker: "DELL", name: "Dell", cn: "戴尔" },
          { ticker: "GEV",  name: "GE Vernova", cn: "GE 能源" },
        ],
      },
    ],
  },
  {
    id: "midstream",
    name: "中游 · Midstream",
    nameEn: "Cloud & Foundation Models",
    sectors: [
      {
        id: "hyperscaler",
        name: "超大规模云",
        nameEn: "Hyperscalers",
        desc: "AWS · Azure · GCP · Oracle",
        companies: [
          { ticker: "MSFT", name: "Microsoft", cn: "微软" },
          { ticker: "AMZN", name: "Amazon", cn: "亚马逊" },
          { ticker: "GOOGL", name: "Alphabet", cn: "谷歌" },
          { ticker: "ORCL", name: "Oracle", cn: "甲骨文" },
          { ticker: "META", name: "Meta", cn: "Meta" },
        ],
      },
      {
        id: "neocloud",
        name: "新兴 GPU 云",
        nameEn: "Neocloud / GPU Cloud",
        desc: "CoreWeave · Lambda · Nebius",
        companies: [
          { ticker: "CRWV", name: "CoreWeave", cn: "CoreWeave" },
          { ticker: "NBIS", name: "Nebius", cn: "Nebius" },
          { ticker: "APLD", name: "Applied Digital", cn: "Applied Digital" },
          { ticker: "IREN", name: "IREN", cn: "IREN" },
        ],
      },
      {
        id: "foundation",
        name: "基础大模型",
        nameEn: "Foundation Models",
        desc: "OpenAI · Anthropic · Google DeepMind · xAI",
        companies: [
          { ticker: "PRIV:OAI", name: "OpenAI", cn: "OpenAI（未上市）" },
          { ticker: "PRIV:ANT", name: "Anthropic", cn: "Anthropic（未上市）" },
          { ticker: "PRIV:XAI", name: "xAI", cn: "xAI（未上市）" },
          { ticker: "PRIV:MST", name: "Mistral", cn: "Mistral（未上市）" },
        ],
      },
      {
        id: "mlops",
        name: "MLOps / 数据栈",
        nameEn: "MLOps & Data",
        desc: "向量库 · 微调 · 评测 · 数据管线",
        companies: [
          { ticker: "SNOW", name: "Snowflake", cn: "Snowflake" },
          { ticker: "DDOG", name: "Datadog", cn: "Datadog" },
          { ticker: "MDB",  name: "MongoDB", cn: "MongoDB" },
          { ticker: "PRIV:DBR", name: "Databricks", cn: "Databricks（未上市）" },
          { ticker: "PRIV:SCL", name: "Scale AI", cn: "Scale AI（未上市）" },
        ],
      },
    ],
  },
  {
    id: "downstream",
    name: "下游 · Downstream",
    nameEn: "Applications & Agents",
    sectors: [
      {
        id: "aiapp",
        name: "AI 原生应用",
        nameEn: "AI-Native Apps",
        desc: "Copilot · 搜索 · 创作 · 编码",
        companies: [
          { ticker: "PRIV:PER", name: "Perplexity", cn: "Perplexity（未上市）" },
          { ticker: "PRIV:CSR", name: "Cursor", cn: "Cursor（未上市）" },
          { ticker: "PRIV:GLN", name: "Glean", cn: "Glean（未上市）" },
          { ticker: "PRIV:HVY", name: "Harvey", cn: "Harvey（未上市）" },
          { ticker: "PRIV:CHR", name: "Character.AI", cn: "Character.AI（未上市）" },
        ],
      },
      {
        id: "saas-ai",
        name: "SaaS + AI",
        nameEn: "SaaS + AI",
        desc: "传统 SaaS 叠加 AI 功能",
        companies: [
          { ticker: "CRM", name: "Salesforce", cn: "Salesforce" },
          { ticker: "NOW", name: "ServiceNow", cn: "ServiceNow" },
          { ticker: "ADBE", name: "Adobe", cn: "Adobe" },
          { ticker: "INTU", name: "Intuit", cn: "Intuit" },
          { ticker: "HUBS", name: "HubSpot", cn: "HubSpot" },
        ],
      },
      {
        id: "robotics",
        name: "具身智能 / 机器人",
        nameEn: "Embodied / Robotics",
        desc: "人形机器人 · 自动驾驶 · 工业",
        companies: [
          { ticker: "TSLA", name: "Tesla", cn: "特斯拉" },
          { ticker: "PRIV:FIG", name: "Figure", cn: "Figure（未上市）" },
          { ticker: "PRIV:1X",  name: "1X", cn: "1X（未上市）" },
          { ticker: "ISRG", name: "Intuitive Surgical", cn: "直觉外科" },
          { ticker: "ABB",  name: "ABB", cn: "ABB" },
        ],
      },
      {
        id: "ai-semi-design",
        name: "AI 赋能垂直",
        nameEn: "Vertical AI",
        desc: "医疗 · 生物 · 金融 · 国防",
        companies: [
          { ticker: "PLTR", name: "Palantir", cn: "Palantir" },
          { ticker: "RCAT", name: "Red Cat", cn: "Red Cat" },
          { ticker: "PRIV:REC", name: "Recursion", cn: "Recursion" },
          { ticker: "VEEV", name: "Veeva", cn: "Veeva" },
        ],
      },
    ],
  },
];

// ============ GENERATE 6-MONTH OHLC DATA PER SECTOR ============
// Weekly candles. 26 weeks = ~6 months.
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateOHLC(seed, weeks = 26, startPrice = 100, volatility = 0.05, drift = 0.004) {
  const rnd = seededRandom(seed);
  const data = [];
  let price = startPrice;
  for (let i = 0; i < weeks; i++) {
    const open = price;
    const change = (rnd() - 0.5) * 2 * volatility + drift;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + rnd() * volatility * 0.6);
    const low  = Math.min(open, close) * (1 - rnd() * volatility * 0.6);
    data.push({ open, high, low, close, week: i });
    price = close;
  }
  return data;
}

// Per-sector seeds & characteristics (volatility, drift) for realistic variance
const SECTOR_PROFILES = {
  gpu:            { seed: 101, vol: 0.08, drift: 0.015 },   // hot
  hbm:            { seed: 102, vol: 0.07, drift: 0.012 },
  foundry:        { seed: 103, vol: 0.05, drift: 0.010 },
  equipment:      { seed: 104, vol: 0.06, drift: 0.006 },
  optical:        { seed: 105, vol: 0.09, drift: 0.018 },   // very hot
  power:          { seed: 106, vol: 0.07, drift: 0.014 },
  hyperscaler:    { seed: 201, vol: 0.04, drift: 0.008 },
  neocloud:       { seed: 202, vol: 0.12, drift: 0.020 },   // extreme
  foundation:     { seed: 203, vol: 0.03, drift: 0.005 },   // private, muted
  mlops:          { seed: 204, vol: 0.06, drift: 0.004 },
  aiapp:          { seed: 301, vol: 0.05, drift: 0.003 },
  "saas-ai":      { seed: 302, vol: 0.04, drift: -0.002 },  // mild decline
  robotics:       { seed: 303, vol: 0.09, drift: 0.010 },
  "ai-semi-design": { seed: 304, vol: 0.07, drift: 0.012 },
};

// Attach OHLC to every sector
INDUSTRY_CHAIN.forEach(layer => {
  layer.sectors.forEach(sector => {
    const p = SECTOR_PROFILES[sector.id] || { seed: 1, vol: 0.05, drift: 0.005 };
    sector.ohlc = generateOHLC(p.seed, 26, 100, p.vol, p.drift);
    const first = sector.ohlc[0].open;
    const last  = sector.ohlc[sector.ohlc.length - 1].close;
    sector.totalChange = ((last - first) / first) * 100;

    // Daily change for each company (seeded)
    const rnd = seededRandom(p.seed + 7);
    sector.companies.forEach((c, i) => {
      const dailyVol = p.vol * 0.6;
      c.dailyChange = (rnd() - 0.45) * 2 * dailyVol * 100; // percent
      c.price = 50 + rnd() * 850;
      c.mcap = Math.round((rnd() * 3000 + 50)); // B USD
    });
  });
});

// ============ KEY METRICS ============
// Each metric: id, label, unit, current, change, spark (12 points), category
function sparkline(seed, points = 20, vol = 0.03, drift = 0.005) {
  const rnd = seededRandom(seed);
  const arr = [100];
  for (let i = 1; i < points; i++) {
    const prev = arr[i - 1];
    arr.push(prev * (1 + (rnd() - 0.5) * 2 * vol + drift));
  }
  return arr;
}

export const KEY_METRICS = [
  {
    id: "h200_spot",
    label: "H200 云端现货价",
    sublabel: "H200 Spot $/hr",
    category: "算力",
    unit: "$/GPU·hr",
    current: 3.28,
    change: -8.4,
    spark: sparkline(11, 26, 0.04, -0.004),
    hint: "过去6月下降，供给释放",
  },
  {
    id: "b200_spot",
    label: "B200 云端现货价",
    sublabel: "B200 Spot $/hr",
    category: "算力",
    unit: "$/GPU·hr",
    current: 6.85,
    change: -12.1,
    spark: sparkline(12, 26, 0.05, -0.006),
    hint: "部署加速，租赁价快速下行",
  },
  {
    id: "hbm3e",
    label: "HBM3e 现货价",
    sublabel: "HBM3e 24GB Spot",
    category: "算力",
    unit: "$/stack",
    current: 420,
    change: 14.2,
    spark: sparkline(13, 26, 0.03, 0.006),
    hint: "供不应求，持续上行",
  },
  {
    id: "capex",
    label: "Hyperscaler Capex",
    sublabel: "MSFT+GOOG+META+AMZN Q4E",
    category: "投资",
    unit: "$B/qtr",
    current: 128.4,
    change: 42.6,
    spark: sparkline(14, 12, 0.04, 0.032),
    hint: "四家合计季度资本开支再创新高",
  },
  {
    id: "chip_ship",
    label: "AI 芯片出货量",
    sublabel: "NV + AMD DC GPU 月度",
    category: "算力",
    unit: "万片/月",
    current: 86.2,
    change: 24.8,
    spark: sparkline(15, 26, 0.04, 0.012),
    hint: "Blackwell 放量拉升出货",
  },
  {
    id: "api_price",
    label: "旗舰 API 价格",
    sublabel: "GPT/Claude/Gemini 加权",
    category: "模型",
    unit: "$/MTok(out)",
    current: 8.2,
    change: -38.5,
    spark: sparkline(16, 26, 0.03, -0.018),
    hint: "token 通缩持续",
  },
  {
    id: "api_vol",
    label: "主力 API 日调用量",
    sublabel: "OpenAI+Anthropic+Google",
    category: "模型",
    unit: "B tokens/day",
    current: 14800,
    change: 186.2,
    spark: sparkline(17, 26, 0.03, 0.042),
    hint: "推理需求指数级增长",
  },
  {
    id: "oss_api",
    label: "开源模型调用量",
    sublabel: "Llama/Qwen/DeepSeek OR",
    category: "模型",
    unit: "B tokens/day",
    current: 3420,
    change: 112.8,
    spark: sparkline(18, 26, 0.04, 0.032),
    hint: "开源份额持续扩张",
  },
  {
    id: "power",
    label: "美国数据中心电价",
    sublabel: "PJM Data Center Zone",
    category: "电力",
    unit: "$/MWh",
    current: 82.4,
    change: 28.6,
    spark: sparkline(19, 26, 0.04, 0.010),
    hint: "电力成本上行",
  },
  {
    id: "pue",
    label: "Hyperscaler PUE",
    sublabel: "加权平均 PUE",
    category: "电力",
    unit: "",
    current: 1.18,
    change: -3.2,
    spark: sparkline(20, 26, 0.01, -0.0015),
    hint: "液冷渗透 PUE 继续优化",
  },
  {
    id: "capacity",
    label: "新增 AI 数据中心容量",
    sublabel: "北美季度新增 IT 容量",
    category: "电力",
    unit: "GW/qtr",
    current: 4.8,
    change: 58.4,
    spark: sparkline(21, 12, 0.05, 0.038),
    hint: "扩产创历史新高",
  },
  {
    id: "sox",
    label: "费城半导体指数",
    sublabel: "SOX Index",
    category: "市场",
    unit: "",
    current: 6248,
    change: 18.6,
    spark: sparkline(22, 26, 0.03, 0.008),
    hint: "半导体整体强势",
  },
];

// ============ NEWS ============
export const NEWS = [
  {
    id: 1,
    category: "模型",
    severity: "high",
    time: "2h",
    title: "Anthropic 发布 Claude 4.5 Opus，上下文扩展至 2M tokens",
    source: "Anthropic",
    tags: ["Claude", "大模型"],
    summary: "新旗舰模型在 SWE-bench 上达到 74.8%，API 定价较 Claude 4 Sonnet 降低 22%。",
  },
  {
    id: 2,
    category: "芯片",
    severity: "high",
    time: "5h",
    title: "NVIDIA 预告 Rubin R200 将于 2026 Q3 出货",
    source: "路透",
    tags: ["NVDA", "Rubin"],
    summary: "首发合作伙伴包括 Microsoft 和 CoreWeave，预计带宽较 B200 提升 3.3x。",
  },
  {
    id: 3,
    category: "投资",
    severity: "medium",
    time: "8h",
    title: "OpenAI 完成 400 亿美元新一轮融资，估值 5000 亿",
    source: "FT",
    tags: ["OpenAI", "融资"],
    summary: "软银领投，微软参与增资，将主要用于 Stargate 数据中心建设。",
  },
  {
    id: 4,
    category: "并购",
    severity: "medium",
    time: "1d",
    title: "AMD 拟以 120 亿美元收购光模块厂商 Coherent",
    source: "WSJ",
    tags: ["AMD", "COHR", "M&A"],
    summary: "强化 AI 网络和硅光布局，交易预计 2026 年下半年完成。",
  },
  {
    id: 5,
    category: "模型",
    severity: "medium",
    time: "1d",
    title: "Google DeepMind 发布 Gemini 3.0，原生视频理解",
    source: "DeepMind",
    tags: ["Gemini", "Google"],
    summary: "多模态能力显著提升，长视频理解基准 VideoMME 刷新 SOTA。",
  },
  {
    id: 6,
    category: "政策",
    severity: "high",
    time: "2d",
    title: "美商务部放宽先进节点设备对华出口管制",
    source: "Commerce.gov",
    tags: ["政策", "半导体"],
    summary: "14nm 以上设备解禁，对台积电、ASML 的亚洲业务构成利好。",
  },
  {
    id: 7,
    category: "芯片",
    severity: "medium",
    time: "2d",
    title: "台积电 3nm 产能利用率达 98%，2nm 提前试产",
    source: "DigiTimes",
    tags: ["TSMC", "2nm"],
    summary: "苹果、英伟达、AMD 均为首批 2nm 客户。",
  },
  {
    id: 8,
    category: "应用",
    severity: "low",
    time: "3d",
    title: "Cursor 周活用户突破 500 万，企业版签约 Stripe",
    source: "The Information",
    tags: ["Cursor", "编码"],
    summary: "AI 编码助手龙头增长迅速，ARR 突破 4 亿美元。",
  },
  {
    id: 9,
    category: "电力",
    severity: "medium",
    time: "3d",
    title: "微软与 Constellation 签订 20 年核电采购协议",
    source: "Bloomberg",
    tags: ["MSFT", "核电"],
    summary: "Three Mile Island 重启，总容量 835 MW 专供 Azure 数据中心。",
  },
  {
    id: 10,
    category: "机器人",
    severity: "medium",
    time: "4d",
    title: "Figure AI 发布 Figure 03，首次进入家庭场景试点",
    source: "Figure",
    tags: ["Figure", "机器人"],
    summary: "与宝马合作 2.0 版本同步落地，工厂部署数突破 1000 台。",
  },
  {
    id: 11,
    category: "模型",
    severity: "low",
    time: "5d",
    title: "Meta 发布 Llama 4.5 多模态开源模型",
    source: "Meta AI",
    tags: ["Llama", "开源"],
    summary: "参数规模 600B，在 MATH-500 上超越 GPT-4 Turbo。",
  },
  {
    id: 12,
    category: "投资",
    severity: "high",
    time: "5d",
    title: "xAI 融资 100 亿美元，估值达 2000 亿",
    source: "Bloomberg",
    tags: ["xAI", "融资"],
    summary: "用于建设 Memphis 超算中心第二期，目标 1M 卡集群。",
  },
];
