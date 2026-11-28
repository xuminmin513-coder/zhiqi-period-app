import { useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import { ModalFrame } from "./Modal.jsx";
import { MoodDistributionBar, WeeklyRateBars, YearlyTrendSvg } from "./ReviewCharts.jsx";
import { shortDate } from "../utils/date.js";
import {
  computeReviewSnapshot,
  CYCLE_PHASE_LABELS,
  formatPeriodLabel,
  getConversionTargetInfo,
  MOOD_OPTIONS
} from "../utils/review.js";

const TYPE_TITLES = {
  daily: "每日复盘",
  weekly: "每周复盘",
  monthly: "每月复盘",
  yearly: "年度复盘"
};

function CycleComparisonCard({ comparison }) {
  return (
    <div className="review-subcard cycle-insight-box">
      <strong>你的周期阶段记录对比</strong>
      <p className="muted small">仅汇总你本机的完成率与精力记录供排期参考，不做任何健康或医疗判断。</p>
      {!comparison?.sufficient ? (
        <p className="small" style={{ marginTop: 6 }}>数据还不够：积累满 2 个完整周期且两类阶段均有记录后，这里会展示对比。</p>
      ) : (
        <div className="button-row" style={{ marginTop: 8 }}>
          <div className="mini-stat">
            <span>经期中及前 3 天</span>
            <strong>
              {comparison.cycleDaysRate !== null ? `完成率 ${comparison.cycleDaysRate}%` : "无计划样本"}
              {comparison.cycleDaysEnergy !== null ? ` · 精力 ${comparison.cycleDaysEnergy}` : ""}
            </strong>
          </div>
          <div className="mini-stat">
            <span>其他日子</span>
            <strong>
              {comparison.otherDaysRate !== null ? `完成率 ${comparison.otherDaysRate}%` : "无计划样本"}
              {comparison.otherDaysEnergy !== null ? ` · 精力 ${comparison.otherDaysEnergy}` : ""}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewModal({
  state,
  payload,
  onClose,
  onSaveReview,
  onDeleteReview,
  onConvertReview
}) {
  const type = payload?.reviewType || "daily";
  const periodKey = payload?.periodKey;
  const saved = state.reviews?.[type]?.[periodKey] || null;

  const snapshot = useMemo(
    () => (saved ? saved.snapshot : computeReviewSnapshot(state, type, periodKey)),
    [saved, state, type, periodKey]
  );

  // Daily fields
  const [mood, setMood] = useState(saved?.mood ?? null);
  const [energy, setEnergy] = useState(saved?.energy ?? null);
  const [bestThing, setBestThing] = useState(saved?.bestThing || "");
  const [obstacle, setObstacle] = useState(saved?.obstacle || "");
  const [tomorrowFocus, setTomorrowFocus] = useState(saved?.tomorrowFocus || "");

  // Weekly fields
  const [wins, setWins] = useState(saved?.wins || "");
  const [improvements, setImprovements] = useState(saved?.improvements || "");
  const [p1, setP1] = useState(saved?.nextWeekPriorities?.[0] || "");
  const [p2, setP2] = useState(saved?.nextWeekPriorities?.[1] || "");
  const [p3, setP3] = useState(saved?.nextWeekPriorities?.[2] || "");

  // Monthly fields
  const [gain, setGain] = useState(saved?.gain || "");
  const [regret, setRegret] = useState(saved?.regret || "");
  const [nextMonthGoal, setNextMonthGoal] = useState(saved?.nextMonthGoal || "");

  // Yearly fields
  const [keywords, setKeywords] = useState(saved?.keywords || "");
  const [proudest, setProudest] = useState(saved?.proudest || "");
  const [nextYearVision, setNextYearVision] = useState(saved?.nextYearVision || "");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [convertError, setConvertError] = useState("");

  const isDirty = useMemo(() => {
    if (type === "daily") {
      return (
        mood !== (saved?.mood ?? null) ||
        energy !== (saved?.energy ?? null) ||
        bestThing.trim() !== (saved?.bestThing || "") ||
        obstacle.trim() !== (saved?.obstacle || "") ||
        tomorrowFocus.trim() !== (saved?.tomorrowFocus || "")
      );
    }
    if (type === "weekly") {
      const nextP = [p1, p2, p3].map((s) => s.trim()).filter(Boolean);
      const savedP = saved?.nextWeekPriorities || [];
      return (
        wins.trim() !== (saved?.wins || "") ||
        improvements.trim() !== (saved?.improvements || "") ||
        JSON.stringify(nextP) !== JSON.stringify(savedP)
      );
    }
    if (type === "monthly") {
      return (
        gain.trim() !== (saved?.gain || "") ||
        regret.trim() !== (saved?.regret || "") ||
        nextMonthGoal.trim() !== (saved?.nextMonthGoal || "")
      );
    }
    return (
      keywords.trim() !== (saved?.keywords || "") ||
      proudest.trim() !== (saved?.proudest || "") ||
      nextYearVision.trim() !== (saved?.nextYearVision || "")
    );
  }, [type, saved, mood, energy, bestThing, obstacle, tomorrowFocus, wins, improvements, p1, p2, p3, gain, regret, nextMonthGoal, keywords, proudest, nextYearVision]);

  function buildDraft() {
    if (type === "daily") return { mood, energy, bestThing, obstacle, tomorrowFocus };
    if (type === "weekly") return { wins, improvements, nextWeekPriorities: [p1, p2, p3].map((s) => s.trim()).filter(Boolean) };
    if (type === "monthly") return { gain, regret, nextMonthGoal };
    return { keywords, proudest, nextYearVision };
  }

  function handleRequestClose() {
    if (isDirty) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSaveReview(type, periodKey, buildDraft());
  }

  function handleConvertClick() {
    setConvertError("");
    const result = onConvertReview(type, periodKey, buildDraft());
    if (result && !result.ok && result.error) {
      setConvertError(result.error);
    }
  }

  const targetInfo = getConversionTargetInfo(type, periodKey);
  const showCycleInsight = Boolean(state.settings.reviewCycleInsight);

  const trimmedTomorrow = tomorrowFocus.trim();
  const isTomorrowLocked = Boolean(trimmedTomorrow && saved?.convertedTomorrow?.sourceText === trimmedTomorrow);

  const uniquePriorities = [...new Set([p1, p2, p3].map((s) => s.trim()).filter(Boolean))];
  const convertedPrioritySet = new Set((saved?.convertedPriorities || []).map((c) => c.text));
  const isWeeklyLocked = uniquePriorities.length > 0 && uniquePriorities.every((t) => convertedPrioritySet.has(t));

  const trimmedNextGoal = nextMonthGoal.trim();
  const isMonthlyLocked = Boolean(trimmedNextGoal && saved?.convertedGoal?.sourceText === trimmedNextGoal);

  if (confirmingDiscard) {
    return (
      <ModalFrame title="放弃未保存的复盘修改？" subtitle={formatPeriodLabel(type, periodKey)} onClose={() => setConfirmingDiscard(false)} disableBackdropClose>
        <div className="notice-box">你填写或修改的复盘内容尚未保存，现在关闭会丢失本次改动。</div>
        <div className="button-row" style={{ marginTop: 20 }}>
          <button type="button" className="secondary-button" onClick={() => setConfirmingDiscard(false)}>继续填写</button>
          <button type="button" className="danger-button" onClick={onClose}>放弃并关闭</button>
        </div>
      </ModalFrame>
    );
  }

  if (saved && confirmingDelete) {
    return (
      <ModalFrame title="确认删除这篇复盘？" subtitle={formatPeriodLabel(type, periodKey)} onClose={() => setConfirmingDelete(false)} disableBackdropClose>
        <div className="notice-box">删除复盘记录不可恢复，但不会影响你原有的计划事项、习惯打卡或经期记录。</div>
        <div className="button-row" style={{ marginTop: 20 }}>
          <button type="button" className="secondary-button" onClick={() => setConfirmingDelete(false)}>保留复盘</button>
          <button type="button" className="danger-button" onClick={() => onDeleteReview(type, periodKey)}>确认删除</button>
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      title={TYPE_TITLES[type]}
      subtitle={formatPeriodLabel(type, periodKey)}
      onClose={handleRequestClose}
      disableBackdropClose={isDirty}
    >
      <div className="review-snapshot-banner">
        <span className={`pill ${saved ? "sage" : ""}`}>
          <Icon name={saved ? "lock" : "info"} size={13} />
          {saved ? `统计快照已于 ${shortDate(saved.savedAt)} 冻结` : "实时统计预览 · 保存时冻结固定"}
        </span>
        {showCycleInsight && type === "daily" && (
          <span className="pill prediction">你的记录阶段：{CYCLE_PHASE_LABELS[snapshot.cyclePhase || "other"]}</span>
        )}
      </div>

      {/* 自动统计区 */}
      <div className="review-stats-panel">
        <div className="metric-grid">
          <div className="card metric-card">
            <strong>{snapshot.completionRate}<small>%</small></strong>
            <span>完成率</span>
          </div>
          <div className="card metric-card">
            <strong>{snapshot.doneCount}/{snapshot.plannedCount}</strong>
            <span>完成 / 计划</span>
          </div>
          {type === "daily" && (
            <div className="card metric-card">
              <strong>{snapshot.pendingTitles.length}</strong>
              <span>未完成项</span>
            </div>
          )}
          {type === "weekly" && (
            <div className="card metric-card">
              <strong>{snapshot.avgMood !== null ? snapshot.avgMood : "—"}</strong>
              <span>平均心情</span>
            </div>
          )}
          {type === "monthly" && (
            <div className="card metric-card">
              <strong>{snapshot.completedGoalsCount}</strong>
              <span>达成目标</span>
            </div>
          )}
          {type === "yearly" && (
            <div className="card metric-card">
              <strong>{snapshot.reviewedDaysCount}<small>天</small></strong>
              <span>全年日复盘</span>
            </div>
          )}
        </div>

        {type === "daily" && (snapshot.completedTitles.length > 0 || snapshot.pendingTitles.length > 0) && (
          <div className="card fold-card" style={{ marginTop: 10 }}>
            <button type="button" className="fold-header" onClick={() => setDetailsOpen((v) => !v)} aria-expanded={detailsOpen}>
              <span>当日完成 {snapshot.completedTitles.length} 项 · 未完成 {snapshot.pendingTitles.length} 项</span>
              <span className="fold-action">{detailsOpen ? "收起" : "明细 ›"}</span>
            </button>
            {detailsOpen && (
              <div className="fold-body review-detail-list">
                {snapshot.completedTitles.length > 0 && (
                  <p className="small"><strong>已完成：</strong>{snapshot.completedTitles.join("、")}</p>
                )}
                {snapshot.pendingTitles.length > 0 && (
                  <p className="small muted"><strong>未完成：</strong>{snapshot.pendingTitles.join("、")}</p>
                )}
              </div>
            )}
          </div>
        )}

        {type === "weekly" && (
          <div className="review-subcard">
            <div className="section-heading" style={{ marginBottom: 6 }}><h3>每日完成率</h3><span>周一至周日</span></div>
            <WeeklyRateBars dailyRates={snapshot.dailyRates} />
            {snapshot.habits.length > 0 && (
              <div className="review-mini-list">
                {snapshot.habits.map((h) => (
                  <div className="review-mini-row" key={h.id}>
                    <strong>{h.title}</strong>
                    <span>打卡 {h.done}/{h.scheduled}（{h.rate}%）· 连续 {h.streak} 次</span>
                  </div>
                ))}
              </div>
            )}
            {snapshot.goals.length > 0 && (
              <div className="review-mini-list">
                {snapshot.goals.map((g) => (
                  <div className="review-mini-row" key={g.id}>
                    <strong>目标：{g.title}</strong>
                    <span>{g.doneCount}/{g.totalCount}（{g.percent}%{g.deltaDone > 0 ? `，本周 +${g.deltaDone}` : ""}）</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {type === "monthly" && (
          <div className="review-subcard">
            <div className="section-heading" style={{ marginBottom: 8 }}><h3>月度分段与心情分布</h3><span>共 {snapshot.weeklyRates.length} 段</span></div>
            <div className="month-segments">
              {snapshot.weeklyRates.map((seg) => (
                <div className="month-seg-chip" key={seg.label}>
                  <span>{seg.label}</span>
                  <strong>{seg.planned ? `${seg.rate}%` : "—"}</strong>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <MoodDistributionBar distribution={snapshot.moodDistribution} />
            </div>
            {snapshot.highlights.length > 0 && (
              <div className="review-highlights">
                <strong>本月每日「最满意的一件事」摘录（{snapshot.highlights.length} 条）</strong>
                <ul>
                  {snapshot.highlights.slice(0, 8).map((item) => (
                    <li key={item.date}><span>{shortDate(item.date)}</span>{item.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {type === "yearly" && (
          <div className="review-subcard">
            <div className="section-heading" style={{ marginBottom: 6 }}>
              <h3>12 个月完成率曲线</h3>
              <span>{snapshot.longestStreak ? `最长连续：${snapshot.longestStreak.title} ${snapshot.longestStreak.days} 次` : "暂无习惯连续记录"}</span>
            </div>
            <YearlyTrendSvg monthlyRates={snapshot.monthlyRates} />
            {snapshot.completedGoalTitles.length > 0 && (
              <p className="small" style={{ marginTop: 8 }}>
                <strong>全年完成目标（{snapshot.completedGoalTitles.length}）：</strong>
                {snapshot.completedGoalTitles.join("、")}
              </p>
            )}
            {snapshot.highlights.length > 0 && (
              <div className="review-highlights">
                <strong>每月「最大收获」汇总</strong>
                <ul>
                  {snapshot.highlights.map((item) => (
                    <li key={item.month}><span>{item.month.slice(5)}月</span>{item.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {showCycleInsight && (type === "monthly" || type === "yearly") && (
          <CycleComparisonCard comparison={snapshot.cycleComparison} />
        )}
      </div>

      {/* 用户填写表单 */}
      <form className="sheet-form" style={{ marginTop: 16 }} onSubmit={handleSubmit}>
        {type === "daily" && (
          <>
            <div className="form-group">
              <span className="form-label">今天的心情（可选）</span>
              <div className="score-picker" role="group" aria-label="选择心情">
                {MOOD_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    className={`score-chip ${mood === opt.value ? "active" : ""}`}
                    onClick={() => setMood(mood === opt.value ? null : opt.value)}
                    aria-pressed={mood === opt.value}
                  >
                    <span className="score-emoji">{opt.emoji}</span>
                    <small>{opt.label}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <span className="form-label">今天的精力（1 最低 ～ 5 充沛，可选）</span>
              <div className="score-picker" role="group" aria-label="选择精力分值">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    className={`score-chip ${energy === val ? "active" : ""}`}
                    onClick={() => setEnergy(energy === val ? null : val)}
                    aria-pressed={energy === val}
                  >
                    <strong>{val}</strong>
                    <small>分</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="rev-best">今天最满意的一件事</label>
              <textarea className="textarea" id="rev-best" maxLength={500} placeholder="哪怕很小的一步也值得记下来" value={bestThing} onChange={(e) => setBestThing(e.target.value)} />
            </div>

            <div className="form-group">
              <label htmlFor="rev-obstacle">遇到了什么困难或卡点</label>
              <textarea className="textarea" id="rev-obstacle" maxLength={500} placeholder="是什么消耗了精力，下次怎样调整" value={obstacle} onChange={(e) => setObstacle(e.target.value)} />
            </div>

            <div className="form-group">
              <label htmlFor="rev-tomorrow">明天最重要的一件事</label>
              <textarea className="textarea" id="rev-tomorrow" maxLength={500} placeholder="写下后可一键生成次日待办" value={tomorrowFocus} onChange={(e) => { setTomorrowFocus(e.target.value); setConvertError(""); }} />
              {trimmedTomorrow && targetInfo && (
                <button
                  type="button"
                  className={`soft-button compact-button ${isTomorrowLocked ? "converted-lock" : ""}`}
                  disabled={isTomorrowLocked}
                  onClick={handleConvertClick}
                >
                  <Icon name={isTomorrowLocked ? "check" : "plus"} size={15} />
                  {isTomorrowLocked ? targetInfo.doneLabel : targetInfo.buttonLabel}
                </button>
              )}
            </div>
          </>
        )}

        {type === "weekly" && (
          <>
            <div className="form-group">
              <label htmlFor="rev-wins">这周做得好的是什么</label>
              <textarea className="textarea" id="rev-wins" maxLength={500} placeholder="总结本周有效的方法与进步" value={wins} onChange={(e) => setWins(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="rev-improve">下周需要改进或减少的事</label>
              <textarea className="textarea" id="rev-improve" maxLength={500} placeholder="给下周做一点减法" value={improvements} onChange={(e) => setImprovements(e.target.value)} />
            </div>
            <div className="form-group">
              <span className="form-label">下周重点（最多 3 条，每条 ≤ 60 字）</span>
              <input className="input" id="rev-p1" type="text" maxLength={60} placeholder="重点 1" value={p1} onChange={(e) => { setP1(e.target.value); setConvertError(""); }} />
              <input className="input" id="rev-p2" type="text" maxLength={60} placeholder="重点 2（可选）" value={p2} onChange={(e) => { setP2(e.target.value); setConvertError(""); }} />
              <input className="input" id="rev-p3" type="text" maxLength={60} placeholder="重点 3（可选）" value={p3} onChange={(e) => { setP3(e.target.value); setConvertError(""); }} />
              {uniquePriorities.length > 0 && targetInfo && (
                <button
                  type="button"
                  className={`soft-button compact-button ${isWeeklyLocked ? "converted-lock" : ""}`}
                  disabled={isWeeklyLocked}
                  onClick={handleConvertClick}
                >
                  <Icon name={isWeeklyLocked ? "check" : "plus"} size={15} />
                  {isWeeklyLocked ? targetInfo.doneLabel : targetInfo.buttonLabel}
                </button>
              )}
            </div>
          </>
        )}

        {type === "monthly" && (
          <>
            <div className="form-group">
              <label htmlFor="rev-gain">本月最大收获</label>
              <textarea className="textarea" id="rev-gain" maxLength={500} placeholder="这句话也会在年底自动汇总进年度复盘" value={gain} onChange={(e) => setGain(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="rev-regret">本月遗憾或未尽之事</label>
              <textarea className="textarea" id="rev-regret" maxLength={500} placeholder="坦诚记录，不必苛责自己" value={regret} onChange={(e) => setRegret(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="rev-next-goal">下月核心目标</label>
              <textarea className="textarea" id="rev-next-goal" maxLength={500} placeholder="写下后可一键转为下月长期目标" value={nextMonthGoal} onChange={(e) => { setNextMonthGoal(e.target.value); setConvertError(""); }} />
              {trimmedNextGoal && targetInfo && (
                <button
                  type="button"
                  className={`soft-button compact-button ${isMonthlyLocked ? "converted-lock" : ""}`}
                  disabled={isMonthlyLocked}
                  onClick={handleConvertClick}
                >
                  <Icon name={isMonthlyLocked ? "check" : "target"} size={15} />
                  {isMonthlyLocked ? targetInfo.doneLabel : targetInfo.buttonLabel}
                </button>
              )}
            </div>
          </>
        )}

        {type === "yearly" && (
          <>
            <div className="form-group">
              <label htmlFor="rev-keywords">年度关键词（最多 100 字）</label>
              <input className="input" id="rev-keywords" type="text" maxLength={100} placeholder="例如：舒展 · 专注 · 自洽" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="rev-proudest">今年最骄傲的事</label>
              <textarea className="textarea" id="rev-proudest" maxLength={500} placeholder="回顾这一年跨越的时刻" value={proudest} onChange={(e) => setProudest(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="rev-vision">明年想成为什么样的人</label>
              <textarea className="textarea" id="rev-vision" maxLength={500} placeholder="写给下一年的自己" value={nextYearVision} onChange={(e) => setNextYearVision(e.target.value)} />
            </div>
          </>
        )}

        {convertError && <div className="notice-box field-error" role="alert">{convertError}</div>}

        {saved ? (
          <div className="button-row">
            <button type="button" className="danger-button" onClick={() => setConfirmingDelete(true)}><Icon name="trash" size={17} />删除复盘</button>
            <button type="submit" className="primary-button">保存修改</button>
          </div>
        ) : (
          <button type="submit" className="primary-button full-width">保存并冻结统计快照</button>
        )}
      </form>
    </ModalFrame>
  );
}
