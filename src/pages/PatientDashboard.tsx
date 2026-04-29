import { useMemo } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Heart,
  Calendar,
  Activity,
  Pill,
  Star,
  MapPin,
  ExternalLink,
  Bell,
  Dna,
  Sparkles,
  MessageSquare,
  Stethoscope,
  Navigation,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import UserAvatar from "@/components/UserAvatar";

import AccountPendingGate from "@/components/AccountPendingGate";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAppointments,
  getPrescriptions,
  getConsultations,
  getDoctors,
  getNotifications,
  getDnaProfileSummary,
  getHealthTwin,
} from "@/services/medicalService";
import { buildDirectionsToClinicUrl, buildMapPinUrl } from "@/lib/mapsDirections";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import FindDoctors from "./patient/FindDoctors";
import Appointments from "./patient/Appointments";
import PatientConsultations from "./patient/PatientConsultations";
import HealthData from "./patient/HealthData";
import DNAProfile from "./patient/DNAProfile";
import VirtualTwin from "./patient/VirtualTwin";
import Pharmacy from "./patient/Pharmacy";
import Prescriptions from "./patient/Prescriptions";
import Messages from "./patient/Messages";
import Settings from "./patient/Settings";
import SupportCenter from "./SupportCenter";
import CareIntelligence from "./CareIntelligence";

