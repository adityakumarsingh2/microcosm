import { Navigate, Route, Routes } from "react-router-dom";
import { AuthPage } from "../auth/AuthPage";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { WorkspaceApp } from "../workspace/WorkspaceApp";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<WorkspaceApp />} />
      </Route>
    </Routes>
  );
}
