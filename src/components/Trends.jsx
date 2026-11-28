import Icon from "./Icon.jsx";
import { PageHeader } from "./Home.jsx";
import { average } from "../utils/period.js";

export default function Trends({ state, onOpenModal, embedded = false }) {
  const cycles = state.cycles.length ? state.cycles : [state.typicalCycle || 30];
  const avg = average(cycles);
  const min = Math.min(...cycles);
  const max = Math.max(...cycles);
  const variability = max - min;
  const stability = state.cycles.length < 3 ? "继续积累" : variability <= 4 ? "较规律" : variability <= 8 ? "有些波动" : "波动较大";
  const symptomCounts = {};
  Object.values(state.logs).forEach((log) => (log.symptoms || []).forEach((symptom) => { symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1; }));
  const symptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const content = (
    <>
      <div className="metric-grid">
        <article className="card metric-card"><strong>{avg}<small> 天</small></strong><span>平均周期间隔</span></article>
        <article className="card metric-card"><strong>{state.periodLength}<small> 天</small></strong><span>平均经期长度</span></article>
        <article className="card metric-card"><strong style={{ fontSize: 18 }}>{stability}</strong><span>近期周期状态</span></article>
      </div>
      <section className="section">
        <div className="section-heading"><h2>周期间隔变化</h2><span>最近 {cycles.length} 次</span></div>
        <article className="card chart-card">
          <div className="bar-chart" role="img" aria-label={`周期间隔柱状图，范围${min}到${max}天`}>
            {cycles.map((value, index) => {
              const height = 30 + Math.round((value - 20) / 20 * 105);
              return <div className={`bar-column ${index === cycles.length - 1 ? "latest" : ""}`} key={`${value}-${index}`}><span className="bar-value">{value}天</span><div className="bar" style={{ height: Math.max(26, Math.min(138, height)) }} /><span className="bar-label">{state.cycles.length ? `第${index + 1}次` : "参考"}</span></div>;
            })}
          </div>
        </article>
      </section>
      <section className="section">
        <div className="section-heading"><h2>记录中的高频感受</h2><span>仅统计你的记录</span></div>
        <article className="card card-pad insight-list">
          {symptoms.length ? symptoms.map(([name, count]) => <div className="insight-row" key={name}><span className="insight-icon"><Icon name="heart" size={18} /></span><strong>{name}</strong><span>记录 {count} 次</span></div>) : <div className="empty-state"><p className="muted small">记录症状后，这里会显示出现次数。</p><button className="text-button" onClick={() => onOpenModal("daily")}>记录今天 →</button></div>}
        </article>
      </section>
      <section className="section"><p className="disclaimer">趋势用于自我观察和就医沟通，不构成疾病诊断或健康评分。</p></section>
    </>
  );

  if (embedded) return content;

  return (
    <section className="page" aria-label="趋势">
      <PageHeader title="趋势" subtitle="看见变化，而不是给自己打分" />
      {content}
    </section>
  );
}
