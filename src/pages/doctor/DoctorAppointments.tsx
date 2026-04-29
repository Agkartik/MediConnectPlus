import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Calendar, Clock, Video, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getAppointments, updateAppointmentStatus } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import VideoCallModal from "@/components/VideoCallModal";
import UserAvatar from "@/components/UserAvatar";

const statusColors: Record<string, string> = {
  confirmed: "bg-primary/10 text-primary",
  pending: "bg-yellow-500/10 text-yellow-600",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const typeIcons: Record<string, any> = { Video: Video, "In-Person": MapPin, Chat: MessageSquare };

const DoctorAppointments = () => {
  const { t } = useTranslation();
  const [appointments] = useAsyncSync(getAppointments, []);
  const [videoCall, setVideoCall] = useState<{ name: string; avatar: string; roomId: string } | null>(null);
  const { toast } = useToast();

  const upcoming = appointments.filter(a => a.status === "confirmed" || a.status === "pending");
  const past = appointments.filter(a => a.status === "completed" || a.status === "cancelled");

  const handleJoin = (apt: typeof appointments[0]) => {
    if (apt.type === "Video") {
      setVideoCall({
        name: apt.patientName || t("doctorAppointments.patient"),
        avatar: (apt.patientName || "PA").slice(0, 2).toUpperCase(),
        roomId: `appointment-${apt.id}`,
      });
    }
    toast({ title: t("doctorAppointments.toastJoining"), description: t("doctorAppointments.toastJoiningDesc", { type: apt.type, patient: apt.patientName || t("doctorAppointments.patient") }) });
  };

  const handleStart = async (apt: typeof appointments[0]) => {
    try {
      await updateAppointmentStatus(apt.id, "confirmed");
      handleJoin(apt);
    } catch {
      toast({ title: t("doctorAppointments.toastUpdateFailed"), variant: "destructive" });
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateAppointmentStatus(id, "completed");
      toast({ title: t("doctorAppointments.toastCompleted") });
    } catch {
      toast({ title: t("doctorAppointments.toastUpdateFailed"), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">{t("doctorAppointments.title")} 📋</h2>
        <p className="text-muted-foreground">{t("doctorAppointments.subtitle")}</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">{t("doctorAppointments.upcoming", { count: upcoming.length })}</TabsTrigger>
          <TabsTrigger value="past">{t("doctorAppointments.past", { count: past.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {upcoming.length === 0 && <p className="text-center text-muted-foreground py-8">{t("doctorAppointments.emptyUpcoming")}</p>}
          {upcoming.map((a, i) => {
            const TypeIcon = typeIcons[a.type] || Calendar;
            return (
              <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border/30 hover:shadow-card transition-all">
                <UserAvatar avatar={a.avatar} name={a.patientName} className="w-12 h-12" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{a.patientName || t("doctorAppointments.patient")}</p>
                  <p className="text-xs text-muted-foreground">{a.specialty}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.time}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{a.date}</span>
                    <span className="flex items-center gap-1"><TypeIcon className="w-3 h-3" />{a.type}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[a.status]}`}>{a.status}</span>
                <div className="flex gap-1">
                  {a.status === "confirmed" && (
                    <>
                      <Button size="sm" className="gradient-primary text-primary-foreground text-xs" onClick={() => handleJoin(a)}>{t("doctorAppointments.join")}</Button>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => handleComplete(a.id)}>{t("doctorAppointments.complete")}</Button>
                    </>
                  )}
                  {a.status === "pending" && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => handleStart(a)}>{t("doctorAppointments.start")}</Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </TabsContent>

        <TabsContent value="past" className="space-y-3 mt-4">
          {past.map((a, i) => {
            const TypeIcon = typeIcons[a.type] || Calendar;
            return (
              <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border/30">
                <UserAvatar avatar={a.avatar} name={a.patientName} className="w-12 h-12 opacity-50" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{a.patientName || t("doctorAppointments.patient")}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{a.time}</span><span>{a.date}</span><span className="flex items-center gap-1"><TypeIcon className="w-3 h-3" />{a.type}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[a.status]}`}>{a.status}</span>
              </motion.div>
            );
          })}
        </TabsContent>
      </Tabs>

      <VideoCallModal
        open={!!videoCall}
        remoteName={videoCall?.name || ""}
        remoteAvatar={videoCall?.avatar || ""}
        roomId={videoCall?.roomId ?? null}
        onEnd={() => setVideoCall(null)}
      />
    </div>
  );
};

export default DoctorAppointments;
