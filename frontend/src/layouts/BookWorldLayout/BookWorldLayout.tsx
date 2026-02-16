import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Grid, theme } from "antd";
import "./bookWorld.css";
import { BookmarkNav } from "./BookmarkNav";
import { PageFlipController } from "../../motion/PageFlipController";
import { BookZoomToDetail } from "../../motion/BookZoomToDetail";
import { getPageSpread } from "./PageSpread";

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

type BookWorldLayoutProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  onLogout?: () => void;
};

const BookWorldLayout: React.FC<BookWorldLayoutProps> = ({
  left,
  right,
  children,
  onLogout,
}) => {
  const { token } = theme.useToken();
  const location = useLocation();
  const currentKey = getKeyFromPath(location.pathname);
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const spread = getPageSpread({
    routeKey: currentKey,
    children: right || children,
  });

  const resolvedLeft = left ?? spread.left;
  const resolvedRight = right ?? spread.right;

  return (
    <div
      className="bw-root"
      style={
        {
          "--book-w": "min(1920px, 98vw)",
          "--book-h": "min(1040px, 94vh)",
          "--bookmark-rail": "110px",
          "--book-paper": token.colorBgContainer,
        } as React.CSSProperties
      }
    >
      <div className="bw-desk" />
      <div className="bw-stage">
        <BookZoomToDetail>
          <div className="bw-book">
            <PageFlipController
              routeKey={currentKey}
              left={resolvedLeft}
              right={resolvedRight}
            />
          </div>
        </BookZoomToDetail>
        <BookmarkNav
          routes={routes}
          currentKey={currentKey}
          onNavigate={(path) => navigate(path)}
          isMobile={isMobile}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
};

export default BookWorldLayout;
