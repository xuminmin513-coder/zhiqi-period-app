import Icon from "./Icon.jsx";
import { PageHeader } from "./Home.jsx";
import { addDays, fullDate, getToday, monthLabel, shortDate, toISO } from "../utils/date.js";
import { getDateStatus, getPrediction } from "../utils/period.js";

export default function Calendar({ state, month, selectedDate, onMonthChange, onSelectDay, onOpenModal }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -offset);
  const prediction = getPrediction(state);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  return (
    <section className="page" aria-label="日历">
      <PageHeader title="日历" subtitle="实际记录与预测，始终分得清楚">
        <button className="header-action" onClick={() => onMonthChange(new Date(getToday().getFullYear(), getToday().getMonth(), 1))} aria-label="回到本月"><Icon name="calendar" /></button>
      </PageHeader>
      <div className="card calendar-card">
        <div className="calendar-toolbar">
          <button className="icon-button" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="上个月"><Icon name="left" /></button>
          <h2>{monthLabel(month)}</h2>
          <button className="icon-button" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="下个月"><Icon name="right" /></button>
        </div>
        <div className="calendar-weekdays">{["一", "二", "三", "四", "五", "六", "日"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {days.map((date) => {
            const dateISO = toISO(date);
            const status = getDateStatus(state, dateISO);
            const classes = ["calendar-day", date.getMonth() !== month.getMonth() ? "outside" : "", status.isActual ? "actual" : status.isPredicted ? "predicted" : "", dateISO === toISO(getToday()) ? "today" : "", dateISO === selectedDate ? "selected" : ""].filter(Boolean).join(" ");
            return <button key={dateISO} className={classes} onClick={() => onSelectDay(dateISO)} aria-label={`${fullDate(dateISO)}${status.isActual ? "，实际经期" : status.isPredicted ? "，预测经期" : ""}`}>{date.getDate()}{status.hasLog && <span className="day-dot" />}</button>;
          })}
        </div>
        <div className="calendar-legend"><span className="legend-item"><i className="legend-dot" />实际经期</span><span className="legend-item"><i className="legend-dot predicted" />预测区间</span><span className="legend-item"><i className="legend-dot today" />今天</span><span className="legend-item">点击日期可补记</span></div>
      </div>
      <section className="section">
        <article className="card prediction-card"><h3>下次经期：{shortDate(prediction.start)}—{shortDate(prediction.end)}</h3><p>这是基于历史周期的估算区间，不是保证日期。生活压力、疾病、旅行和激素变化都可能让周期改变。</p><button className="text-button" onClick={() => onOpenModal("prediction")}>查看这次预测如何使用数据 →</button></article>
      </section>
    </section>
  );
}
