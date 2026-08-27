import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth-context';
import {
  LayoutDashboard,
  FileText,
  Pill,
  Clock,
  Activity,
  Sparkles,
  Share2,
  AlertCircle,
  Download,
  User,
  Shield,
  LogOut,
  Menu,
  X,
  HeartPulse,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, activeProfile, setActiveProfile, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <HeartPulse className="w-10 h-10 text-sky-600 animate-pulse" />
          <p className="text-slate-600 font-medium text-sm">Loading Prescriptionly...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Prescriptions', path: '/prescriptions', icon: Pill },
    { label: 'Treatments', path: '/treatments', icon: HeartPulse },
    { label: 'Document Vault', path: '/documents', icon: FileText },
    { label: 'Timeline', path: '/timeline', icon: Clock },
    { label: 'Symptoms', path: '/symptoms', icon: Activity },
    { label: 'AI Assistant', path: '/assistant', icon: Sparkles, tag: 'Coming soon' },
    { label: 'Health Summary', path: '/summaries', icon: FileText },
    { label: 'Exports', path: '/exports', icon: Download },
    { label: 'Sharing', path: '/sharing', icon: Share2 },
    { label: 'Emergency Card', path: '/emergency', icon: AlertCircle },
    { label: 'Profile Settings', path: '/profile', icon: User },
    ...(user.isAdmin ? [{ label: 'Admin Ops', path: '/admin', icon: Shield }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-sky-600" />
          <span className="font-bold text-lg tracking-tight text-slate-900">Prescriptionly</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded text-slate-600 hover:bg-slate-100"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-40 transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">Prescriptionly</h1>
            <p className="text-xs text-slate-500">Personal Health Wallet</p>
          </div>
        </div>

        {/* Patient Profile Switcher */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Active Patient
          </label>
          <select
            value={activeProfile?.id || ''}
            onChange={(e) => {
              const selected = user.patientProfiles.find((p) => p.id === e.target.value);
              if (selected) setActiveProfile(selected);
            }}
            className="input-field py-1.5 text-xs font-medium"
          >
            {user.patientProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName} {p.isPrimary ? '(Primary)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.tag && (
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                    {item.tag}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-xs font-medium text-slate-900 truncate">{user.email}</p>
              <p className="text-[11px] text-slate-500 truncate">{activeProfile?.displayName || 'User'}</p>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
