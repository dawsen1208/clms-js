import React from "react";
import { LogoutOutlined } from "@ant-design/icons";
import "./bookWorld.css";

type BookmarkRoute = {
  key: string;
  path: string;
  label: string;
};

type BookmarkNavProps = {
  routes: BookmarkRoute[];
  currentKey: string;
  onNavigate: (path: string) => void;
  isMobile: boolean;
  onLogout?: () => void;
};

export const BookmarkNav: React.FC<BookmarkNavProps> = ({
  routes,
  currentKey,
  onNavigate,
  isMobile,
  onLogout,
}) => {
  const containerClass = isMobile ? "bw-bookmarks bw-bookmarks-mobile" : "bw-bookmarks";

  return (
    <nav className={containerClass}>
      <div className="bw-bookmarks-stack">
        {routes.map((route) => (
          <button
            key={route.key}
            type="button"
            className={currentKey === route.key ? "bw-bookmark active" : "bw-bookmark"}
            onClick={() => onNavigate(route.path)}
          >
            <span className="bw-bookmark-label">{route.label}</span>
          </button>
        ))}
      </div>
      {onLogout && (
        <button
          type="button"
          className="bw-bookmark bw-bookmark-logout"
          onClick={onLogout}
        >
          <LogoutOutlined style={{ fontSize: 14, marginBottom: 4 }} />
          <span className="bw-bookmark-label">Logout</span>
        </button>
      )}
    </nav>
  );
};

