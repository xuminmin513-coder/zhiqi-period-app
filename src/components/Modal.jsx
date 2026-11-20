import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { SettingToggle } from "./Profile.jsx";
import { addDays, fullDate, getToday, toISO } from "../utils/date.js";
import { getPrediction } from "../utils/period.js";

function ModalFrame({ title, subtitle, children, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet-handle" />
        <header className="sheet-header"><div><h2 id="sheet-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button ref={closeRef} className="icon-button" onClick={onClose} aria-label="关闭"><Icon name="close" /></button></header>
        {children}
      </section>
    </div>
  );
}

function DailyModal({ state, date, onClose, onSave }) {
  const dateISO = date || toISO(getToday());
  const log = state.logs[dateISO] || {};
  const symptoms = ["痛经", "腰酸", "头痛", "腹胀", "疲惫", "情绪偏低", "心情平稳", "轻微腰酸"];
  function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave(dateISO, { symptoms: data.getAll("symptoms"), flow: data.get("flow"), note: String(data.get("note") || "").slice(0, 300) });
  }
  return (
    <ModalFrame title="记录身体感受" subtitle={fullDate(dateISO)} onClose={onClose}>
      <form className="sheet-form" onSubmit={handleSubmit}>
        <div className="form-group"><span className="form-label">今天有哪些感受？（可多选）</span><div className="choice-grid">{symptoms.map((symptom, index) => <span key={symptom}><input className="choice-input" type="checkbox" id={`symptom-${index}`} name="symptoms" value={symptom} defaultChecked={log.symptoms?.includes(symptom)} /><label className="choice-chip" htmlFor={`symptom-${index}`}>{symptom}</label></span>)}</div></div>
        <div className="form-group"><label htmlFor="flow">经量（可选）</label><select className="select" id="flow" name="flow" defaultValue={log.flow || ""}><option value="">今天不记录</option><option value="light">较少</option><option value="medium">适中</option><option value="heavy">较多</option></select></div>
        <div className="form-group"><label htmlFor="note">留一句话给自己（可选）</label><textarea className="textarea" id="note" name="note" maxLength="300" placeholder="只保存在本机" defaultValue={log.note || ""} /></div>
        <button className="primary-button full-width" type="submit">保存到本机</button>
      </form>
    </ModalFrame>
  );
}

function PeriodModal({ state, date, onClose, onSave }) {
  const start = date || state.lastPeriodStart;
  const end = toISO(addDays(start, state.periodLength - 1));
  function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave(data.get("start"), data.get("end"));
  }
  return (
    <ModalFrame title="记录经期" subtitle="补记和修改都会影响后续预测" onClose={onClose}>
      <form className="sheet-form" onSubmit={handleSubmit}>
        <div className="form-group"><label htmlFor="period-start">开始日期</label><input className="input" id="period-start" name="start" type="date" defaultValue={start} max={toISO(getToday())} required /></div>
        <div className="form-group"><label htmlFor="period-end">结束日期</label><input className="input" id="period-end" name="end" type="date" defaultValue={end} max={toISO(getToday())} required /></div>
        <div className="notice-box">预测以“本次第一天到下次第一天”的间隔计算。请尽量记录真实日期，而不是预测的日期。</div>
        <button className="primary-button full-width" type="submit">保存并更新预测</button>
      </form>
    </ModalFrame>
  );
}

function PredictionModal({ state, onClose }) {
  const prediction = getPrediction(state);
  return (
    <ModalFrame title="这次预测怎样得出" subtitle="可解释，比假装精确更重要" onClose={onClose}>
      <div className="info-list">
        <div className="info-item"><span className="info-number">1</span><div><strong>读取真实经期记录</strong><p>使用最近开始日期和 {prediction.evidenceCount} 个已知周期间隔；数据不足时参考你填写的平均周期。</p></div></div>
        <div className="info-item"><span className="info-number">2</span><div><strong>计算个人参考间隔</strong><p>当前参考间隔为 {prediction.cycle} 天。历史中位数可减少个别异常周期对结果的影响。</p></div></div>
        <div className="info-item"><span className="info-number">3</span><div><strong>保留 ±{prediction.spread} 天的不确定区间</strong><p>因此展示 {fullDate(prediction.start)} 至 {fullDate(prediction.end)}，而不是一个保证准确的日期。</p></div></div>
      </div>
      <div className="notice-box">这是一版用于验证交互的前端预测模型，尚不代表经过临床验证。预测不可用于避孕、诊断或判断是否已经排卵。</div>
      <button className="soft-button full-width" style={{ marginTop: 18 }} onClick={onClose}>我明白了</button>
    </ModalFrame>
  );
}

