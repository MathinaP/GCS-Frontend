import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  ShoppingCart,
  MessageSquare,
  Users,
  Truck,
  Package,
  ListOrdered,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';

interface NavItem   { to: string; label: string; icon: React.ReactNode; }
interface NavSection { title: string; items: NavItem[]; }

const sections: NavSection[] = [
  {
    title: '',
    items: [{ to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> }],
  },
  {
    title: 'SALES',
    items: [
      { to: '/invoices',   label: 'Invoice',          icon: <FileText size={18} /> },
      { to: '/proforma',   label: 'Proforma Invoice',  icon: <ClipboardList size={18} /> },
      { to: '/quotations', label: 'Quotation',         icon: <MessageSquare size={18} /> },
    ],
  },
  {
    title: 'PURCHASE',
    items: [
      { to: '/purchase-orders', label: 'Purchase Order', icon: <ShoppingCart size={18} /> },
    ],
  },
  {
    title: 'MASTERS',
    items: [
      { to: '/customers', label: 'Customers', icon: <Users size={18} /> },
      { to: '/suppliers', label: 'Suppliers', icon: <Truck size={18} /> },
      { to: '/materials', label: 'Materials', icon: <Package size={18} /> },
      { to: '/document-counters', label: 'Document Counters', icon: <ListOrdered size={18} /> },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    // AuthContext clears state → ProtectedRoute redirects to /login automatically
  }

  const initials = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col no-print">

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <img
          src="/logo.png"
          alt="Logo"
          className="w-12 h-12 object-contain"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <span className="font-bold text-gray-800 text-sm leading-tight">Go Care Solutions</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {sections.map(section => (
          <div key={section.title} className="mb-4">
            {section.title && (
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
                {section.title}
              </p>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-light text-brand border-l-4 border-brand pl-2'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-2">
        {/* Avatar + name/email */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-brand-light hover:text-brand transition-colors"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        message="Are you sure you want to logout?"
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
        loading={loggingOut}
        confirmLabel="Logout"
        loadingLabel="Logging out..."
      />
    </aside>
  );
}
