import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Search, Star, MapPin, Calendar, Video, MessageSquare, Navigation, ExternalLink, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDoctors,
  addAppointment,
  getPaymentConfig,
  createConsultationRazorpayOrder,
  verifyConsultationBooking,
  updateMyLocation,
  getDoctorAvailableSlots,
} from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import { loadRazorpayScript, razorpayPaymentMethodConfig } from "@/lib/razorpayCheckout";
import { specialtyMatches } from "@/lib/specialtyMatch";
import { buildDirectionsToClinicUrl } from "@/lib/mapsDirections";
import UserAvatar from "@/components/UserAvatar";


const SPECIALTY_FILTERS: { value: string; labelKey: string }[] = [
  { value: "All", labelKey: "findDoctors.specAll" },
  { value: "Cardiologist", labelKey: "findDoctors.specCardiologist" },
  { value: "Dermatologist", labelKey: "findDoctors.specDermatologist" },
  { value: "General Physician", labelKey: "findDoctors.specGP" },
  { value: "Orthopedic", labelKey: "findDoctors.specOrthopedic" },
  { value: "Neurologist", labelKey: "findDoctors.specNeurologist" },
  { value: "Pediatrician", labelKey: "findDoctors.specPediatrician" },
];

function consultationFeeAmount(feeStr: string, type: "Video" | "In-Person" | "Chat") {
  const feeNum = parseFloat(String(feeStr || "$100").replace(/[^0-9.]/g, "")) || 100;
  const mult = type === "Video" ? 1 : type === "In-Person" ? 1.2 : 0.7;
  return Math.round(feeNum * mult * 100) / 100;
}

