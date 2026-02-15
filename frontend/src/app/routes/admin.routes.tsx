import React from "react";
import { Route } from "react-router-dom";

const AdminDashboard = React.lazy(() => import("../../pages/AdminDashboard"));
const AdminBookPage = React.lazy(() => import("../../pages/AdminBookPage"));
const AdminBorrowPage = React.lazy(() => import("../../pages/AdminBorrowPage"));
const AdminRequestPage = React.lazy(() => import("../../pages/AdminRequestPage"));
const AdminBorrowHistory = React.lazy(() => import("../../pages/AdminBorrowHistory"));
const AdminUserManagePage = React.lazy(() => import("../../pages/AdminUserManagePage"));
const AdminFeedbackPage = React.lazy(() => import("../../pages/AdminFeedbackPage"));
const AdminProfilePage = React.lazy(() => import("../../pages/AdminProfilePage"));
const AdminSettingsPage = React.lazy(() => import("../../pages/AdminSettingsPage"));

export const AdminRoutes = ({ AdminLayoutWrapper, appearance, setAppearance, user }) => (
  <>
    <Route path="/admin/dashboard" element={<AdminLayoutWrapper><AdminDashboard appearance={appearance} /></AdminLayoutWrapper>} />
    <Route path="/admin/books" element={<AdminLayoutWrapper><AdminBookPage appearance={appearance} /></AdminLayoutWrapper>} />
    <Route path="/admin/borrow" element={<AdminLayoutWrapper><AdminBorrowPage appearance={appearance} /></AdminLayoutWrapper>} />
    <Route path="/admin/requests" element={<AdminLayoutWrapper><AdminRequestPage appearance={appearance} /></AdminLayoutWrapper>} />
    <Route path="/admin/history" element={<AdminLayoutWrapper><AdminBorrowHistory appearance={appearance} /></AdminLayoutWrapper>} />
    <Route path="/admin/users" element={<AdminLayoutWrapper><AdminUserManagePage appearance={appearance} /></AdminLayoutWrapper>} />
    <Route path="/admin/feedback" element={<AdminLayoutWrapper><AdminFeedbackPage appearance={appearance} /></AdminLayoutWrapper>} />
    <Route path="/admin/profile" element={<AdminLayoutWrapper><AdminProfilePage appearance={appearance} /></AdminLayoutWrapper>} />
    <Route path="/admin/settings" element={<AdminLayoutWrapper><AdminSettingsPage appearance={appearance} onChange={setAppearance} user={user} /></AdminLayoutWrapper>} />
  </>
);

