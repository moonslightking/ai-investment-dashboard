# Key Metrics 数据更新审计

- generatedAt: 2026-05-01T02:03:37.916Z
- updateMode: validated-with-source-reachability
- coverage: 4/11
- generatedDate: 2026-05-01

## Source Reachability
- WARN · OpenAI Pricing · 403 · https://openai.com/api/pricing/
- PASS · Anthropic Pricing · 200 · https://platform.claude.com/docs/en/docs/about-claude/pricing
- PASS · Gemini Pricing · 200 · https://ai.google.dev/gemini-api/docs/pricing
- PASS · DeepSeek Pricing · 200 · https://api-docs.deepseek.com/quick_start/pricing
- WARN · CoreWeave Pricing · 403 · https://www.coreweave.com/pricing
- PASS · Lambda Pricing · 200 · https://lambda.ai/pricing
- PASS · Nebius Pricing · 200 · https://nebius.com/prices
- PASS · Microsoft FY26 Q3 Cash Flows · 200 · https://www.microsoft.com/en-us/investor/earnings/fy-2026-q3/cash-flows
- PASS · Alphabet Q1 2026 SEC Exhibit · 200 · https://www.sec.gov/Archives/edgar/data/1652044/000165204426000043/googexhibit991q12026.htm
- WARN · Amazon Q1 2026 Results · 403 · https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-First-Quarter-Results/default.aspx
- WARN · Meta Q1 2026 Results · 403 · https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-First-Quarter-2026-Results/default.aspx
- PASS · Intel Q1 2026 Results · 200 · https://www.intc.com/news-events/press-releases/detail/1767/intel-reports-first-quarter-2026-financial-results
- PASS · AMD Q4 2025 Results · 200 · https://www.amd.com/en/newsroom/press-releases/2026-2-3-amd-reports-fourth-quarter-and-full-year-2025-fina.html
- PASS · AWS Graviton / Meta · 200 · https://press.aboutamazon.com/2026/4/meta-signs-agreement-with-aws-to-power-agentic-ai-on-aws-graviton-chips

## api_effective_price
- status: verified
- updatedAt: 2026-05-01
- cadence: pricing-page refresh
- source count: 4
- validation: PASS
- limitation: Cross-sectional public list prices; not yet a historical time series.

## gpu_cloud_availability
- status: verified
- updatedAt: 2026-05-01
- cadence: provider-page refresh
- source count: 3
- validation: PASS
- limitation: Availability, minimum term, region, and cluster size differ by provider; prices are not a pure like-for-like market index.

## ai_infra_capex
- status: verified
- updatedAt: 2026-05-01
- cadence: quarterly filings
- source count: 4
- validation: PASS
- limitation: Metric intentionally mixes fiscal calendars. Meta includes finance-lease principal payments; the other bars use purchases/additions to PP&E.

## server_cpu
- status: mixed-proxy
- updatedAt: 2026-05-01
- cadence: quarterly + event-driven
- source count: 4
- validation: PASS
- limitation: Not a pure CPU revenue index: AMD Data Center includes GPUs, and AWS chips include Trainium/Nitro. This is a demand-proxy card until cleaner CPU-only disclosures are available.
