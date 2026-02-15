import React from "react";
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
};

export const BookmarkNav: React.FC<BookmarkNavProps> = ({
  routes,
  currentKey,
  onNavigate,
  isMobile,
}) => {
  return (
    <div className={isMobile ? "bookmark-nav bookmark-nav-mobile" : "bookmark-nav"}>
      {routes.map((route) => (
        <button
          key={route.key}
          type="button"
          className={currentKey === route.key ? "bookmark active" : "bookmark"}
          onClick={() => onNavigate(route.path)}
        >
          <span className="bookmark-label">{route.label}</span>
        </button>
      ))}
    </div>
  );
};

