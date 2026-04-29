import { Routes, Route } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, DollarSign, Shield, Stethoscope, TrendingUp, CheckCircle, XCircle, BarChart3, Clock, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import UserAvatar from "@/components/UserAvatar";

import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import UsersManagement from "./admin/UsersManagement";
import DoctorsManagement from "./admin/DoctorsManagement";
import Revenue from "./admin/Revenue";
import AdminPharmacy from "./admin/AdminPharmacy";
import Compliance from "./admin/Compliance";
import Analytics from "./admin/Analytics";
import AdminSettings from "./admin/AdminSettings";
import SupportDesk from "./admin/SupportDesk";
import { getAdminStats, approveDoctor, rejectDoctor, updateComplianceStatus } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import type { AdminStats } from "@/types/store";

const emptyAdminStats: AdminStats = {
  totalRevenue: 0,
  completedRevenue: 0,
  pendingRevenue: 0,
  pharmacyRevenue: 0,
  totalUsers: 0,
  activeDoctors: 0,
  pendingDoctors: 0,
  totalAppointments: 0,
  completedAppointments: 0,
  totalStock: 0,
  totalSold: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  openIssues: 0,
  resolvedIssues: 0,
  complianceScore: 100,
  patients: [],
  doctors: [],
  appointments: [],
  earnings: [],
  orders: [],
  medicines: [],
  issues: [],
};

const Overview = () => {
  const [stats] = useAsyncSync(getAdminStats, emptyAdminStats);
  const { toast } = useToast();
  const totalRev = stats.totalRevenue + stats.pharmacyRevenue;

  const revenueBreakdown = [
    { source: "Consultations", amount: stats.completedRevenue, percentage: totalRev > 0 ? Math.round((stats.completedRevenue / totalRev) * 100) : 0 },
    { source: "Pharmacy Orders", amount: stats.pharmacyRevenue, percentage: totalRev > 0 ? Math.round((stats.pharmacyRevenue / totalRev) * 100) : 0 },
    { source: "Pending", amount: stats.pendingRevenue, percentage: totalRev > 0 ? Math.round((stats.pendingRevenue / totalRev) * 100) : 0 },
  ];

  const pendingDoctors = stats.doctors.filter(d => d.approved === false);
  const openIssues = stats.issues.filter(i => i.status !== "Resolved").slice(0, 3);

  return (
    <div className="space-y-6">
      <div><h2 className="font-heading text-2xl font-bold">Platform Overview 🛡️</h2><p className="text-muted-foreground">MediConnect+ administrative control center</p></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats.totalUsers} change={`${stats.totalUsers} registered`} positive icon={<Users className="w-5 h-5 text-primary-foreground" />} />
        <StatCard title="Active Doctors" value={stats.activeDoctors} change={`${stats.pendingDoctors} pending`} positive icon={<Stethoscope className="w-5 h-5 text-primary-foreground" />} />
        <StatCard title="Total Revenue" value={`$${totalRev.toLocaleString()}`} change={`${stats.earnings.length} txns`} positive icon={<DollarSign className="w-5 h-5 text-primary-foreground" />} />
        <StatCard title="Compliance" value={`${stats.complianceScore}%`} change={`${stats.openIssues} open`} positive={stats.complianceScore >= 80} icon={<Shield className="w-5 h-5 text-primary-foreground" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Revenue Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {revenueBreakdown.map((r, i) => (
              <motion.div key={r.source} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="flex justify-between text-sm mb-1.5"><span className="font-medium">{r.source}</span><span className="text-muted-foreground">${r.amount.toLocaleString()} ({r.percentage}%)</span></div>
                <Progress value={r.percentage} className="h-2.5" />
              </motion.div>
            ))}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-3xl font-heading font-bold text-gradient">${totalRev.toLocaleString()}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Stethoscope className="w-5 h-5 text-accent" /> Pending Approvals</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pendingDoctors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pending approvals</p>
            ) : pendingDoctors.slice(0, 3).map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} className="p-3 rounded-xl bg-secondary/50 border border-border/30">
                <div className="flex items-center gap-3 mb-2">
                  <UserAvatar
                    avatar={d.avatar}
                    name={d.name}
                    className="w-9 h-9 bg-accent/10 text-accent text-xs"
                  />

                  <div className="flex-1"><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{d.specialty}</p></div>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors" onClick={async () => { try { await approveDoctor(d.id); toast({ title: `${d.name} Approved ✅` }); } catch (e) { toast({ title: "Failed", variant: "destructive" }); } }}>
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </button>
                  <button className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors" onClick={async () => { try { await rejectDoctor(d.id); toast({ title: `${d.name} Rejected`, variant: "destructive" }); } catch { toast({ title: "Failed", variant: "destructive" }); } }}>
                    <XCircle className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Compliance Issues</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {openIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No open issues 🎉</p>
            ) : openIssues.map((v, i) => (
              <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
                className={`p-3 rounded-xl border ${v.severity === "High" ? "border-destructive/30 bg-destructive/5" : v.severity === "Medium" ? "border-yellow-500/30 bg-yellow-500/5" : "border-border/30 bg-secondary/50"}`}>
                <div className="flex justify-between items-center mb-1"><p className="text-sm font-medium">{v.type}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.severity === "High" ? "bg-destructive/10 text-destructive" : v.severity === "Medium" ? "bg-yellow-500/10 text-yellow-600" : "bg-muted text-muted-foreground"}`}>{v.severity}</span>
                </div>
                <p className="text-xs text-muted-foreground">{v.entity} • {v.date}</p>
                <div className="flex justify-end mt-2">
                  <Button size="sm" className="text-xs gradient-primary text-primary-foreground" onClick={async () => { try { await updateComplianceStatus(v.id, "Resolved"); toast({ title: "Issue Resolved ✅" }); } catch { toast({ title: "Failed", variant: "destructive" }); } }}>Resolve</Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Quick Stats</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Appointments", value: String(stats.totalAppointments), icon: Users, trend: `${stats.completedAppointments} done` },
                { label: "Pharmacy Items", value: String(stats.medicines.length), icon: Stethoscope, trend: `${stats.totalSold} sold` },
                { label: "Orders", value: String(stats.orders.length), icon: DollarSign, trend: `$${stats.pharmacyRevenue.toLocaleString()}` },
                { label: "Compliance", value: `${stats.complianceScore}%`, icon: Clock, trend: `${stats.openIssues} open` },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                  className="p-4 rounded-xl bg-secondary/50 border border-border/30 text-center">
                  <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-lg font-heading font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <span className="text-xs text-primary font-medium">{s.trend}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const AdminDashboard = () => (
  <DashboardLayout role="admin">
    <Routes>
      <Route index element={<Overview />} />
      <Route path="users" element={<UsersManagement />} />
      <Route path="doctors" element={<DoctorsManagement />} />
      <Route path="revenue" element={<Revenue />} />
      <Route path="pharmacy" element={<AdminPharmacy />} />
      <Route path="compliance" element={<Compliance />} />
      <Route path="support" element={<SupportDesk />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="settings" element={<AdminSettings />} />
    </Routes>
  </DashboardLayout>
);

export default AdminDashboard;