function BackupModal({ onClose, onExport, onImport }) {
  const [mode, setMode] = useState("export");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (mode === "export" && password !== confirmation) return;
    setBusy(true);
    try {
      if (mode === "export") await onExport(password);
      else await onImport(file, password);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalFrame title="备份与恢复" subtitle="加密在离开本机前完成，密码不会被保存" onClose={onClose}>
      <div className="segmented-control" role="tablist" aria-label="备份或恢复">
        <button type="button" role="tab" aria-selected={mode === "export"} className={`segment-button ${mode === "export" ? "active" : ""}`} onClick={() => setMode("export")}>加密备份</button>
        <button type="button" role="tab" aria-selected={mode === "import"} className={`segment-button ${mode === "import" ? "active" : ""}`} onClick={() => setMode("import")}>恢复记录</button>
      </div>
      <form className="sheet-form" onSubmit={handleSubmit}>
        <input className="sr-only" type="text" name="username" value="local-user" autoComplete="username" readOnly tabIndex={-1} aria-hidden="true" />
        {mode === "export" ? <>
          <div className="notice-box">密码至少 8 个字符。知期不保存密码，忘记后将无法恢复这份备份。</div>
          <div className="form-group"><label htmlFor="backup-password">设置备份密码</label><input className="input" id="backup-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /></div>
          <div className="form-group"><label htmlFor="backup-confirmation">再次输入密码</label><input className="input" id="backup-confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} autoComplete="new-password" required />{confirmation && password !== confirmation && <small className="field-error">两次输入的密码不一致</small>}</div>
          <button className="primary-button full-width" type="submit" disabled={busy || password.length < 8 || password !== confirmation}><Icon name="lock" size={18} />{busy ? "正在本机加密…" : "加密并导出"}</button>
        </> : <>
          <div className="form-group"><label htmlFor="backup-file">选择备份文件</label><input className="input file-input" id="backup-file" type="file" accept=".zqbackup,.json,application/json" onChange={(event) => setFile(event.target.files[0] || null)} required />{file && <small>{file.name} · {Math.max(1, Math.round(file.size / 1024))} KB</small>}</div>
          <div className="form-group"><label htmlFor="restore-password">备份密码</label><input className="input" id="restore-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="加密备份必填；早期 JSON 可留空" /></div>
          <div className="notice-box">恢复会先校验完整文件，再覆盖当前浏览器中的记录。密码错误或文件损坏时不会写入。</div>
          <button className="primary-button full-width" type="submit" disabled={busy || !file}><Icon name="upload" size={18} />{busy ? "正在校验和恢复…" : "验证并恢复"}</button>
        </>}
      </form>
    </ModalFrame>
  );
}

function PrivacyModal({ onClose, onOpenLegal }) {
  return (
    <ModalFrame title="隐私与健康声明" subtitle="UI 预览版的明确边界" onClose={onClose}>
      <div className="info-list">
        <div className="info-item"><Icon name="lock" size={23} /><div><strong>数据只保存在当前浏览器</strong><p>本版没有账号、后端接口、广告或第三方统计。清除网站数据、换浏览器或换设备可能导致记录丢失。</p></div></div>
        <div className="info-item"><Icon name="shield" size={23} /><div><strong>设备安全仍然重要</strong><p>本地存储不等于绝对加密。请使用系统锁屏，并妥善保管备份文件与密码；忘记备份密码将无法恢复。</p></div></div>
        <div className="info-item"><Icon name="alert" size={23} /><div><strong>不用于医疗决策</strong><p>预测和趋势只供自我观察，不用于避孕、诊断或治疗。持续异常或明显不适时，请咨询专业医务人员。</p></div></div>
      </div>
      <button className="soft-button full-width" onClick={onClose}>知道了</button>
      <div className="legal-links"><button className="text-button" onClick={() => onOpenLegal("privacy")}>完整隐私政策</button><button className="text-button" onClick={() => onOpenLegal("terms")}>完整用户协议</button></div>
    </ModalFrame>
  );
}

