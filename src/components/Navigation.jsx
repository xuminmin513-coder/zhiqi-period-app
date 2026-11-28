import Icon from "./Icon.jsx";

const routes = [
  { id: "home", label: "今天", icon: "home" },
  { id: "plan", label: "计划", icon: "list" },
  { id: "review", label: "复盘", icon: "book" },
  { id: "cycle", label: "经期", icon: "drop" },
  { id: "profile", label: "我的", icon: "user" }
];

export default function Navigation({ route, onNavigate }) {
  return (
    <nav className="tab-bar" aria-label="主要导航">
      {routes.map((item) => (
        <button key={item.id} className={`tab-button ${route === item.id ? "active" : ""}`} onClick={() => onNavigate(item.id)} aria-current={route === item.id ? "page" : undefined}>
          <Icon name={item.icon} size={20} /><span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
