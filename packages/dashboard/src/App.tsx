import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ErrorsPage } from './pages/ErrorsPage';
import { ErrorDetailPage } from './pages/ErrorDetailPage';
import { SettingsPage } from './pages/SettingsPage';

function ProtectedLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="errors" element={<ErrorsPage />} />
            <Route path="errors/:id" element={<ErrorDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/" />} />
      <Route
        path="/*"
        element={token ? <ProtectedLayout /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}
