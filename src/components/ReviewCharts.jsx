import { MOOD_OPTIONS } from "../utils/review.js";

const SHORT_WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function WeeklyRateBars({ dailyRates = [] }) {
  return (
    <div className="review-bars" role="img" aria-label="本周每日计划完成率柱状图">
      {dailyRates.map((day, idx) => {
        const hasPlan = day.planned > 0;
        const heightPct = hasPlan ? Math.max(10, day.rate) : 8;
        return (
          <div className="review-bar-col" key={day.date || idx}>
            <span className="review-bar-val">{hasPlan ? `${day.rate}%` : "—"}</span>
            <div className="review-bar-track">
              <div
                className={`review-bar-fill ${hasPlan ? (day.rate === 100 ? "full" : "active") : "idle"}`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="review-bar-day">{SHORT_WEEKDAYS[idx] || ""}</span>
          </div>
        );
      })}
    </div>
  );
}

export function YearlyTrendSvg({ monthlyRates = [] }) {
  const left = 22;
  const right = 304;
  const top = 18;
  const bottom = 96;
  const spanX = right - left;
  const spanY = bottom - top;

  const points = monthlyRates.map((item, index) => {
    const x = Math.round((left + (spanX * index) / 11) * 10) / 10;
    const y = Math.round((bottom - (spanY * (item.rate || 0)) / 100) * 10) / 10;
    return { ...item, x, y };
  });

  const linePath = points
    .map((pt, idx) => `${idx === 0 ? "M" : "L"}${pt.x},${pt.y}`)
    .join(" ");
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1].x},${bottom} L${points[0].x},${bottom} Z`
    : "";

  return (
    <div className="yearly-chart-wrap">
      <svg className="yearly-svg" viewBox="0 0 320 124" role="img" aria-label="年度 12 个月计划完成率趋势曲线">
        <defs>
          <linearGradient id="reviewAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a465b" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7a465b" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0, 50, 100].map((pct) => {
          const y = Math.round(bottom - (spanY * pct) / 100);
          return (
            <g key={pct}>
              <line x1={left} y1={y} x2={right} y2={y} stroke="#ece3e8" strokeDasharray="3 3" strokeWidth="1" />
              <text x="2" y={y + 3} fontSize="8.5" fill="#aa9ca3">{pct}%</text>
            </g>
          );
        })}
        {areaPath && <path d={areaPath} fill="url(#reviewAreaGrad)" />}
        {linePath && <path d={linePath} fill="none" stroke="#7a465b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((pt) => (
          <g key={pt.month}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.planned > 0 ? "3.3" : "2.5"}
              fill={pt.planned > 0 ? "#7a465b" : "#ffffff"}
              stroke="#7a465b"
              strokeWidth="1.5"
            />
            <text x={pt.x} y="114" textAnchor="middle" fontSize="8.5" fill="#82737b">{pt.month}月</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function MoodDistributionBar({ distribution = {} }) {
  const total = MOOD_OPTIONS.reduce((sum, opt) => sum + (Number(distribution[opt.value]) || 0), 0);
  if (total === 0) {
    return <p className="muted small">本月日复盘尚未记录心情分值。</p>;
  }
  return (
    <div className="mood-dist-row" aria-label="本月心情分布">
      {MOOD_OPTIONS.map((opt) => {
        const count = Number(distribution[opt.value]) || 0;
        return (
          <div className={`mood-dist-chip ${count > 0 ? "has-data" : ""}`} key={opt.value}>
            <span>{opt.emoji}</span>
            <strong>{count}</strong>
            <small>{opt.label}</small>
          </div>
        );
      })}
    </div>
  );
}
