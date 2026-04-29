import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Video, FileText, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getActiveConsultations, getCompletedConsultations, updateConsultationStatus } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import VideoCallModal from "@/components/VideoCallModal";
import UserAvatar from "@/components/UserAvatar";

const Consultations = () => {
  const { t } = useTranslation();
  const [active] = useAsyncSync(getActiveConsultations, []);
  const [completed] = useAsyncSync(getCompletedConsultations, []);
  const [videoCall, setVideoCall] = useState<{ name: string; avatar: string; roomId: string } | null>(null);
  const [showEndDialog, setShowEndDialog] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const { toast } = useToast();

  const handleStart = async (consultationId: string, appointmentId: string | null | undefined, patient: string) => {
    try {
      await updateConsultationStatus(consultationId, "Ongoing");
      const roomId = appointmentId ? `appointment-${appointmentId}` : `consultation-${consultationId}`;
      setVideoCall({
        name: patient,
        avatar: patient.slice(0, 2).toUpperCase(),
        roomId,
      });
      toast({ title: t("doctorConsultations.toastStarted"), description: t("doctorConsultations.toastStartedDesc", { patient }) });
    } catch {
      toast({ title: t("doctorConsultations.toastStartFailed"), variant: "destructive" });
    }
  };

  const handleResume = (appointmentId: string, fallbackConsultationId: string, patient: string) => {
    const roomId = appointmentId ? `appointment-${appointmentId}` : `consultation-${fallbackConsultationId}`;
    setVideoCall({ name: patient, avatar: patient.slice(0, 2).toUpperCase(), roomId });
  };

  const handleEndCall = () => {
    setVideoCall(null);
    const ongoingId = active.find(c => c.status === "Ongoing")?.id;
    if (ongoingId) setShowEndDialog(ongoingId);
  };

  const handleComplete = async () => {
    if (showEndDialog) {
      try {
        await updateConsultationStatus(showEndDialog, "Completed", diagnosis || t("doctorConsultations.defaultDiagnosis"));
        toast({ title: t("doctorConsultations.toastCompleted"), description: t("doctorConsultations.toastCompletedDesc") });
      } catch {
        toast({ title: t("doctorConsultations.toastFailed"), variant: "destructive" });
      }
      setShowEndDialog(null);
      setDiagnosis("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">{t("doctorConsultations.title")} 🩺</h2>
        <p className="text-muted-foreground">{t("doctorConsultations.subtitle")}</p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">{t("doctorConsultations.active")} ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">{t("doctorConsultations.completed")} ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {active.length === 0 && <p className="text-center text-muted-foreground py-8">{t("doctorConsultations.emptyActive")}</p>}
          {active.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="shadow-card border-border/50 border-l-4 border-l-accent">
                <CardContent className="p-5 flex items-center gap-4">
                  <UserAvatar avatar={c.avatar} name={c.patient} className="w-12 h-12" />
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-sm">{c.patient}</h3>
                    <p className="text-xs text-muted-foreground">{c.notes}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Video className="w-3 h-3" />{c.type}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.duration}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.status === "Ongoing" ? "bg-accent/10 text-accent" : "bg-yellow-500/10 text-yellow-600"}`}>{c.status}</span>
                  <Button size="sm" className="gradient-primary text-primary-foreground text-xs"
                    onClick={() =>
                      c.status === "Ongoing"
                        ? handleResume(c.appointmentId || "", c.id, c.patient)
                        : handleStart(c.id, c.appointmentId, c.patient)
                    }>
                    {c.status === "Ongoing" ? t("doctorConsultations.resume") : t("doctorConsultations.start")}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {completed.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border/30">
              <UserAvatar avatar={c.avatar} name={c.patient} className="w-10 h-10 opacity-50" />
              <div className="flex-1">
                <p className="font-medium text-sm">{c.patient}</p>
                <p className="text-xs text-muted-foreground">{c.diagnosis}</p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{c.type}</span><span>{c.duration}</span><span>{c.date}</span>
                </div>
              </div>
              <CheckCircle className="w-4 h-4 text-primary" />
            </motion.div>
          ))}
        </TabsContent>
      </Tabs>

      <VideoCallModal
        open={!!videoCall}
        remoteName={videoCall?.name || ""}
        remoteAvatar={videoCall?.avatar || ""}
        roomId={videoCall?.roomId ?? null}
        onEnd={handleEndCall}
      />

      <Dialog open={!!showEndDialog} onOpenChange={() => setShowEndDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("doctorConsultations.endTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>{t("doctorConsultations.diagnosisLabel")}</Label><Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder={t("doctorConsultations.diagnosisPlaceholder")} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(null)}>{t("doctorConsultations.cancel")}</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleComplete}>{t("doctorConsultations.complete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Consultations;
