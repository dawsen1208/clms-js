import React from "react";
import {
  HomeOutlined,
  SearchOutlined,
  ReadOutlined,
  SwapOutlined,
  RobotOutlined,
  BellOutlined,
  MessageOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import "./bookmark.css";

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

  const iconForRoute = (key: string) => {
    switch (key) {
      case "home":
        return <HomeOutlined />;
      case "search":
        return <SearchOutlined />;
      case "borrow":
        return <ReadOutlined />;
      case "return":
        return <SwapOutlined />;
      case "assistant":
        return <RobotOutlined />;
      case "notifications":
        return <BellOutlined />;
      case "feedback":
        return <MessageOutlined />;
      case "profile":
        return <UserOutlined />;
      case "settings":
        return <SettingOutlined />;
      default:
        return <ReadOutlined />;
    }
  };

  return (
    <nav className={containerClass}>
      <div className="bw-bookmarks-stack">
        {routes.map((route) => (
          <Tooltip key={route.key} title={route.label} placement="right">
            <button
              type="button"
              className={
                currentKey === route.key
                  ? `bw-bookmark bw-bookmark-${route.key} active`
                  : `bw-bookmark bw-bookmark-${route.key}`
              }
              onClick={() => onNavigate(route.path)}
            >
              <span className="bw-bookmark-icon">{iconForRoute(route.key)}</span>
              <span className="bw-bookmark-label">{route.label}</span>
            </button>
          </Tooltip>
        ))}
      </div>
      {onLogout && (
        <Tooltip title="Logout" placement="right">
          <button
            type="button"
            className="bw-bookmark bw-bookmark-logout"
            onClick={onLogout}
          >
            <span className="bw-bookmark-icon">
              <LogoutOutlined />
            </span>
            <span className="bw-bookmark-label">Logout</span>
          </button>
        </Tooltip>
      )}
    </nav>
  );
};
