import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Grid, theme } from "antd";
import { PageFlipTransition } from "../../motion/PageFlipTransition";
import { useMotionPref } from "../../motion/MotionProvider";
import "./bookWorld.css";

const routes = [
  { key: "home", path: "/home", label: "Home" },
  { key: "search", path: "/search", label: "Search" },
  { key: "borrow", path: "/borrow", label: "Borrow" },
  { key: "return", path: "/return", label: "Return" },
  { key: "assistant", path: "/assistant", label: "Assistant" },
  { key: "notifications", path: "/notifications", label: "Inbox" },
  { key: "feedback", path: "/feedback", label: "Feedback" },
  { key: "profile", path: "/profile", label: "Profile" },
  { key: "settings", path: "/settings", label: "Settings" },
];

const getKeyFromPath = (pathname: string) => {
  const seg = pathname.split("/").filter(Boolean)[0] || "home";
  return seg;
};

const BookWorldLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = theme.useToken();
  const location = useLocation();
  const curKey = getKeyFromPath(location.pathname);
  const navigate = useNavigate();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { motionEnabled } = useMotionPref();

  const nav = useMemo(() => routes, []);

  return (
    <div className="book-world-frame" style={{ "--book-bg": token.colorBgLayout } as React.CSSProperties}>
      <div className="book-cover-left" />
      <div className="book-page-right">
        <PageFlipTransition>
          <div style={{ height: "100%", minHeight: "100vh" }}>
            {children}
          </div>
        </PageFlipTransition>
      </div>
      <div className="bookmark-nav">
        {nav.map((n) => (
          <div
            key={n.key}
            className={`bookmark ${curKey === n.key ? "active" : ""}`}
            onClick={() => navigate(n.path)}
          >
            {n.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookWorldLayout;

