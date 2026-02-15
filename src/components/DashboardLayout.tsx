import { useState, useMemo, memo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Activity, MessageSquare, AlertCircle, User as UserIcon, Bell, LogOut, Menu, X, Globe } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useLanguage, type Language } from '../context/LanguageContext';

interface DashboardLayoutProps {
    children?: React.ReactNode;
}

interface SidebarContentProps {
  user: User | null;
  role: string | null;
  navigation: any[];
  pathname: string;
  signOut: () => Promise<void>;
  onClose: () => void;
  navigate: (path: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const SidebarContent = memo(({ user, role, navigation, pathname, signOut, onClose, navigate, language, setLanguage }: SidebarContentProps) => (
  // ... existing JSX
  <div className="flex flex-col h-full pt-8 bg-[#1e293b] md:bg-[#1e293b]/50 backdrop-blur-xl border-r border-white/5 overflow-y-auto">
    <div className="flex items-center flex-shrink-0 px-6 mb-8 group cursor-pointer">
       <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/20 transition-all mr-3">
          <Activity className="h-6 w-6 text-white" />
       </div>
       <div className="flex flex-col">
         <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">HealthMonitor</span>
       </div>
    </div>

    <div className="px-6 mb-6">
      <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/5">
        <Globe className="h-4 w-4 text-blue-400" />
        <select 
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-400 focus:outline-none cursor-pointer hover:text-white transition-colors flex-1"
        >
          <option value="en" className="bg-slate-800">English</option>
          <option value="ta" className="bg-slate-800">தமிழ்</option>
          <option value="hi" className="bg-slate-800">हिन्दी</option>
          <option value="es" className="bg-slate-800">Español</option>
        </select>
      </div>
    </div>
    
    <div className="flex-grow flex flex-col">
      <nav className="flex-1 px-3 space-y-2">
        {navigation.filter(item => item.show !== false).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={`${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              } group flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200`}
            >
              <item.icon
                className={`${
                  isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                } mr-3 flex-shrink-0 h-5 w-5 transition-colors`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>

    <div className="flex-shrink-0 p-4 border-t border-white/5 pb-20 md:pb-4">
      <div className="bg-slate-800/40 rounded-2xl p-4 border border-white/5">
        <div className="flex items-center mb-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500/20 to-teal-400/20 flex items-center justify-center border border-white/10">
             <UserIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-bold text-white truncate">
              {user?.email?.split('@')[0]}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              {role} portal
            </p>
          </div>
        </div>
        <button
          id="logout-button"
          onClick={async (e) => {
            e.preventDefault();
            console.log('[Sidebar] Sign out initiated');
            onClose();
            try {
              // Start signout
              signOut().catch(err => console.error('signOut error:', err));
              // Navigate to landing page for portal selection
              navigate('/');
              // Fallback for safety
              setTimeout(() => {
                if (window.location.pathname !== '/') {
                  window.location.href = '/';
                }
              }, 400);
            } catch (err) {
              window.location.href = '/';
            }
          }}
          className="w-full flex items-center justify-center px-3 py-2 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-red-500/20 rounded-lg transition-all group"
        >
          <LogOut className="h-3.5 w-3.5 mr-2 group-hover:translate-x-0.5 transition-transform" />
          Sign out
        </button>
      </div>
    </div>
  </div>
));

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut, user, role } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = useMemo(() => [
    { 
      name: t('dashboard') || 'Dashboard', 
      href: (role === 'doctor' || role === 'caretaker') ? '/dashboard/caretaker' : role === 'admin' ? '/admin' : '/dashboard/patient', 
      icon: LayoutDashboard 
    },
    // Patient Features
    { name: t('reminders') || 'Reminders', href: '/reminders', icon: Bell, show: role === 'patient' },
    { name: t('chat') || 'AI Chat', href: '/chat', icon: MessageSquare, show: role === 'patient' },
    { name: t('emergency') || 'Emergency', href: '/emergency', icon: AlertCircle, show: role === 'patient' },
    
    // Doctor/Caretaker Features
    { name: t('patient_directory') || 'Patient Directory', href: '/dashboard/caretaker', icon: UserIcon, show: role === 'doctor' || role === 'caretaker' },
    
    // Admin Features
    { name: t('system_logs') || 'System Logs', href: '/admin', icon: Activity, show: role === 'admin' },

    // General Features
    { name: t('my_profile') || 'My Profile', href: '/profile', icon: UserIcon },
  ], [t, role]);

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-inter relative">
      {/* Mobile Header */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-[#1e293b]/80 backdrop-blur-lg border-b border-white/5 flex items-center justify-between px-4 z-40">
        <div className="flex items-center">
          <Activity className="h-6 w-6 text-blue-400 mr-2" />
          <span className="font-bold text-white">HealthMonitor</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col relative z-20">
        <SidebarContent 
            user={user} 
            role={role} 
            navigation={navigation} 
            pathname={location.pathname} 
            signOut={signOut} 
            onClose={() => {}}
            navigate={navigate}
            language={language}
            setLanguage={setLanguage}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[45]" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`md:hidden fixed inset-y-0 left-0 w-72 z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent 
            user={user} 
            role={role} 
            navigation={navigation} 
            pathname={location.pathname} 
            signOut={signOut} 
            onClose={() => setIsMobileMenuOpen(false)}
            navigate={navigate}
            language={language}
            setLanguage={setLanguage}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 relative overflow-hidden pt-16 md:pt-0">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-600/5 blur-[120px] pointer-events-none rounded-full" />

        <main className="flex-1 relative overflow-y-auto focus:outline-none custom-scrollbar pb-10">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
              {children || <Outlet />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
