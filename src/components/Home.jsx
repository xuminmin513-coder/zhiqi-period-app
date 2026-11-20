import Icon from "./Icon.jsx";
import { diffDays, getToday, shortDate, toISO } from "../utils/date.js";
import { getPrediction } from "../utils/period.js";

export function PageHeader({ title, subtitle, children }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div>{children}</header>;
}

export default function Home({ state, onOpenModal, onNavigate }) {
  const prediction = getPrediction(state);
  const today = getToday();
  const todayISO = toISO(today);
  const cycleDay = diffDays(todayISO, state.lastPeriodStart) + 1;
  const progress = Math.max(3, Math.min(96, Math.round(cycleDay / prediction.cycle * 100)));
  const daysMin = diffDays(prediction.start, todayISO);
  const daysMax = diffDays(prediction.end, todayISO);
  const daysText = daysMax < 0 ? "可能已推迟" : daysMin <= 0 ? "可能就在这几天" : `约 ${daysMin}—${daysMax} 天`;
  const inPeriod = cycleDay >= 1 && cycleDay <= state.periodLength;
  const todayLog = state.logs[todayISO];
  const todaySummary = inPeriod ? `经期第 ${cycleDay} 天` : todayLog?.symptoms?.length ? `已记录：${todayLog.symptoms.join("、")}` : "今天还没有记录身体状况";

  return (
    <section className="page" aria-label="今天">
      <PageHeader title="今天" subtitle={`${today.getMonth() + 1}月${today.getDate()}日 · 听见身体的节奏`}>
        <button className="header-action" onClick={() => onOpenModal("reminders")} aria-label="提醒设置"><Icon name="bell" /></button>
      </PageHeader>
      <div className="stack">
        <article className="cycle-card">
          <div className="cycle-top">
            <div className="cycle-copy">
              <span className="pill">{inPeriod ? `经期第 ${cycleDay} 天` : `当前周期第 ${Math.max(cycleDay, 1)} 天`}</span>
              <h2>距离下次经期</h2>
              <strong className="cycle-number">{daysText}</strong>
              <p>预计 {shortDate(prediction.start)}—{shortDate(prediction.end)}</p>
            </div>
            <div className="cycle-ring" style={{ "--progress": progress }} aria-label={`当前周期进度约${progress}%`}>
              <div className="cycle-ring-content"><strong>{Math.max(cycleDay, 1)}</strong><span>周期天数</span></div>
            </div>
          </div>
          <div className="cycle-actions">
            <button className="primary-button" onClick={() => onOpenModal("daily", todayISO)}><Icon name="plus" size={18} />记录今天</button>
            <button className="text-button" onClick={() => onOpenModal("prediction")}>预测依据</button>
          </div>
          <div className="prediction-meta"><Icon name="info" size={14} />{prediction.evidenceCount ? `参考 ${prediction.evidenceCount} 个周期间隔` : "使用你填写的平均周期"} · {prediction.confidence}</div>
        </article>
        <button className="card today-strip" onClick={() => onOpenModal("period")}>
          <Icon name="drop" size={22} />
          <span className="today-strip-content"><strong>{inPeriod ? "正在记录本次经期" : "记录经期开始或结束"}</strong><span>{todaySummary}</span></span>
          <Icon name="chevron" size={18} />
        </button>
      </div>
      <section className="section">
        <div className="section-heading"><h2>快速记录</h2><span>少填一点，也可以</span></div>
        <div className="quick-grid">
          <button className="quick-action" onClick={() => onOpenModal("period")}><Icon name="drop" size={23} /><span>经期</span></button>
          <button className="quick-action" onClick={() => onOpenModal("daily", todayISO)}><Icon name="heart" size={23} /><span>症状与心情</span></button>
          <button className="quick-action" onClick={() => onNavigate("trends")}><Icon name="chart" size={23} /><span>查看趋势</span></button>
        </div>
      </section>
      <section className="section">
        <div className="privacy-note"><Icon name="shield" size={22} /><div><strong>你的记录，默认只留在这台设备</strong><p>无需账号，不上传经期和症状。清除浏览器数据前，请先在「我的」中导出备份。</p></div></div>
      </section>
    </section>
  );
}
