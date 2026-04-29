import curated from "@/data/dnaCuratedMarkers.json";

export type RawGenotypeMap = Map<string, string>;

/** Parse 23andMe-style raw text: tab-separated rsid, chromosome, position, genotype */
export function extractRawGenotypes(content: string): { map: RawGenotypeMap; lineCount: number } {
  const map: RawGenotypeMap = new Map();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;

    const parts = t.includes("\t") ? t.split("\t") : t.split(/\s+/);
    const col0 = parts[0]?.trim() ?? "";
    if (/^rsid$/i.test(col0) || /^rs#$/i.test(col0)) continue;

    if (/^rs\d+$/i.test(col0) && parts.length >= 4) {
      const rsid = col0.toLowerCase();
      const genotype = (parts[3] ?? "").trim().toUpperCase();
      if (genotype && genotype !== "--" && genotype !== "-" && genotype.length <= 4) {
        map.set(rsid, genotype);
      }
    }
  }

  return { map, lineCount: map.size };
}

type Curated = {
  rsid: string;
  gene: string;
  title: string;
  genotypes: Record<
    string,
    {
      metabolismHint?: string;
      traitStatus?: string;
      riskLevel?: string;
      confidence?: number;
      note: string;
    }
  >;
};

const CURATED_RSIDS = new Set((curated as Curated[]).map((r) => r.rsid.toLowerCase()));

/** Same diploid genotype with letters in either order (e.g. CA → AC) */
function normalizeDiploid(g: string): string {
  const u = g.toUpperCase().replace(/[^ACGTID]/g, "");
  if (u.length === 2 && /^[ACGT]{2}$/.test(u)) return u.split("").sort().join("");
  return g.toUpperCase();
}

/** True if this looks like a consumer raw export or we can match at least one curated SNP */
export function shouldAnnotateFromRaw(genotypeMap: RawGenotypeMap): boolean {
  if (genotypeMap.size < 1) return false;
  if (genotypeMap.size >= 30) return true;
  for (const rs of CURATED_RSIDS) {
    if (genotypeMap.has(rs)) return true;
  }
  return false;
}

/** Build analysis payloads from actual called genotypes + curated reference (informational only). */
export function buildAnalysisFromRawGenotypes(fileName: string, genotypeMap: RawGenotypeMap) {
  const geneticRisks: Array<{
    condition: string;
    riskLevel: "low" | "moderate" | "high" | "very_high";
    probability: number;
    genes: string[];
    description: string;
  }> = [];

  const traits: Array<{
    trait: string;
    status: "likely" | "unlikely" | "carrier";
    confidence: number;
    genes: string[];
  }> = [];

  let caffeineMetabolism: "fast" | "slow" = "slow";
  let lactose: "tolerant" | "intolerant" = "tolerant";

  for (const row of curated as Curated[]) {
    const rsid = row.rsid.toLowerCase();
    const g = genotypeMap.get(rsid);
    if (!g) continue;

    const gKey = g.toUpperCase();
    const nd = normalizeDiploid(g);
    const hit = row.genotypes[gKey] || row.genotypes[nd];
    if (!hit) continue;

    if (row.rsid === "rs762551") {
      if (hit.metabolismHint === "fast") caffeineMetabolism = "fast";
      if (hit.metabolismHint === "slow") caffeineMetabolism = "slow";
      traits.push({
        trait: row.title,
        status: "likely",
        confidence: hit.confidence ?? 65,
        genes: [row.gene],
      });
    } else if (row.rsid === "rs4988235") {
      traits.push({
        trait: "Lactose intolerance (population-level pattern)",
        status: gKey === "GG" ? "unlikely" : "likely",
        confidence: hit.confidence ?? 60,
        genes: [row.gene],
      });
      if (gKey === "GG") lactose = "tolerant";
      else if (gKey === "AA") lactose = "intolerant";
      else lactose = "tolerant";
    } else if (row.rsid === "rs1801133" && hit.riskLevel) {
      geneticRisks.push({
        condition: "MTHFR C677T (folate metabolism; common variant)",
        riskLevel: hit.riskLevel as "low" | "moderate" | "high",
        probability: hit.riskLevel === "moderate" ? 40 : 20,
        genes: ["MTHFR"],
        description: hit.note,
      });
    }
  }

  const provider = fileName.toLowerCase().includes("23andme")
    ? "23andMe raw"
    : fileName.toLowerCase().includes("ancestry")
      ? "AncestryDNA-style"
      : "Consumer raw file";

  return {
    testProvider: provider,
    testDate: new Date().toISOString(),
    geneticRisks:
      geneticRisks.length > 0
        ? geneticRisks
        : [
            {
              condition: "Curated SNPs",
              riskLevel: "low" as const,
              probability: 10,
              genes: [],
              description:
                genotypeMap.size >= 30
                  ? "Raw genotype file detected, but none of the app’s small curated SNPs matched your export (build/version can differ). Expand dnaCuratedMarkers.json to add more."
                  : "Not enough overlapping SNPs with this app’s curated list.",
            },
          ],
    traits:
      traits.length > 0
        ? traits
        : [
            {
              trait: "Raw genotype file",
              status: "likely" as const,
              confidence: 50,
              genes: [],
            },
          ],
    metabolism: {
      caffeine: caffeineMetabolism,
      carbohydrate: "normal" as const,
      fat: "normal" as const,
      lactose,
      gluten: "tolerant" as const,
    },
    vitaminNeeds: [
      {
        vitamin: "Folate (diet)",
        deficiencyRisk: geneticRisks.some((x) => x.genes.includes("MTHFR")) ? ("moderate" as const) : ("low" as const),
        recommendation: "Follow clinician advice on diet and supplements.",
        dosage: "—",
      },
    ],
    fitnessProfile: {
      muscleGrowth: "normal" as const,
      endurance: "normal" as const,
      recovery: "normal" as const,
      injuryRisk: "low" as const,
      bestExerciseType: "Balanced training",
    },
    analysisStatus: "completed" as const,
  };
}
