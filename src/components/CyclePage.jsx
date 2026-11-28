import { useState } from "react";
import Icon from "./Icon.jsx";
import { PageHeader } from "./Home.jsx";
import Calendar from "./Calendar.jsx";
import Trends from "./Trends.jsx";
import { getToday, toISO } from "../utils/date.js";

export default function CyclePage({ state, month, selectedDate, onMonthChange, onSelectDay, onOpenModal }) {
  const [tab, setTab] = useState("calendar");
  const todayISO = toISO(getToday());

  return (
    <section className="page" aria-label="经期">
      <PageHeader title="经期" subtitle="实际记录、区间预测与周期趋势">
        {tab === "calendar" ? (
          <button className="header-action" onClick={() => onMonthChange(new Date(getToday().getFullYear(), getToday().getMonth(), 1))} aria-label="回到本月"><Icon name="calendar" /></button>
        ) : (
          <button className="header-action" onClick={() => onOpenModal("daily", todayISO)} aria-label="记录身体感受"><Icon name="heart" /></button>
        )}
      </PageHeader>
      <div className="segmented-control" role="tablist" aria-label="经期视图切换">
        <button type="button" role="tab" aria-selected={tab === "calendar"} className={`segment-button ${tab === "calendar" ? "active" : ""}`} onClick={() => setTab("calendar")}>日历与记录</button>
        <button type="button" role="tab" aria-selected={tab === "trends"} className={`segment-button ${tab === "trends" ? "active" : ""}`} onClick={() => setTab("trends")}>周期趋势</button>
      </div>
      {tab === "calendar" ? (
        <Calendar embedded state={state} month={month} selectedDate={selectedDate} onMonthChange={onMonthChange} onSelectDay={onSelectDay} onOpenModal={onOpenModal} />
      ) : (
        <Trends embedded state={state} onOpenModal={onOpenModal} />
      )}
    </section>
  );
}
