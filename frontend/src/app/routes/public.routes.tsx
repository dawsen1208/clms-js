import React from "react";
import { Route } from "react-router-dom";

const LoginPage = React.lazy(() => import("../../pages/LoginPage"));
const RegisterReader = React.lazy(() => import("../../pages/RegisterReader"));
const RegisterAdmin = React.lazy(() => import("../../pages/RegisterAdmin"));

export const PublicRoutes = ({ handleLogin }) => (
  <>
    <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
    <Route path="/register" element={<RegisterReader />} />
    <Route path="/register-admin" element={<RegisterAdmin />} />
  </>
);

