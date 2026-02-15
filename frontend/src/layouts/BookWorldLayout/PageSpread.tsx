import React from "react";
import { HomeLeft, HomeRight } from "../../pages/HomePage";
import { SearchLeftPanel, SearchRightPanel } from "../../pages/SearchPage";
import { BorrowLeftPanel, BorrowRightPanel } from "../../pages/BorrowPage";
import { BookDetailLeft, BookDetailRight } from "../../pages/BookDetail";
import { ReturnLeftPanel, ReturnRightPanel } from "../../pages/ReturnPage";
import { AssistantLeftPanel } from "../../pages/SmartAssistant";
import { ProfileLeftPanel } from "../../pages/ProfilePage";
import { FeedbackLeftPanel } from "../../pages/FeedbackPage";
import { NotificationLeftPanel } from "../../pages/NotificationPage";

export type PageSpreadResult = {
  left: React.ReactNode;
  right: React.ReactNode;
};

type PageSpreadProps = {
  routeKey: string;
  children?: React.ReactNode;
};

const PlaceholderLeft: React.FC<{ routeKey: string }> = ({ routeKey }) => {
  return (
    <div className="book-placeholder">
      <div className="book-placeholder-title">Tips</div>
      <div className="book-placeholder-body">
        You are on the <strong>{routeKey}</strong> page. Use the bookmarks on
        the left to switch sections, or explore the main content on the right.
      </div>
    </div>
  );
};

const BorrowLeft: React.FC = () => {
  return (
    <div className="book-placeholder">
      <div className="book-placeholder-title">Borrowing</div>
      <div className="book-placeholder-body">
        View your current loans on the right page and manage renew requests
        here.
      </div>
    </div>
  );
};

const ReturnLeft: React.FC = () => {
  return (
    <div className="book-placeholder">
      <div className="book-placeholder-title">Returns</div>
      <div className="book-placeholder-body">
        Track your recent borrow and return history and plan upcoming returns.
      </div>
    </div>
  );
};

const AssistantLeft: React.FC = () => {
  return (
    <div className="book-placeholder">
      <div className="book-placeholder-title">Assistant</div>
      <div className="book-placeholder-body">
        Ask questions about books, borrowing rules, or get recommendations.
      </div>
    </div>
  );
};

const ProfileLeft: React.FC = () => {
  return (
    <div className="book-placeholder">
      <div className="book-placeholder-title">Profile</div>
      <div className="book-placeholder-body">
        Manage your personal information and see your reading statistics.
      </div>
    </div>
  );
};

const SettingsLeft: React.FC = () => {
  return (
    <div className="book-placeholder">
      <div className="book-placeholder-title">Settings</div>
      <div className="book-placeholder-body">
        Adjust appearance, accessibility, and notification preferences.
      </div>
    </div>
  );
};

const FeedbackLeft: React.FC = () => {
  return (
    <div className="book-placeholder">
      <div className="book-placeholder-title">Feedback</div>
      <div className="book-placeholder-body">
        Share your thoughts about the system to help us improve it.
      </div>
    </div>
  );
};

const NotificationsLeft: React.FC = () => {
  return (
    <div className="book-placeholder">
      <div className="book-placeholder-title">Notifications</div>
      <div className="book-placeholder-body">
        Check messages from the library about your loans and requests.
      </div>
    </div>
  );
};

const BookDetailLeft: React.FC = () => {
  return (
    <div className="book-placeholder">
      <div className="book-placeholder-title">Book Detail</div>
      <div className="book-placeholder-body">
        Explore the book information, reviews, and borrow status on the right.
      </div>
    </div>
  );
};

export const getPageSpread = ({
  routeKey,
  children,
}: PageSpreadProps): PageSpreadResult => {
  switch (routeKey) {
    case "home":
      return {
        left: <HomeLeft />,
        right: <HomeRight />,
      };
    case "search":
      return {
        left: <SearchLeftPanel />,
        right: <SearchRightPanel />,
      };
    case "borrow":
      return {
        left: <BorrowLeftPanel />,
        right: <BorrowRightPanel />,
      };
    case "return":
      return {
        left: <ReturnLeftPanel />,
        right: <ReturnRightPanel />,
      };
    case "assistant":
      return {
        left: <AssistantLeftPanel />,
        right: children ?? null,
      };
    case "profile":
      return {
        left: <ProfileLeftPanel />,
        right: children ?? null,
      };
    case "settings":
      return {
        left: <SettingsLeft />,
        right: children ?? null,
      };
    case "feedback":
      return {
        left: <FeedbackLeftPanel />,
        right: children ?? null,
      };
    case "notifications":
      return {
        left: <NotificationLeftPanel />,
        right: children ?? null,
      };
    case "book":
      return {
        left: <BookDetailLeft />,
        right: <BookDetailRight />,
      };
    default:
      return {
        left: <PlaceholderLeft routeKey={routeKey} />,
        right: children ?? null,
      };
  }
};