const Overview = () => {
  const { t } = useTranslation();
  const { patientProfile, userId } = useAuth();
  const [appointments] = useAsyncSync(getAppointments, []);
  const [prescriptions] = useAsyncSync(getPrescriptions, []);
  const [consultations] = useAsyncSync(getConsultations, []);
  const [doctors] = useAsyncSync(getDoctors, []);
  const [notifications] = useAsyncSync(getNotifications, []);
  const [dnaSummary] = useAsyncSync(getDnaProfileSummary, { hasProfile: false }, []);
  const [twin] = useAsyncSync(
    () => (userId ? getHealthTwin(userId) : Promise.resolve(null)),
    null,
    [userId]
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t("dashboard.patient.greetingMorning");
    if (h < 17) return t("dashboard.patient.greetingAfternoon");
    return t("dashboard.patient.greetingEvening");
  }, [t]);

  const upcoming = useMemo(
    () => appointments.filter((a) => a.status === "confirmed" || a.status === "pending"),
    [appointments]
  );
  const activeRx = useMemo(() => prescriptions.filter((p) => p.status === "Active"), [prescriptions]);
  const consultThisMonth = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    return consultations.filter((c) => (typeof c.startedAt === "number" ? c.startedAt : 0) >= monthStart).length;
  }, [consultations]);
  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const topDoctors = useMemo(() => {
    const list = doctors.filter((d) => d.approved !== false && d.status !== "Suspended");
    return [...list]
      .sort((a, b) => {
        if (b.reviews !== a.reviews) return b.reviews - a.reviews;
        const ar = a.rating ?? 0;
        const br = b.rating ?? 0;
        return br - ar;
      })
      .slice(0, 3);
  }, [doctors]);

  const recentRx = useMemo(() => prescriptions.slice(0, 4), [prescriptions]);

  const twinScore =
    twin && typeof twin.baseHealthScore === "number" ? Math.round(twin.baseHealthScore) : null;

  const mapsHref =
    patientProfile?.latitude != null && patientProfile?.longitude != null
      ? buildMapPinUrl(patientProfile.latitude, patientProfile.longitude)
      : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold">
            {greeting}! 👋
          </h2>
          <p className="text-muted-foreground">{t("dashboard.patient.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("dashboard.patient.statUpcoming")}
          value={upcoming.length}
          icon={<Calendar className="w-5 h-5 text-primary-foreground" />}
        />
        <StatCard
          title={t("dashboard.patient.statUnread")}
          value={unread}
          icon={<Bell className="w-5 h-5 text-primary-foreground" />}
        />
        <StatCard
          title={t("dashboard.patient.statActiveRx")}
          value={activeRx.length}
          icon={<Pill className="w-5 h-5 text-primary-foreground" />}
        />
        <StatCard
          title={t("dashboard.patient.statConsultMonth")}
          value={consultThisMonth}
          change={t("dashboard.patient.thisMonth")}
          positive
          icon={<Heart className="w-5 h-5 text-primary-foreground" />}
        />
      </div>

      <div>
        <h3 className="font-heading font-semibold text-lg mb-3">{t("dashboard.patient.quickTitle")}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/dashboard/patient/consultations" className="block group">
            <Card className="shadow-card border-border/50 h-full transition-all group-hover:border-primary/40 group-hover:shadow-elevated">
              <CardContent className="p-5">
                <Stethoscope className="w-8 h-8 text-primary mb-3" />
                <p className="font-heading font-semibold">{t("dashboard.patient.quickConsult")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.patient.quickConsultDesc")}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/patient/doctors" className="block group">
            <Card className="shadow-card border-border/50 h-full transition-all group-hover:border-primary/40 group-hover:shadow-elevated">
              <CardContent className="p-5">
                <Navigation className="w-8 h-8 text-accent mb-3" />
                <p className="font-heading font-semibold">{t("dashboard.patient.quickDoctors")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.patient.quickDoctorsDesc")}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/patient/dna" className="block group">
            <Card className="shadow-card border-border/50 h-full transition-all group-hover:border-primary/40 group-hover:shadow-elevated">
              <CardContent className="p-5">
                <Dna className="w-8 h-8 text-primary mb-3" />
                <p className="font-heading font-semibold">{t("dashboard.patient.quickDna")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dnaSummary.hasProfile ? t("dashboard.patient.quickDnaOn") : t("dashboard.patient.quickDnaOff")}
                </p>
                {dnaSummary.hasProfile ? <Badge className="mt-2 bg-primary/15 text-primary border-0">DNA</Badge> : null}
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/patient/twin" className="block group">
            <Card className="shadow-card border-border/50 h-full transition-all group-hover:border-primary/40 group-hover:shadow-elevated">
              <CardContent className="p-5">
                <Sparkles className="w-8 h-8 text-accent mb-3" />
                <p className="font-heading font-semibold">{t("dashboard.patient.quickTwin")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {twinScore != null
                    ? t("dashboard.patient.quickTwinScore", { score: twinScore })
                    : t("dashboard.patient.quickTwinLoading")}
                </p>
                <span className="inline-block mt-2 text-xs font-medium text-primary">{t("dashboard.patient.quickTwinOpen")} →</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {t("dashboard.patient.careTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("dashboard.patient.careIntro")}</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
                <p className="text-xs text-muted-foreground">{t("dashboard.patient.careCondition")}</p>
                <p className="font-heading font-semibold">{patientProfile?.condition ?? "—"}</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
                <p className="text-xs text-muted-foreground">{t("dashboard.patient.careStatus")}</p>
                <p className="font-heading font-semibold">{patientProfile?.healthStatus ?? "—"}</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
                <p className="text-xs text-muted-foreground">{t("dashboard.patient.careAge")}</p>
                <p className="font-heading font-semibold">{patientProfile?.age ?? "—"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/dashboard/patient/health">{t("dashboard.patient.careOpenHealth")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/dashboard/patient/pharmacy">
                  <Pill className="w-4 h-4" /> {t("dashboard.patient.quickPharmacy")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/dashboard/patient/messages">
                  <MessageSquare className="w-4 h-4" /> {t("nav.messages")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-base">
              <MapPin className="w-5 h-5 text-accent" />
              {t("dashboard.patient.locationTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {patientProfile?.hasLocation && mapsHref
                ? t("dashboard.patient.locationOn")
                : t("dashboard.patient.locationOff")}
            </p>
            {patientProfile?.hasLocation && mapsHref ? (
              <Button asChild size="sm" className="w-full gradient-primary text-primary-foreground gap-2">
                <a href={mapsHref} target="_blank" rel="noreferrer">
                  <MapPin className="w-4 h-4" /> {t("dashboard.patient.locationOpenMaps")}
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/dashboard/patient/settings">{t("dashboard.patient.locationSettings")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              {t("dashboard.patient.upcomingTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("dashboard.patient.upcomingEmpty")}</p>
            ) : (
              upcoming.slice(0, 4).map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30"
                >
                  <UserAvatar
                    avatar={a.avatar}
                    name={a.doctor}
                    className="w-10 h-10 gradient-primary text-primary-foreground text-xs"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.doctor}</p>
                    <p className="text-xs text-muted-foreground">{a.specialty}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium">{a.time}</p>
                    <p className="text-xs text-muted-foreground">{a.date}</p>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              {t("dashboard.patient.doctorsTitle")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("dashboard.patient.doctorsByReviews")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDoctors.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.patient.doctorsEmpty")}</p>
            ) : (
              topDoctors.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <UserAvatar
                    avatar={d.avatar}
                    name={d.name}
                    className="w-10 h-10 bg-accent/10 text-accent text-xs"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.specialty}</p>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <div className="flex items-center justify-end gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {d.rating != null ? d.rating : "—"}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {d.distance}
                    </div>
                    {d.hasClinicLocation && d.latitude != null && d.longitude != null && (
                      <a
                        href={buildDirectionsToClinicUrl(d.latitude, d.longitude, {
                          patientLat: patientProfile?.latitude ?? undefined,
                          patientLng: patientProfile?.longitude ?? undefined,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-primary mt-1"
                      >
                        {t("dashboard.patient.mapLink")} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))
            )}
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link to="/dashboard/patient/doctors">{t("dashboard.patient.findDoctorsCta")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            {t("dashboard.patient.rxTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentRx.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("dashboard.patient.rxEmpty")}</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {recentRx.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/30"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.medicine}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.doctor} • {p.date}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                      p.status === "Active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.status}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const PatientDashboard = () => (
  <DashboardLayout role="patient">
    <AccountPendingGate>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="doctors" element={<FindDoctors />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="consultations" element={<PatientConsultations />} />
        <Route path="health" element={<HealthData />} />
        <Route path="dna" element={<DNAProfile />} />
        <Route path="twin" element={<VirtualTwin />} />
        <Route path="pharmacy" element={<Pharmacy />} />
        <Route path="prescriptions" element={<Prescriptions />} />
        <Route path="messages" element={<Messages />} />
        <Route path="care-intelligence" element={<CareIntelligence />} />
        <Route path="support" element={<SupportCenter />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </AccountPendingGate>
  </DashboardLayout>
);

export default PatientDashboard;
