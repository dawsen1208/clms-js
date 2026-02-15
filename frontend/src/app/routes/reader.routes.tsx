import React from "react";
import { Route } from "react-router-dom";

const HomePage = React.lazy(() => import("../../pages/HomePage"));
const SearchPage = React.lazy(() => import("../../pages/SearchPage"));
const BorrowPage = React.lazy(() => import("../../pages/BorrowPage"));
const ReturnPage = React.lazy(() => import("../../pages/ReturnPage"));
const ProfilePage = React.lazy(() => import("../../pages/ProfilePage"));
const SmartAssistant = React.lazy(() => import("../../pages/SmartAssistant"));
const BookDetail = React.lazy(() => import("../../pages/BookDetail"));
const FeedbackPage = React.lazy(() => import("../../pages/FeedbackPage"));
const NotificationPage = React.lazy(() => import("../../pages/NotificationPage"));
const SettingsPage = React.lazy(() => import("../../pages/SettingsPage"));

export const ReaderRoutes = ({ UserLayoutWrapper, appearance, user, setAppearance, setUser }) => (
  <>
    <Route path="/home" element={<UserLayoutWrapper><HomePage appearance={appearance} /></UserLayoutWrapper>} />
    <Route path="/search" element={<UserLayoutWrapper><SearchPage appearance={appearance} /></UserLayoutWrapper>} />
    <Route path="/borrow" element={<UserLayoutWrapper><BorrowPage appearance={appearance} /></UserLayoutWrapper>} />
    <Route path="/return" element={<UserLayoutWrapper><ReturnPage appearance={appearance} /></UserLayoutWrapper>} />
    <Route path="/profile" element={<UserLayoutWrapper><ProfilePage user={user} appearance={appearance} /></UserLayoutWrapper>} />
    <Route path="/assistant" element={<UserLayoutWrapper><SmartAssistant appearance={appearance} /></UserLayoutWrapper>} />
    <Route path="/settings" element={<UserLayoutWrapper><SettingsPage appearance={appearance} onChange={setAppearance} user={user} onUserUpdate={setUser} /></UserLayoutWrapper>} />
    <Route path="/book/:id" element={<UserLayoutWrapper><BookDetail appearance={appearance} /></UserLayoutWrapper>} />
    <Route path="/feedback" element={<UserLayoutWrapper><FeedbackPage appearance={appearance} /></UserLayoutWrapper>} />
    <Route path="/notifications" element={<UserLayoutWrapper><NotificationPage appearance={appearance} /></UserLayoutWrapper>} />
  </>
);
