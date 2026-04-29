import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, CheckCircle } from "lucide-react";
import { AppLogoMark } from "@/components/AppLogoMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { authRegister, authLogin } from "@/services/medicalService";

type PublicRole = "patient" | "doctor";
const roleLabels: Record<PublicRole, string> = { patient: "Patient", doctor: "Doctor" };
const roleColors: Record<PublicRole, string> = { patient: "from-primary to-accent", doctor: "from-accent to-primary" };

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithToken } = useAuth();
  const { toast } = useToast();
  const preselected = (location.state as { role?: PublicRole })?.role;

  const [selectedRole, setSelectedRole] = useState<PublicRole>(preselected === "doctor" ? "doctor" : "patient");
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [fee, setFee] = useState("");
  // Doctor Verification
  const [licenseNumber, setLicenseNumber] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  // Patient Verification
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [pendingSignup, setPendingSignup] = useState<{
    role: PublicRole;
    name: string;
    email: string;
    password: string;
    // Data to persist through OTP
    licenseNumber?: string;
    qualification?: string;
    experience?: string;
    dob?: string;
    phone?: string;
    gender?: string;
    bloodGroup?: string;
    specialty?: string;
    fee?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = name || email.split("@")[0] || "User";

    if (isSignup) {
      // Request real OTP from backend (sends email)
      try {
        const response = await fetch("/api/auth/request-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to send OTP");
        }
        
        setPendingSignup({ 
          role: selectedRole, 
          name: displayName, 
          email, 
          password,
          licenseNumber,
          qualification,
          experience,
          dob,
          phone,
          gender,
          bloodGroup,
          specialty,
          fee
        });
        setShowEmailConfirm(true);
        toast({
          title: "Verification code sent! 📧",
          description: `Check your email ${email}. If not received, check the backend terminal console.`,
        });
      } catch (err) {
        toast({
          title: "Failed to send OTP",
          description: "Please check your email address and try again.",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      const res = await authLogin(email, password);
      const r = res.user.role as UserRole;
      if (r !== selectedRole) {
        toast({
          title: "Wrong role",
          description: `This account is registered as a ${res.user.role}.`,
          variant: "destructive",
        });
        return;
      }
      loginWithToken(res.token, res.user as any);
      navigate(`/dashboard/${selectedRole}`);
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  const handleConfirmEmail = async () => {
    if (!confirmCode || confirmCode.length !== 6) {
      toast({ title: "Invalid code", description: "Please enter the 6-digit code from your email.", variant: "destructive" });
      return;
    }
    
    // Verify OTP with backend
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: confirmCode }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        toast({ 
          title: "Invalid code", 
          description: result.message || "The verification code is incorrect or expired.", 
          variant: "destructive" 
        });
        return;
      }
    } catch (err) {
      toast({ 
        title: "Verification failed", 
        description: "Please try again.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!pendingSignup) return;

    const displayName = pendingSignup.name;

    try {
      if (pendingSignup.role === "doctor") {
        const baseName = pendingSignup.name;
        const docName = baseName.startsWith("Dr.") ? baseName : `Dr. ${baseName}`;
        const res = await authRegister({
          email: pendingSignup.email,
          password: pendingSignup.password,
          name: docName,
          role: "doctor",
          specialty: pendingSignup.specialty || "General Physician",
          fee: pendingSignup.fee ? (pendingSignup.fee.startsWith("$") ? pendingSignup.fee : `$${pendingSignup.fee}`) : "$100",
          modes: ["video", "chat"],
          licenseNumber: pendingSignup.licenseNumber,
          qualification: pendingSignup.qualification,
          experience: pendingSignup.experience,
        });
        loginWithToken(res.token, res.user as any);
        toast({
          title: "Welcome, Doctor! 🩺",
          description: "Your profile has been registered. Pending approvals are shown to admins if enabled.",
        });
      } else {
        const res = await authRegister({
          email: pendingSignup.email,
          password: pendingSignup.password,
          name: displayName,
          role: "patient",
          dob: pendingSignup.dob,
          phone: pendingSignup.phone,
          gender: pendingSignup.gender,
          bloodGroup: pendingSignup.bloodGroup,
        });
        loginWithToken(res.token, res.user as any);
      }

      setShowEmailConfirm(false);
      setConfirmCode("");
      navigate("/verify-face");
    } catch (err) {
      toast({
        title: "Signup failed",
        description: err instanceof Error ? err.message : "Could not create account",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = () => {
    if (!forgotEmail) {
      toast({ title: "Enter email", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setResetSent(true);
    toast({ title: "Reset link sent! 📧", description: `Password reset link sent to ${forgotEmail}` });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="text-primary-foreground max-w-md z-10">
          <AppLogoMark className="w-14 h-14 mb-6 drop-shadow-md" title="MediConnect+" />
          <h1 className="font-heading text-4xl font-bold mb-4">Welcome to MediConnect+</h1>
          <p className="text-primary-foreground/80 text-lg">Your unified healthcare ecosystem — consultations, monitoring, pharmacy, all in one place.</p>
        </motion.div>
        <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute bottom-20 right-20 w-32 h-32 rounded-full bg-primary-foreground/10" />
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-20 right-32 w-20 h-20 rounded-2xl bg-primary-foreground/5" />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <h2 className="font-heading text-2xl font-bold mb-2">{isSignup ? "Create Account" : "Sign In"}</h2>
          <p className="text-muted-foreground mb-8">Select your role and continue</p>

          <div className="flex gap-2 mb-8">
            {(["patient", "doctor"] as PublicRole[]).map((r) => (
              <button key={r} onClick={() => setSelectedRole(r)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  selectedRole === r ? `bg-gradient-to-r ${roleColors[r]} text-primary-foreground shadow-soft` : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}>
                {roleLabels[r]}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Full Name" className="pl-10" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            {isSignup && selectedRole === "doctor" && (
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Specialty (e.g. Cardiologist)" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
                <Input placeholder="Consultation Fee ($)" value={fee} onChange={(e) => setFee(e.target.value)} type="number" />
                <Input placeholder="Medical License #" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                <Input placeholder="Qualification (e.g. MBBS)" value={qualification} onChange={(e) => setQualification(e.target.value)} />
                <Input placeholder="Experience (Years)" value={experience} onChange={(e) => setExperience(e.target.value)} type="number" className="col-span-2" />
              </div>
            )}
            {isSignup && selectedRole === "patient" && (
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input placeholder="Date of Birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                >
                  <option value="">Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Email" type="email" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Password" type="password" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {!isSignup && (
              <div className="text-right">
                <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary hover:underline">Forgot Password?</button>
              </div>
            )}

            <Button type="submit" className={`w-full bg-gradient-to-r ${roleColors[selectedRole]} text-primary-foreground`} size="lg">
              {isSignup ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignup(!isSignup)} className="text-primary font-medium hover:underline">
              {isSignup ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </motion.div>
      </div>

      <Dialog open={showEmailConfirm} onOpenChange={(open) => { if (!open) { setShowEmailConfirm(false); setConfirmCode(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Verify Your Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </motion.div>
              <p className="text-sm text-muted-foreground mb-1">We've sent a 6-digit confirmation code to</p>
              <p className="text-sm font-medium">{email}</p>
              <p className="text-xs text-muted-foreground mt-2 bg-secondary/50 p-2 rounded-lg">
                📌 Check your inbox (and spam folder). If email is not configured, check the backend terminal console for the OTP code.
              </p>
            </div>
            <div>
              <Label>Confirmation Code</Label>
              <Input
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEmailConfirm(false); setConfirmCode(""); }}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground gap-2" onClick={handleConfirmEmail}>
              <CheckCircle className="w-4 h-4" /> Verify & Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showForgot} onOpenChange={(open) => { setShowForgot(open); if (!open) setResetSent(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{resetSent ? "Check Your Email" : "Reset Password"}</DialogTitle>
          </DialogHeader>
          {resetSent ? (
            <div className="text-center py-6 space-y-3">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </motion.div>
              <p className="text-sm text-muted-foreground">We've sent a password reset link to <strong>{forgotEmail}</strong>.</p>
              <Button className="gradient-primary text-primary-foreground" onClick={() => { setShowForgot(false); setResetSent(false); }}>Back to Login</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">Enter your email address and we'll send you a link to reset your password.</p>
                <div><Label>Email Address</Label><Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowForgot(false)}>Cancel</Button>
                <Button className="gradient-primary text-primary-foreground" onClick={handleForgotPassword}>Send Reset Link</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
