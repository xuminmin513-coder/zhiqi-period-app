import { useCallback, useEffect, useRef, useState } from "react";
import Onboarding from "./components/Onboarding.jsx";
import Navigation from "./components/Navigation.jsx";
import Home from "./components/Home.jsx";
import PlanPage from "./components/PlanPage.jsx";
import ReviewPage from "./components/ReviewPage.jsx";
import CyclePage from "./components/CyclePage.jsx";
import Profile from "./components/Profile.jsx";
import Modal from "./components/Modal.jsx";
import LegalPage from "./components/LegalPage.jsx";
import { diffDays, getToday, toISO } from "./utils/date.js";
import { calculateCycles, createBaseState, createDemoState } from "./utils/period.js";
import {
  deleteGoal,
  deleteItem,
  moveAllOverdueToToday,
  moveOverdueToToday,
  toggleItemCompletion,
  updateGoalStatus,
  upsertGoal,
  upsertItem
} from "./utils/planner.js";
import { convertReviewToPlan, deleteReview, upsertReview } from "./utils/review.js";
import { clearState, getStorageUsage, loadState, MAX_BACKUP_BYTES, saveState, validateState } from "./services/localRepository.js";
import { decryptBackup, encryptBackup, isEncryptedBackupDocument } from "./utils/backupCrypto.js";

let swRefreshing = false;
const SW_RELOAD_COOLDOWN_MS = 60000;
const SW_RELOAD_SESSION_KEY = "zhiqi-sw-reload-at";

