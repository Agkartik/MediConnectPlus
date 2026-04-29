import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Calendar, Clock, Video, MapPin, MessageSquare, X, CheckCircle, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getUpcomingAppointments,
  getPastAppointments,
  addAppointment,
  updateAppointmentStatus,
  getDoctors,
  getMyDoctorReview,
  submitDoctorReview,
} from "@/services/medicalService";
import type { Appointment } from "@/types/store";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import { useAuth } from "@/contexts/AuthContext";
import VideoCallModal from "@/components/VideoCallModal";
import UserAvatar from "@/components/UserAvatar";
import { canPatientJoinAppointmentCall } from "@/lib/appointmentTime";

const statusColors: Record<string, string> = {
  confirmed: "bg-primary/10 text-primary",
  pending: "bg-yellow-500/10 text-yellow-600",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const typeIcons: Record<string, typeof Video> = { Video: Video, "In-Person": MapPin, Chat: MessageSquare };

function appointmentTypeLabel(type: string, t: (k: string) => string) {
  if (type === "Video") return t("appointments.typeVideo");
  if (type === "In-Person") return t("appointments.typeInPerson");
  if (type === "Chat") return t("appointments.typeChat");
  return type;
}

const AppointmentCard = ({
  apt,
  onStatusChange,
  onVideoCall,
  onRate,
  allowRate,
}: {
  apt: Appointment;
  onStatusChange: (id: string, status: Appointment["status"]) => void;
  onVideoCall?: (name: string, avatar: string, appointmentId: string) => void;
  onRate?: (apt: Appointment) => void;
  allowRate?: boolean;
}) => {
  const { t } = useTranslation();
  const TypeIcon = typeIcons[apt.type] || Calendar;
  const { toast } = useToast();
  const canJoinNow = apt.type !== "Video" || canPatientJoinAppointmentCall(apt.date, apt.time, apt.type);

  const handleJoin = () => {
    if (apt.type === "Video" && !canJoinNow) {
      toast({
        title: t("appointments.callNotAvailable"),
        description: t("appointments.callNotAvailableDesc"),
        variant: "destructive",
      });
      return;
    }
    if (apt.type === "Video") {
      onVideoCall?.(apt.doctor, apt.avatar, apt.id);
    }
    toast({
      title: t("appointments.joiningToastTitle"),
      description: t("appointments.joiningToastDesc", {
        type: appointmentTypeLabel(apt.type, t).toLowerCase(),
        doctor: apt.doctor,
      }),
    });
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border/30 hover:shadow-card transition-all">
      <UserAvatar avatar={apt.avatar} name={apt.doctor} className="w-12 h-12" />
      <div className="flex-1">
        <p className="font-medium text-sm">{apt.doctor}</p>
        <p className="text-xs text-muted-foreground">{apt.specialty}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{apt.time}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{apt.date}</span>
          <span className="flex items-center gap-1"><TypeIcon className="w-3 h-3" />{appointmentTypeLabel(apt.type, t)}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[apt.status]}`}>
          {t(`appointments.status.${apt.status}`)}
        </span>
        {apt.status === "confirmed" && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="text-xs h-7 text-destructive" onClick={() => onStatusChange(apt.id, "cancelled")}>{t("appointments.cancel")}</Button>
            <Button size="sm" className="text-xs h-7 gradient-primary text-primary-foreground" onClick={handleJoin} disabled={!canJoinNow}>
              {t("appointments.join")}
            </Button>
          </div>
        )}
        {apt.status === "pending" && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="text-xs h-7 text-destructive" onClick={() => onStatusChange(apt.id, "cancelled")}><X className="w-3 h-3" /></Button>
            <Button size="sm" className="text-xs h-7 gradient-primary text-primary-foreground" onClick={() => onStatusChange(apt.id, "confirmed")}><CheckCircle className="w-3 h-3" /></Button>
          </div>
        )}
        {allowRate && apt.status === "completed" && apt.doctorId && (
          <Button size="sm" variant="secondary" className="text-xs h-7" onClick={() => onRate?.(apt)}>
            {t("appointments.rateDoctor")}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

const Appointments = () => {
  const { t } = useTranslation();
  const [upcoming] = useAsyncSync(getUpcomingAppointments, []);
  const [past] = useAsyncSync(getPastAppointments, []);
  const [showBook, setShowBook] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedType, setSelectedType] = useState<"Video" | "In-Person" | "Chat">("Video");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [videoCall, setVideoCall] = useState<{ name: string; avatar: string; roomId: string } | null>(null);
  const [doctors] = useAsyncSync(getDoctors, []);
  const [rateApt, setRateApt] = useState<Appointment | null>(null);
  const [rateStars, setRateStars] = useState(5);
  const [rateComment, setRateComment] = useState("");
  const [rateLoading, setRateLoading] = useState(false);
  const { toast } = useToast();
  const { userName } = useAuth();

  const openRate = async (apt: Appointment) => {
    if (!apt.doctorId) return;
    setRateApt(apt);
    setRateLoading(true);
    try {
      const { review } = await getMyDoctorReview(apt.doctorId);
      if (review) {
        setRateStars(review.rating);
        setRateComment(review.comment || "");
      } else {
        setRateStars(5);
        setRateComment("");
      }
    } catch {
      setRateStars(5);
      setRateComment("");
    } finally {
      setRateLoading(false);
    }
  };

  const saveRating = async () => {
    if (!rateApt?.doctorId) return;
    setRateLoading(true);
    try {
      await submitDoctorReview({
        doctorId: rateApt.doctorId,
        rating: rateStars,
        comment: rateComment,
        appointmentId: rateApt.id,
      });
      toast({ title: t("appointments.thanksReview"), description: t("appointments.reviewSaved") });
      setRateApt(null);
    } catch (e) {
      toast({ title: t("appointments.toastReviewFailed"), description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setRateLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: Appointment["status"]) => {
    try {
      await updateAppointmentStatus(id, status);
      toast({
        title: t("appointments.toastAppointment", { status: t(`appointments.status.${status}`) }),
        description: t("appointments.toastAppointmentDesc", { status: t(`appointments.status.${status}`) }),
      });
    } catch (e) {
      toast({ title: t("appointments.toastUpdateFailed"), variant: "destructive", description: e instanceof Error ? e.message : "" });
    }
  };

  const handleVideoCall = (name: string, avatar: string, appointmentId: string) => {
    setVideoCall({ name, avatar, roomId: `appointment-${appointmentId}` });
  };

  const handleBook = async () => {
    const doc = doctors.find(d => d.id === selectedDoctor);
    if (!doc || !selectedDate || !selectedTime) {
      toast({ title: t("appointments.toastMissing"), description: t("appointments.toastMissingDesc"), variant: "destructive" });
      return;
    }
    try {
      await addAppointment({
        doctorUserId: doc.id,
        doctor: doc.name,
        specialty: doc.specialty,
        time: selectedTime,
        date: selectedDate,
        type: selectedType,
        status: "pending",
        avatar: doc.avatar,
        patientName: userName || "Patient",
      });
      toast({
        title: t("appointments.toastBooked"),
        description: t("appointments.toastBookedDesc", { doctor: doc.name, date: selectedDate, time: selectedTime }),
      });
      setShowBook(false);
      setSelectedDoctor("");
      setSelectedDate("");
      setSelectedTime("");
    } catch (e) {
      toast({ title: t("appointments.toastBookingFailed"), variant: "destructive", description: e instanceof Error ? e.message : "" });
    }
  };

  const timeSlots = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM"];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold">{t("appointments.title")} 📅</h2>
          <p className="text-muted-foreground">{t("appointments.subtitle")}</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setShowBook(true)}>
          <Plus className="w-4 h-4" /> {t("appointments.bookNew")}
        </Button>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">{t("appointments.upcoming", { count: upcoming.length })}</TabsTrigger>
          <TabsTrigger value="past">{t("appointments.past", { count: past.length })}</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-3 mt-4">
          <AnimatePresence>
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("appointments.emptyUpcoming")}</p>
            ) : (
              upcoming.map(a => <AppointmentCard key={a.id} apt={a} onStatusChange={handleStatusChange} onVideoCall={handleVideoCall} />)
            )}
          </AnimatePresence>
        </TabsContent>
        <TabsContent value="past" className="space-y-3 mt-4">
          {past.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("appointments.emptyPast")}</p>
          ) : (
            past.map((a) => (
              <AppointmentCard key={a.id} apt={a} onStatusChange={handleStatusChange} allowRate onRate={openRate} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rateApt} onOpenChange={(o) => !o && setRateApt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{t("appointments.rateDialogTitle", { name: rateApt?.doctor ?? "" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t("appointments.rating15")}</Label>
              <Select value={String(rateStars)} onValueChange={(v) => setRateStars(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? t("appointments.star") : t("appointments.stars")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("appointments.commentOptional")}</Label>
              <Textarea value={rateComment} onChange={(e) => setRateComment(e.target.value)} rows={3} placeholder={t("appointments.commentPlaceholder")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateApt(null)} disabled={rateLoading}>
              {t("appointments.cancel")}
            </Button>
            <Button className="gradient-primary text-primary-foreground" onClick={() => void saveRating()} disabled={rateLoading}>
              {rateLoading ? t("appointments.saving") : t("appointments.submitReview")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBook} onOpenChange={setShowBook}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{t("appointments.bookDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t("appointments.selectDoctor")}</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger><SelectValue placeholder={t("appointments.chooseDoctor")} /></SelectTrigger>
                <SelectContent>
                  {doctors.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name} — {d.specialty} ({d.fee})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("appointments.consultationType")}</Label>
              <Select value={selectedType} onValueChange={v => setSelectedType(v as "Video" | "In-Person" | "Chat")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Video">{t("appointments.videoCall")}</SelectItem>
                  <SelectItem value="In-Person">{t("appointments.inPerson")}</SelectItem>
                  <SelectItem value="Chat">{t("appointments.chat")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("appointments.date")}</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <Label>{t("appointments.preferredTime")}</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger><SelectValue placeholder={t("appointments.selectTime")} /></SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBook(false)}>{t("appointments.cancel")}</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleBook}>{t("appointments.confirmBooking")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

export default Appointments;
