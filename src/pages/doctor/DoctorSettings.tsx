import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { User, Bell, Clock, Save, Lock, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getDoctorProfile, saveDoctorProfile } from "@/services/medicalService";
import { useAuth } from "@/contexts/AuthContext";
import type { DoctorProfile } from "@/types/store";
import UserAvatar from "@/components/UserAvatar";


const defaultProfile: DoctorProfile = {
  name: "",
  specialization: "",
  license: "",
  experience: "",
  fee: "",
  hospital: "",
  practiceAddress: "",
  latitude: null,
  longitude: null,
  schedule: {
    Monday: { start: "09:00", end: "17:00", enabled: true },
    Tuesday: { start: "09:00", end: "17:00", enabled: true },
    Wednesday: { start: "09:00", end: "17:00", enabled: true },
    Thursday: { start: "09:00", end: "17:00", enabled: true },
    Friday: { start: "09:00", end: "17:00", enabled: true },
  },
  notifications: { email: true, sms: true, push: true, appointments: true, alerts: true },
};

const DoctorSettings = () => {
  const { t } = useTranslation();
  const { refreshSession } = useAuth();
  const [profile, setProfile] = useState<DoctorProfile>(defaultProfile);
  const [loaded, setLoaded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [locBusy, setLocBusy] = useState(false);
  const { toast } = useToast();
  const useClinicLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: t("doctorSettings.toastNotSupported"), description: t("doctorSettings.toastNotSupportedDesc"), variant: "destructive" });
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProfile((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setLocBusy(false);
        toast({ title: t("doctorSettings.toastCoordsCaptured"), description: t("doctorSettings.toastCoordsCapturedDesc") });
      },
      () => {
        setLocBusy(false);
        toast({ title: t("doctorSettings.toastLocationDenied"), description: t("doctorSettings.toastLocationDeniedDesc"), variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  useEffect(() => {
    getDoctorProfile()
      .then((p) => {
        setProfile(p);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const updateField = (field: keyof DoctorProfile, value: unknown) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      await saveDoctorProfile(profile);
      toast({ title: t("doctorSettings.toastProfileSaved"), description: t("doctorSettings.toastProfileSavedDesc") });
    } catch {
      toast({ title: t("doctorSettings.toastSaveFailed"), variant: "destructive" });
    }
  };

  const handleSaveSchedule = async () => {
    try {
      await saveDoctorProfile(profile);
      toast({ title: t("doctorSettings.toastScheduleSaved"), description: t("doctorSettings.toastScheduleSavedDesc") });
    } catch {
      toast({ title: t("doctorSettings.toastSaveFailed"), variant: "destructive" });
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await saveDoctorProfile(profile);
      toast({ title: t("doctorSettings.toastNotificationsSaved"), description: t("doctorSettings.toastNotificationsSavedDesc") });
    } catch {
      toast({ title: t("doctorSettings.toastSaveFailed"), variant: "destructive" });
    }
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      toast({ title: t("doctorSettings.toastError"), description: t("doctorSettings.toastFillAllPw"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("doctorSettings.toastError"), description: t("doctorSettings.toastPwMismatch"), variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: t("doctorSettings.toastError"), description: t("doctorSettings.toastPwLen"), variant: "destructive" });
      return;
    }
    toast({ title: t("doctorSettings.toastPwChanged"), description: t("doctorSettings.toastPwChangedDesc") });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  if (!loaded) return <div className="p-6 text-muted-foreground">{t("doctorSettings.loading")}</div>;

  return (
    <div className="space-y-6">
      <div><h2 className="font-heading text-2xl font-bold">{t("doctorSettings.title")} ⚙️</h2><p className="text-muted-foreground">{t("doctorSettings.subtitle")}</p></div>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><User className="w-3.5 h-3.5 mr-1" />{t("doctorSettings.tabProfile")}</TabsTrigger>
          <TabsTrigger value="schedule"><Clock className="w-3.5 h-3.5 mr-1" />{t("doctorSettings.tabSchedule")}</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-3.5 h-3.5 mr-1" />{t("doctorSettings.tabNotifications")}</TabsTrigger>
          <TabsTrigger value="security"><Lock className="w-3.5 h-3.5 mr-1" />{t("doctorSettings.tabSecurity")}</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="font-heading">{t("doctorSettings.professionalProfile")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <label className="cursor-pointer group relative">
                  <UserAvatar
                    avatar={profile.avatar}
                    name={profile.name}
                    className="w-16 h-16 border-2 border-primary/30 group-hover:border-primary transition-colors text-xl bg-primary/10 text-primary"
                  />

                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Change</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const dataUrl = ev.target?.result as string;
                      updateField("avatar", dataUrl);
                      try {
                        await saveDoctorProfile({ ...profile, avatar: dataUrl });
                        await refreshSession();
                        toast({ title: "Profile photo updated! 📸" });
                      } catch {
                        toast({ title: "Photo saved in current session", description: "Save profile to sync permanently." });
                      }
                    };
                    reader.readAsDataURL(file);
                  }} />
                </label>
                <div>
                  <p className="font-medium">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{profile.specialization}</p>
                  <p className="text-xs text-primary mt-0.5">Click photo to change</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>{t("doctorSettings.fullName")}</Label><Input value={profile.name} onChange={e => updateField("name", e.target.value)} /></div>
                <div><Label>{t("doctorSettings.specialization")}</Label><Input value={profile.specialization} onChange={e => updateField("specialization", e.target.value)} /></div>
                <div><Label>{t("doctorSettings.license")}</Label><Input value={profile.license} onChange={e => updateField("license", e.target.value)} /></div>
                <div><Label>{t("doctorSettings.experienceYears")}</Label><Input value={profile.experience} onChange={e => updateField("experience", e.target.value)} type="number" /></div>
                <div><Label>{t("doctorSettings.fee")}</Label><Input value={profile.fee} onChange={e => updateField("fee", e.target.value)} type="number" /></div>
                <div><Label>{t("doctorSettings.hospital")}</Label><Input value={profile.hospital} onChange={e => updateField("hospital", e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>{t("doctorSettings.practiceAddress")}</Label><Input value={profile.practiceAddress} onChange={e => updateField("practiceAddress", e.target.value)} placeholder={t("doctorSettings.practiceAddressPlaceholder")} /></div>
                <div><Label>{t("doctorSettings.latitude")}</Label><Input value={profile.latitude ?? ""} onChange={e => updateField("latitude", e.target.value === "" ? null : Number(e.target.value))} type="number" step="any" placeholder={t("doctorSettings.latitudePlaceholder")} /></div>
                <div><Label>{t("doctorSettings.longitude")}</Label><Input value={profile.longitude ?? ""} onChange={e => updateField("longitude", e.target.value === "" ? null : Number(e.target.value))} type="number" step="any" placeholder={t("doctorSettings.longitudePlaceholder")} /></div>
              </div>
              <Button type="button" variant="secondary" className="gap-2 mr-2" onClick={useClinicLocation} disabled={locBusy}>
                <Navigation className="w-4 h-4" />
                {locBusy ? t("doctorSettings.locating") : t("doctorSettings.useDeviceLocation")}
              </Button>
              <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleSaveProfile}><Save className="w-4 h-4" /> {t("doctorSettings.saveChanges")}</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="font-heading">{t("doctorSettings.availabilitySchedule")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(profile.schedule).map(([day, val]) => (
                <div key={day} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/30">
                  <span className="text-sm font-medium w-24">{t(`doctorSettings.days.${day}`, { defaultValue: day })}</span>
                  <div className="flex items-center gap-3">
                    <Input value={val.start} type="time" className="w-28" onChange={e => setProfile(prev => ({ ...prev, schedule: { ...prev.schedule, [day]: { ...val, start: e.target.value } } }))} />
                    <span className="text-muted-foreground">{t("doctorSettings.to")}</span>
                    <Input value={val.end} type="time" className="w-28" onChange={e => setProfile(prev => ({ ...prev, schedule: { ...prev.schedule, [day]: { ...val, end: e.target.value } } }))} />
                  </div>
                  <Switch checked={val.enabled} onCheckedChange={v => setProfile(prev => ({ ...prev, schedule: { ...prev.schedule, [day]: { ...val, enabled: v } } }))} />
                </div>
              ))}
              <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleSaveSchedule}><Save className="w-4 h-4" /> {t("doctorSettings.saveSchedule")}</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="font-heading">{t("doctorSettings.notificationPreferences")}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "email", label: t("doctorSettings.notif.email"), desc: t("doctorSettings.notif.emailDesc") },
                { key: "sms", label: t("doctorSettings.notif.sms"), desc: t("doctorSettings.notif.smsDesc") },
                { key: "push", label: t("doctorSettings.notif.push"), desc: t("doctorSettings.notif.pushDesc") },
                { key: "appointments", label: t("doctorSettings.notif.appointments"), desc: t("doctorSettings.notif.appointmentsDesc") },
                { key: "alerts", label: t("doctorSettings.notif.alerts"), desc: t("doctorSettings.notif.alertsDesc") },
              ].map(n => (
                <div key={n.key} className="flex items-center justify-between">
                  <div><p className="text-sm font-medium">{n.label}</p><p className="text-xs text-muted-foreground">{n.desc}</p></div>
                  <Switch checked={profile.notifications[n.key]} onCheckedChange={v => setProfile(prev => ({ ...prev, notifications: { ...prev.notifications, [n.key]: v } }))} />
                </div>
              ))}
              <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleSaveNotifications}><Save className="w-4 h-4" /> {t("doctorSettings.savePreferences")}</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="font-heading">{t("doctorSettings.changePassword")}</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div><Label>{t("doctorSettings.currentPassword")}</Label><Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>
              <div><Label>{t("doctorSettings.newPassword")}</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
              <div><Label>{t("doctorSettings.confirmNewPassword")}</Label><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
              <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleChangePassword}><Lock className="w-4 h-4" /> {t("doctorSettings.changePassword")}</Button>
              <p className="text-xs text-muted-foreground pt-2">
                {t("doctorSettings.supportHint")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorSettings;
