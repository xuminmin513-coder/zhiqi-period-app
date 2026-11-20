import { useCallback, useEffect, useRef, useState } from "react";
import Onboarding from "./components/Onboarding.jsx";
import Navigation from "./components/Navigation.jsx";
import Home from "./components/Home.jsx";
import Calendar from "./components/Calendar.jsx";
import Trends from "./components/Trends.jsx";
import Profile from "./components/Profile.jsx";
import Modal from "./components/Modal.jsx";
import LegalPage from "./components/LegalPage.jsx";
import { diffDays, getToday, toISO } from "./utils/date.js";
import { calculateCycles, createBaseState, createDemoState } from "./utils/period.js";
import { clearState, loadState, MAX_BACKUP_BYTES, saveState, validateState } from "./services/localRepository.js";
import { decryptBackup, encryptBackup, isEncryptedBackupDocument } from "./utils/backupCrypto.js";

function getLegalRoute() {
  if (window.location.hash.startsWith("#/privacy")) return "privacy";
  if (window.location.hash.startsWith("#/terms")) return "terms";
  return null;
}

function getInitialSnapshot() {
  try {
    const query = new URLSearchParams(window.location.search);
    return { state: query.get("demo") === "1" ? createDemoState() : loadState(), error: "" };
  } catch (error) {
    return { state: null, error: error instanceof Error ? error.message : "本机记录暂时无法读取" };
  }
}

export default function App() {
  const [initial] = useState(getInitialSnapshot);
  const [state, setState] = useState(initial.state);
  const [legalRoute, setLegalRoute] = useState(getLegalRoute);
  const [route, setRoute] = useState("home");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(getToday().getFullYear(), getToday().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toISO(getToday()));
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const installPrompt = useRef(null);

  const notify = useCallback((message) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);
  const openModal = useCallback((type, date = null) => setModal({ type, date }), []);

  useEffect(() => {
    if (!state) return;
    try {
      saveState(state);
    } catch (error) {
      notify(error instanceof Error ? error.message : "本机记录保存失败，请先导出备份");
    }
  }, [state, notify]);

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      installPrompt.current = event;
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
  }, []);

  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    const syncLegalRoute = () => setLegalRoute(getLegalRoute());
    window.addEventListener("hashchange", syncLegalRoute);
    return () => window.removeEventListener("hashchange", syncLegalRoute);
  }, []);

  function navigate(nextRoute) {
    setRoute(nextRoute);
    setModal(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateSetting(key, value) {
    setState((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
    notify("偏好已保存在本机；系统通知尚未启用");
  }

  function saveDaily(date, log) {
    setState((current) => ({ ...current, logs: { ...current.logs, [date]: log } }));
    closeModal();
    notify("今天的感受已保存在本机");
  }

  function savePeriod(start, end) {
    if (diffDays(end, start) < 0) { notify("结束日期不能早于开始日期"); return; }
    if (diffDays(end, start) > 30) { notify("请检查起止日期，当前记录超过 30 天"); return; }
    setState((current) => {
      const historyStarts = [...new Set([...current.historyStarts, start])].sort();
      return {
        ...current,
        periodLength: diffDays(end, start) + 1,
        historyStarts,
        lastPeriodStart: historyStarts[historyStarts.length - 1],
        cycles: calculateCycles(historyStarts)
      };
    });
    closeModal();
    notify("经期已更新，预测区间已重新计算");
  }

  async function exportData(password) {
    try {
      const encrypted = await encryptBackup(state, password);
      const payload = JSON.stringify(encrypted, null, 2);
      const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `知期加密备份-${toISO(getToday())}.zqbackup`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      closeModal();
      notify("加密备份已生成；忘记密码将无法恢复");
    } catch (error) {
      notify(error instanceof Error ? error.message : "加密备份失败，请稍后重试");
    }
  }

  async function importData(file, password) {
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) { notify("备份文件超过 2 MB 上限，未读取"); return; }
    try {
      const parsed = JSON.parse(await file.text());
      const data = isEncryptedBackupDocument(parsed) ? await decryptBackup(parsed, password) : parsed.data;
      const validated = validateState(data);
      setState(validated);
      closeModal();
      notify("备份已恢复到本机");
    } catch (error) {
      notify(error instanceof Error ? error.message : "无法读取：请选择有效的知期备份");
    }
  }

  function resetData() {
    try {
      clearState();
      setState(null);
      closeModal();
      notify("本机演示数据已清除");
    } catch (error) {
      notify(error instanceof Error ? error.message : "本机记录清除失败");
    }
  }

  async function installApp() {
    if (installPrompt.current) {
      await installPrompt.current.prompt();
      installPrompt.current = null;
    } else {
      openModal("install");
    }
  }

  function openLegalPage(type) {
    setModal(null);
    setLegalRoute(type);
    window.location.hash = `#/${type}`;
  }

  if (legalRoute) {
    return <LegalPage type={legalRoute} onBack={() => { window.location.hash = ""; setLegalRoute(null); }} />;
  }

  if (!state) {
    return <Onboarding startupError={initial.error} onComplete={(lastPeriod, typicalCycle) => { setState(createBaseState(lastPeriod, typicalCycle)); notify("已创建只属于你的本地记录"); }} onDemo={() => setState(createDemoState())} />;
  }

  return (
    <>
      <div className="app-shell">
        {route === "home" && <Home state={state} onOpenModal={openModal} onNavigate={navigate} />}
        {route === "calendar" && <Calendar state={state} month={calendarMonth} selectedDate={selectedDate} onMonthChange={setCalendarMonth} onSelectDay={(date) => { setSelectedDate(date); if (date > toISO(getToday())) notify("未来日期可查看预测，但不能提前记录身体感受"); else openModal("daily", date); }} onOpenModal={openModal} />}
        {route === "trends" && <Trends state={state} onOpenModal={openModal} />}
        {route === "profile" && <Profile state={state} onOpenModal={openModal} onInstall={installApp} onSettingChange={updateSetting} />}
        <Navigation route={route} onNavigate={navigate} />
      </div>
      <Modal modal={modal} state={state} onClose={closeModal} onSaveDaily={saveDaily} onSavePeriod={savePeriod} onExport={exportData} onImport={importData} onReset={resetData} onSettingChange={updateSetting} onOpenLegal={openLegalPage} />
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
