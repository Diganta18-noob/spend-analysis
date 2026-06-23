import React from "react";
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { useAuth } from "./auth/AuthProvider";

export default function Navbar({ currentRoute, onNavigate, hasData, theme, toggleTheme }) {
  const { isClerkEnabled, isSignedIn, userEmail } = useAuth();

  return (
    <nav style={styles.nav}>
      <div style={styles.brand} onClick={() => onNavigate("#/")}>
        <span style={styles.logo}>💸</span>
        <span style={styles.brandText}>Spend Analysis</span>
      </div>

      <div style={styles.links}>
        <button
          onClick={() => onNavigate("#/")}
          style={{
            ...styles.linkBtn,
            color: currentRoute === "#/" ? "#fbbf24" : "var(--app-text)",
            background: currentRoute === "#/" ? "var(--app-hover-bg)" : "none",
          }}
        >
          Upload
        </button>
        {hasData && (
          <button
            onClick={() => onNavigate("#/dashboard")}
            style={{
              ...styles.linkBtn,
              color: currentRoute === "#/dashboard" ? "#fbbf24" : "var(--app-text)",
              background: currentRoute === "#/dashboard" ? "var(--app-hover-bg)" : "none",
            }}
          >
            Dashboard
          </button>
        )}
        {isClerkEnabled && isSignedIn && (
          <button
            onClick={() => onNavigate("#/history")}
            style={{
              ...styles.linkBtn,
              color: currentRoute === "#/history" ? "#fbbf24" : "var(--app-text)",
              background: currentRoute === "#/history" ? "var(--app-hover-bg)" : "none",
            }}
          >
            History
          </button>
        )}
      </div>

      <div style={styles.actions}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={styles.themeToggle}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* Clerk Auth Section */}
        {isClerkEnabled && (
          <div style={styles.authWrapper}>
            {isSignedIn ? (
              <div style={styles.profileSection}>
                <span style={styles.userEmail} title={userEmail}>
                  {userEmail ? (userEmail.length > 20 ? userEmail.slice(0, 17) + "..." : userEmail) : ""}
                </span>
                <UserButton afterSignOutUrl={window.location.origin} />
              </div>
            ) : (
              <SignInButton mode="modal">
                <button className="navbar-login-btn" style={styles.loginBtn}>Sign In</button>
              </SignInButton>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    background: "var(--app-card-solid)",
    borderBottom: "1px solid var(--app-border)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(12px)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  logo: {
    fontSize: "24px",
  },
  brandText: {
    fontWeight: 800,
    fontSize: "18px",
    color: "var(--app-text-h)",
    fontFamily: "'DM Sans', sans-serif",
  },
  links: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  linkBtn: {
    background: "none",
    border: "none",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "8px 16px",
    borderRadius: "10px",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  themeToggle: {
    background: "none",
    border: "1px solid var(--app-border)",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    color: "var(--app-text)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    transition: "all 0.2s ease",
  },
  authWrapper: {
    display: "flex",
    alignItems: "center",
  },
  profileSection: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  userEmail: {
    fontSize: "12px",
    color: "var(--app-text-muted)",
    fontWeight: 500,
    maxWidth: "150px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  loginBtn: {
    background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    color: "#0a0a0a",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  }
};
