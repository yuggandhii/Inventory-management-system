import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

import DashboardPage from './pages/DashboardPage';
import ReceiptsListPage from './pages/ReceiptsListPage';
import ReceiptCreatePage from './pages/ReceiptCreatePage';
import ReceiptDetailPage from './pages/ReceiptDetailPage';
import DeliveriesListPage from './pages/DeliveriesListPage';
import DeliveryCreatePage from './pages/DeliveryCreatePage';
import DeliveryDetailPage from './pages/DeliveryDetailPage';
import StockPage from './pages/StockPage';
import MoveHistoryPage from './pages/MoveHistoryPage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
        <h1 style={{ fontWeight: 900, fontSize: 48, textTransform: 'uppercase', letterSpacing: 2 }}>404</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 8, marginBottom: 24, fontSize: 15 }}>
          This page doesn't exist.
        </p>
        <a href="/dashboard" className="btn btn-primary">← Back to Dashboard</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              border: '3px solid #000',
              borderRadius: '8px',
              boxShadow: '4px 4px 0px #000',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            },
            success: { style: { background: '#DCFCE7', color: '#166534' } },
            error: { style: { background: '#FEE2E2', color: '#991B1B' } },
          }}
        />
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected routes inside Layout */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/receipts" element={<ReceiptsListPage />} />
            <Route path="/receipts/new" element={<ReceiptCreatePage />} />
            <Route path="/receipts/:id" element={<ReceiptDetailPage />} />
            <Route path="/deliveries" element={<DeliveriesListPage />} />
            <Route path="/deliveries/new" element={<DeliveryCreatePage />} />
            <Route path="/deliveries/:id" element={<DeliveryDetailPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/move-history" element={<MoveHistoryPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Redirects & fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
