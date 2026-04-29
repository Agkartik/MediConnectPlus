import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import FaceVerification from "./pages/FaceVerification";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import FloatingAssistant from "@/components/FloatingAssistant";
import GlobalMessageListener from "@/components/GlobalMessageListener";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <GlobalMessageListener />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify-face" element={<FaceVerification />} />
            <Route path="/dashboard/patient/*" element={<PatientDashboard />} />
            <Route path="/dashboard/doctor/*" element={<DoctorDashboard />} />
            <Route path="/dashboard/admin/*" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingAssistant />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
