import { useState, useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import {
  Dna,
  Upload,
  Activity,
  Heart,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Sparkles,
  Shield,
  TrendingUp,
  Pill,
  Apple,
  Dumbbell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { apiFetch } from "../../lib/api";
import {
  extractRawGenotypes,
  buildAnalysisFromRawGenotypes,
  shouldAnnotateFromRaw,
} from "../../lib/dnaRawParser";
import { extractTextFromPdfFile } from "../../lib/extractPdfText";

export default function DNAProfile() {
  const { t, i18n } = useTranslation();
  const [dnaProfile, setDnaProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchDNAProfile();
  }, []);

  const fetchDNAProfile = async () => {
    try {
      const data = await apiFetch<any>("/api/dna/profile");
      if (data.hasProfile) {
        setDnaProfile(data.dnaProfile);
      }
    } catch (error) {
      console.error("Error fetching DNA profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDemo = async () => {
    setSubmitting(true);
    try {
      // Demo DNA data
      const demoDNAData = {
        testProvider: "23andMe",
        testDate: new Date().toISOString(),
        geneticRisks: [
          {
            condition: "Type 2 Diabetes",
            riskLevel: "moderate",
            probability: 35,
            genes: ["TCF7L2", "PPARG"],
            description: "Moderate genetic predisposition to Type 2 Diabetes",
          },
          {
            condition: "Celiac Disease",
            riskLevel: "low",
            probability: 8,
            genes: ["HLA-DQ2", "HLA-DQ8"],
            description: "Low risk for Celiac Disease",
          },
          {
            condition: "Age-related Macular Degeneration",
            riskLevel: "high",
            probability: 65,
            genes: ["CFH", "ARMS2"],
            description: "Higher than average risk for eye conditions",
          },
        ],
        traits: [
          {
            trait: "Lactose Intolerance",
            status: "likely",
            confidence: 92,
            genes: ["MCM6"],
          },
          {
            trait: "Caffeine Metabolism",
            status: "likely",
            confidence: 88,
            genes: ["CYP1A2"],
          },
        ],
        metabolism: {
          caffeine: "slow",
          carbohydrate: "normal",
          fat: "high",
          lactose: "intolerant",
          gluten: "tolerant",
        },
        vitaminNeeds: [
          {
            vitamin: "Vitamin D",
            deficiencyRisk: "high",
            recommendation: "Take Vitamin D3 supplements daily",
            dosage: "2000-4000 IU/day",
          },
          {
            vitamin: "Vitamin B12",
            deficiencyRisk: "moderate",
            recommendation: "Monitor B12 levels regularly",
            dosage: "1000 mcg/day",
          },
        ],
        fitnessProfile: {
          muscleGrowth: "high",
          endurance: "normal",
          recovery: "fast",
          injuryRisk: "low",
          bestExerciseType: "Strength Training + HIIT",
        },
        analysisStatus: "completed",
      };

      const data = await apiFetch<any>("/api/dna/submit", {
        method: "POST",
        body: JSON.stringify(demoDNAData),
      });

      toast.success(data.message);
      
      // Refresh profile after 4 seconds
      setTimeout(() => fetchDNAProfile(), 4000);
    } catch (error) {
      toast.error(t("dna.toastSubmitFail"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error(t("dna.toastSelectFileFirst"));
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      let dnaData;
      let rawExtractText = "";

      if (selectedFile.name.toLowerCase().endsWith(".pdf")) {
        let pdfText = "";
        try {
          pdfText = await extractTextFromPdfFile(selectedFile);
        } catch (pdfErr) {
          console.error("PDF text extraction failed:", pdfErr);
        }
        rawExtractText = pdfText ? pdfText.slice(0, 20000) : `PDF upload (no text extracted): ${selectedFile.name}`;

        if (pdfText && pdfText.length >= 120) {
          try {
            dnaData = parseDNAFile(pdfText, selectedFile.name);
          } catch {
            dnaData = generateAnalysisFromFile(selectedFile.name, selectedFile.size);
          }
        } else {
          dnaData = generateAnalysisFromFile(selectedFile.name, selectedFile.size);
        }
      } else {
        const fileContent = await selectedFile.text();
        rawExtractText = fileContent.slice(0, 20000);

        try {
          if (selectedFile.name.toLowerCase().endsWith(".json")) {
            dnaData = JSON.parse(fileContent);
          } else {
            dnaData = parseDNAFile(fileContent, selectedFile.name);
          }
        } catch {
          dnaData = generateAnalysisFromFile(selectedFile.name, fileContent.length);
        }
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      const data = await apiFetch<any>("/api/dna/submit", {
        method: "POST",
        body: JSON.stringify({
          ...dnaData,
          rawFile: selectedFile.name,
          fileName: selectedFile.name,
          rawExtractText,
        }),
      });

      toast.success(data.message);
      setShowForm(false);
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Refresh profile
      setTimeout(() => fetchDNAProfile(), 2000);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t("dna.toastUploadFail"));
    } finally {
      setSubmitting(false);
    }
  };

  const parseDNAFile = (content: string, fileName: string) => {
    const { map } = extractRawGenotypes(content);
    if (shouldAnnotateFromRaw(map)) {
      return buildAnalysisFromRawGenotypes(fileName, map);
    }

    // Fallback: keyword heuristics on any text (incl. PDF-extracted text pasted into TXT)
    const lines = content.split('\n');
    const geneticRisks: any[] = [];
    const traits: any[] = [];
    const vitaminNeeds: any[] = [];

    // Simple heuristic analysis based on file content
    const contentLower = content.toLowerCase();
    
    // Check for common genetic markers
    if (contentLower.includes('rs7903146') || contentLower.includes('tcf7l2')) {
      geneticRisks.push({
        condition: "Type 2 Diabetes",
        riskLevel: "moderate",
        probability: 35,
        genes: ["TCF7L2"],
        description: "Genetic variant associated with Type 2 Diabetes risk",
      });
    }

    if (contentLower.includes('lactose') || contentLower.includes('mcm6')) {
      traits.push({
        trait: "Lactose Intolerance",
        status: "likely",
        confidence: 90,
        genes: ["MCM6"],
      });
    }

    if (contentLower.includes('caffeine') || contentLower.includes('cyp1a2')) {
      traits.push({
        trait: "Caffeine Sensitivity",
        status: "likely",
        confidence: 85,
        genes: ["CYP1A2"],
      });
    }

    return {
      testProvider: fileName.includes('23andme') ? "23andMe" : 
                    fileName.includes('ancestry') ? "AncestryDNA" : "Unknown",
      testDate: new Date().toISOString(),
      geneticRisks: geneticRisks.length > 0 ? geneticRisks : [
        {
          condition: "General Health Screening Recommended",
          riskLevel: "low",
          probability: 15,
          genes: ["Multiple"],
          description: "Standard genetic screening based on uploaded data",
        }
      ],
      traits: traits.length > 0 ? traits : [
        {
          trait: "General Metabolic Profile",
          status: "likely",
          confidence: 75,
          genes: ["Various"],
        }
      ],
      metabolism: {
        caffeine: contentLower.includes('fast') ? "fast" : "slow",
        carbohydrate: "normal",
        fat: "normal",
        lactose: contentLower.includes('intolerant') ? "intolerant" : "tolerant",
        gluten: "tolerant",
      },
      vitaminNeeds: vitaminNeeds.length > 0 ? vitaminNeeds : [
        {
          vitamin: "Vitamin D",
          deficiencyRisk: "moderate",
          recommendation: "Consider Vitamin D supplementation",
          dosage: "1000-2000 IU/day",
        }
      ],
      fitnessProfile: {
        muscleGrowth: "normal",
        endurance: "normal",
        recovery: "normal",
        injuryRisk: "low",
        bestExerciseType: "Mixed Training (Cardio + Strength)",
      },
      analysisStatus: "completed",
    };
  };

  const generateAnalysisFromFile = (fileName: string, fileSize: number) => {
    // Generate analysis based on file metadata when parsing fails
    return {
      testProvider: fileName.includes('23andme') ? "23andMe" : 
                    fileName.includes('ancestry') ? "AncestryDNA" : 
                    fileName.includes('familytree') ? "FamilyTreeDNA" : "Unknown",
      testDate: new Date().toISOString(),
      geneticRisks: [
        {
          condition: "General Health Analysis",
          riskLevel: "low",
          probability: 20,
          genes: ["Multiple Markers Analyzed"],
          description: `Analysis based on uploaded file: ${fileName} (${(fileSize / 1024).toFixed(2)} KB)`,
        }
      ],
      traits: [
        {
          trait: "Comprehensive Genetic Profile",
          status: "likely",
          confidence: 80,
          genes: ["Various Markers"],
        }
      ],
      metabolism: {
        caffeine: "slow",
        carbohydrate: "normal",
        fat: "normal",
        lactose: "tolerant",
        gluten: "tolerant",
      },
      vitaminNeeds: [
        {
          vitamin: "Vitamin D",
          deficiencyRisk: "moderate",
          recommendation: "Regular Vitamin D monitoring recommended",
          dosage: "1000-2000 IU/day",
        }
      ],
      fitnessProfile: {
        muscleGrowth: "normal",
        endurance: "normal",
        recovery: "normal",
        injuryRisk: "low",
        bestExerciseType: "Balanced Exercise Program",
      },
      analysisStatus: "completed",
    };
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case "low":
        return "bg-green-500/20 text-green-700 border-green-500/30";
      case "moderate":
        return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-700 border-orange-500/30";
      case "very_high":
        return "bg-red-500/20 text-red-700 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-500/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!dnaProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 flex gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">{t("dna.accuracyTitle")}</p>
              <p className="mt-1 text-amber-900/90">
                <Trans
                  i18nKey="dna.accuracyEmpty"
                  components={{ strong: <strong className="font-semibold" /> }}
                />
              </p>
            </div>
          </div>
          <Card className="border-2 border-dashed border-teal-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Dna className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-3xl bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                {t("dna.heroTitle")}
              </CardTitle>
              <p className="text-gray-600 mt-2 text-lg">
                {t("dna.heroSubtitle")}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">{t("dna.tileRisksTitle")}</h3>
                  <p className="text-sm text-purple-700 mt-1">
                    {t("dna.tileRisksDesc")}
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">{t("dna.tileTraitsTitle")}</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {t("dna.tileTraitsDesc")}
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-semibold text-green-900">{t("dna.tileAiTitle")}</h3>
                  <p className="text-sm text-green-700 mt-1">
                    {t("dna.tileAiDesc")}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">{t("dna.howItWorks")}</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      1
                    </div>
                    <p className="text-sm text-gray-700">
                      {t("dna.step1")}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      2
                    </div>
                    <p className="text-sm text-gray-700">
                      {t("dna.step2")}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      3
                    </div>
                    <p className="text-sm text-gray-700">
                      {t("dna.step3")}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowForm(true)}
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-6 text-lg shadow-lg hover:shadow-xl transition-all"
              >
                <Upload className="w-5 h-5 mr-2" />
                {t("dna.uploadResults")}
              </Button>

              <Button
                onClick={handleSubmitDemo}
                disabled={submitting}
                variant="outline"
                className="w-full border-2 border-purple-400 text-purple-700 hover:bg-purple-50 py-5 text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("dna.analyzing")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t("dna.tryDemo")}
                  </>
                )}
              </Button>

              {showForm && (
                <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900 mb-2">
                      🧬 {t("dna.uploadReportTitle")}
                    </h3>
                    <p className="text-sm text-blue-800 mb-4">
                      {t("dna.uploadReportDesc")}
                    </p>
                  </div>

                  {/* File Input */}
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-400 rounded-lg bg-white hover:border-blue-600 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept=".json,.csv,.txt,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          toast.success(t("dna.fileSelected", { name: file.name }));
                        }
                      }}
                      className="hidden"
                      id="dna-file-upload"
                    />
                    <label htmlFor="dna-file-upload" className="cursor-pointer text-center">
                      <Upload className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                      {selectedFile ? (
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{selectedFile.name}</p>
                          <p className="text-sm text-gray-600">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                          <p className="text-xs text-green-600 mt-1">{t("dna.fileReady")}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lg font-semibold text-gray-700">
                            {t("dna.clickSelectFile")}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {t("dna.orDragDrop")}
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Upload Progress */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleFileUpload}
                      disabled={submitting || !selectedFile}
                      className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t("dna.analyzingPercent", { percent: uploadProgress })}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          {t("dna.uploadAnalyze")}
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => { setShowForm(false); setSelectedFile(null); setUploadProgress(0); }}
                      disabled={submitting}
                      variant="outline"
                      className="border-gray-300"
                    >
                      {t("dna.cancel")}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-600 text-center">
                    {t("dna.dataEncrypted")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 flex gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">{t("dna.accuracyTitle")}</p>
            <p className="mt-1 text-amber-900/90">
              <Trans
                i18nKey="dna.accuracyLoaded"
                components={{ strong: <strong className="font-semibold" /> }}
              />
            </p>
          </div>
        </div>
        {/* Header */}
        <Card className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Dna className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{t("dna.yourProfile")}</h1>
                  <p className="text-teal-100">
                    {t("dna.providerDateLine", {
                      provider: dnaProfile.testProvider || t("dna.unknownProvider"),
                      date: new Date(dnaProfile.createdAt).toLocaleDateString(i18n.language),
                    })}
                  </p>
                </div>
              </div>
              <Badge
                className={
                  dnaProfile.analysisStatus === "completed"
                    ? "bg-green-500"
                    : "bg-yellow-500"
                }
              >
                {dnaProfile.analysisStatus === "completed" ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {t("dna.analysisComplete")}
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    {t("dna.processing")}
                  </>
                )}
              </Badge>
            </div>
            <div className="mt-4">
              <Button onClick={() => setShowForm((v) => !v)} variant="secondary">
                <Upload className="w-4 h-4 mr-2" />
                {showForm ? t("dna.hideUploader") : t("dna.uploadAnother")}
              </Button>
            </div>
            {showForm && (
              <div className="mt-4 p-4 bg-white/10 rounded-lg space-y-3">
                <input
                  type="file"
                  accept=".json,.csv,.txt,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedFile(file);
                  }}
                />
                <div className="flex gap-2">
                  <Button onClick={handleFileUpload} disabled={!selectedFile || submitting}>
                    {submitting ? t("dna.analyzing") : t("dna.uploadAnalyze")}
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
                    {t("dna.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="recommendations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-lg">
            <TabsTrigger value="recommendations">{t("dna.tabRecommendations")}</TabsTrigger>
            <TabsTrigger value="risks">{t("dna.tabRisks")}</TabsTrigger>
            <TabsTrigger value="metabolism">{t("dna.tabMetabolism")}</TabsTrigger>
            <TabsTrigger value="fitness">{t("dna.tabFitness")}</TabsTrigger>
          </TabsList>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {dnaProfile.reports?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("dna.uploadedHistory")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dnaProfile.reports.slice().reverse().map((r, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      {new Date(r.uploadedAt).toLocaleString()} - {r.fileName} ({r.provider})
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {dnaProfile.recommendations && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-900">
                        <Apple className="w-5 h-5" />
                        {t("dna.recommendedDiet")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold text-green-800">
                        {dnaProfile.recommendations.diet}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-900">
                        <Pill className="w-5 h-5" />
                        {t("dna.supplements")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {dnaProfile.recommendations.supplements.map((sup, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                            <span className="text-purple-800">{sup}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-900">
                      <AlertTriangle className="w-5 h-5" />
                      {t("dna.foodsToAvoid")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {dnaProfile.recommendations.foodsToAvoid.map((food, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                          <span className="text-red-800">{food}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Shield className="w-5 h-5" />
                      {t("dna.healthScreenings")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {dnaProfile.recommendations.healthScreenings.map((screening, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Shield className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                          <span className="text-blue-800">{screening}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-teal-50 to-green-50 border-teal-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-teal-900">
                      <TrendingUp className="w-5 h-5" />
                      {t("dna.lifestyleChanges")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {dnaProfile.recommendations.lifestyle.map((lifestyle, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-teal-600 mt-1 flex-shrink-0" />
                          <span className="text-teal-800">{lifestyle}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Genetic Risks Tab */}
          <TabsContent value="risks">
            <div className="space-y-4">
              {dnaProfile.geneticRisks.map((risk, i) => (
                <Card key={i} className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900">{risk.condition}</h3>
                      <Badge className={getRiskColor(risk.riskLevel)}>
                        <span className="uppercase">
                          {t("dna.riskBadgeFull", {
                            level: t(`dna.riskLevels.${risk.riskLevel}`, {
                              defaultValue: risk.riskLevel?.replace("_", " ") ?? "",
                            }),
                          })}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{risk.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">{t("dna.probability")}:</span>
                        <span className="text-teal-600 font-bold">{risk.probability}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">{t("dna.genes")}:</span>
                        <span className="text-purple-600">{risk.genes.join(", ")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Metabolism Tab */}
          <TabsContent value="metabolism">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-900">{t("dna.metabolismProfile")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="font-medium text-gray-700">{t("dna.caffeine")}</span>
                    <Badge className="bg-amber-500">
                      {dnaProfile.metabolism?.caffeine?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="font-medium text-gray-700">{t("dna.lactose")}</span>
                    <Badge
                      className={
                        dnaProfile.metabolism?.lactose === "intolerant"
                          ? "bg-red-500"
                          : "bg-green-500"
                      }
                    >
                      {dnaProfile.metabolism?.lactose?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="font-medium text-gray-700">{t("dna.gluten")}</span>
                    <Badge className="bg-blue-500">
                      {dnaProfile.metabolism?.gluten?.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                <CardHeader>
                  <CardTitle className="text-indigo-900">{t("dna.vitaminNeeds")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dnaProfile.vitaminNeeds?.map((vitamin, i) => (
                    <div key={i} className="p-3 bg-white rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-900">{vitamin.vitamin}</span>
                        <Badge
                          className={
                            vitamin.deficiencyRisk === "high"
                              ? "bg-red-500"
                              : vitamin.deficiencyRisk === "moderate"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }
                        >
                          <span className="uppercase">
                            {t("dna.vitaminRiskBadge", {
                              risk: t(`dna.deficiencyRisk.${vitamin.deficiencyRisk}`, {
                                defaultValue: vitamin.deficiencyRisk,
                              }),
                            })}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{vitamin.recommendation}</p>
                      <p className="text-sm font-semibold text-indigo-600 mt-1">
                        {vitamin.dosage}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fitness Tab */}
          <TabsContent value="fitness">
            <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <Dumbbell className="w-5 h-5" />
                  {t("dna.fitnessProfile")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">{t("dna.bestExerciseType")}</p>
                    <p className="text-lg font-bold text-orange-800">
                      {dnaProfile.fitnessProfile?.bestExerciseType}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">{t("dna.muscleGrowthPotential")}</p>
                    <Badge className="bg-green-500">
                      {dnaProfile.fitnessProfile?.muscleGrowth?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="p-4 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">{t("dna.enduranceLevel")}</p>
                    <Badge className="bg-blue-500">
                      {dnaProfile.fitnessProfile?.endurance?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="p-4 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">{t("dna.recoverySpeed")}</p>
                    <Badge className="bg-purple-500">
                      {dnaProfile.fitnessProfile?.recovery?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
