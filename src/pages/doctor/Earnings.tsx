import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { DollarSign, TrendingUp, CreditCard, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getEarningsSummary } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";

const emptySummary = {
  totalCompleted: 0,
  totalPending: 0,
  completedCount: 0,
  pendingCount: 0,
  all: [] as { id: string; patient: string; type: string; amount: number; date: string; status: string }[],
};

const Earnings = () => {
  const { t } = useTranslation();
  const [summary] = useAsyncSync(getEarningsSummary, emptySummary);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">{t("doctorEarnings.title")} 💰</h2>
        <p className="text-muted-foreground">{t("doctorEarnings.subtitle")}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: t("doctorEarnings.totalEarned"), value: `$${summary.totalCompleted.toLocaleString()}`, change: t("doctorEarnings.completedCount", { count: summary.completedCount }), up: true },
          { label: t("doctorEarnings.pending"), value: `$${summary.totalPending.toLocaleString()}`, change: t("doctorEarnings.pendingCount", { count: summary.pendingCount }), up: false },
          { label: t("doctorEarnings.totalRevenue"), value: `$${(summary.totalCompleted + summary.totalPending).toLocaleString()}`, change: t("doctorEarnings.totalCount", { count: summary.all.length }), up: true },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="shadow-card border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span className={`text-xs flex items-center gap-1 ${s.up ? "text-primary" : "text-muted-foreground"}`}>
                    {s.up && <ArrowUpRight className="w-3 h-3" />}{s.change}
                  </span>
                </div>
                <p className="text-2xl font-heading font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> {t("doctorEarnings.byType")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {["Video Consultation", "In-Person Visit", "Chat Consultation"].map(type => {
              const items = summary.all.filter(e => e.type === type);
              const total = items.reduce((s, e) => s + e.amount, 0);
              const max = summary.totalCompleted + summary.totalPending || 1;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{t(`doctorEarnings.types.${type}`, { defaultValue: type })}</span>
                    <span className="text-muted-foreground">${total.toLocaleString()} ({t("doctorEarnings.sessions", { count: items.length })})</span>
                  </div>
                  <Progress value={(total / max) * 100} className="h-2.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="font-heading flex items-center gap-2"><CreditCard className="w-5 h-5 text-accent" /> {t("doctorEarnings.recent")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {summary.all.slice(0, 8).map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/30">
                <div>
                  <p className="text-sm font-medium">{t.patient}</p>
                  <p className="text-xs text-muted-foreground">{t.type} • {t.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">${t.amount}</p>
                  <span className={`text-xs ${t.status === "Completed" ? "text-primary" : "text-yellow-600"}`}>{t.status}</span>
                </div>
              </motion.div>
            ))}
            {summary.all.length === 0 && <p className="text-center text-muted-foreground py-4">{t("doctorEarnings.empty")}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Earnings;
