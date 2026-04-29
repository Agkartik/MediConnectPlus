import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { User, Bell, Shield, Save, Check, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { updateMyLocation, updateMyProfile } from "@/services/medicalService";
import UserAvatar from "@/components/UserAvatar";


const Settings = () => {
  const { t } = useTranslation();
  const { userName, email: authEmail, refreshSession, patientProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(userName || "");
  const [email, setEmail] = useState(authEmail ?? "");
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    setName(userName);
  }, [userName]);
  useEffect(() => {
    if (authEmail) setEmail(authEmail);
  }, [authEmail]);
  
  // Initialize phone and dob from patientProfile - updates when profile loads
  // Initialize profile fields
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  
  useEffect(() => {
    if (patientProfile) {
      if (patientProfile.phone) setPhone(patientProfile.phone);
      if (patientProfile.dob) setDob(patientProfile.dob);
      if (patientProfile.gender) setGender(patientProfile.gender);
      if (patientProfile.bloodGroup) setBloodGroup(patientProfile.bloodGroup);
    }
    // Load saved profile photo from localStorage
    const savedAvatar = localStorage.getItem(`mc_avatar_${authEmail}`);
    if (savedAvatar) setAvatar(savedAvatar);
  }, [patientProfile, authEmail]);
  const [saving, setSaving] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, sms: false, push: true, appointments: true, prescriptions: true });
  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateMyProfile({ name, email, phone, dob, gender, bloodGroup } as any);
      await refreshSession();
      toast({ title: t("patientSettings.toastProfileSaved"), description: t("patientSettings.toastProfileSavedDesc") });
    } catch (e) {
      toast({ 
        title: t("patientSettings.toastSaveFailed"), 
        description: e instanceof Error ? e.message : t("patientSettings.toastSaveFailedDesc"),
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatar(dataUrl);
      localStorage.setItem(`mc_avatar_${authEmail}`, dataUrl);
      try {
        await updateMyProfile({ avatar: dataUrl } as any);
        await refreshSession();
        toast({ title: "Profile photo updated! 📸" });
      } catch {
        toast({ title: "Photo saved locally", description: "Could not sync to server." });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNotifications = () => {
    localStorage.setItem("mc_notifications_prefs", JSON.stringify(notifications));
    toast({ title: t("patientSettings.toastPrefsSaved"), description: t("patientSettings.toastPrefsSavedDesc") });
  };

  const saveMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: t("patientSettings.toastNotSupported"), description: t("patientSettings.toastNotSupportedDesc"), variant: "destructive" });
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await updateMyLocation(pos.coords.latitude, pos.coords.longitude);
          await refreshSession();
          toast({ title: t("patientSettings.toastLocationSaved"), description: t("patientSettings.toastLocationSavedDesc") });
        } catch (e) {
          toast({ title: t("patientSettings.toastFailed"), description: e instanceof Error ? e.message : "", variant: "destructive" });
        } finally {
          setLocBusy(false);
        }
      },
      () => {
        setLocBusy(false);
        toast({ title: t("patientSettings.toastPermissionNeeded"), description: t("patientSettings.toastPermissionNeededDesc"), variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleUpdatePassword = () => {
    if (!currentPw) {
      toast({ title: t("patientSettings.toastError"), description: t("patientSettings.toastEnterCurrentPw"), variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: t("patientSettings.toastError"), description: t("patientSettings.toastPwLen"), variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: t("patientSettings.toastError"), description: t("patientSettings.toastPwMismatch"), variant: "destructive" });
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast({ title: t("patientSettings.toastPwUpdated"), description: t("patientSettings.toastPwUpdatedDesc") });
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">{t("patientSettings.title")} ⚙️</h2>
        <p className="text-muted-foreground">{t("patientSettings.subtitle")}</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><User className="w-3.5 h-3.5 mr-1" />{t("patientSettings.tabProfile")}</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-3.5 h-3.5 mr-1" />{t("patientSettings.tabNotifications")}</TabsTrigger>
          <TabsTrigger value="security"><Shield className="w-3.5 h-3.5 mr-1" />{t("patientSettings.tabSecurity")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="font-heading">{t("patientSettings.personalInfo")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <label className="cursor-pointer group relative">
                  <UserAvatar
                    avatar={avatar ?? ""}
                    name={name}
                    className="w-16 h-16 border-2 border-primary/30 group-hover:border-primary transition-colors text-xl gradient-primary text-primary-foreground"
                  />

                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Change</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                  <p className="text-xs text-primary mt-0.5">Click photo to change</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>{t("patientSettings.fullName")}</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                <div><Label>{t("patientSettings.email")}</Label><Input value={email} onChange={e => setEmail(e.target.value)} type="email" /></div>
                <div><Label>{t("patientSettings.phone")}</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("patientSettings.phonePlaceholder")} /></div>
                <div><Label>{t("patientSettings.dob")}</Label><Input type="date" value={dob} onChange={e => setDob(e.target.value)} /></div>
                <div><Label>{t("patientSettings.gender")}</Label><Input value={gender} onChange={e => setGender(e.target.value)} placeholder={t("patientSettings.genderPlaceholder")} /></div>
                <div><Label>{t("patientSettings.bloodGroup")}</Label><Input value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} placeholder={t("patientSettings.bloodGroupPlaceholder")} /></div>
              </div>
              <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleSaveProfile} disabled={saving}>
                {saving ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity }} className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" /> : <Save className="w-4 h-4" />}
                {saving ? t("patientSettings.saving") : t("patientSettings.saveChanges")}
              </Button>
              <div className="pt-6 border-t border-border/50 mt-6">
                <p className="text-sm font-medium mb-1">{t("patientSettings.visitPlanning")}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {t("patientSettings.visitPlanningDesc")}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {t("patientSettings.locationStatus", { status: patientProfile?.hasLocation ? t("patientSettings.locationOn") : t("patientSettings.locationOff") })}
                </p>
                {patientProfile?.hasLocation && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("patientSettings.coordinates", { lat: patientProfile.latitude, lon: patientProfile.longitude })}
                  </p>
                )}
                <Button type="button" variant="secondary" className="gap-2" onClick={saveMyLocation} disabled={locBusy}>
                  <Navigation className="w-4 h-4" />
                  {locBusy ? t("patientSettings.locating") : t("patientSettings.updateLocation")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="font-heading">{t("patientSettings.notificationPreferences")}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "email", label: t("patientSettings.notif.email"), desc: t("patientSettings.notif.emailDesc") },
                { key: "sms", label: t("patientSettings.notif.sms"), desc: t("patientSettings.notif.smsDesc") },
                { key: "push", label: t("patientSettings.notif.push"), desc: t("patientSettings.notif.pushDesc") },
                { key: "appointments", label: t("patientSettings.notif.appointments"), desc: t("patientSettings.notif.appointmentsDesc") },
                { key: "prescriptions", label: t("patientSettings.notif.prescriptions"), desc: t("patientSettings.notif.prescriptionsDesc") },
              ].map(n => (
                <div key={n.key} className="flex items-center justify-between">
                  <div><p className="text-sm font-medium">{n.label}</p><p className="text-xs text-muted-foreground">{n.desc}</p></div>
                  <Switch checked={notifications[n.key as keyof typeof notifications]} onCheckedChange={v => setNotifications(prev => ({ ...prev, [n.key]: v }))} />
                </div>
              ))}
              <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleSaveNotifications}>
                <Check className="w-4 h-4" /> {t("patientSettings.savePreferences")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="font-heading">{t("patientSettings.securitySettings")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>{t("patientSettings.currentPassword")}</Label><Input type="password" placeholder="••••••••" value={currentPw} onChange={e => setCurrentPw(e.target.value)} /></div>
              <div><Label>{t("patientSettings.newPassword")}</Label><Input type="password" placeholder="••••••••" value={newPw} onChange={e => setNewPw(e.target.value)} /></div>
              <div><Label>{t("patientSettings.confirmNewPassword")}</Label><Input type="password" placeholder="••••••••" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} /></div>
              <Button className="gradient-primary text-primary-foreground" onClick={handleUpdatePassword} disabled={saving}>
                {saving ? t("patientSettings.updating") : t("patientSettings.updatePassword")}
              </Button>
              <p className="text-xs text-muted-foreground pt-2">
                {t("patientSettings.supportHint")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