function canAutoReloadForSwUpdate() {
  try {
    const last = Number(sessionStorage.getItem(SW_RELOAD_SESSION_KEY) || 0);
    if (last && Date.now() - last < SW_RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(SW_RELOAD_SESSION_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

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
  const [storageUsage, setStorageUsage] = useState(getStorageUsage);
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
  const openModal = useCallback((type, payload = null) => {
    setModal({
      type,
      date: typeof payload === "string" ? payload : null,
      payload: payload && typeof payload === "object" ? payload : null
    });
  }, []);

  useEffect(() => {
    if (!state) return;
    try {
      saveState(state);
      setStorageUsage(getStorageUsage());
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
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return undefined;
    const initialController = navigator.serviceWorker.controller;
    let registrationRef = null;

    const onControllerChange = () => {
      const nextController = navigator.serviceWorker.controller;
      if (!initialController || !nextController || nextController === initialController || swRefreshing) return;
      swRefreshing = true;
      if (canAutoReloadForSwUpdate()) {
        window.location.reload();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && registrationRef) {
        registrationRef.update().catch(() => {});
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((reg) => {
        registrationRef = reg;
        reg.update().catch(() => {});
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
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
    if (key === "reviewCycleInsight") {
      notify(value ? "已在复盘中开启周期阶段参考" : "已关闭复盘周期阶段参考");
    } else {
      notify("偏好已保存在本机；系统通知尚未启用");
    }
  }

  function saveNickname(nickname) {
    setState((current) => ({ ...current, settings: { ...current.settings, nickname } }));
    closeModal();
    notify(nickname ? `已更新本地称呼：${nickname}` : "已清除本地称呼");
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

  function handleSaveItem(draft) {
    const todayISO = toISO(getToday());
    try {
      const validated = validateState({ ...state, planner: upsertItem(state.planner, draft, todayISO) });
      setState(validated);
      closeModal();
      notify(draft.id ? "事项已更新" : "已添加到工作台");
    } catch (error) {
      notify(error instanceof Error ? error.message : "事项保存失败");
    }
  }

  function handleDeleteItem(itemId) {
    setState((current) => ({ ...current, planner: deleteItem(current.planner, itemId) }));
    closeModal();
    notify("事项已删除");
  }

  function handleToggleItem(itemId, dateISO) {
    setState((current) => ({ ...current, planner: toggleItemCompletion(current.planner, itemId, dateISO) }));
  }

  function handleMoveOverdue(itemId, todayISO) {
    setState((current) => ({ ...current, planner: moveOverdueToToday(current.planner, itemId, todayISO) }));
    notify("已移到今天");
  }

  function handleMoveAllOverdue(todayISO) {
    setState((current) => ({ ...current, planner: moveAllOverdueToToday(current.planner, todayISO) }));
    notify("过期事项已全部移到今天");
  }

  function handleSaveGoal(draft) {
    const todayISO = toISO(getToday());
    try {
      const validated = validateState({ ...state, planner: upsertGoal(state.planner, draft, todayISO) });
      setState(validated);
      closeModal();
      notify(draft.id ? "目标已更新" : "长期目标已创建");
    } catch (error) {
      notify(error instanceof Error ? error.message : "目标保存失败");
    }
  }

  function handleUpdateGoalStatus(goalId, status) {
    setState((current) => ({ ...current, planner: updateGoalStatus(current.planner, goalId, status) }));
    notify(status === "done" ? "目标已标记完成" : status === "archived" ? "目标已归档" : "目标已恢复为进行中");
  }

  function handleDeleteGoal(goalId) {
    setState((current) => ({ ...current, planner: deleteGoal(current.planner, goalId) }));
    closeModal();
    notify("目标已删除，名下事项已解除关联并保留");
  }

  function handleSaveReview(type, key, draft) {
    const todayISO = toISO(getToday());
    const existed = Boolean(state.reviews?.[type]?.[key]);
    try {
      const validated = validateState(upsertReview(state, type, key, draft, todayISO));
      setState(validated);
      closeModal();
      notify(existed ? "复盘内容已更新（原统计快照保持不变）" : "复盘已保存，统计快照已冻结");
    } catch (error) {
      notify(error instanceof Error ? error.message : "复盘保存失败");
    }
  }

  function handleDeleteReview(type, key) {
    setState((current) => deleteReview(current, type, key));
    closeModal();
    notify("复盘记录已删除");
  }

  function handleConvertReview(type, key, draft) {
    const todayISO = toISO(getToday());
    let withSavedReview;
    try {
      withSavedReview = validateState(upsertReview(state, type, key, draft, todayISO));
    } catch (error) {
      const message = error instanceof Error ? error.message : "复盘保存失败";
      notify(message);
      return { ok: false, error: message };
    }

    try {
      const { state: convertedState, createdCount } = convertReviewToPlan(withSavedReview, type, key, todayISO);
      const validated = validateState(convertedState);
      setState(validated);
      if (createdCount === 0) {
        notify("该内容已转入计划，无需重复生成");
      } else if (type === "monthly") {
        notify("已转为下月长期目标，并保存复盘");
      } else {
        notify(`已转入 ${createdCount} 条计划事项，并保存复盘`);
      }
      return { ok: true, createdCount };
    } catch (error) {
      setState(withSavedReview);
      const message = error instanceof Error ? error.message : "转入计划失败";
      notify(message);
      return { ok: false, error: message };
    }
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
      const data = isEncryptedBackupDocument(parsed) ? await decryptBackup(parsed, password) : (parsed?.data ?? parsed);
      const wasLegacy = Boolean(data && typeof data === "object" && (data.version === undefined || data.reviews === undefined));
      const validated = validateState(data);
      setState(validated);
      closeModal();
      notify(wasLegacy ? "旧版备份已恢复并无损升级至当前工作台格式" : "备份已恢复到本机");
    } catch (error) {
      notify(error instanceof Error ? error.message : "无法读取：请选择有效的知期备份");
    }
  }

  function resetData() {
    try {
      clearState();
      setState(null);
      setStorageUsage(getStorageUsage());
      closeModal();
      notify("本机全部数据已清除");
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
    return <Onboarding startupError={initial.error} onComplete={(lastPeriod, typicalCycle) => { setState(createBaseState(lastPeriod, typicalCycle)); notify("已创建只属于你的本地工作台"); }} onDemo={() => setState(createDemoState())} />;
  }

  return (
    <>
      <div className="app-shell">
        {route === "home" && (
          <Home
            state={state}
            onOpenModal={openModal}
            onNavigate={navigate}
            onToggleItem={handleToggleItem}
            onMoveOverdue={handleMoveOverdue}
            onMoveAllOverdue={handleMoveAllOverdue}
          />
        )}
        {route === "plan" && (
          <PlanPage
            state={state}
            onOpenModal={openModal}
            onToggleItem={handleToggleItem}
            onUpdateGoalStatus={handleUpdateGoalStatus}
          />
        )}
        {route === "review" && (
          <ReviewPage
            state={state}
            onOpenModal={openModal}
            onNotify={notify}
          />
        )}
        {route === "cycle" && (
          <CyclePage
            state={state}
            month={calendarMonth}
            selectedDate={selectedDate}
            onMonthChange={setCalendarMonth}
            onSelectDay={(date) => {
              setSelectedDate(date);
              if (date > toISO(getToday())) notify("未来日期可查看预测，但不能提前记录身体感受");
              else openModal("daily", date);
            }}
            onOpenModal={openModal}
          />
        )}
        {route === "profile" && (
          <Profile
            state={state}
            storageUsage={storageUsage}
            onOpenModal={openModal}
            onInstall={installApp}
            onSettingChange={updateSetting}
          />
        )}
        <Navigation route={route} onNavigate={navigate} />
      </div>
      <Modal
        modal={modal}
        state={state}
        onClose={closeModal}
        onSaveDaily={saveDaily}
        onSavePeriod={savePeriod}
        onSaveItem={handleSaveItem}
        onDeleteItem={handleDeleteItem}
        onSaveGoal={handleSaveGoal}
        onDeleteGoal={handleDeleteGoal}
        onSaveReview={handleSaveReview}
        onDeleteReview={handleDeleteReview}
        onConvertReview={handleConvertReview}
        onSaveNickname={saveNickname}
        onExport={exportData}
        onImport={importData}
        onReset={resetData}
        onSettingChange={updateSetting}
        onOpenLegal={openLegalPage}
      />
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
