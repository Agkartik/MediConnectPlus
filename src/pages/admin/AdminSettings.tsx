import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Shield, Globe, Bell, Save, RotateCcw, User, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getAdminSettings, saveAdminSettings, updateMyProfile } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import { useAuth } from "@/contexts/AuthContext";
import type { AdminSettings as AdminSettingsType } from "@/types/store";
import UserAvatar from "@/components/UserAvatar";


const defaultSettings: AdminSettingsType = {
  platformName: "MediConnect+", supportEmail: "support@mediconnect.com", currency: "USD", commissionRate: 15,
  maintenance: false, registration: true, doctorApproval: true,
  emailNotifications: true, systemAlerts: true, sessionTimeout: 30, maxLoginAttempts: 5, passwordMinLength: 8,
};

/** Compress an image to max 256x256 JPEG at 85% quality (keeps it under ~30KB base64) */
function compressImage(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 256;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(base64); // fallback to original if error
    img.src = base64;
  });
}

const AdminSettings = () => {
  const { userName, email: authEmail, avatar: authAvatar, refreshSession } = useAuth();
  const [stored] = useAsyncSync(getAdminSettings, defaultSettings);
  const [settings, setSettings] = useState<AdminSettingsType>(defaultSettings);

  // Keep a separate ref for the current avatar so we always send the latest value
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [personalName, setPersonalName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // Sync from auth context when it loads/changes
  useEffect(() => {
    setPersonalName(userName || "");
    setPersonalEmail(authEmail || "");
    // Only sync avatar from context if we don't have a locally selected one
    setLocalAvatar(prev => prev ?? authAvatar ?? null);
  }, [userName, authEmail, authAvatar]);

  useEffect(() => {
    setSettings(stored);
  }, [stored]);

  const { toast } = useToast();

  const handleSaveGeneral = async () => {
    try {
      await saveAdminSettings(settings);
      toast({ title: "Settings Saved ✅", description: "Platform settings have been updated." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const handleSaveSecurity = async () => {
    try {
      await saveAdminSettings(settings);
      toast({ title: "Security Updated 🔒", description: "Security settings have been saved." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await saveAdminSettings(settings);
      toast({ title: "Notification Settings Saved 🔔" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const handleSavePersonalProfile = async () => {
    if (!personalName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      const updateData: Record<string, string> = { name: personalName.trim() };

      // Always send email if changed
      if (personalEmail && personalEmail !== authEmail) {
        updateData.email = personalEmail;
      }

      // Always persist avatar — send it whenever we have a base64 image
      if (localAvatar && localAvatar.startsWith("data:image")) {
        updateData.avatar = localAvatar;
      }

      await updateMyProfile(updateData);

      // Refresh session to sync context with what's now in the DB
      try {
        await refreshSession();
      } catch (refreshErr) {
        console.warn("Session refresh after profile update failed:", refreshErr);
        // Profile WAS saved; the refresh is best-effort
      }

      toast({ title: "Profile Updated ✨", description: "Your personal details have been saved." });
    } catch (e: any) {
      toast({ title: "Failed to update profile", description: e.message || "An error occurred", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB raw)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please choose an image under 10MB", variant: "destructive" });
      return;
    }

    setCompressing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const raw = ev.target?.result as string;
        try {
          const compressed = await compressImage(raw);
          setLocalAvatar(compressed);
        } catch {
          setLocalAvatar(raw); // fallback: use original
        }
        setCompressing(false);
      };
      reader.onerror = () => setCompressing(false);
      reader.readAsDataURL(file);
    } catch {
      setCompressing(false);
    }
  };

  const handleReset = async () => {
    setSettings(defaultSettings);
    try {
      await saveAdminSettings(defaultSettings);
      toast({ title: "Settings Reset", description: "All settings restored to defaults." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  // Display avatar: show local selection first, then context avatar
  const displayAvatar = localAvatar ?? authAvatar ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="font-heading text-2xl font-bold">Platform Settings ⚙️</h2><p className="text-muted-foreground">Configure platform-wide settings</p></div>
        <Button variant="outline" className="gap-2" onClick={handleReset}><RotateCcw className="w-4 h-4" />Reset Defaults</Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general"><Globe className="w-3.5 h-3.5 mr-1" />General</TabsTrigger>
          <TabsTrigger value="profile"><User className="w-3.5 h-3.5 mr-1" />My Profile</TabsTrigger>
          <TabsTrigger value="security"><Shield className="w-3.5 h-3.5 mr-1" />Security</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-3.5 h-3.5 mr-1" />Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="font-heading">General Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Platform Name</Label><Input value={settings.platformName} onChange={e => setSettings(p => ({ ...p, platformName: e.target.value }))} /></div>
                <div><Label>Support Email</Label><Input value={settings.supportEmail} onChange={e => setSettings(p => ({ ...p, supportEmail: e.target.value }))} type="email" /></div>
                <div><Label>Default Currency</Label><Input value={settings.currency} onChange={e => setSettings(p => ({ ...p, currency: e.target.value }))} /></div>
                <div><Label>Commission Rate (%)</Label><Input type="number" value={settings.commissionRate} onChange={e => setSettings(p => ({ ...p, commissionRate: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              {[
                { key: "maintenance" as const, label: "Maintenance Mode", desc: "Temporarily disable platform access" },
                { key: "registration" as const, label: "Open Registration", desc: "Allow new user signups" },
                { key: "doctorApproval" as const, label: "Doctor Approval Required", desc: "Require admin approval for new doctors" },
              ].map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <div><p className="text-sm font-medium">{s.label}</p><p className="text-xs text-muted-foreground">{s.desc}</p></div>
                  <Switch checked={settings[s.key] as boolean} onCheckedChange={v => setSettings(prev => ({ ...prev, [s.key]: v }))} />
                </div>
              ))}
              <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleSaveGeneral}><Save className="w-4 h-4" /> Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="font-heading">Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Session Timeout (minutes)</Label><Input type="number" value={settings.sessionTimeout} onChange={e => setSettings(p => ({ ...p, sessionTimeout: parseInt(e.target.value) || 30 }))} /></div>
              <div><Label>Max Login Attempts</Label><Input type="number" value={settings.maxLoginAttempts} onChange={e => setSettings(p => ({ ...p, maxLoginAttempts: parseInt(e.target.value) || 5 }))} /></div>
              <div><Label>Password Min Length</Label><Input type="number" value={settings.passwordMinLength} onChange={e => setSettings(p => ({ ...p, passwordMinLength: parseInt(e.target.value) || 8 }))} /></div>
              <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleSaveSecurity}><Save className="w-4 h-4" /> Update Security</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="font-heading">System Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "emailNotifications" as const, label: "Admin Email Alerts", desc: "Receive critical system alerts" },
                { key: "systemAlerts" as const, label: "System Health Alerts", desc: "Server and performance notifications" },
              ].map(n => (
                <div key={n.key} className="flex items-center justify-between">
                  <div><p className="text-sm font-medium">{n.label}</p><p className="text-xs text-muted-foreground">{n.desc}</p></div>
                  <Switch checked={settings[n.key] as boolean} onCheckedChange={v => setSettings(prev => ({ ...prev, [n.key]: v }))} />
                </div>
              ))}
              <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleSaveNotifications}><Save className="w-4 h-4" /> Save Notifications</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="font-heading">Personal Profile</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <label className="cursor-pointer group relative">
                  <UserAvatar
                    avatar={displayAvatar}
                    name={personalName}
                    className="w-20 h-20 border-2 border-primary/30 group-hover:border-primary transition-colors text-2xl bg-admin/10 text-admin"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                    <span className="text-white text-[10px] font-medium mt-0.5">
                      {compressing ? "Processing..." : "Change"}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={compressing}
                  />
                </label>
                <div>
                  <h4 className="font-heading font-bold">{personalName}</h4>
                  <p className="text-sm text-muted-foreground">{personalEmail}</p>
                  <p className="text-xs text-primary mt-1">Administrator Account</p>
                  {localAvatar && localAvatar.startsWith("data:image") && localAvatar !== authAvatar && (
                    <p className="text-xs text-amber-500 mt-1">⚠ Unsaved photo — click Save Profile</p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={personalName} onChange={e => setPersonalName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} type="email" />
                </div>
              </div>

              <Button
                className="gradient-primary text-primary-foreground gap-2"
                onClick={handleSavePersonalProfile}
                disabled={savingProfile || compressing}
              >
                <Save className="w-4 h-4" />
                {savingProfile ? "Saving..." : compressing ? "Processing image..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
