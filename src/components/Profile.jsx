import Icon from "./Icon.jsx";
import { PageHeader } from "./Home.jsx";

export function SettingToggle({ settingKey, label, settings, onSettingChange }) {
  return <label className="switch"><input type="checkbox" checked={Boolean(settings[settingKey])} onChange={(event) => onSettingChange(settingKey, event.target.checked)} aria-label={label} /><span className="switch-track" /></label>;
}

function formatStorageSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Profile({ state, storageUsage, onOpenModal, onInstall, onSettingChange }) {
  const nickname = state.settings.nickname;
  return (
    <section className="page" aria-label="我的">
      <PageHeader title="我的" subtitle="本地称呼、复盘偏好、存储与数据边界" />
      <div className="stack">
        <article className="card profile-hero">
          <span className="profile-avatar"><Icon name="lock" size={24} /></span>
          <div>
            <h2>{nickname ? `${nickname}的私密工作台` : "本地私密工作台"}</h2>
            <p>未创建账号 · 无广告追踪 · 计划、复盘与经期记录默认不上传</p>
          </div>
        </article>

        {storageUsage?.warn && (
          <div className="notice-box" role="alert">
            本机存储已使用 {formatStorageSize(storageUsage.bytes)}（浏览器上限约 5 MB）。请尽快在下方导出加密备份，避免空间写满。
          </div>
        )}

        <article className="card settings-card">
          <button className="setting-row" onClick={() => onOpenModal("nickname")}>
            <Icon name="user" />
            <span className="setting-copy">
              <strong>个人称呼</strong>
              <span>{nickname ? `当前：${nickname}（仅保存在本机）` : "未设置 · 仅用于首页问候，不上传"}</span>
            </span>
            <Icon name="chevron" size={17} />
          </button>
          <button className="setting-row" onClick={onInstall}>
            <Icon name="phone" />
            <span className="setting-copy"><strong>安装到主屏幕</strong><span>像 App 一样从桌面打开，支持离线页面</span></span>
            <Icon name="chevron" size={17} />
          </button>
          <div className="setting-row">
            <Icon name="book" />
            <span className="setting-copy"><strong>复盘结合经期阶段</strong><span>在复盘中参考你自己的周期阶段对比，不做健康判断</span></span>
            <SettingToggle settingKey="reviewCycleInsight" label="复盘结合经期阶段" settings={state.settings} onSettingChange={onSettingChange} />
          </div>
          <div className="setting-row">
            <Icon name="bell" />
            <span className="setting-copy"><strong>经期提醒偏好</strong><span>保存偏好；定时推送将在第三期接入</span></span>
            <SettingToggle settingKey="periodReminder" label="经期提醒偏好" settings={state.settings} onSettingChange={onSettingChange} />
          </div>
          <div className="setting-row">
            <Icon name="shield" />
            <span className="setting-copy"><strong>隐蔽通知文案</strong><span>未来通知默认不直接出现敏感词语</span></span>
            <SettingToggle settingKey="discreetNotifications" label="隐蔽通知文案" settings={state.settings} onSettingChange={onSettingChange} />
          </div>
        </article>

        <article className="card settings-card">
          <button className="setting-row" onClick={() => onOpenModal("backup")}>
            <Icon name="download" />
            <span className="setting-copy">
              <strong>加密备份与恢复</strong>
              <span>包含经期、计划与复盘 · 本机已用 {formatStorageSize(storageUsage?.bytes || 0)} / 约 5 MB</span>
            </span>
            <Icon name="chevron" size={17} />
          </button>
          <button className="setting-row" onClick={() => onOpenModal("prediction")}>
            <Icon name="chart" />
            <span className="setting-copy"><strong>预测如何工作</strong><span>查看经期区间估算的输入和局限</span></span>
            <Icon name="chevron" size={17} />
          </button>
          <button className="setting-row" onClick={() => onOpenModal("privacy")}>
            <Icon name="file" />
            <span className="setting-copy"><strong>隐私与健康声明</strong><span>了解本地数据处理和医疗边界</span></span>
            <Icon name="chevron" size={17} />
          </button>
        </article>

        <article className="card settings-card">
          <button className="setting-row danger" onClick={() => onOpenModal("reset")}>
            <Icon name="trash" />
            <span className="setting-copy"><strong>清除本机全部数据</strong><span>删除计划、复盘、经期、称呼与升级备份，请先导出备份</span></span>
            <Icon name="chevron" size={17} />
          </button>
        </article>
        <p className="version">知期个人工作台 0.4 · 本地优先 · 无服务器连接</p>
      </div>
    </section>
  );
}
