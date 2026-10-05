import { useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Building2,
  Sparkles,
  Gift,
  Upload,
  History,
  Shield,
  Activity,
  ScrollText,
  Files,
  Sun,
  Moon,
  Menu,
  ChevronRight,
  ArrowUpRight,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "../ui/PortalUI";
import AnimatedLink from "../ui/AnimatedLink";
const main = [
  ["overview", "Overview", LayoutDashboard],
  ["transactions", "Transactions", ArrowLeftRight],
  ["vendors", "Merchants", Building2],
  ["insights", "Insights", Sparkles],
  ["rewards", "Rewards", Gift],
];
const admin = [
  ["overview", "Overview", LayoutDashboard],
  ["analyses", "Analyses", Files],
  ["quality", "Quality review", Shield],
  ["usage", "API usage", Activity],
  ["audit", "Audit trail", ScrollText],
];
export default function PortalShell({
  portal = "main",
  activeView,
  onNavigate,
  theme,
  onToggleTheme,
  children,
  actions,
  hasData = true,
}) {
  const [open, setOpen] = useState(false);
  const isAdmin = portal === "admin";
  const items = isAdmin ? admin : main;
  const navigate = (view) => {
    onNavigate(view);
    setOpen(false);
  };
  const label =
    items.find((item) => item[0] === activeView)?.[1] ||
    (activeView === "history" ? "Statement history" : "New analysis");
  return (
    <div className="portal-shell">
      <aside
        className={`portal-sidebar ${open ? "is-open" : ""}`}
        aria-label={isAdmin ? "Admin navigation" : "Main navigation"}
      >
        <a className="portal-brand" href="#/">
          <span className="portal-brand-mark">
            <Wallet size={22} />
          </span>
          <span>
            spend<span className="brand-dot">.</span>
            <small>ANALYSIS WORKSPACE</small>
          </span>
        </a>
        <Button
          className="sidebar-close"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X size={18} />
        </Button>
        <div className="portal-space">
          <span className="space-avatar">
            {isAdmin ? <Shield size={17} /> : <Wallet size={17} />}
          </span>
          <div>
            {isAdmin ? "Administration" : "Personal workspace"}
            <small>
              {isAdmin ? "Operations & oversight" : "Your money, understood"}
            </small>
          </div>
          <ChevronRight size={14} />
        </div>
        <div className="portal-nav-label">
          {isAdmin ? "MANAGE" : "WORKSPACE"}
        </div>
        <nav>
          {items.map(([value, title, Icon]) => (
            <button
              key={value}
              disabled={!isAdmin && !hasData}
              aria-current={activeView === value ? "page" : undefined}
              className={activeView === value ? "active" : ""}
              onClick={() => navigate(value)}
            >
              <Icon size={18} />
              {title}
              {activeView === value && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        {!isAdmin && (
          <>
            <div className="portal-nav-label">STATEMENTS</div>
            <nav>
              <button
                className={activeView === "upload" ? "active" : ""}
                onClick={() => navigate("upload")}
              >
                <Upload size={18} />
                New analysis
              </button>
              <button
                className={activeView === "history" ? "active" : ""}
                onClick={() => navigate("history")}
              >
                <History size={18} />
                History
              </button>
            </nav>
          </>
        )}
        <div className="sidebar-footer">
          <div className="sidebar-note">
            <Shield size={19} />
            <strong>Built for peace of mind</strong>
            <p>Statement data stays out of your browser storage.</p>
          </div>
          <AnimatedLink href={isAdmin ? "#/" : "#/admin/login"}>
            {isAdmin ? "Personal workspace" : "Admin portal"}
            <ArrowUpRight size={15} />
          </AnimatedLink>
          <span className="sidebar-version">Spend Analysis · v2</span>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="portal-main">
        <header className="portal-topbar">
          <div className="portal-breadcrumb">
            <Button
              className="mobile-menu"
              onClick={() => setOpen(!open)}
              aria-label="Open navigation"
              aria-expanded={open}
            >
              <Menu size={20} />
            </Button>
            <span>{isAdmin ? "Admin workspace" : "Workspace"}</span>
            <ChevronRight size={13} />
            <strong>{label}</strong>
          </div>
          <div className="portal-top-actions">
            {actions}
            <Button
              onClick={onToggleTheme}
              aria-label={
                theme === "light" ? "Use dark theme" : "Use light theme"
              }
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </Button>
          </div>
        </header>
        <main className="portal-content">{children}</main>
        <footer className="portal-footer">
          <span>Spend Analysis</span>
          <span>
            Clarity in every transaction.{" "}
            <a href="https://skiper-ui.com/" target="_blank" rel="noreferrer">
              UI details by Skiper UI
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
