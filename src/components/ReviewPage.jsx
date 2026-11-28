import { useState } from "react";
import Icon from "./Icon.jsx";
import { PageHeader } from "./Home.jsx";
import { getToday, shortDate, toISO } from "../utils/date.js";
import {
  formatPeriodLabel,
  getCurrentPeriodKey,
  getIsoWeekKey,
  getPendingReviewPrompts,
  isFuturePeriod,
  MOOD_OPTIONS,
  parseIsoWeekKey,
  shiftPeriodKey
} from "../utils/review.js";

const TABS = [
  { id: "daily", label: "日复盘" },
  { id: "weekly", label: "周复盘" },
  { id: "monthly", label: "月复盘" },
  { id: "yearly", label: "年复盘" }
];

const MOOD_MAP = Object.fromEntries(MOOD_OPTIONS.map((m) => [m.value, m]));

function getSummaryLine(type, item) {
  if (type === "daily") {
    return item.bestThing || item.tomorrowFocus || item.obstacle || "已保存当日统计快照";
  }
  if (type === "weekly") {
    return item.wins || (item.nextWeekPriorities?.length ? `下周重点：${item.nextWeekPriorities.join("、")}` : "") || item.improvements || "已保存本周统计快照";
  }
  if (type === "monthly") {
    return item.gain || item.nextMonthGoal || item.regret || "已保存本月统计快照";
  }
  return item.keywords ? `关键词：${item.keywords}` : (item.proudest || item.nextYearVision || "已保存年度统计快照");
}

export default function ReviewPage({ state, onOpenModal, onNotify }) {
  const todayISO = toISO(getToday());
  const [activeType, setActiveType] = useState("daily");
  const [selectedKeys, setSelectedKeys] = useState(() => ({
    daily: getCurrentPeriodKey("daily", todayISO),
    weekly: getCurrentPeriodKey("weekly", todayISO),
    monthly: getCurrentPeriodKey("monthly", todayISO),
    yearly: getCurrentPeriodKey("yearly", todayISO)
  }));

  const prompts = getPendingReviewPrompts(state, todayISO);
  const currentKey = selectedKeys[activeType];
  const nextCandidateKey = shiftPeriodKey(activeType, currentKey, 1);
  const canStepForward = !isFuturePeriod(activeType, nextCandidateKey, todayISO);
  const currentSaved = Boolean(state.reviews?.[activeType]?.[currentKey]);

  const historyList = Object.values(state.reviews?.[activeType] || {}).sort((a, b) => b.key.localeCompare(a.key));

  function updateKey(type, nextKey) {
    if (isFuturePeriod(type, nextKey, todayISO)) {
      onNotify?.("不能提前创建未来周期的复盘");
      return;
    }
    setSelectedKeys((prev) => ({ ...prev, [type]: nextKey }));
  }

  function handleDateJump(dateValue) {
    if (!dateValue) return;
    if (dateValue > todayISO) {
      onNotify?.("不能选择未来日期补写复盘");
      return;
    }
    if (activeType === "daily") {
      updateKey("daily", dateValue);
    } else if (activeType === "weekly") {
      updateKey("weekly", getIsoWeekKey(dateValue));
    }
  }

  const weekStartForInput = activeType === "weekly" ? (parseIsoWeekKey(currentKey)?.startISO || todayISO) : currentKey;

  return (
    <section className="page" aria-label="复盘">
      <PageHeader title="复盘" subtitle="自动汇总完成率，沉淀属于你的节奏" />

      {prompts.length > 0 && (
        <div className="stack" style={{ marginBottom: 18 }} aria-label="待完成复盘提示">
          {prompts.map((prompt) => (
            <button
              type="button"
              key={`${prompt.type}-${prompt.key}`}
              className="card prompt-card"
              onClick={() => onOpenModal("review", { reviewType: prompt.type, periodKey: prompt.key })}
            >
              <span className="prompt-icon"><Icon name="book" size={18} /></span>
              <span className="today-strip-content">
                <strong>{prompt.title}</strong>
                <span>{prompt.subtitle}</span>
              </span>
              <span className="chip-action">去完成</span>
            </button>
          ))}
        </div>
      )}

      <div className="segmented-control four-way" role="tablist" aria-label="复盘维度切换">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeType === tab.id}
            className={`segment-button ${activeType === tab.id ? "active" : ""}`}
            onClick={() => setActiveType(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="stack">
        <article className="card card-pad period-switcher">
          <div className="switcher-bar">
            <button
              type="button"
              className="icon-button"
              onClick={() => updateKey(activeType, shiftPeriodKey(activeType, currentKey, -1))}
              aria-label="上一周期"
            >
              <Icon name="left" />
            </button>
            <div className="switcher-title">
              <strong>{formatPeriodLabel(activeType, currentKey)}</strong>
              <span>{currentSaved ? "已保存 · 统计快照已冻结" : "尚未复盘 · 可直接记录或补写"}</span>
            </div>
            <button
              type="button"
              className="icon-button"
              disabled={!canStepForward}
              onClick={() => updateKey(activeType, nextCandidateKey)}
              aria-label="下一周期"
            >
              <Icon name="right" />
            </button>
          </div>

          {(activeType === "daily" || activeType === "weekly") && (
            <div className="backfill-Jump">
              <label className="small muted" htmlFor="review-jump-date">
                {activeType === "daily" ? "按日期跳转或补写过去某天" : "选任意过去日期定位所属周"}
              </label>
              <input
                className="input"
                id="review-jump-date"
                type="date"
                max={todayISO}
                value={weekStartForInput > todayISO ? todayISO : weekStartForInput}
                onChange={(e) => handleDateJump(e.target.value)}
              />
            </div>
          )}

          <button
            type="button"
            className="primary-button full-width"
            onClick={() => onOpenModal("review", { reviewType: activeType, periodKey: currentKey })}
          >
            <Icon name={currentSaved ? "edit" : "plus"} size={18} />
            {currentSaved ? "查看 / 编辑这篇复盘" : "开始写这篇复盘"}
          </button>
        </article>

        <section className="workbench-group" aria-label="历史复盘记录">
          <div className="section-heading">
            <h2>已存{TABS.find((t) => t.id === activeType)?.label}</h2>
            <span>{historyList.length} 篇</span>
          </div>

          {historyList.length === 0 ? (
            <article className="card card-pad">
              <p className="muted small">当前维度还没有保存过复盘。可以从上方选择今天或过去任意周期开始记录。</p>
            </article>
          ) : (
            <div className="stack">
              {historyList.map((entry) => {
                const moodObj = entry.mood ? MOOD_MAP[entry.mood] : null;
                return (
                  <button
                    type="button"
                    key={entry.key}
                    className="card review-history-card"
                    onClick={() => onOpenModal("review", { reviewType: activeType, periodKey: entry.key })}
                  >
                    <div className="review-history-top">
                      <strong>{formatPeriodLabel(activeType, entry.key)}</strong>
                      <div className="inline-actions">
                        {moodObj && <span className="pill">{moodObj.emoji} {moodObj.label}</span>}
                        <span className="pill sage">完成率 {entry.snapshot.completionRate}%</span>
                      </div>
                    </div>
                    <p className="muted small">{getSummaryLine(activeType, entry)}</p>
                    <span className="review-history-meta">快照固定于 {shortDate(entry.savedAt)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
