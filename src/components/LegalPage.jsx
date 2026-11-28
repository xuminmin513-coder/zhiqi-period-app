import Icon from "./Icon.jsx";
import BrandMark from "./BrandMark.jsx";
import { HAS_SUPPORT_CONTACT, SUPPORT_EMAIL, SUPPORT_URL } from "../utils/release.js";

const EFFECTIVE_DATE = "2026年11月27日";

function Section({ title, children }) {
  return <section className="legal-section"><h2>{title}</h2><div className="legal-content">{children}</div></section>;
}

function Contact() {
  if (SUPPORT_EMAIL) return <p>联系邮箱：<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>;
  if (SUPPORT_URL) return <p>支持页面：<a href={SUPPORT_URL} target="_blank" rel="noreferrer">{SUPPORT_URL}</a></p>;
  return <p className="legal-warning">当前为开发预览，尚未配置公开支持联系方式；发布门禁会阻止正式上线。</p>;
}

function PrivacyPolicy() {
  return <>
    <Section title="1. 我们如何处理你的记录">
      <p>知期当前版本无需账号。你录入的个人计划（待办、习惯、长期目标、日程、打卡记录）、经期日期、周期长度、经量、症状、心情、备注、本地称呼和提醒偏好，仅保存在你当前使用的浏览器本地存储中。</p>
      <p>当前版本没有业务后端，不会把上述计划或健康记录上传给我们的服务器。</p>
    </Section>
    <Section title="2. 本地存储与设备安全">
      <p>本地存储由浏览器和操作系统管理，不等同于应用层端到端加密。设备锁屏、浏览器隐私设置、系统磁盘加密及网站数据清除行为都会影响数据安全与可用性。</p>
      <p>清除网站数据、更换浏览器或设备、浏览器回收存储，可能导致记录丢失或无法迁移。请定期使用加密备份。</p>
    </Section>
    <Section title="3. 加密备份与恢复">
      <p>当你主动导出备份时，知期在当前设备上使用 PBKDF2-SHA-256 派生密钥，并使用 AES-GCM 加密备份内容。每次备份使用随机 salt 和 IV。备份密码不会写入备份文件，也不会上传。</p>
      <p>忘记备份密码后无法恢复对应文件。请妥善保管密码和备份文件。你可以主动选择导入早期明文 JSON 备份；明文文件不受上述加密保护。</p>
    </Section>
    <Section title="4. PWA、离线与托管日志">
      <p>为实现主屏幕安装和离线页面，Service Worker 会缓存应用代码、图标和清单等静态资源。这些缓存不应包含你的健康记录。</p>
      <p>当你访问公开网站时，静态托管与网络服务商可能出于安全、故障排查和网络传输需要处理 IP 地址、时间、User-Agent 等标准技术日志。正常功能不会把经期或症状写入网址。具体处理以实际托管服务商的有效政策为准。</p>
    </Section>
    <Section title="5. 账号、广告、分析与共享">
      <p>当前版本没有账号系统、广告 SDK、第三方行为分析、健康数据出售或广告共享，也不把记录发送给 AI 服务。</p>
      <p>如果未来增加账号、云同步、AI、可穿戴、分析或广告功能，我们会先更新本政策，并按适用法律提供所需的告知、选择和授权机制。</p>
    </Section>
    <Section title="6. 提醒偏好">
      <p>当前提醒开关只保存你的偏好，不代表系统通知已经启用。若后续提供本地或推送通知，我们会在请求系统权限前说明用途；隐蔽文案偏好只用于减少通知中的敏感表达。</p>
    </Section>
    <Section title="7. 你的选择与删除权利">
      <p>你可以随时修改记录、导出加密备份，或在「我的」中选择清除本机数据。你也可以通过浏览器设置删除该网站的全部本地数据。</p>
      <p>当前没有业务服务器上的健康记录可供删除。你自行导出的备份文件由你管理，删除应用不会自动删除已经下载到其他位置的文件。</p>
    </Section>
    <Section title="8. 未成年人">
      <p>本产品不是专门针对未成年人设计的服务。未成年人应在监护人指导下使用，并理解健康记录、备份密码和设备共享的风险。</p>
    </Section>
    <Section title="9. 政策更新与联系">
      <p>功能、数据处理或法律要求变化时，我们会更新本政策并标注生效日期；重大变化应在产品中提供显著提示。</p>
      <Contact />
    </Section>
  </>;
}

