import { useState } from "react";
import Icon from "./Icon.jsx";
import { PageHeader } from "./Home.jsx";
import { getToday, shortDate, toISO } from "../utils/date.js";
import {
  formatRepeatLabel,
  getGoalProgress,
  getHabitGrid,
  getHabitStreak,
  getUpcomingGroups,
  isItemDoneOnDate,
  occursOnDate
} from "../utils/planner.js";

const STATUS_LABELS = { active: "进行中", done: "已完成", archived: "已归档" };

export default function PlanPage({
  state,
  onOpenModal,
  onToggleItem,
  onUpdateGoalStatus
}) {
  const [segment, setSegment] = useState("goals");
  const [showArchived, setShowArchived] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const todayISO = toISO(getToday());

  const habits = state.planner.items.filter((item) => item.repeat && item.repeat.type !== "none");
  const groups = getUpcomingGroups(state.planner, todayISO, 14);
  const visibleGoals = state.planner.goals.filter((goal) => showArchived || goal.status !== "archived");
  const archivedCount = state.planner.goals.filter((goal) => goal.status === "archived").length;

  function handleHeaderCreate() {
    if (segment === "goals") onOpenModal("goal", {});
    else if (segment === "habits") onOpenModal("item", { defaultDate: todayISO, defaultRepeat: "daily" });
    else onOpenModal("item", { defaultDate: todayISO });
  }

  return (
    <section className="page workbench-page" aria-label="计划">
      <PageHeader title="计划" subtitle="长期目标、日常习惯与全部事项">
        <button className="header-action" onClick={handleHeaderCreate} aria-label={segment === "goals" ? "新建目标" : "新建事项"}><Icon name="plus" /></button>
      </PageHeader>

      <div className="segmented-control three-way" role="tablist" aria-label="计划分类">
        <button type="button" role="tab" aria-selected={segment === "goals"} className={`segment-button ${segment === "goals" ? "active" : ""}`} onClick={() => setSegment("goals")}>目标</button>
        <button type="button" role="tab" aria-selected={segment === "habits"} className={`segment-button ${segment === "habits" ? "active" : ""}`} onClick={() => setSegment("habits")}>习惯</button>
        <button type="button" role="tab" aria-selected={segment === "all"} className={`segment-button ${segment === "all" ? "active" : ""}`} onClick={() => setSegment("all")}>全部事项</button>
      </div>

      {segment === "goals" && (
        <div className="stack">
          {visibleGoals.length === 0 ? (
            <article className="card card-pad empty-workbench">
              <span className="pill"><Icon name="target" size={14} />长期目标</span>
              <h2>还没有设定长期目标</h2>
              <p className="muted small">把未来几个月想达成的事拆成小步骤，按自己的节奏推进。</p>
              <button className="primary-button" onClick={() => onOpenModal("goal", {})}><Icon name="plus" size={18} />创建第一个目标</button>
            </article>
          ) : (
            visibleGoals.map((goal) => {
              const progress = getGoalProgress(state.planner, goal.id);
              return (
                <article className="card card-pad goal-card" key={goal.id}>
                  <div className="goal-header">
                    <div>
                      <span className={`pill ${goal.status === "done" ? "sage" : ""}`}>{STATUS_LABELS[goal.status]}</span>
                      <h3>{goal.title}</h3>
                      {goal.deadline && <p className="muted small">截止：{shortDate(goal.deadline)}</p>}
                    </div>
                    <button className="icon-button" onClick={() => onOpenModal("goal", { goal })} aria-label={`编辑目标 ${goal.title}`}><Icon name="edit" size={18} /></button>
                  </div>

                  <div className="goal-progress-meta">
                    <span>{progress.hasSteps ? `步骤进度 ${progress.doneCount} / ${progress.totalCount}` : "还没有步骤"}</span>
                    {progress.hasSteps && <strong>{progress.percent}%</strong>}
                  </div>
                  {progress.hasSteps && (
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
                    </div>
                  )}

                  {progress.steps.length > 0 && (
                    <div className="goal-steps">
                      {progress.steps.map((step) => (
                        <div className={`task-row compact ${step.doneAt ? "done" : ""}`} key={step.id}>
                          <button className={`check-circle ${step.doneAt ? "checked" : ""}`} onClick={() => onToggleItem(step.id, todayISO)} aria-label={`${step.doneAt ? "取消完成" : "完成"} ${step.title}`}><Icon name="check" size={13} /></button>
                          <button className="task-body" onClick={() => onOpenModal("item", { item: step })}>
                            <strong>{step.title}</strong>
                            {step.date && <span>{shortDate(step.date)}</span>}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {progress.habits.length > 0 && (
                    <div className="goal-habits muted small">
                      关联习惯（不计入步骤百分比）：{progress.habits.map((h) => h.title).join("、")}
                    </div>
                  )}

                  <div className="inline-actions" style={{ marginTop: 12 }}>
                    <button className="soft-button compact-button" onClick={() => onOpenModal("item", { defaultGoalId: goal.id, defaultDate: todayISO })}><Icon name="plus" size={15} />添加步骤</button>
                    {goal.status === "active" && <button className="text-button" onClick={() => onUpdateGoalStatus(goal.id, "done")}>标记完成</button>}
                    {goal.status === "done" && <button className="text-button" onClick={() => onUpdateGoalStatus(goal.id, "archived")}>归档</button>}
                    {goal.status === "archived" && <button className="text-button" onClick={() => onUpdateGoalStatus(goal.id, "active")}>恢复进行</button>}
                  </div>
                </article>
              );
            })
          )}

          {archivedCount > 0 && (
            <button className="text-button" onClick={() => setShowArchived((value) => !value)}>
              {showArchived ? "隐藏已归档目标" : `查看已归档目标（${archivedCount}）`}
            </button>
          )}
        </div>
      )}

      {segment === "habits" && (
        <div className="stack">
          {habits.length === 0 ? (
            <article className="card card-pad empty-workbench">
              <span className="pill"><Icon name="repeat" size={14} />固定习惯</span>
              <h2>还没有固定习惯</h2>
              <p className="muted small">支持每天、每周指定星期或每月固定日期，自动统计连续打卡次数。</p>
              <button className="primary-button" onClick={() => onOpenModal("item", { defaultDate: todayISO, defaultRepeat: "daily" })}><Icon name="plus" size={18} />添加第一个习惯</button>
            </article>
          ) : (
            habits.map((habit) => {
              const streak = getHabitStreak(state.planner, habit, todayISO);
              const grid = getHabitGrid(state.planner, habit, todayISO, 5);
              const scheduledToday = occursOnDate(habit, todayISO);
              const doneToday = isItemDoneOnDate(state.planner, habit, todayISO);
              return (
                <article className="card card-pad habit-card" key={habit.id}>
                  <div className="goal-header">
                    <div>
                      <span className="streak-pill">{streak > 0 ? `已连续 ${streak} 次` : "等待打卡"}</span>
                      <h3 style={{ marginTop: 6 }}>{habit.title}</h3>
                      <p className="muted small">{formatRepeatLabel(habit.repeat)}{habit.startTime ? ` · ${habit.startTime}` : ""}</p>
                    </div>
                    <div className="inline-actions">
                      {scheduledToday && (
                        <button className={`chip-action ${doneToday ? "done" : ""}`} onClick={() => onToggleItem(habit.id, todayISO)}>
                          {doneToday ? "今日已打卡" : "今日打卡"}
                        </button>
                      )}
                      <button className="icon-button" onClick={() => onOpenModal("item", { item: habit })} aria-label={`编辑习惯 ${habit.title}`}><Icon name="edit" size={18} /></button>
                    </div>
                  </div>
                  <div className="habit-weekdays">{["一", "二", "三", "四", "五", "六", "日"].map((d) => <span key={d}>{d}</span>)}</div>
                  <div className="habit-grid" aria-label={`${habit.title} 近 5 周打卡记录`}>
                    {grid.map((cell) => (
                      <span
                        key={cell.dateISO}
                        className={[
                          "habit-cell",
                          cell.done ? "done" : "",
                          cell.scheduled && !cell.isFuture && !cell.done ? "scheduled" : "",
                          cell.isToday ? "today" : "",
                          cell.isFuture ? "future" : ""
                        ].filter(Boolean).join(" ")}
                        title={cell.dateISO}
                      >
                        {cell.dayNumber}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {segment === "all" && (
        <div className="stack">
          <section className="workbench-group">
            <div className="section-heading">
              <h2>未安排</h2>
              <button className="text-button" onClick={() => onOpenModal("item", { defaultDate: "" })}>+ 记个想法</button>
            </div>
            {groups.unscheduled.length === 0 ? (
              <article className="card card-pad"><p className="muted small">还没有未定日期的想法或待办。</p></article>
            ) : (
              <div className="card list-card">
                {groups.unscheduled.map((item) => (
                  <div className="task-row" key={item.id}>
                    <button className="check-circle" onClick={() => onToggleItem(item.id, todayISO)} aria-label={`完成 ${item.title}`}><Icon name="check" size={14} /></button>
                    <button className="task-body" onClick={() => onOpenModal("item", { item })}>
                      <strong>{item.title}</strong>
                      {item.note && <span>{item.note}</span>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="workbench-group">
            <div className="section-heading"><h2>接下来 14 天</h2><span>按日期分组</span></div>
            {groups.upcoming.length === 0 ? (
              <article className="card card-pad"><p className="muted small">未来 14 天暂无单次待办或日程。</p></article>
            ) : (
              groups.upcoming.map((group) => (
                <div className="card list-card" key={group.dateISO} style={{ marginBottom: 10 }}>
                  <div className="date-group-header">{group.dateISO === todayISO ? `今天 · ${shortDate(group.dateISO)}` : shortDate(group.dateISO)}</div>
                  {group.items.map((item) => (
                    <div className="task-row" key={item.id}>
                      <button className="check-circle" onClick={() => onToggleItem(item.id, todayISO)} aria-label={`完成 ${item.title}`}><Icon name="check" size={14} /></button>
                      {item.startTime && <span className="time-badge">{item.startTime}</span>}
                      <button className="task-body" onClick={() => onOpenModal("item", { item })}>
                        <strong>{item.title}</strong>
                        {item.note && <span>{item.note}</span>}
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </section>

          {groups.later.length > 0 && (
            <section className="workbench-group">
              <div className="section-heading"><h2>更远日程</h2><span>14 天之后</span></div>
              <div className="card list-card">
                {groups.later.map((item) => (
                  <div className="task-row" key={item.id}>
                    <button className="check-circle" onClick={() => onToggleItem(item.id, todayISO)} aria-label={`完成 ${item.title}`}><Icon name="check" size={14} /></button>
                    <button className="task-body" onClick={() => onOpenModal("item", { item })}>
                      <strong>{item.title}</strong>
                      <span>{shortDate(item.date)}{item.startTime ? ` · ${item.startTime}` : ""}</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {groups.completed.length > 0 && (
            <article className="card fold-card">
              <button className="fold-header" onClick={() => setCompletedOpen((open) => !open)} aria-expanded={completedOpen}>
                <span>已完成单次事项（{groups.completed.length}）</span>
                <span className="fold-action">{completedOpen ? "收起" : "展开 ›"}</span>
              </button>
              {completedOpen && (
                <div className="fold-body">
                  {groups.completed.map((item) => (
                    <div className="task-row done" key={item.id}>
                      <button className="check-circle checked" onClick={() => onToggleItem(item.id, todayISO)} aria-label={`取消完成 ${item.title}`}><Icon name="check" size={14} /></button>
                      <button className="task-body" onClick={() => onOpenModal("item", { item })}>
                        <strong>{item.title}</strong>
                        <span>完成于 {shortDate(item.doneAt)}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}
        </div>
      )}

      <button className="fab-button" onClick={handleHeaderCreate} aria-label={segment === "goals" ? "新建目标" : "新建事项"}>
        <Icon name="plus" size={24} />
      </button>
    </section>
  );
}
