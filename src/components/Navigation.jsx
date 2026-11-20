import Icon from "./Icon.jsx";

const routes = [
  { id: "home", label: "今天", icon: "home" },
  { id: "calendar", label: "日历", icon: "calendar" },
  { id: "trends", label: "趋势", icon: "chart" },
  { id: "profile", label: "我的", icon: "user" }
];

export default function Navigation({ route, onNavigate }) {
  return (
    <nav className="tab-bar" aria-label="主要导航">
      {routes.map((item) => (
        <button key={item.id} className={`tab-button ${route === item.id ? "active" : ""}`} onClick={() => onNavigate(item.id)} aria-current={route === item.id ? "page" : undefined}>
          <Icon name={item.icon} size={21} /><span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
