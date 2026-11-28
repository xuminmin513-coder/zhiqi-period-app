import { useState } from "react";
import Icon from "./Icon.jsx";
import { diffDays, getToday, shortDate, toISO } from "../utils/date.js";
import { getPrediction } from "../utils/period.js";
import { formatRepeatLabel, getGreeting, getTodayBuckets } from "../utils/planner.js";

export function PageHeader({ title, subtitle, children }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div>{children}</header>;
}

const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default function Home({
  state,
  onOpenModal,
  onNavigate,
  onToggleItem,
  onMoveOverdue,
  onMoveAllOverdue
}) {
  const [overdueOpen, setOverdueOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  const now = new Date();
  const today = getToday();
  const todayISO = toISO(today);
  const greeting = getGreeting(now.getHours(), state.settings.nickname);
  const dateSubtitle = `${today.getMonth() + 1}月${today.getDate()}日 ${WEEKDAY_NAMES[today.getDay()]} · 属于你的私密工作台`;

  const buckets = getTodayBuckets(state.planner, todayISO);
  const goalsMap = new Map(state.planner.goals.map((goal) => [goal.id, goal.title]));

  const prediction = getPrediction(state);
  const cycleDay = Math.max(1, diffDays(todayISO, state.lastPeriodStart) + 1);
  const inPeriod = cycleDay >= 1 && cycleDay <= state.periodLength;
  const cycleSummary = inPeriod
    ? `经期第 ${cycleDay} 天 · 预计下次 ${shortDate(prediction.start)}—${shortDate(prediction.end)}`
    : `周期第 ${cycleDay} 天 · 下次约 ${shortDate(prediction.start)}—${shortDate(prediction.end)}`;

  return (
    <section className="page workbench-page" aria-label="今天">
      <PageHeader title={greeting} subtitle={dateSubtitle}>
        <button className="header-action" onClick={() => onOpenModal("daily", todayISO)} aria-label="记录今日身体感受"><Icon name="heart" /></button>
      </PageHeader>

      <div className="stack">
        {buckets.totalToday > 0 && (
          <article className="card progress-card">
            <div className="progress-top">
              <div>
                <strong>今日进度 {buckets.doneToday} / {buckets.totalToday}</strong>
                <span>{buckets.doneToday === buckets.totalToday ? "今天的安排已全部完成" : `还有 ${buckets.totalToday - buckets.doneToday} 件事待完成`}</span>
              </div>
              <span className="pill sage">{buckets.percentToday}%</span>
            </div>
            <div className="progress-track" role="progressbar" aria-valuenow={buckets.percentToday} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-fill" style={{ width: `${buckets.percentToday}%` }} />
            </div>
          </article>
        )}

        {buckets.schedule.length > 0 && (
          <section className="workbench-group" aria-label="今日日程">
            <div className="section-heading"><h2>今日日程</h2><span>按时间排序</span></div>
            <div className="card list-card">
              {buckets.schedule.map((item) => (
                <div className="task-row timeline-row" key={item.id}>
                  <button className="check-circle" onClick={() => onToggleItem(item.id, todayISO)} aria-label={`完成 ${item.title}`}><Icon name="check" size={14} /></button>
                  <span className="time-badge">{item.startTime}{item.endTime ? `–${item.endTime}` : ""}</span>
                  <button className="task-body" onClick={() => onOpenModal("item", { item })}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.isHabit ? `${formatRepeatLabel(item.repeat)}${item.streak ? ` · 已连续 ${item.streak} 次` : ""}` : ""}
                      {item.goalId && goalsMap.has(item.goalId) ? `${item.isHabit ? " · " : ""}${goalsMap.get(item.goalId)}` : ""}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {buckets.overdue.length > 0 && (
          <article className="card fold-card warning-border">
            <button className="fold-header" onClick={() => setOverdueOpen((open) => !open)} aria-expanded={overdueOpen}>
              <span className="pill warning">{buckets.overdue.length} 件已过期</span>
              <span className="fold-action">{overdueOpen ? "收起" : "查看 ›"}</span>
            </button>
            {overdueOpen && (
              <div className="fold-body">
                {buckets.overdue.length > 1 && (
                  <div className="fold-toolbar">
                    <span className="muted small">过期事项不会自动挪动，由你决定何时处理</span>
                    <button className="text-button" onClick={() => onMoveAllOverdue(todayISO)}>全部移到今天</button>
                  </div>
                )}
                {buckets.overdue.map((item) => (
                  <div className="task-row" key={item.id}>
                    <button className="check-circle" onClick={() => onToggleItem(item.id, todayISO)} aria-label={`完成 ${item.title}`}><Icon name="check" size={14} /></button>
                    <button className="task-body" onClick={() => onOpenModal("item", { item })}>
                      <strong>{item.title}</strong>
                      <span>原定 {shortDate(item.date)}</span>
                    </button>
                    <button className="chip-action" onClick={() => onMoveOverdue(item.id, todayISO)}>移到今天</button>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {buckets.todos.length > 0 && (
          <section className="workbench-group" aria-label="今日待办">
            <div className="section-heading"><h2>今日待办</h2><span>{buckets.todos.length} 项</span></div>
            <div className="card list-card">
              {buckets.todos.map((item) => (
                <div className="task-row" key={item.id}>
                  <button className="check-circle" onClick={() => onToggleItem(item.id, todayISO)} aria-label={`完成 ${item.title}`}><Icon name="check" size={14} /></button>
                  <button className="task-body" onClick={() => onOpenModal("item", { item })}>
                    <strong>{item.title}</strong>
                    {(item.goalId && goalsMap.has(item.goalId)) ? <span>目标：{goalsMap.get(item.goalId)}</span> : item.note ? <span>{item.note}</span> : null}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {buckets.habits.length > 0 && (
          <section className="workbench-group" aria-label="习惯打卡">
            <div className="section-heading"><h2>习惯打卡</h2><span>点一下完成今日打卡</span></div>
            <div className="card list-card">
              {buckets.habits.map((item) => (
                <div className="task-row" key={item.id}>
                  <button className="check-circle" onClick={() => onToggleItem(item.id, todayISO)} aria-label={`打卡 ${item.title}`}><Icon name="check" size={14} /></button>
                  <button className="task-body" onClick={() => onOpenModal("item", { item })}>
                    <strong>{item.title}</strong>
                    <span>{formatRepeatLabel(item.repeat)}{item.startTime ? ` · ${item.startTime}` : ""}</span>
                  </button>
                  <span className="streak-pill">{item.streak > 0 ? `连续 ${item.streak} 次` : "开始打卡"}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {buckets.completedToday.length > 0 && (
          <article className="card fold-card">
            <button className="fold-header" onClick={() => setCompletedOpen((open) => !open)} aria-expanded={completedOpen}>
              <span>已完成 {buckets.completedToday.length} 件</span>
              <span className="fold-action">{completedOpen ? "收起" : "展开 ›"}</span>
            </button>
            {completedOpen && (
              <div className="fold-body">
                {buckets.completedToday.map((item) => (
                  <div className="task-row done" key={item.id}>
                    <button className="check-circle checked" onClick={() => onToggleItem(item.id, todayISO)} aria-label={`取消完成 ${item.title}`}><Icon name="check" size={14} /></button>
                    <button className="task-body" onClick={() => onOpenModal("item", { item })}>
                      <strong>{item.title}</strong>
                      {item.startTime && <span>{item.startTime}</span>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {buckets.showEmpty && (
          <article className="card card-pad empty-workbench">
            <span className="pill"><Icon name="list" size={14} />轻松开始</span>
            <h2>今天还没有安排</h2>
            <p className="muted small">可以记一件今天想完成的小事、排一个时间日程，或者建立每天坚持的习惯。</p>
            <button className="primary-button" onClick={() => onOpenModal("item", { defaultDate: todayISO })}><Icon name="plus" size={18} />添加第一件事</button>
          </article>
        )}

        <button className="card cycle-mini-strip" onClick={() => onNavigate("cycle")}>
          <span className="cycle-mini-dot"><Icon name="drop" size={18} /></span>
          <span className="today-strip-content">
            <strong>{cycleSummary}</strong>
            <span>点击查看经期日历、记录经期或身体感受</span>
          </span>
          <Icon name="chevron" size={17} />
        </button>
      </div>

      <button className="fab-button" onClick={() => onOpenModal("item", { defaultDate: todayISO })} aria-label="快速新建事项">
        <Icon name="plus" size={24} />
      </button>
    </section>
  );
}
