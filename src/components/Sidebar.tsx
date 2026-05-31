import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  ShoppingCart,
  MessageSquare,
  Users,
  HardDrive,
  Truck,
  Package,
  ListOrdered,
  Ruler,
  LogOut,
  Wrench,
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
    title: 'SERVICE',
    items: [
      { to: '/service-reports', label: 'Service Reports', icon: <Wrench size={18} /> },
    ],
  },
  {
    title: 'MASTERS',
    items: [
      { to: '/customers', label: 'Customers', icon: <Users size={18} /> },
      { to: '/customer-assets', label: 'Customer Assets', icon: <HardDrive size={18} /> },
      { to: '/suppliers', label: 'Suppliers', icon: <Truck size={18} /> },
      { to: '/materials', label: 'Materials', icon: <Package size={18} /> },
      { to: '/document-counters', label: 'Document Counters', icon: <ListOrdered size={18} /> },
      { to: '/units', label: 'Units', icon: <Ruler size={18} /> },
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
    <aside className="no-print flex max-h-[42vh] w-full flex-shrink-0 flex-col border-b border-gray-200 bg-white md:max-h-none md:h-screen md:w-60 md:border-b-0 md:border-r">

      {/* Logo */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 md:justify-start md:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-10 w-10 flex-shrink-0 object-contain md:h-12 md:w-12"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="truncate text-sm font-bold leading-tight text-gray-800 md:whitespace-normal">Go Care Solutions</span>
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex flex-shrink-0 items-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-gray-600 hover:bg-brand-light hover:text-brand md:hidden"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>

      {/* Nav */}
      <nav className="flex gap-2 overflow-x-auto px-2 py-2 md:block md:flex-1 md:overflow-y-auto md:py-4">
        {sections.map(section => (
          <div key={section.title} className="flex flex-shrink-0 gap-2 md:mb-4 md:block">
            {section.title && (
              <p className="mb-1 hidden px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 md:block">
                {section.title}
              </p>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors md:gap-3 md:text-sm ${
                    isActive
                      ? 'bg-brand-light text-brand md:border-l-4 md:border-brand md:pl-2'
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
      <div className="hidden space-y-2 border-t border-gray-100 px-3 py-3 md:block">
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