const FindDoctors = () => {
  const { t } = useTranslation();
  const { userName, email, refreshSession, patientProfile } = useAuth();
  const [doctors] = useAsyncSync(getDoctors, []);
  const [payConfig] = useAsyncSync(getPaymentConfig, {
    razorpayEnabled: false,
    keyId: null,
    currency: "INR",
    allowUnpaidPharmacyOrders: false,
    allowUnpaidAppointments: false,
  });
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [bookingDoc, setBookingDoc] = useState<string | null>(null);
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("");
  const [bookType, setBookType] = useState<"Video" | "In-Person" | "Chat">("Video");
  const [bookingBusy, setBookingBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (bookingDoc && bookDate) {
      setLoadingSlots(true);
      getDoctorAvailableSlots(bookingDoc, bookDate)
        .then((data) => {
          setAvailableSlots(data.availableSlots);
          if (data.availableSlots.length === 0) {
            toast({
              title: t("findDoctors.noSlots"),
              description: t("findDoctors.noSlotsDesc"),
              variant: "destructive",
            });
          }
        })
        .catch((err) => {
          console.error(err);
          setAvailableSlots([]);
        })
        .finally(() => setLoadingSlots(false));
    }
  }, [bookingDoc, bookDate, t]);

  const filtered = doctors.filter((d) => {
    if (d.approved === false || d.status === "Suspended") return false;
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase());
    const matchesSpec = specialtyMatches(d.specialty, selectedSpecialty);
    return matchesSearch && matchesSpec;
  });

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: t("findDoctors.notSupported"), description: t("findDoctors.notSupportedDesc"), variant: "destructive" });
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await updateMyLocation(pos.coords.latitude, pos.coords.longitude);
          await refreshSession();
          toast({
            title: t("findDoctors.locationSaved"),
            description: t("findDoctors.locationSavedDesc"),
          });
        } catch (e) {
          toast({
            title: t("findDoctors.couldNotSaveLoc"),
            description: e instanceof Error ? e.message : "Try again",
            variant: "destructive",
          });
        } finally {
          setLocBusy(false);
        }
      },
      () => {
        setLocBusy(false);
        toast({
          title: t("findDoctors.locationDenied"),
          description: t("findDoctors.locationDeniedDesc"),
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const selectedDoctor = doctors.find((d) => d.id === bookingDoc);
  const feeForDialog = selectedDoctor ? consultationFeeAmount(selectedDoctor.fee, bookType) : 0;

  const handleBook = async () => {
    const doc = doctors.find((d) => d.id === bookingDoc);
    if (!doc || !bookDate || !bookTime) {
      toast({ title: t("appointments.toastMissing"), description: t("appointments.toastMissingDesc"), variant: "destructive" });
      return;
    }

    if (payConfig.razorpayEnabled && payConfig.keyId) {
      setBookingBusy(true);
      try {
        await loadRazorpayScript();
        const order = await createConsultationRazorpayOrder({
          doctorId: doc.id,
          type: bookType,
          date: bookDate,
          time: bookTime,
        });
        await new Promise<void>((resolve, reject) => {
          if (!window.Razorpay) {
            reject(new Error("Razorpay failed to load"));
            return;
          }
          const rzp = new window.Razorpay({
            key: order.keyId,
            currency: order.currency,
            order_id: order.orderId,
            name: t("app.name"),
            description: `Consultation — ${doc.name}`,
            config: razorpayPaymentMethodConfig(),
            handler: (response) => {
              void (async () => {
                try {
                  await verifyConsultationBooking({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    patientName: userName,
                  });
                  toast({
                    title: t("appointments.toastPaidConfirmed"),
                    description: t("appointments.toastPaidDesc", {
                      amount: order.feeInr.toFixed(2),
                      doctor: doc.name,
                      date: bookDate,
                      time: bookTime,
                    }),
                  });
                  setBookingDoc(null);
                  setBookDate("");
                  setBookTime("");
                  resolve();
                } catch (err) {
                  toast({
                    title: t("appointments.toastPaymentVerifyFail"),
                    description: t("appointments.toastPaymentVerifyFailDesc"),
                    variant: "destructive",
                  });
                  reject(err);
                }
              })();
            },
            modal: {
              ondismiss: () => {
                toast({
                  title: t("appointments.toastPaymentCancelledTitle"),
                  description: t("appointments.toastPaymentCancelledDesc"),
                  variant: "destructive",
                });
                reject(new Error("Payment cancelled"));
              },
            },
            prefill: { name: userName, email: email ?? undefined },
            theme: { color: "#0d9488" },
          });
          rzp.open();
        });
      } catch (e) {
        if (e instanceof Error && e.message === "Payment cancelled") {
          toast({ title: t("appointments.cancel"), variant: "destructive" });
        } else {
          toast({
            title: t("appointments.toastBookingFailed"),
            description: e instanceof Error ? e.message : "Try again",
            variant: "destructive",
          });
        }
      } finally {
        setBookingBusy(false);
      }
      return;
    }

    if (payConfig.allowUnpaidAppointments) {
      setBookingBusy(true);
      try {
        await addAppointment({
          doctorUserId: doc.id,
          doctor: doc.name,
          specialty: doc.specialty,
          time: bookTime,
          date: bookDate,
          type: bookType,
          status: "pending",
          avatar: doc.avatar,
          patientName: userName,
        });
        toast({
          title: t("appointments.toastBooked"),
          description: t("appointments.toastBookedDesc", { doctor: doc.name, date: bookDate, time: bookTime }),
        });
        setBookingDoc(null);
        setBookDate("");
        setBookTime("");
      } catch (e) {
        toast({ title: t("appointments.toastBookingFailed"), description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
      } finally {
        setBookingBusy(false);
      }
      return;
    }

    toast({
      title: t("findDoctors.payHintRequired"),
      description: t("findDoctors.payHintRequired"),
      variant: "destructive",
    });
  };

  const directionsHref = (lat: number, lng: number) =>
    buildDirectionsToClinicUrl(lat, lng, {
      patientLat: patientProfile?.latitude ?? undefined,
      patientLng: patientProfile?.longitude ?? undefined,
    });

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <div>
        <h2 className="font-heading text-2xl font-bold">{t("findDoctors.title")} 🔍</h2>
        <p className="text-muted-foreground">{t("findDoctors.subtitle")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("findDoctors.searchPlaceholder")}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="button" variant="secondary" size="default" className="shrink-0 gap-2" onClick={useMyLocation} disabled={locBusy}>
          <Navigation className="w-4 h-4" />
          {locBusy ? t("findDoctors.locating") : t("findDoctors.useMyLocation")}
        </Button>
        <div className="flex gap-2 flex-wrap">
          {SPECIALTY_FILTERS.map((s) => (
            <Button
              key={s.value}
              variant={selectedSpecialty === s.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSpecialty(s.value)}
              className="text-xs"
            >
              {t(s.labelKey)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-card border-border/50 hover:shadow-elevated transition-all">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <UserAvatar
                    avatar={d.avatar}
                    name={d.name}
                    className="w-12 h-12 gradient-primary text-primary-foreground text-sm"
                  />

                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-sm">{d.name}</h3>
                    <p className="text-xs text-muted-foreground">{d.specialty}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium">{d.rating != null ? d.rating : "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        ({d.reviews} {d.reviews === 1 ? t("findDoctors.review") : t("findDoctors.reviews")})
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary">{d.fee}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {d.distance}
                  </span>
                  {d.hasClinicLocation && d.latitude != null && d.longitude != null && (
                    <a
                      href={directionsHref(d.latitude, d.longitude)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t("findDoctors.directionsToClinic")} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {d.available}
                  </span>
                  <div className="flex gap-1 ml-auto">
                    {d.modes.includes("video") && <Video className="w-3.5 h-3.5 text-primary" />}
                    {d.modes.includes("chat") && <MessageSquare className="w-3.5 h-3.5 text-accent" />}
                  </div>
                </div>
                <Button className="w-full gradient-primary text-primary-foreground" size="sm" onClick={() => setBookingDoc(d.id)}>
                  {t("findDoctors.bookAppointment")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!bookingDoc} onOpenChange={(open) => !open && setBookingDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{t("findDoctors.bookDialogTitle", { name: selectedDoctor?.name ?? "" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-secondary/50 border border-border/50 p-3 text-sm space-y-1">
              <p className="font-medium text-foreground">{t("findDoctors.feeTitle")}</p>
              <p className="text-2xl font-heading font-bold text-primary">
                {payConfig.razorpayEnabled ? `₹${feeForDialog.toFixed(2)}` : `$${feeForDialog.toFixed(2)}`}
              </p>
              <p className="text-xs text-muted-foreground">{t("findDoctors.feeHint")}</p>
            </div>
            <div>
              <Label>{t("findDoctors.consultationType")}</Label>
              <Select value={bookType} onValueChange={(v) => setBookType(v as "Video" | "In-Person" | "Chat")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Video">{t("appointments.videoCall")}</SelectItem>
                  <SelectItem value="In-Person">{t("appointments.inPerson")}</SelectItem>
                  <SelectItem value="Chat">{t("appointments.chat")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("findDoctors.dateLabel")}</Label>
              <Input type="date" value={bookDate} onChange={(e) => { setBookDate(e.target.value); setBookTime(""); }} min={new Date().toISOString().split("T")[0]} />
            </div>
            <div>
              <Label>{t("findDoctors.slotsLabel")}</Label>
              {loadingSlots ? (
                <p className="text-sm text-muted-foreground py-2">{t("findDoctors.loadingSlots")}</p>
              ) : availableSlots.length === 0 && bookDate ? (
                <p className="text-sm text-destructive py-2">{t("findDoctors.noSlotsDate")}</p>
              ) : (
                <Select value={bookTime} onValueChange={setBookTime} disabled={!bookDate || availableSlots.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={bookDate ? t("findDoctors.selectTimeSlot") : t("findDoctors.chooseDateFirst")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {slot}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {bookDate && availableSlots.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {availableSlots.length === 1
                    ? t("findDoctors.slotsAvailableCount", { count: availableSlots.length })
                    : t("findDoctors.slotsAvailableCountPlural", { count: availableSlots.length })}
                </p>
              )}
            </div>
            {payConfig.razorpayEnabled ? (
              <p className="text-xs text-muted-foreground">{t("findDoctors.payHintRzp")}</p>
            ) : payConfig.allowUnpaidAppointments ? (
              <p className="text-xs text-muted-foreground">{t("findDoctors.payHintDemo")}</p>
            ) : (
              <p className="text-xs text-destructive">{t("findDoctors.payHintRequired")}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDoc(null)} disabled={bookingBusy}>
              {t("appointments.cancel")}
            </Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleBook} disabled={bookingBusy}>
              {bookingBusy
                ? t("findDoctors.pleaseWait")
                : payConfig.razorpayEnabled
                  ? t("findDoctors.payAndConfirm", { fee: feeForDialog.toFixed(2) })
                  : t("findDoctors.confirmBookingShort")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FindDoctors;
