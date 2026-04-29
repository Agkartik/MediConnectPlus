import { useMemo } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Calendar, DollarSign, Star, Clock, Activity, TrendingUp, AlertTriangle, MessageSquare } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import AccountPendingGate from "@/components/AccountPendingGate";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Patients from "./doctor/Patients";
import DoctorAppointments from "./doctor/DoctorAppointments";
import Consultations from "./doctor/Consultations";
import UserAvatar from "@/components/UserAvatar";
import DoctorPrescriptions from "./doctor/DoctorPrescriptions";
import Earnings from "./doctor/Earnings";
import DoctorMessages from "./doctor/DoctorMessages";
import DoctorSettings from "./doctor/DoctorSettings";
import SupportCenter from "./SupportCenter";
import DoctorPharmacy from "./doctor/DoctorPharmacy";
import CareIntelligence from "./CareIntelligence";
import { getDoctorDashboardSummary } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import type { DoctorDashboardSummary, Notification } from "@/types/store";

const emptyDashboard: DoctorDashboardSummary = {
  doctorName: "",
  myPatientCount: 0,
  newPatientTouchesThisWeek: 0,
  todayAppointments: [],
  todayAppointmentCount: 0,
  monthlyEarningsCompleted: 0,
  earningsMonthChangePct: null,
  ratingAvg: null,
  reviewCount: 0,
  alerts: [],
  earningsByMonth: [],
  completedConsultations: 0,
  pendingEarningsTotal: 0,
  unreadMessages: 0,
};

function formatMonthKey(k: string) {
  const [y, m] = k.split("-").map(Number);
  if (!y || !m) return k;
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function scheduleStatusLabel(status: string) {
  if (status === "confirmed") return "Confirmed";
  if (status === "pending") return "Pending";
  return status;
}

function notificationSeverity(t: Notification["type"]): "critical" | "warning" | "info" {
  if (t === "prescription") return "warning";
  return "info";
}

const Overview = () => {
  const [dash] = useAsyncSync(getDoctorDashboardSummary, emptyDashboard);

  const maxMonthEarn = useMemo(
    () => Math.max(...dash.earningsByMonth.map((e) => e.amount), 1),
    [dash.earningsByMonth]
  );

  const quarterTotal = useMemo(
    () => dash.earningsByMonth.reduce((s, e) => s + e.amount, 0),
    [dash.earningsByMonth]
  );

  const displayName = dash.doctorName?.trim() || "Doctor";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold">Welcome, {displayName}! 🩺</h2>
          <p className="text-muted-foreground">
            {dash.todayAppointmentCount === 0
              ? "No appointments scheduled for today in your calendar."
              : `${dash.todayAppointmentCount} appointment${dash.todayAppointmentCount === 1 ? "" : "s"} on your schedule today.`}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 self-start">
          <Link to="/dashboard/doctor/appointments">View all</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My patients"
          value={dash.myPatientCount}
          change={
            dash.newPatientTouchesThisWeek > 0
              ? `${dash.newPatientTouchesThisWeek} booking${dash.newPatientTouchesThisWeek === 1 ? "" : "s"} (7d)`
              : undefined
          }
          positive={dash.newPatientTouchesThisWeek > 0}
          icon={<Users className="w-5 h-5 text-primary-foreground" />}
        />
        <StatCard
          title="Today's appointments"
          value={dash.todayAppointmentCount}
          icon={<Calendar className="w-5 h-5 text-primary-foreground" />}
        />
        <StatCard
          title="Monthly earnings (completed)"
          value={`$${dash.monthlyEarningsCompleted.toLocaleString()}`}
          change={
            dash.earningsMonthChangePct != null
              ? `${dash.earningsMonthChangePct >= 0 ? "+" : ""}${dash.earningsMonthChangePct}% vs last month`
              : undefined
          }
          positive={dash.earningsMonthChangePct != null ? dash.earningsMonthChangePct >= 0 : true}
          icon={<DollarSign className="w-5 h-5 text-primary-foreground" />}
        />
        <StatCard
          title="Avg. rating"
          value={dash.ratingAvg != null ? String(dash.ratingAvg) : "—"}
          change={dash.reviewCount > 0 ? `${dash.reviewCount} review${dash.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}
          positive={dash.ratingAvg != null}
          icon={<Star className="w-5 h-5 text-primary-foreground" />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Today&apos;s schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dash.todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nothing scheduled for today. Dates must match today (including &quot;Today&quot; in the date field) to appear
                here.
              </p>
            ) : (
              dash.todayAppointments.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border/30 hover:shadow-card transition-all"
                >
                  <UserAvatar avatar={s.avatar} name={s.patientName} className="w-10 h-10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.type} consultation
                    </p>
                  </div>
                  <span className="text-sm font-medium shrink-0">{s.time}</span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                      s.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-yellow-500/10 text-yellow-600"
                    }`}
                  >
                    {scheduleStatusLabel(s.status)}
                  </span>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Alerts &amp; notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dash.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No notifications yet.</p>
            ) : (
              dash.alerts.map((a, i) => {
                const sev = notificationSeverity(a.type);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-3 rounded-xl border ${
                      sev === "critical"
                        ? "border-destructive/30 bg-destructive/5"
                        : sev === "warning"
                          ? "border-yellow-500/30 bg-yellow-500/5"
                          : "border-border/30 bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.message}</p>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Earnings (last 3 months, completed)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dash.earningsByMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed earnings recorded yet.</p>
            ) : (
              dash.earningsByMonth.map((e) => (
                <div key={e.monthKey} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-24 shrink-0">{formatMonthKey(e.monthKey)}</span>
                  <div className="flex-1 min-w-0">
                    <Progress value={maxMonthEarn ? (e.amount / maxMonthEarn) * 100 : 0} className="h-3" />
                  </div>
                  <span className="text-sm font-bold shrink-0">${e.amount.toLocaleString()}</span>
                </div>
              ))
            )}
            <div className="pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground">Total (shown months)</p>
              <p className="text-2xl font-heading font-bold text-primary">${quarterTotal.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Completed consultations", value: String(dash.completedConsultations) },
              { label: "Pending earnings", value: `$${dash.pendingEarningsTotal.toLocaleString()}` },
              { label: "Unread patient messages", value: String(dash.unreadMessages) },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="flex justify-between text-sm gap-3 border-b border-border/40 last:border-0 pb-3 last:pb-0"
              >
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-medium text-foreground shrink-0">{m.value}</span>
              </motion.div>
            ))}
            <Button asChild variant="outline" size="sm" className="w-full gap-2">
              <Link to="/dashboard/doctor/messages">
                <MessageSquare className="w-4 h-4" />
                Open messages
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const DoctorDashboard = () => (
  <DashboardLayout role="doctor">
    <AccountPendingGate>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="patients" element={<Patients />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="consultations" element={<Consultations />} />
        <Route path="prescriptions" element={<DoctorPrescriptions />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="messages" element={<DoctorMessages />} />
        <Route path="care-intelligence" element={<CareIntelligence />} />
        <Route path="pharmacy" element={<DoctorPharmacy />} />
        <Route path="support" element={<SupportCenter />} />
        <Route path="settings" element={<DoctorSettings />} />
      </Routes>
    </AccountPendingGate>
  </DashboardLayout>
);

export default DoctorDashboard;
