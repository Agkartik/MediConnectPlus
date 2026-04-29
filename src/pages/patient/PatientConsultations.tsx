import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Video, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getConsultations } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import VideoCallModal from "@/components/VideoCallModal";
import type { ConsultationSession } from "@/types/store";

function doctorInitials(doctorName: string) {
  return doctorName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const PatientConsultations = () => {
  const { t } = useTranslation();
  const [all] = useAsyncSync(getConsultations, []);
  const [videoCall, setVideoCall] = useState<{ name: string; avatar: string; roomId: string } | null>(null);

  const isVideo = (c: ConsultationSession) => c.type.includes("Video");
  const active = all.filter((c) => (c.status === "Ongoing" || c.status === "Waiting") && isVideo(c));
  const completed = all.filter((c) => c.status === "Completed");

  const joinCall = (c: ConsultationSession) => {
    const roomId = c.appointmentId ? `appointment-${c.appointmentId}` : `consultation-${c.id}`;
    setVideoCall({
      name: c.doctor,
      avatar: doctorInitials(c.doctor),
      roomId,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">{t("consultations.title")} 🩺</h2>
        <p className="text-muted-foreground">{t("consultations.subtitlePatient")}</p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">{t("consultations.active")} ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">{t("consultations.completed")} ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {active.length === 0 && (
            <p className="text-center text-muted-foreground py-8">{t("consultations.emptyActivePatient")}</p>
          )}
          {active.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="shadow-card border-border/50 border-l-4 border-l-primary">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {doctorInitials(c.doctor)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-sm">{c.doctor}</h3>
                    <p className="text-xs text-muted-foreground">{c.notes}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        {c.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {c.duration}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      c.status === "Ongoing" ? "bg-accent/10 text-accent" : "bg-yellow-500/10 text-yellow-600"
                    }`}
                  >
                    {c.status}
                  </span>
                  <Button size="sm" className="gradient-primary text-primary-foreground text-xs" onClick={() => joinCall(c)}>
                    {t("consultations.joinVideo")}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {completed.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("consultations.emptyCompleted")}</p>
          ) : (
            completed.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border/30"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">
                  {doctorInitials(c.doctor)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{c.doctor}</p>
                  <p className="text-xs text-muted-foreground">{c.diagnosis || c.notes}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{c.type}</span>
                    <span>{c.duration}</span>
                    <span>{c.date}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
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

export default PatientConsultations;
