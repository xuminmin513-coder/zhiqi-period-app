import Icon from "./Icon.jsx";
import { PageHeader } from "./Home.jsx";

export function SettingToggle({ settingKey, label, settings, onSettingChange }) {
  return <label className="switch"><input type="checkbox" checked={Boolean(settings[settingKey])} onChange={(event) => onSettingChange(settingKey, event.target.checked)} aria-label={label} /><span className="switch-track" /></label>;
}

export default function Profile({ state, onOpenModal, onInstall, onSettingChange }) {
  return (
    <section className="page" aria-label="我的">
      <PageHeader title="我的" subtitle="数据、提醒与使用边界" />
      <div className="stack">
        <article className="card profile-hero"><span className="profile-avatar"><Icon name="lock" size={24} /></span><div><h2>本地私密空间</h2><p>未创建账号 · 无广告追踪 · 记录默认不上传</p></div></article>
        <article className="card settings-card">
          <button className="setting-row" onClick={onInstall}><Icon name="phone" /><span className="setting-copy"><strong>安装到主屏幕</strong><span>像 App 一样打开，支持离线页面</span></span><Icon name="chevron" size={17} /></button>
          <div className="setting-row"><Icon name="bell" /><span className="setting-copy"><strong>经期提醒偏好</strong><span>保存偏好；系统通知将在后续接入</span></span><SettingToggle settingKey="periodReminder" label="经期提醒偏好" settings={state.settings} onSettingChange={onSettingChange} /></div>
          <div className="setting-row"><Icon name="shield" /><span className="setting-copy"><strong>隐蔽通知文案</strong><span>通知中不直接出现敏感词语</span></span><SettingToggle settingKey="discreetNotifications" label="隐蔽通知文案" settings={state.settings} onSettingChange={onSettingChange} /></div>
        </article>
        <article className="card settings-card">
          <button className="setting-row" onClick={() => onOpenModal("backup")}><Icon name="download" /><span className="setting-copy"><strong>备份与恢复</strong><span>导出或导入你的本地记录</span></span><Icon name="chevron" size={17} /></button>
          <button className="setting-row" onClick={() => onOpenModal("prediction")}><Icon name="chart" /><span className="setting-copy"><strong>预测如何工作</strong><span>查看输入、区间和局限</span></span><Icon name="chevron" size={17} /></button>
          <button className="setting-row" onClick={() => onOpenModal("privacy")}><Icon name="file" /><span className="setting-copy"><strong>隐私与健康声明</strong><span>了解数据处理和医疗边界</span></span><Icon name="chevron" size={17} /></button>
        </article>
        <article className="card settings-card"><button className="setting-row danger" onClick={() => onOpenModal("reset")}><Icon name="trash" /><span className="setting-copy"><strong>清除本机演示数据</strong><span>删除后无法恢复，请先导出备份</span></span><Icon name="chevron" size={17} /></button></article>
        <p className="version">知期 React UI 预览版 0.2 · 无服务器连接</p>
      </div>
    </section>
  );
}
