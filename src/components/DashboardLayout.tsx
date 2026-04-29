import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Home, Calendar, Search, Pill, Activity, MessageSquare, Settings, LogOut,
  Users, DollarSign, Shield, BarChart3, Stethoscope, FileText, Bell, User, X, Check, Dna, LifeBuoy, Brain, Menu
} from "lucide-react";
import { AppLogoMark } from "@/components/AppLogoMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import UserAvatar from "@/components/UserAvatar";


const navItems: Record<UserRole, { icon: any; labelKey: string; path: string }[]> = {
  patient: [
    { icon: Home, labelKey: "nav.dashboard", path: "/dashboard/patient" },
    { icon: Search, labelKey: "nav.findDoctors", path: "/dashboard/patient/doctors" },
    { icon: Calendar, labelKey: "nav.appointments", path: "/dashboard/patient/appointments" },
    { icon: Stethoscope, labelKey: "nav.consultations", path: "/dashboard/patient/consultations" },
    { icon: Activity, labelKey: "nav.healthData", path: "/dashboard/patient/health" },
    { icon: Dna, labelKey: "nav.dnaProfile", path: "/dashboard/patient/dna" },
    { icon: Activity, labelKey: "nav.virtualTwin", path: "/dashboard/patient/twin" },
    { icon: Pill, labelKey: "nav.pharmacy", path: "/dashboard/patient/pharmacy" },
    { icon: FileText, labelKey: "nav.prescriptions", path: "/dashboard/patient/prescriptions" },
    { icon: MessageSquare, labelKey: "nav.messages", path: "/dashboard/patient/messages" },
    { icon: Brain, labelKey: "nav.careIntelligence", path: "/dashboard/patient/care-intelligence" },
    { icon: LifeBuoy, labelKey: "nav.support", path: "/dashboard/patient/support" },
    { icon: Settings, labelKey: "nav.settings", path: "/dashboard/patient/settings" },
  ],
  doctor: [
    { icon: Home, labelKey: "nav.dashboard", path: "/dashboard/doctor" },
    { icon: Users, labelKey: "nav.patients", path: "/dashboard/doctor/patients" },
    { icon: Calendar, labelKey: "nav.appointments", path: "/dashboard/doctor/appointments" },
    { icon: Stethoscope, labelKey: "nav.consultations", path: "/dashboard/doctor/consultations" },
    { icon: FileText, labelKey: "nav.prescriptions", path: "/dashboard/doctor/prescriptions" },
    { icon: DollarSign, labelKey: "nav.earnings", path: "/dashboard/doctor/earnings" },
    { icon: MessageSquare, labelKey: "nav.messages", path: "/dashboard/doctor/messages" },
    { icon: Brain, labelKey: "nav.careIntelligence", path: "/dashboard/doctor/care-intelligence" },
    { icon: Pill, labelKey: "nav.pharmacy", path: "/dashboard/doctor/pharmacy" },
    { icon: LifeBuoy, labelKey: "nav.support", path: "/dashboard/doctor/support" },
    { icon: Settings, labelKey: "nav.settings", path: "/dashboard/doctor/settings" },
  ],
  admin: [
    { icon: Home, labelKey: "nav.dashboard", path: "/dashboard/admin" },
    { icon: Users, labelKey: "nav.users", path: "/dashboard/admin/users" },
    { icon: Stethoscope, labelKey: "nav.doctors", path: "/dashboard/admin/doctors" },
    { icon: DollarSign, labelKey: "nav.revenue", path: "/dashboard/admin/revenue" },
    { icon: Pill, labelKey: "nav.pharmacy", path: "/dashboard/admin/pharmacy" },
    { icon: Shield, labelKey: "nav.compliance", path: "/dashboard/admin/compliance" },
    { icon: LifeBuoy, labelKey: "nav.supportDesk", path: "/dashboard/admin/support" },
    { icon: BarChart3, labelKey: "nav.analytics", path: "/dashboard/admin/analytics" },
    { icon: Settings, labelKey: "nav.settings", path: "/dashboard/admin/settings" },
  ],
};

