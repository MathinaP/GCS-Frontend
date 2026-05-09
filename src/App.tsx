import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import MaterialsPage from './pages/MaterialsPage';
import CustomersPage from './pages/CustomersPage';
import DocumentCountersPage from './pages/DocumentCountersPage';
import SuppliersPage from './pages/SuppliersPage';
import DocumentListPage from './pages/documents/DocumentListPage';
import DocumentFormPage from './pages/documents/DocumentFormPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

/** Redirects unauthenticated users to /login */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Redirects already-logged-in users away from /login */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={<PublicRoute><LoginPage /></PublicRoute>}
              />

              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />

                {/* Invoices */}
                <Route path="invoices"     element={<DocumentListPage type="invoice" />} />
                <Route path="invoices/new" element={<DocumentFormPage type="invoice" />} />
                <Route path="invoices/:id" element={<DocumentFormPage type="invoice" />} />

                {/* Proforma */}
                <Route path="proforma"     element={<DocumentListPage type="proforma_invoice" />} />
                <Route path="proforma/new" element={<DocumentFormPage type="proforma_invoice" />} />
                <Route path="proforma/:id" element={<DocumentFormPage type="proforma_invoice" />} />

                {/* Purchase Orders */}
                <Route path="purchase-orders"     element={<DocumentListPage type="purchase_order" />} />
                <Route path="purchase-orders/new" element={<DocumentFormPage type="purchase_order" />} />
                <Route path="purchase-orders/:id" element={<DocumentFormPage type="purchase_order" />} />

                {/* Quotations */}
                <Route path="quotations"     element={<DocumentListPage type="quotation" />} />
                <Route path="quotations/new" element={<DocumentFormPage type="quotation" />} />
                <Route path="quotations/:id" element={<DocumentFormPage type="quotation" />} />

                {/* Masters */}
                <Route path="customers" element={<CustomersPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="materials" element={<MaterialsPage />} />
                <Route path="document-counters" element={<DocumentCountersPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
