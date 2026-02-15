import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Grid, theme } from "antd";
import "./bookWorld.css";
import { BookmarkNav } from "./BookmarkNav";
import { PageFlipController } from "../../motion/PageFlipController";
import { BookZoomToDetail } from "../../motion/BookZoomToDetail";

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
};

const BookWorldLayout: React.FC<BookWorldLayoutProps> = ({
  left,
  right,
  children,
}) => {
  const { token } = theme.useToken();
  const location = useLocation();
  const currentKey = getKeyFromPath(location.pathname);
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const resolvedLeft =
    left ||
    (
      <div className="book-placeholder">
        <div className="book-placeholder-title">Tips</div>
        <div className="book-placeholder-body">
          Use bookmarks to navigate between sections.
        </div>
      </div>
    );

  return (
    <div className="book-desk">
      <div className="book-desk-texture" />
      <BookZoomToDetail>
        <div
          className="book-frame"
          style={
            {
              "--book-paper": token.colorBgContainer,
            } as React.CSSProperties
          }
        >
          <PageFlipController
            routeKey={currentKey}
            left={resolvedLeft}
            right={right || children}
          />
        </div>
      </BookZoomToDetail>
      <BookmarkNav
        routes={routes}
        currentKey={currentKey}
        onNavigate={(path) => navigate(path)}
        isMobile={isMobile}
      />
    </div>
  );
};

export default BookWorldLayout;
