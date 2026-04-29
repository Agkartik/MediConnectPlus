import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Shield, Stethoscope, Activity, MapPin, Pill, Globe, ArrowRight, Lock, CheckCircle, UserPlus, Search as SearchIcon, CalendarCheck } from "lucide-react";
import { AppLogoMark } from "@/components/AppLogoMark";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { authLogin } from "@/services/medicalService";

const features = [
  { icon: Stethoscope, title: "Online Consultations", desc: "Chat & video with verified doctors instantly" },
  { icon: MapPin, title: "Clinic Discovery", desc: "Find nearby clinics & doctors on a map" },
  { icon: Pill, title: "Digital Pharmacy", desc: "Order prescribed medicines with delivery" },
  { icon: Activity, title: "Wearable Monitoring", desc: "Real-time health data with smart alerts" },
  { icon: Globe, title: "Multilingual", desc: "Healthcare in your preferred language" },
  { icon: Shield, title: "Secure & Compliant", desc: "Role-based access with encrypted data" },
];

const roles = [
  { role: "patient" as const, icon: Heart, title: "Patient", desc: "Access healthcare, book consultations, track health", color: "from-primary to-accent" },
  { role: "doctor" as const, icon: Stethoscope, title: "Doctor", desc: "Manage patients, consultations & earnings", color: "from-accent to-primary" },
];

const howItWorks = [
  { step: 1, icon: UserPlus, title: "Create Your Account", desc: "Sign up as a patient or doctor in under a minute. Verify your email to get started." },
  { step: 2, icon: SearchIcon, title: "Find & Connect", desc: "Patients search for top-rated doctors by specialty. Doctors get discovered by patients instantly." },
  { step: 3, icon: CalendarCheck, title: "Book & Consult", desc: "Schedule video, chat, or in-person appointments. Join consultations with one click." },
  { step: 4, icon: CheckCircle, title: "Track & Manage", desc: "Monitor health data in real-time, manage prescriptions, and order medicines with delivery." },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const { toast } = useToast();
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");

  const handleAdminLogin = async () => {
    try {
      const res = await authLogin(adminEmail, adminPass);
      if (res.user.role !== "admin") {
        toast({ title: "Access denied", description: "This account is not an administrator.", variant: "destructive" });
        return;
      }
      loginWithToken(res.token, {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role as UserRole,
        approved: res.user.approved,
      });
      navigate("/dashboard/admin");
      setShowAdmin(false);
    } catch {
      toast({ title: "Invalid credentials", description: "Admin email or password is incorrect.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <nav className="relative z-10 container mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-primary/20 shrink-0">
              <AppLogoMark title="" className="w-full h-full" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">MediConnect+</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground/10 hover:text-muted-foreground/30" onClick={() => setShowAdmin(true)}>
              <Lock className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/login")}>
              Sign In
            </Button>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20 lg:py-32">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Activity className="w-4 h-4" />
              Unified Healthcare Ecosystem
            </div>
            <h1 className="font-heading text-5xl lg:text-7xl font-extrabold leading-tight mb-6">
              <span className="text-foreground">Your Health,</span><br />
              <span className="text-gradient">One Platform.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mb-8">
              Consultations, clinic discovery, pharmacy, wearable monitoring — all unified in one intelligent platform for preventive, data-driven healthcare.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="gradient-primary text-primary-foreground px-8 shadow-soft" onClick={() => navigate("/login")}>
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
                How It Works
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-32 right-20 w-16 h-16 rounded-2xl gradient-primary opacity-20 hidden lg:block" />
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute bottom-20 right-40 w-24 h-24 rounded-full bg-accent/10 hidden lg:block" />
      </header>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-6 py-20 border-b border-border/30">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-4">How MediConnect+ Works</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Get started in 4 simple steps — from signup to complete healthcare management.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {howItWorks.map((item, i) => (
            <motion.div key={item.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              className="relative text-center group">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform shadow-soft">
                <item.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground shadow-soft">
                {item.step}
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              {i < howItWorks.length - 1 && (
                <div className="hidden lg:block absolute top-8 -right-4 w-8 text-muted-foreground/20">
                  <ArrowRight className="w-6 h-6" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="container mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-4">Why MediConnect+?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Everything you need for complete healthcare, seamlessly integrated.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-2xl bg-card shadow-card hover:shadow-elevated transition-all duration-300 border border-border/50">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-4">Choose Your Portal</h2>
          <p className="text-muted-foreground">Specialized dashboards for patients and doctors.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {roles.map((r, i) => (
            <motion.div key={r.role} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              onClick={() => navigate("/login", { state: { role: r.role } })}
              className="group cursor-pointer p-8 rounded-2xl bg-card shadow-card hover:shadow-elevated border border-border/50 text-center transition-all duration-300 hover:-translate-y-1">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform`}>
                <r.icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-heading font-bold text-xl mb-2">{r.title}</h3>
              <p className="text-muted-foreground text-sm">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><AppLogoMark title="" className="w-4 h-4" /> MediConnect+ © 2026</span>
          <span>Unified Healthcare Ecosystem</span>
        </div>
      </footer>

      {/* Hidden Admin Login — no placeholders */}
      <Dialog open={showAdmin} onOpenChange={setShowAdmin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Admin Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Email</Label><Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdminLogin()} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdmin(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleAdminLogin}>Login</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
