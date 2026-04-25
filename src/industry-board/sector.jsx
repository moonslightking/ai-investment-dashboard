import { useMemo, useState } from "react";
import { Sparkline } from "./charts.jsx";
import { createCompanyFromDraft, VISIBLE_COMPANY_LIMIT } from "./sectorMath.js";

const EMPTY_DRAFT = {
  ticker: "",
  name: "",
  price: "",
  prevClose: "",
  open: "",
  high: "",
  low: "",
};

const formatPct = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const formatPrice = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value >= 1000 ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : value.toFixed(2);
};

const getChangeClass = (value) => {
  if (typeof value !== "number" || Number.isNaN(value) || Math.abs(value) < 0.05) return "flat";
  return value >= 0 ? "up" : "down";
};

export const SectorCard = ({ onCompaniesChange, sector }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const hiddenCompanyCount = Math.max(0, sector.companies.length - VISIBLE_COMPANY_LIMIT);
  const visibleCompanies = expanded || editing
    ? sector.companies
    : sector.companies.slice(0, VISIBLE_COMPANY_LIMIT);
  const avgUp = sector.averageChange >= 0;
  const trendValues = useMemo(
    () => (sector.trend || []).map((point) => point.value),
    [sector.trend],
  );

  const updateDraft = (field, value) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  };

  const addCompany = (event) => {
    event.preventDefault();
    if (!draft.ticker.trim()) return;

    const company = createCompanyFromDraft(draft);
    onCompaniesChange(sector.id, [...sector.companies, company]);
    setDraft(EMPTY_DRAFT);
    setExpanded(true);
  };

  const removeCompany = (ticker) => {
    onCompaniesChange(
      sector.id,
      sector.companies.filter((company) => company.ticker !== ticker),
    );
  };

  return (
    <div className="sector-card">
      <div className="sector-top">
        <div>
          <div className="sector-code">{sector.code}</div>
          <h4 className="sector-name">{sector.name}</h4>
          <div className="sector-desc">{sector.summary}</div>
        </div>
        <div>
          <div className="sector-change-lbl">Avg Daily Move</div>
          <div className={`sector-change ${avgUp ? "up" : "down"}`}>
            {formatPct(sector.averageChange)}
          </div>
        </div>
      </div>

      <div className="sector-trend">
        <div className="sector-trend-head">
          <span>Group Avg Trend</span>
          <span>Prev / Open / Range / Last</span>
        </div>
        {trendValues.length > 1 ? (
          <Sparkline data={trendValues} height={52} positive={sector.averageChange >= 0} />
        ) : (
          <div className="trend-empty">No group trend data</div>
        )}
      </div>

      <div className="sector-snapshot">
        <div className="sector-snapshot-item">
          <span className="snapshot-label">Quotes</span>
          <span className="snapshot-value">
            {sector.quoteCoverage}/{sector.companies.length}
          </span>
        </div>
        <div className="sector-snapshot-item">
          <span className="snapshot-label">Best</span>
          <span className="snapshot-value">
            {sector.leader ? `${sector.leader.ticker} ${formatPct(sector.leader.change)}` : "—"}
          </span>
        </div>
        <div className="sector-snapshot-item">
          <span className="snapshot-label">Worst</span>
          <span className="snapshot-value">
            {sector.laggard ? `${sector.laggard.ticker} ${formatPct(sector.laggard.change)}` : "—"}
          </span>
        </div>
      </div>

      <div className="company-list">
        {visibleCompanies.map((company) => (
          <div
            key={company.ticker}
            className="company-row"
            title={`${company.ticker} · ${company.quoteSource || "workbook"}${company.quoteTime ? ` · ${company.quoteTime}` : ""}`}
          >
            <span className="company-rank">{company.rank}</span>
            <div>
              <span className="company-ticker">{company.displayTicker}</span>
              <span className="company-name">{company.name}</span>
            </div>
            <span className="company-price">{formatPrice(company.price)}</span>
            <span className={`company-change ${getChangeClass(company.dailyChange)}`}>
              {formatPct(company.dailyChange)}
            </span>
            {editing && (
              <button
                aria-label={`Remove ${company.displayTicker}`}
                className="company-remove"
                onClick={() => removeCompany(company.ticker)}
                type="button"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="sector-actions">
        {hiddenCompanyCount > 0 && !editing && (
          <button
            className="sector-action-btn"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? "−" : `+${hiddenCompanyCount}`}
          </button>
        )}
        <button
          className="sector-action-btn"
          onClick={() => {
            setEditing((current) => !current);
            setExpanded(true);
          }}
          type="button"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing && (
        <form className="company-editor" onSubmit={addCompany}>
          <input
            aria-label="Ticker"
            onChange={(event) => updateDraft("ticker", event.target.value)}
            placeholder="Ticker"
            value={draft.ticker}
          />
          <input
            aria-label="Company name"
            onChange={(event) => updateDraft("name", event.target.value)}
            placeholder="Name"
            value={draft.name}
          />
          <input
            aria-label="Latest price"
            inputMode="decimal"
            onChange={(event) => updateDraft("price", event.target.value)}
            placeholder="Price"
            value={draft.price}
          />
          <input
            aria-label="Previous close"
            inputMode="decimal"
            onChange={(event) => updateDraft("prevClose", event.target.value)}
            placeholder="Prev"
            value={draft.prevClose}
          />
          <button className="company-add" type="submit">+</button>
        </form>
      )}
    </div>
  );
};