function Terms() {
  return <>
    <Section title="1. 服务内容与接受条款">
      <p>知期提供个人计划管理、经期记录、日历展示、趋势统计、区间预测、本地数据管理及加密备份工具。使用本应用即表示你理解并同意本条款和隐私政策；如不同意，请停止使用并删除本机数据。</p>
    </Section>
    <Section title="2. 健康与预测边界">
      <p>所有预测均基于你录入的数据和当前统计规则，只是估算。个体周期会受到疾病、压力、旅行、药物、激素避孕、产后、哺乳和围绝经期等因素影响。</p>
      <p>本应用不用于避孕、诊断、治疗或判断是否排卵，不能替代医生、检查或紧急医疗服务。持续异常、明显不适或紧急情况请及时联系专业医疗机构。</p>
    </Section>
    <Section title="3. 你的记录与输入责任">
      <p>你应尽可能录入真实、准确的日期和症状，并在预测变化后核对实际经期。你对自己的记录、备份密码、导出文件及主动分享行为负责。</p>
    </Section>
    <Section title="4. 备份、恢复与数据丢失">
      <p>加密备份使用你设置的密码。忘记密码、文件损坏、设备丢失、浏览器清理、操作系统限制或存储回收都可能导致数据无法恢复。</p>
      <p>恢复备份会替换当前浏览器内的记录。请在恢复前备份现有数据，并确认文件来源可信。</p>
    </Section>
    <Section title="5. 可用性与平台差异">
      <p>浏览器、操作系统和设备对 PWA、离线、文件下载和通知的支持不同。我们会进行合理测试，但不保证所有平台、版本或网络环境下均不间断运行。</p>
      <p>当前提醒偏好不构成系统通知承诺。重要健康事项不应只依赖本应用提醒。</p>
    </Section>
    <Section title="6. 合理使用">
      <p>不得利用本应用实施违法、攻击、破坏、未授权访问、传播恶意文件或侵犯他人隐私的行为。不得把他人的健康记录当作自己的授权数据进行公开传播。</p>
    </Section>
    <Section title="7. 知识产权与第三方服务">
      <p>应用界面、文案和代码的知识产权归相应权利人所有。静态托管、浏览器和操作系统等第三方服务受其自身条款约束，我们不对第三方独立服务承担控制能力之外的责任。</p>
    </Section>
    <Section title="8. 变更、停止与责任">
      <p>我们可能为安全、合规或产品改进更新功能。法律允许范围内，因个体周期差异、错误输入、设备环境、备份密码遗失或第三方服务造成的影响，不应被理解为预测或医疗效果的保证。</p>
      <p>本条款不排除或限制适用法律明确规定不得排除的消费者权利与责任。</p>
    </Section>
    <Section title="9. 适用法律与联系">
      <p>本条款适用中华人民共和国法律。发生争议时，双方应先友好协商；协商不成，可依法向有管辖权的人民法院寻求解决。</p>
      <Contact />
    </Section>
  </>;
}

export default function LegalPage({ type, onBack }) {
  const isPrivacy = type === "privacy";
  return (
    <main className="legal-page">
      <header className="legal-header">
        <button className="icon-button" onClick={onBack} aria-label="返回应用"><Icon name="left" /></button>
        <div className="onboarding-brand"><BrandMark /><span>知期</span></div>
      </header>
      <article className="legal-document">
        <span className="pill sage"><Icon name="file" size={14} />正式文档预览</span>
        <h1>{isPrivacy ? "隐私政策" : "用户协议"}</h1>
        <p className="legal-meta">版本 1.1 · 生效日期：{EFFECTIVE_DATE}</p>
        <p className="legal-intro">{isPrivacy ? "我们只描述当前代码真实具备的数据行为，不把未来功能写成已经发生。" : "请在使用前理解记录、预测、备份和平台能力的边界。"}</p>
        {isPrivacy ? <PrivacyPolicy /> : <Terms />}
        <footer className="legal-footer"><button className="text-button" onClick={() => { window.location.hash = isPrivacy ? "#/terms" : "#/privacy"; }}>{isPrivacy ? "查看用户协议 →" : "查看隐私政策 →"}</button></footer>
      </article>
    </main>
  );
}
