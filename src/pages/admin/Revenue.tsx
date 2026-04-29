import { motion } from "framer-motion";
import { DollarSign, TrendingUp, ArrowUpRight, CreditCard, ShoppingCart } from "lucide-react";
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

const Revenue = () => {
  const [stats] = useAsyncSync(getAdminStats, empty);

  const consultationRevenue = stats.earnings.filter(e => e.type.includes("Consultation") || e.type.includes("Visit")).reduce((s, e) => s + e.amount, 0);
  const totalRev = stats.totalRevenue + stats.pharmacyRevenue;
  const pharmacyPct = totalRev > 0 ? Math.round((stats.pharmacyRevenue / totalRev) * 100) : 0;
  const consultPct = totalRev > 0 ? Math.round((consultationRevenue / totalRev) * 100) : 0;
  const commissionRevenue = Math.round(totalRev * 0.15);
  const commissionPct = totalRev > 0 ? Math.round((commissionRevenue / totalRev) * 100) : 0;
  const netProfit = Math.round(totalRev * 0.4);

  const breakdown = [
    { source: "Consultations", amount: consultationRevenue, pct: consultPct },
    { source: "Pharmacy Orders", amount: stats.pharmacyRevenue, pct: pharmacyPct },
    { source: "Commission Fees", amount: commissionRevenue, pct: commissionPct },
  ];

  const recentEarnings = stats.earnings.slice(-6).reverse();

  return (
    <div className="space-y-6">
      <div><h2 className="font-heading text-2xl font-bold">Revenue Analytics 💰</h2><p className="text-muted-foreground">Live financial overview from platform data</p></div>

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${totalRev.toLocaleString()}`, change: `${stats.earnings.length} transactions` },
          { label: "Net Profit (est.)", value: `$${netProfit.toLocaleString()}`, change: "~40% margin" },
          { label: "Pharmacy Sales", value: `$${stats.pharmacyRevenue.toLocaleString()}`, change: `${stats.orders.length} orders` },
          { label: "Pending Payouts", value: `$${stats.pendingRevenue.toLocaleString()}`, change: `${stats.earnings.filter(e => e.status === "Pending").length} pending` },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="shadow-card border-border/50">
              <CardContent className="p-5">
                <DollarSign className="w-5 h-5 text-primary mb-2" />
                <p className="text-2xl font-heading font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <span className="text-xs text-primary flex items-center gap-1 mt-1"><ArrowUpRight className="w-3 h-3" />{s.change}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Revenue Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {breakdown.map(r => (
              <div key={r.source}>
                <div className="flex justify-between text-sm mb-1.5"><span className="font-medium">{r.source}</span><span className="text-muted-foreground">${r.amount.toLocaleString()} ({r.pct}%)</span></div>
                <Progress value={r.pct} className="h-2.5" />
              </div>
            ))}
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Grand Total</span><span className="text-lg font-heading font-bold text-primary">${totalRev.toLocaleString()}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><CreditCard className="w-5 h-5 text-accent" /> Recent Transactions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentEarnings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
            ) : recentEarnings.map((e, i) => (
              <motion.div key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/30">
                <div><p className="text-sm font-medium">{e.patient}</p><p className="text-xs text-muted-foreground">{e.type} • {e.date}</p></div>
                <div className="text-right"><p className="text-sm font-bold">${e.amount.toLocaleString()}</p>
                  <span className={`text-xs ${e.status === "Completed" ? "text-primary" : "text-yellow-600"}`}>{e.status}</span></div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {stats.orders.length > 0 && (
        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> Pharmacy Orders</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.orders.slice(-5).reverse().map((o, i) => (
              <motion.div key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/30">
                <div><p className="text-sm font-medium">{o.buyerName}</p><p className="text-xs text-muted-foreground">{o.items.length} items • {o.date}</p></div>
                <div className="text-right"><p className="text-sm font-bold">${o.total.toFixed(2)}</p>
                  <span className={`text-xs ${o.status === "Delivered" ? "text-primary" : o.status === "Cancelled" ? "text-destructive" : "text-yellow-600"}`}>{o.status}</span></div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Revenue;