const roleGradients: Record<UserRole, string> = {
  patient: "from-primary to-accent",
  doctor: "from-accent to-primary",
  admin: "from-admin to-accent",
};

const NotificationDropdown = ({ show, onClose }: { show: boolean, onClose: () => void }) => {
  const { t } = useTranslation();
  const [notifications, refreshNotifications] = useAsyncSync(getNotifications, []);
  const unreadCount = notifications.filter(n => !n.read).length;

  const notifIcon = (type: string) => {
    if (type === "appointment") return <Calendar className="w-4 h-4 text-primary" />;
    if (type === "prescription") return <Pill className="w-4 h-4 text-accent" />;
    if (type === "pharmacy") return <Pill className="w-4 h-4 text-primary" />;
    return <Bell className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="relative shrink-0">
      <button type="button" className="relative p-2 rounded-xl hover:bg-secondary transition-colors" onClick={onClose}>
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground text-xs font-bold">{unreadCount}</span>
        )}
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-12 right-0 w-80 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-heading font-semibold text-sm">{t("layout.notifications")}</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button type="button" onClick={async () => { await markAllNotificationsRead(); refreshNotifications(); }} className="text-xs text-primary hover:underline">{t("layout.markAllRead")}</button>
                )}
                <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">{t("layout.noNotifications")}</p>
              ) : (
                notifications.slice(0, 10).map(n => (
                  <button
                    key={n.id}
                    onClick={async () => { await markNotificationRead(n.id); refreshNotifications(); }}
                    className={`w-full flex items-start gap-3 p-3 text-left hover:bg-secondary/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className="mt-0.5">{notifIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? "font-medium" : ""}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DashboardLayout = ({ children, role }: { children: ReactNode; role: UserRole }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { userName, logout, ready, isAuthenticated, role: authRole, avatar } = useAuth();
  const items = navItems[role];
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (authRole !== role) {
      navigate(authRole ? `/dashboard/${authRole}` : "/login");
    }
  }, [ready, isAuthenticated, authRole, role, navigate]);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`w-64 bg-sidebar flex flex-col shrink-0 fixed inset-y-0 left-0 z-50 md:relative transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-5 border-b border-sidebar-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl overflow-hidden ring-2 ring-white/10 shrink-0 bg-gradient-to-br ${roleGradients[role]} p-0.5`}>
              <AppLogoMark title="" className="w-full h-full rounded-[10px]" />
            </div>
            <div>
              <span className="font-heading text-sm font-bold text-sidebar-foreground">{t("app.name")}</span>
              <p className="text-xs text-sidebar-foreground/50">
                {t("layout.panel", { role: t(`roles.${role}`) })}
              </p>
            </div>
          </div>
          <button className="md:hidden text-sidebar-foreground/70" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = location.pathname === item.path || (item.path !== `/dashboard/${role}` && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <UserAvatar
              avatar={avatar ?? ""}
              name={userName}
              className="w-8 h-8 bg-primary/10 text-primary text-xs"
            />

            <div>
              <p className="text-sm font-medium text-sidebar-foreground">{userName}</p>
              <p className="text-xs text-sidebar-foreground/50">{t(`roles.${role}`)}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" /> {t("layout.signOut")}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 bg-card shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-heading font-semibold text-foreground truncate min-w-0 text-lg">
              {(() => {
                const active = items.find(
                  (i) => location.pathname === i.path || (i.path !== `/dashboard/${role}` && location.pathname.startsWith(i.path))
                );
                return active ? t(active.labelKey) : t("layout.dashboardFallback");
              })()}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 relative shrink-0">
            <LanguageSwitcher />
            <NotificationDropdown show={showNotifications} onClose={() => setShowNotifications(!showNotifications)} />

            <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-border">
              <div className="text-right">
                <p className="text-xs font-bold text-foreground leading-none">{userName}</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-1 uppercase tracking-wider">{role}</p>
              </div>
              <UserAvatar
                avatar={avatar ?? ""}
                name={userName}
                className="w-9 h-9 bg-primary/10 text-primary border border-border text-xs"
              />

            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6" onClick={() => showNotifications && setShowNotifications(false)}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
