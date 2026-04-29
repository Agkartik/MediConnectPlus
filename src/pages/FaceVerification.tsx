import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, CheckCircle, XCircle, ShieldCheck, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as faceapi from "face-api.js";
import { updateMyProfile } from "@/services/medicalService";

type Step = "upload" | "camera" | "scanning" | "success" | "fail";

const FaceVerification = () => {
  const navigate = useNavigate();
  const { role, refreshSession } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [referenceDescriptor, setReferenceDescriptor] = useState<Float32Array | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceDataUrl, setReferenceDataUrl] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face models:", err);
        toast.error("Failed to load AI face detection models. Please refresh.");
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async () => {
    stopCamera();
    setScanProgress(0);
    setMatchScore(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStep("camera");
    } catch (err) {
      toast.error("Camera access denied. Please allow camera permission in your browser settings.");
    }
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setReferencePreview(url);
    setReferenceDescriptor(null);
    setReferenceDataUrl(null);

    // Convert to base64 for saving as profile photo
    const reader = new FileReader();
    reader.onload = (ev) => setReferenceDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const img = document.createElement("img");
      img.src = url;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("Image load failed"));
      });

      const detection = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error("No face detected. Use a clear, well-lit, front-facing photo.");
        setReferencePreview(null);
        setReferenceDataUrl(null);
        return;
      }
      setReferenceDescriptor(detection.descriptor);
      toast.success("✓ Face detected in photo!");
    } catch (err) {
      toast.error("Failed to process photo. Please try a different image.");
      setReferencePreview(null);
      setReferenceDataUrl(null);
    }
  };

  const captureFrameToCanvas = (): HTMLCanvasElement | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas;
  };

  const handleCapture = useCallback(async () => {
    if (!referenceDescriptor) return;

    setStep("scanning");
    setScanProgress(0);

    progressRef.current = setInterval(() => {
      setScanProgress((p) => (p < 82 ? p + Math.random() * 10 : p));
    }, 180);

    try {
      await new Promise((r) => setTimeout(r, 400));

      const canvas = captureFrameToCanvas();
      if (!canvas) throw new Error("Camera frame not ready. Please try again.");

      const detectionPromise = faceapi
        .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Detection timed out. Try better lighting.")), 15000)
      );

      const detection = await Promise.race([detectionPromise, timeoutPromise]);

      if (progressRef.current) clearInterval(progressRef.current);
      setScanProgress(100);
      await new Promise((r) => setTimeout(r, 400));

      if (!detection) {
        setStep("fail");
        setMatchScore(null);
        return;
      }

      const distance = faceapi.euclideanDistance(referenceDescriptor, detection.descriptor);
      const confidence = Math.round(Math.max(0, Math.min(100, (1 - distance) * 160)));
      setMatchScore(confidence);

      if (distance < 0.6) {
        stopCamera();
        setStep("success");

        // Save photo as profile picture
        if (referenceDataUrl) {
          try {
            await updateMyProfile({ avatar: referenceDataUrl } as any);
            await refreshSession();
          } catch (e) {
            console.warn("Could not save profile photo:", e);
          }
        }

        setTimeout(() => {
          navigate(`/dashboard/${role}`);
        }, 2000);
      } else {
        setStep("fail");
      }
    } catch (err: any) {
      if (progressRef.current) clearInterval(progressRef.current);
      toast.error(err?.message || "Face scan failed. Please try again.");
      setStep("fail");
    }
  }, [referenceDescriptor, referenceDataUrl, role, navigate, refreshSession]);

  const retry = async () => {
    setScanProgress(0);
    setMatchScore(null);
    await startCamera();
  };

  const isCameraGroup = ["camera", "scanning", "success", "fail"].includes(step);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Profile Photo & Verification</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Take a photo to set your profile picture. This is a one-time setup during account creation.
          </p>
        </div>

        {loadingModels && (
          <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-14 h-14 border-4 border-primary/30 border-t-primary rounded-full mx-auto" />
            <p className="font-semibold text-lg">Loading AI Face Detection Models</p>
            <p className="text-xs text-muted-foreground">One-time setup…</p>
          </div>
        )}

        {!loadingModels && !modelsLoaded && (
          <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-3">
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="font-semibold">AI Models Failed to Load</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.location.reload()}>Reload Page</Button>
              <Button variant="outline" onClick={() => navigate(`/dashboard/${role}`)}>Skip for Now</Button>
            </div>
          </div>
        )}

        {!loadingModels && modelsLoaded && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
            <div className="flex border-b border-border">
              {[{ id: "upload", label: "1. Upload Photo" }, { id: "camera", label: "2. Verify Face" }].map((s) => {
                const active = s.id === "upload" ? !isCameraGroup : isCameraGroup;
                return (
                  <div key={s.id} className={`flex-1 py-3 text-center text-xs font-semibold transition-colors ${active ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
                    {s.label}
                  </div>
                );
              })}
            </div>

            <div className="relative">
              {/* Camera view - always in DOM */}
              <div className={`${step === "camera" ? "block" : "hidden"} p-6 space-y-4`}>
                <p className="text-sm text-muted-foreground text-center">
                  Centre your face in the oval. Ensure good lighting, then click <strong>Verify</strong>.
                </p>
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-border">
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-44 h-56 rounded-full border-4 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <Button onClick={handleCapture} className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold" size="lg">
                  <Camera className="w-4 h-4 mr-2" /> Capture &amp; Verify Face
                </Button>
                <button onClick={() => { stopCamera(); setStep("upload"); }} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                  ← Use a different photo
                </button>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {step === "upload" && (
                    <motion.div key="upload" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                      <p className="text-sm text-muted-foreground">
                        Upload a clear, front-facing photo of yourself. This will become your profile picture and be used to verify your identity.
                      </p>
                      <label className="block cursor-pointer">
                        <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all hover:border-primary/50 hover:bg-primary/5 ${referencePreview ? "border-primary bg-primary/5" : "border-border"}`}>
                          {referencePreview ? (
                            <div className="space-y-3">
                              <img src={referencePreview} alt="Your photo" className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-primary/40 shadow" />
                              {referenceDescriptor ? (
                                <div className="flex items-center justify-center gap-2 text-green-500 text-sm font-medium">
                                  <CheckCircle className="w-4 h-4" /> Face detected — looking great!
                                </div>
                              ) : (
                                <p className="text-yellow-500 text-sm flex items-center justify-center gap-1">
                                  <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing photo…
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">Click to change</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
                                <Upload className="w-7 h-7 text-muted-foreground/60" />
                              </div>
                              <p className="text-sm font-medium">Click to upload your photo</p>
                              <p className="text-xs text-muted-foreground">JPG, PNG or WEBP — your face must be clearly visible</p>
                            </div>
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleReferenceUpload} />
                      </label>
                      <Button onClick={startCamera} disabled={!referenceDescriptor} className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold" size="lg">
                        <Camera className="w-4 h-4 mr-2" />
                        {referenceDescriptor ? "Verify with Camera →" : "Upload a clear photo first"}
                      </Button>
                      <button onClick={() => navigate(`/dashboard/${role}`)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline">
                        Skip for now (you can do this later in Settings)
                      </button>
                    </motion.div>
                  )}

                  {step === "scanning" && (
                    <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6 py-6">
                      <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                        <ShieldCheck className="w-10 h-10 text-primary" />
                      </motion.div>
                      <div>
                        <p className="font-bold text-xl">Verifying Face…</p>
                        <p className="text-sm text-muted-foreground mt-1">Matching facial features</p>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" animate={{ width: `${scanProgress}%` }} transition={{ ease: "easeOut", duration: 0.3 }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{Math.round(scanProgress)}% complete</p>
                    </motion.div>
                  )}

                  {step === "success" && (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-8">
                      <div className="relative w-24 h-24 mx-auto">
                        {referencePreview && <img src={referencePreview} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-green-500/50" />}
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <p className="font-bold text-2xl text-green-500">Verified &amp; Profile Set! 🎉</p>
                      {matchScore !== null && <p className="text-sm text-muted-foreground">Match confidence: <span className="font-bold text-foreground">{matchScore}%</span></p>}
                      <p className="text-xs text-muted-foreground">Your profile photo has been saved. Redirecting…</p>
                    </motion.div>
                  )}

                  {step === "fail" && (
                    <motion.div key="fail" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-4">
                      <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                        <XCircle className="w-10 h-10 text-destructive" />
                      </div>
                      <p className="font-bold text-xl text-destructive">Face Mismatch</p>
                      {matchScore !== null && (
                        <p className="text-sm text-muted-foreground">
                          Confidence: <span className="font-bold text-foreground">{matchScore}%</span>{" "}
                          <span className="text-destructive">(min 60% required)</span>
                        </p>
                      )}
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-left">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                          <p>Ensure good lighting, remove glasses, look directly at the camera, and avoid shadows.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => { stopCamera(); setStep("upload"); setReferencePreview(null); setReferenceDescriptor(null); setReferenceDataUrl(null); }}>
                          New Photo
                        </Button>
                        <Button className="flex-1 bg-gradient-to-r from-primary to-accent text-white" onClick={retry}>
                          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                        </Button>
                      </div>
                      <button onClick={() => navigate(`/dashboard/${role}`)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Skip for now
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FaceVerification;
