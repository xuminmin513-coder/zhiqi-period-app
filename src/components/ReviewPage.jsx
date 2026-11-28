import Icon from "./Icon.jsx";
import { PageHeader } from "./Home.jsx";
import { getToday, toISO } from "../utils/date.js";
import { getTodayBuckets } from "../utils/planner.js";

export default function ReviewPage({ state, onNavigate }) {
  const todayISO = toISO(getToday());
  const buckets = getTodayBuckets(state.planner, todayISO);
  const activeGoals = state.planner.goals.filter((goal) => goal.status === "active").length;

  return (
    <section className="page" aria-label="复盘">
      <PageHeader title="复盘" subtitle="日、周、月、年复盘将在下一阶段接入" />
      <div className="stack">
        <article className="card card-pad">
          <span className="pill sage"><Icon name="book" size={14} />数据正在自动积累</span>
          <h2 style={{ marginTop: 14 }}>你的日常完成记录已就绪</h2>
          <p className="muted small" style={{ marginTop: 8 }}>
            当前你在「今天」与「计划」中记录的每一次待办完成、习惯打卡和目标进展都已保存在本机。第二期上线后，这里会自动汇总生成每日、每周、每月与年度复盘。
          </p>
          <div className="metric-grid" style={{ marginTop: 16 }}>
            <div className="card metric-card"><strong>{buckets.doneToday}/{buckets.totalToday}</strong><span>今日已完成</span></div>
            <div className="card metric-card"><strong>{activeGoals}</strong><span>进行中目标</span></div>
            <div className="card metric-card"><strong>{Object.keys(state.planner.completions).length}</strong><span>累计打卡天</span></div>
          </div>
          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="soft-button" onClick={() => onNavigate("home")}>回到今天</button>
            <button className="secondary-button" onClick={() => onNavigate("plan")}>管理计划</button>
          </div>
        </article>
      </div>
    </section>
  );
}
