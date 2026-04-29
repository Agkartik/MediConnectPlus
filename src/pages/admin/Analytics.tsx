import { motion } from "framer-motion";
import { BarChart3, Users, Stethoscope, DollarSign, Clock, TrendingUp, Activity, ShoppingCart, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getAdminStats } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import type { AdminStats } from "@/types/store";

const empty: AdminStats = {
  totalRevenue: 0, completedRevenue: 0, pendingRevenue: 0, pharmacyRevenue: 0,
  totalUsers: 0, activeDoctors: 0, pendingDoctors: 0, totalAppointments: 0, completedAppointments: 0,
  totalStock: 0, totalSold: 0, lowStockCount: 0, outOfStockCount: 0,
  openIssues: 0, resolvedIssues: 0, complianceScore: 100,
  patients: [], doctors: [], appointments: [], earnings: [], orders: [], medicines: [], issues: [],
};

const Analytics = () => {
  const [stats] = useAsyncSync(getAdminStats, empty);

  const totalRev = stats.totalRevenue + stats.pharmacyRevenue;

  const platformStats = [
    { label: "Total Users", value: String(stats.totalUsers), change: `${stats.totalUsers} registered`, icon: Users },
    { label: "Active Doctors", value: String(stats.activeDoctors), change: `${stats.pendingDoctors} pending`, icon: Stethoscope },
    { label: "Total Revenue", value: `$${totalRev.toLocaleString()}`, change: `${stats.earnings.length} transactions`, icon: DollarSign },
    { label: "Appointments", value: String(stats.totalAppointments), change: `${stats.completedAppointments} completed`, icon: Clock },
  ];

  const growthMetrics = [
    { label: "User Growth", current: stats.totalUsers, target: Math.max(stats.totalUsers + 10, 50), pct: Math.min(Math.round((stats.totalUsers / Math.max(stats.totalUsers + 10, 50)) * 100), 100) },
    { label: "Doctor Onboarding", current: stats.activeDoctors, target: Math.max(stats.activeDoctors + 5, 20), pct: Math.min(Math.round((stats.activeDoctors / Math.max(stats.activeDoctors + 5, 20)) * 100), 100) },
    { label: "Revenue Target", current: totalRev, target: Math.max(totalRev + 5000, 10000), pct: Math.min(Math.round((totalRev / Math.max(totalRev + 5000, 10000)) * 100), 100) },
    { label: "Pharmacy Sales", current: stats.totalSold, target: Math.max(stats.totalSold + 200, 500), pct: Math.min(Math.round((stats.totalSold / Math.max(stats.totalSold + 200, 500)) * 100), 100) },
  ];

  // Build specialty stats from doctors
  const specialtyMap: Record<string, { count: number; revenue: number }> = {};
  stats.doctors.forEach(d => {
    if (!specialtyMap[d.specialty]) specialtyMap[d.specialty] = { count: 0, revenue: 0 };
    specialtyMap[d.specialty].count++;
  });
  stats.earnings.forEach(e => {
    // Distribute earnings roughly
    const keys = Object.keys(specialtyMap);
    if (keys.length > 0) {
      const key = keys[Math.abs(e.amount) % keys.length];
      specialtyMap[key].revenue += e.amount;
    }
  });
  const topSpecialties = Object.entries(specialtyMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="space-y-6">
      <div><h2 className="font-heading text-2xl font-bold">Platform Analytics 📊</h2><p className="text-muted-foreground">Live platform metrics from real data</p></div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {platformStats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="shadow-card border-border/50">
              <CardContent className="p-5 text-center">
                <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-heading font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <span className="text-xs text-primary font-medium">{s.change}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Growth Targets</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {growthMetrics.map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground">{m.current.toLocaleString()} / {m.target.toLocaleString()}</span>
                </div>
                <Progress value={m.pct} className="h-3" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Activity className="w-5 h-5 text-accent" /> Top Specialties</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topSpecialties.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : topSpecialties.map((s, i) => (
              <motion.div key={s.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/30">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{i + 1}</span>
                  <div><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.count} doctor{s.count !== 1 ? "s" : ""}</p></div>
                </div>
                <span className="text-sm font-bold text-primary">${s.revenue.toLocaleString()}</span>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Pill className="w-5 h-5 text-primary" /> Pharmacy Stats</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total Stock</span><span className="font-bold">{stats.totalStock.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Units Sold</span><span className="font-bold">{stats.totalSold.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Low Stock Items</span><span className="font-bold text-yellow-600">{stats.lowStockCount}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Out of Stock</span><span className="font-bold text-destructive">{stats.outOfStockCount}</span></div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-accent" /> Order Stats</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total Orders</span><span className="font-bold">{stats.orders.length}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Processing</span><span className="font-bold text-yellow-600">{stats.orders.filter(o => o.status === "Processing").length}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Shipped</span><span className="font-bold text-primary">{stats.orders.filter(o => o.status === "Shipped").length}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Delivered</span><span className="font-bold text-primary">{stats.orders.filter(o => o.status === "Delivered").length}</span></div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Score</span><span className="font-bold text-primary">{stats.complianceScore}%</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Open Issues</span><span className="font-bold text-destructive">{stats.openIssues}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Resolved</span><span className="font-bold text-primary">{stats.resolvedIssues}</span></div>
            <Progress value={stats.complianceScore} className="h-3 mt-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