function InstallModal({ onClose }) {
  return (
    <ModalFrame title="安装到主屏幕" subtitle="之后可以像普通 App 一样打开" onClose={onClose}>
      <div className="info-list">
        <div className="info-item"><span className="info-number">iOS</span><div><strong>iPhone／iPad</strong><p>使用 Safari 打开本页面，点击“分享”，再选择“添加到主屏幕”。</p></div></div>
        <div className="info-item"><span className="info-number">安卓</span><div><strong>Android</strong><p>使用 Chrome 等支持的浏览器打开，选择浏览器菜单中的“安装应用”或“添加到主屏幕”。</p></div></div>
        <div className="info-item"><Icon name="info" size={23} /><div><strong>提醒能力有所不同</strong><p>安装和离线页面不代表系统通知在所有浏览器都可用，提醒功能需单独验证。</p></div></div>
      </div>
    </ModalFrame>
  );
}

function RemindersModal({ state, onClose, onSettingChange }) {
  return (
    <ModalFrame title="提醒偏好" subtitle="先保存偏好，系统通知后续接入" onClose={onClose}>
      <div className="card settings-card">
        <div className="setting-row"><Icon name="bell" /><span className="setting-copy"><strong>下次经期提醒</strong><span>当前只保存偏好，不会发送系统通知</span></span><SettingToggle settingKey="periodReminder" label="下次经期提醒" settings={state.settings} onSettingChange={onSettingChange} /></div>
        <div className="setting-row"><Icon name="shield" /><span className="setting-copy"><strong>隐蔽通知文案</strong><span>未来通知默认不直接显示敏感词</span></span><SettingToggle settingKey="discreetNotifications" label="隐蔽通知文案" settings={state.settings} onSettingChange={onSettingChange} /></div>
      </div>
      <div className="notice-box" style={{ marginTop: 18 }}>不同浏览器的后台通知能力不一致。商店版本将优先使用可验证的本地通知。</div>
    </ModalFrame>
  );
}

function ResetModal({ onClose, onReset }) {
  return (
    <ModalFrame title="确认清除本机数据？" subtitle="这个操作无法撤销" onClose={onClose}>
      <div className="notice-box">将删除当前浏览器中的经期、症状和设置。建议先导出备份。</div>
      <div className="button-row" style={{ marginTop: 20 }}><button className="secondary-button" onClick={onClose}>保留记录</button><button className="danger-button" onClick={onReset}>确认清除</button></div>
    </ModalFrame>
  );
}

export default function Modal({ modal, state, onClose, onSaveDaily, onSavePeriod, onExport, onImport, onReset, onSettingChange, onOpenLegal }) {
  if (!modal) return null;
  const props = { state, onClose };
  if (modal.type === "daily") return <DailyModal {...props} date={modal.date} onSave={onSaveDaily} />;
  if (modal.type === "period") return <PeriodModal {...props} date={modal.date} onSave={onSavePeriod} />;
  if (modal.type === "prediction") return <PredictionModal {...props} />;
  if (modal.type === "backup") return <BackupModal onClose={onClose} onExport={onExport} onImport={onImport} />;
  if (modal.type === "privacy") return <PrivacyModal onClose={onClose} onOpenLegal={onOpenLegal} />;
  if (modal.type === "install") return <InstallModal onClose={onClose} />;
  if (modal.type === "reminders") return <RemindersModal {...props} onSettingChange={onSettingChange} />;
  if (modal.type === "reset") return <ResetModal onClose={onClose} onReset={onReset} />;
  return null;
}
