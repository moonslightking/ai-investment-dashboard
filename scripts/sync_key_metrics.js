import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  KEY_METRIC_SOURCE_SNAPSHOTS,
  KEY_METRIC_TOTAL,
} from "./key_metric_sources.js";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputPath = path.join(rootDir, "src", "industry-board", "generatedKeyMetricData.js");
const auditPath = path.join(rootDir, "KEY_METRICS_数据更新审计.md");
const now = new Date();
const checkSources = process.argv.includes("--check-sources") || process.env.KEY_METRICS_CHECK_SOURCES === "1";
const strictSources = process.argv.includes("--strict-sources") || process.env.KEY_METRICS_STRICT_SOURCES === "1";
const allowedStatuses = new Set(["verified", "mixed-proxy", "stale", "blocked"]);
const allowedChartTypes = new Set(["bar", "line", "events"]);
const allowedTones = new Set(["high", "mid", "low", "up", "down", "neutral"]);

const formatDate = (date) => date.toISOString().slice(0, 10);

const stableStringify = (value, indent = 0) => {
  const space = " ".repeat(indent);
  const next = " ".repeat(indent + 2);

  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const simple = value.every((item) => item && typeof item === "object" && !Array.isArray(item)
      && Object.values(item).every((inner) => inner === null || ["string", "number", "boolean"].includes(typeof inner)));
    if (simple && value.length <= 8) {
      return `[\n${value.map((item) => `${next}${stableStringify(item, indent + 2)}`).join(",\n")}\n${space}]`;
    }
    return `[\n${value.map((item) => `${next}${stableStringify(item, indent + 2)}`).join(",\n")}\n${space}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    const simple = entries.every(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item));
    if (simple && entries.length <= 4) {
      return `{ ${entries.map(([key, item]) => `${JSON.stringify(key)}: ${stableStringify(item, indent)}`).join(", ")} }`;
    }
    return `{\n${entries.map(([key, item]) => `${next}${JSON.stringify(key)}: ${stableStringify(item, indent + 2)}`).join(",\n")}\n${space}}`;
  }
  return JSON.stringify(value);
};

const assert = (condition, issues, message) => {
  if (!condition) issues.push(message);
};

const validateUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const validateMetric = (metricId, metric) => {
  const issues = [];
  assert(metric && typeof metric === "object", issues, "metric must be an object");
  if (!metric || typeof metric !== "object") return issues;

  assert(allowedStatuses.has(metric.status), issues, `invalid status: ${metric.status}`);
  assert(Boolean(metric.updatedAt), issues, "missing updatedAt");
  assert(Boolean(metric.cadence), issues, "missing cadence");
  assert(Boolean(metric.headline?.label), issues, "missing headline label");
  assert(Boolean(metric.headline?.value), issues, "missing headline value");
  assert(allowedTones.has(metric.headline?.tone), issues, `invalid headline tone: ${metric.headline?.tone}`);
  assert(Boolean(metric.delta?.label), issues, "missing delta label");
  assert(Boolean(metric.delta?.value), issues, "missing delta value");
  assert(allowedTones.has(metric.delta?.tone), issues, `invalid delta tone: ${metric.delta?.tone}`);
  assert(Boolean(metric.sourceNote), issues, "missing sourceNote");
  assert(Array.isArray(metric.sources) && metric.sources.length > 0, issues, "missing sources");
  assert(Array.isArray(metric.rows) && metric.rows.length > 0, issues, "missing detail rows");

  if (metric.chart) {
    assert(allowedChartTypes.has(metric.chart.type), issues, `invalid chart type: ${metric.chart.type}`);
    if (metric.chart.type === "bar") {
      assert(Array.isArray(metric.chart.items) && metric.chart.items.length > 0, issues, "bar chart has no items");
      (metric.chart.items || []).forEach((item, index) => {
        assert(Number.isFinite(item.value), issues, `bar item ${index} has non-numeric value`);
        assert(Boolean(item.label), issues, `bar item ${index} missing label`);
        assert(allowedTones.has(item.tone), issues, `bar item ${index} invalid tone: ${item.tone}`);
        if (item.previousValue !== undefined) {
          assert(Number.isFinite(item.previousValue), issues, `bar item ${index} has non-numeric previousValue`);
        }
      });
    }
  }

  (metric.sources || []).forEach((source, index) => {
    assert(Boolean(source.label), issues, `source ${index} missing label`);
    assert(validateUrl(source.url), issues, `source ${index} must be an https URL`);
  });

  if (metricId === "server_cpu") {
    assert(metric.status === "mixed-proxy", issues, "server_cpu must remain mixed-proxy until CPU-only revenue is available");
    assert(/not a pure CPU revenue index/i.test(metric.sourceNote), issues, "server_cpu sourceNote must explicitly state proxy limitation");
  }

  if (metric.status !== "verified") {
    assert(metric.sourceNote.length >= 80, issues, "non-verified metrics need an explicit limitation note");
  }

  return issues;
};

const checkSource = async (source) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(source.url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml,application/json",
        "User-Agent": "ai-investment-dashboard-key-metrics/0.1",
      },
      signal: controller.signal,
    });
    return {
      label: source.label,
      url: source.url,
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      label: source.label,
      url: source.url,
      ok: false,
      status: "fetch-error",
      error: error.name === "AbortError" ? "timeout" : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const uniqueSources = (metrics) => {
  const byUrl = new Map();
  Object.values(metrics).forEach((metric) => {
    (metric.sources || []).forEach((source) => {
      if (!byUrl.has(source.url)) byUrl.set(source.url, source);
    });
  });
  return [...byUrl.values()];
};

const buildGeneratedData = () => {
  const metrics = Object.fromEntries(
    Object.entries(KEY_METRIC_SOURCE_SNAPSHOTS).map(([metricId, metric]) => [
      metricId,
      {
        ...metric,
        generatedAt: now.toISOString(),
      },
    ]),
  );

  return {
    source: {
      status: "verified-snapshot",
      generatedAt: now.toISOString(),
      coverage: {
        verified: Object.keys(metrics).length,
        total: KEY_METRIC_TOTAL,
      },
      updateMode: checkSources ? "validated-with-source-reachability" : "local-schema-validation",
      note: "Generated by scripts/sync_key_metrics.js from curated source snapshots. Values are verified snapshots, not realtime data.",
    },
    metrics,
  };
};

const renderGeneratedFile = ({ source, metrics }) => `export const KEY_METRIC_DATA_SOURCE = ${stableStringify(source)};\n\nexport const KEY_METRIC_DATA = ${stableStringify(metrics)};\n`;

const renderAudit = ({ source, metrics }, validation, sourceChecks) => {
  const sourceCheckRows = sourceChecks.length === 0
    ? "- Source reachability was not checked. Run `npm run sync:key-metrics:check` when network access is available."
    : sourceChecks.map((item) => `- ${item.ok ? "PASS" : "WARN"} · ${item.label} · ${item.status} · ${item.url}${item.error ? ` · ${item.error}` : ""}`).join("\n");

  const metricRows = Object.entries(metrics).map(([metricId, metric]) => {
    const issues = validation[metricId] || [];
    return [
      `## ${metricId}`,
      `- status: ${metric.status}`,
      `- updatedAt: ${metric.updatedAt}`,
      `- cadence: ${metric.cadence}`,
      `- source count: ${metric.sources.length}`,
      `- validation: ${issues.length === 0 ? "PASS" : `WARN (${issues.length})`}`,
      issues.map((issue) => `  - ${issue}`).join("\n"),
      `- limitation: ${metric.sourceNote}`,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  return [
    "# Key Metrics 数据更新审计",
    "",
    `- generatedAt: ${source.generatedAt}`,
    `- updateMode: ${source.updateMode}`,
    `- coverage: ${source.coverage.verified}/${source.coverage.total}`,
    `- generatedDate: ${formatDate(now)}`,
    "",
    "## Source Reachability",
    sourceCheckRows,
    "",
    metricRows,
    "",
  ].join("\n");
};

const main = async () => {
  const generated = buildGeneratedData();
  const validation = Object.fromEntries(
    Object.entries(generated.metrics).map(([metricId, metric]) => [
      metricId,
      validateMetric(metricId, metric),
    ]),
  );
  const validationIssues = Object.values(validation).flat();
  const sourceChecks = checkSources
    ? await Promise.all(uniqueSources(generated.metrics).map(checkSource))
    : [];

  await writeFile(outputPath, renderGeneratedFile(generated));
  await writeFile(auditPath, renderAudit(generated, validation, sourceChecks));

  console.log(`Generated ${path.relative(rootDir, outputPath)}`);
  console.log(`Wrote ${path.relative(rootDir, auditPath)}`);
  console.log(`Coverage ${generated.source.coverage.verified}/${generated.source.coverage.total}`);

  if (validationIssues.length > 0) {
    console.error(`Validation warnings: ${validationIssues.length}`);
    process.exitCode = 1;
  }
  if (sourceChecks.some((item) => !item.ok)) {
    console.error(`Source reachability warnings: ${sourceChecks.filter((item) => !item.ok).length}`);
    if (strictSources) {
      process.exitCode = 1;
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
