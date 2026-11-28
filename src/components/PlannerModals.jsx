import { useState } from "react";
import Icon from "./Icon.jsx";
import { ModalFrame } from "./Modal.jsx";
import { fromISO, getToday, toISO } from "../utils/date.js";
import { getIsoWeekday } from "../utils/planner.js";

const WEEKDAY_LABELS = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 7, label: "周日" }
];

export function ItemModal({ state, payload, onClose, onSave, onDelete }) {
  const todayISO = toISO(getToday());
  const editing = payload?.item || null;
  const initialDate = editing ? (editing.date || "") : (payload?.defaultDate ?? todayISO);
  const initialRepeatType = editing ? editing.repeat.type : (payload?.defaultRepeat || "none");

  const [title, setTitle] = useState(editing?.title || "");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(editing?.startTime || "");
  const [endTime, setEndTime] = useState(editing?.endTime || "");
  const [repeatType, setRepeatType] = useState(initialRepeatType);
  const [weekdays, setWeekdays] = useState(() => {
    if (editing?.repeat?.type === "weekly") return editing.repeat.weekdays;
    return [getIsoWeekday(initialDate || todayISO)];
  });
  const [monthDay, setMonthDay] = useState(() => {
    if (editing?.repeat?.type === "monthly") return editing.repeat.day;
    return initialDate ? fromISO(initialDate).getDate() : getToday().getDate();
  });
  const [repeatEnd, setRepeatEnd] = useState(editing?.repeatEnd || "");
  const [goalId, setGoalId] = useState(editing ? (editing.goalId || "") : (payload?.defaultGoalId || ""));
  const [note, setNote] = useState(editing?.note || "");
  const [errors, setErrors] = useState({});

  const activeGoals = state.planner.goals.filter((goal) => goal.status !== "archived" || goal.id === goalId);

  function toggleWeekday(day) {
    setWeekdays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b)));
  }

  function handleRepeatChange(nextType) {
    setRepeatType(nextType);
    if (nextType !== "none" && !date) setDate(todayISO);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    const trimmed = title.trim();
    if (!trimmed) nextErrors.title = "请填写事项标题";
    else if (trimmed.length > 60) nextErrors.title = "标题不能超过 60 字";

    if (repeatType !== "none" && !date) nextErrors.date = "重复习惯需要指定起始日期";
    if (endTime && !startTime) nextErrors.time = "填写结束时间前请先选择开始时间";
    else if (startTime && endTime && endTime <= startTime) nextErrors.time = "结束时间必须晚于开始时间";

    if (repeatType === "weekly" && weekdays.length === 0) nextErrors.repeat = "请至少选择每周重复的一天";
    if (repeatType === "monthly" && (!Number.isInteger(Number(monthDay)) || Number(monthDay) < 1 || Number(monthDay) > 31)) {
      nextErrors.repeat = "每月日期需在 1 到 31 日之间";
    }
    if (repeatType !== "none" && repeatEnd && date && repeatEnd < date) {
      nextErrors.repeatEnd = "重复结束日期不能早于起始日期";
    }
    if (note.length > 300) nextErrors.note = "备注不能超过 300 字";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const repeat =
      repeatType === "daily"
        ? { type: "daily" }
        : repeatType === "weekly"
          ? { type: "weekly", weekdays }
          : repeatType === "monthly"
            ? { type: "monthly", day: Number(monthDay) }
            : { type: "none" };

    onSave({
      id: editing?.id || null,
      title: trimmed,
      date: date || null,
      startTime: startTime || null,
      endTime: startTime && endTime ? endTime : null,
      repeat,
      repeatEnd: repeatType !== "none" && repeatEnd ? repeatEnd : null,
      goalId: goalId || null,
      note
    });
  }

  return (
    <ModalFrame title={editing ? "编辑事项" : "新建事项"} subtitle="填时间成为日程，设重复成为习惯" onClose={onClose}>
      <form className="sheet-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="item-title">标题 *</label>
          <input className="input" id="item-title" type="text" maxLength={60} placeholder="例如：交周报 / 20:00 护肤 / 每天喝水" value={title} onChange={(event) => setTitle(event.target.value)} />
          {errors.title && <small className="field-error">{errors.title}</small>}
        </div>

        <div className="form-group">
          <label htmlFor="item-date">{repeatType === "none" ? "日期（留空则放入「未安排」）" : "起始日期 *"}</label>
          <div className="inline-field">
            <input className="input" id="item-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            {repeatType === "none" && date && <button type="button" className="text-button" onClick={() => setDate("")}>清除日期</button>}
          </div>
          {errors.date && <small className="field-error">{errors.date}</small>}
        </div>

        <div className="form-group">
          <span className="form-label">时间（可选，填写后显示在日程时间线）</span>
          <div className="button-row">
            <div>
              <label className="small muted" htmlFor="item-start">开始时间</label>
              <input className="input" id="item-start" type="time" value={startTime} onChange={(event) => { setStartTime(event.target.value); if (!event.target.value) setEndTime(""); }} />
            </div>
            <div>
              <label className="small muted" htmlFor="item-end">结束时间</label>
              <input className="input" id="item-end" type="time" value={endTime} disabled={!startTime} onChange={(event) => setEndTime(event.target.value)} />
            </div>
          </div>
          {errors.time && <small className="field-error">{errors.time}</small>}
        </div>

        <div className="form-group">
          <label htmlFor="item-repeat">重复方式</label>
          <select className="select" id="item-repeat" value={repeatType} onChange={(event) => handleRepeatChange(event.target.value)}>
            <option value="none">不重复（单次事项）</option>
            <option value="daily">每天重复（固定习惯）</option>
            <option value="weekly">每周指定星期（固定习惯）</option>
            <option value="monthly">每月指定日期（固定习惯）</option>
          </select>
          {repeatType === "weekly" && (
            <div className="choice-grid" style={{ marginTop: 6 }}>
              {WEEKDAY_LABELS.map((day) => (
                <span key={day.value}>
                  <input className="choice-input" type="checkbox" id={`weekday-${day.value}`} checked={weekdays.includes(day.value)} onChange={() => toggleWeekday(day.value)} />
                  <label className="choice-chip" htmlFor={`weekday-${day.value}`}>{day.label}</label>
                </span>
              ))}
            </div>
          )}
          {repeatType === "monthly" && (
            <div style={{ marginTop: 6 }}>
              <label className="small muted" htmlFor="item-month-day">每月几号（无该日时自动取当月最后一天）</label>
              <input className="input" id="item-month-day" type="number" min={1} max={31} inputMode="numeric" value={monthDay} onChange={(event) => setMonthDay(event.target.value)} />
            </div>
          )}
          {errors.repeat && <small className="field-error">{errors.repeat}</small>}
        </div>

        {repeatType !== "none" && (
          <div className="form-group">
            <label htmlFor="item-repeat-end">重复结束日期（可选）</label>
            <input className="input" id="item-repeat-end" type="date" min={date || undefined} value={repeatEnd} onChange={(event) => setRepeatEnd(event.target.value)} />
            {errors.repeatEnd && <small className="field-error">{errors.repeatEnd}</small>}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="item-goal">所属长期目标（可选）</label>
          <select className="select" id="item-goal" value={goalId} onChange={(event) => setGoalId(event.target.value)}>
            <option value="">不关联目标</option>
            {activeGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="item-note">备注（可选）</label>
          <textarea className="textarea" id="item-note" maxLength={300} placeholder="补充步骤细节，只保存在本机" value={note} onChange={(event) => setNote(event.target.value)} />
          {errors.note && <small className="field-error">{errors.note}</small>}
        </div>

        {editing ? (
          <div className="button-row">
            <button type="button" className="danger-button" onClick={() => onDelete(editing.id)}><Icon name="trash" size={17} />删除</button>
            <button type="submit" className="primary-button">保存修改</button>
          </div>
        ) : (
          <button type="submit" className="primary-button full-width">添加到工作台</button>
        )}
      </form>
    </ModalFrame>
  );
}

export function GoalModal({ state, payload, onClose, onSave, onDelete }) {
  const editing = payload?.goal || null;
  const [title, setTitle] = useState(editing?.title || "");
  const [deadline, setDeadline] = useState(editing?.deadline || "");
  const [status, setStatus] = useState(editing?.status || "active");
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(Boolean(payload?.confirmDelete));

  const linkedCount = editing
    ? state.planner.items.filter((item) => item.goalId === editing.id).length
    : 0;

  if (editing && confirmingDelete) {
    return (
      <ModalFrame title="确认删除这个长期目标？" subtitle={`目标：${editing.title}`} onClose={onClose}>
        <div className="notice-box">
          <strong>不会连带删除名下的事项：</strong>删除目标后，{linkedCount > 0 ? `该目标名下已有的 ${linkedCount} 条步骤或习惯不会丢失，系统只会解除它们的目标关联，并保留为普通事项。` : "该目标名下当前没有关联事项。"}
        </div>
        <div className="button-row" style={{ marginTop: 20 }}>
          <button type="button" className="secondary-button" onClick={() => setConfirmingDelete(false)}>返回保留</button>
          <button type="button" className="danger-button" onClick={() => onDelete(editing.id)}>确认仅删除目标</button>
        </div>
      </ModalFrame>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) { setError("请填写目标名称"); return; }
    if (trimmed.length > 40) { setError("目标名称不能超过 40 字"); return; }
    onSave({
      id: editing?.id || null,
      title: trimmed,
      deadline: deadline || null,
      status
    });
  }

  return (
    <ModalFrame title={editing ? "编辑长期目标" : "新建长期目标"} subtitle="把大目标拆成可执行的小步骤" onClose={onClose}>
      <form className="sheet-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="goal-title">目标名称 *</label>
          <input className="input" id="goal-title" type="text" maxLength={40} placeholder="例如：三个月考下证书" value={title} onChange={(event) => { setTitle(event.target.value); setError(""); }} />
          {error && <small className="field-error">{error}</small>}
        </div>
        <div className="form-group">
          <label htmlFor="goal-deadline">目标截止日期（可选）</label>
          <input className="input" id="goal-deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
        </div>
        {editing && (
          <div className="form-group">
            <label htmlFor="goal-status">目标状态</label>
            <select className="select" id="goal-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="active">进行中</option>
              <option value="done">已完成</option>
              <option value="archived">已归档</option>
            </select>
          </div>
        )}
        {editing ? (
          <div className="button-row">
            <button type="button" className="danger-button" onClick={() => setConfirmingDelete(true)}><Icon name="trash" size={17} />删除目标</button>
            <button type="submit" className="primary-button">保存目标</button>
          </div>
        ) : (
          <button type="submit" className="primary-button full-width">创建目标</button>
        )}
      </form>
    </ModalFrame>
  );
}

export function NicknameModal({ state, onClose, onSave }) {
  const [nickname, setNickname] = useState(state.settings.nickname || "");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length > 12) { setError("称呼不能超过 12 个字"); return; }
    onSave(trimmed);
  }

  return (
    <ModalFrame title="个人称呼" subtitle="用于首页问候，仅保存在当前设备" onClose={onClose}>
      <form className="sheet-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="nickname-input">希望知期怎样称呼你？（可选，最多 12 字）</label>
          <input className="input" id="nickname-input" type="text" maxLength={12} placeholder="留空则只显示时段问候" value={nickname} onChange={(event) => { setNickname(event.target.value); setError(""); }} />
          <small>该称呼会随加密备份保存，绝不上传服务器，也不会出现在通知文案中。</small>
          {error && <small className="field-error">{error}</small>}
        </div>
        <button type="submit" className="primary-button full-width">保存在本机</button>
      </form>
    </ModalFrame>
  );
}
