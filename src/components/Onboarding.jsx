import Icon from "./Icon.jsx";
import { getToday, toISO } from "../utils/date.js";

export default function Onboarding({ onComplete, onDemo, startupError = "" }) {
  function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onComplete(data.get("lastPeriod"), Number(data.get("typicalCycle")) || 30);
  }

  return (
    <main className="onboarding">
      <div className="onboarding-brand"><span className="brand-mark">知</span><span>知期</span></div>
      {startupError && <div className="notice-box" style={{ marginTop: 20 }} role="alert">{startupError}。你仍可开始新记录；如需保留旧数据，请先不要清除浏览器存储。</div>}
      <section className="onboarding-hero">
        <span className="pill"><Icon name="shield" size={14} />无需注册，本地优先</span>
        <h1>听见身体的节奏，<br />不交出你的隐私。</h1>
        <p>记录经期，了解周期变化。预测会告诉你依据和不确定性，而不是假装每个身体都一样。</p>
      </section>
      <form className="onboarding-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="last-period">最近一次经期开始日</label>
          <input className="input" id="last-period" name="lastPeriod" type="date" max={toISO(getToday())} required />
          <small>只用于在你的设备上生成第一条周期记录。</small>
        </div>
        <div className="form-group">
          <label htmlFor="typical-cycle">平时周期间隔（可选）</label>
          <input className="input" id="typical-cycle" name="typicalCycle" type="number" min="15" max="120" inputMode="numeric" placeholder="例如 30 天，不知道可留空" />
          <small>从本次经期第一天到下次经期第一天的间隔。</small>
        </div>
        <button className="primary-button full-width" type="submit">开始我的私密记录 <Icon name="right" size={18} /></button>
      </form>
      <div className="onboarding-points">
        <div className="onboarding-point"><Icon name="check" size={17} />数据默认不离开这台设备</div>
        <div className="onboarding-point"><Icon name="check" size={17} />预测展示区间，不用于避孕或诊断</div>
        <div className="onboarding-point"><Icon name="check" size={17} />随时导出或删除全部记录</div>
      </div>
      <div className="onboarding-footer"><button className="text-button" onClick={onDemo}>先用演示数据看看 →</button></div>
    </main>
  );
}
