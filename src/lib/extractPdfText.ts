import * as pdfjsLib from "pdfjs-dist";

/** Load PDF.js worker (browser). Uses CDN matching installed pdfjs-dist version. */
function ensureWorker() {
  if (typeof window === "undefined") return;
  if (pdfjsLib.GlobalWorkerOptions.workerSrc) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * Extract plain text from a PDF in the browser (for DNA reports, etc.).
 * Scanned/image-only PDFs may return little or no text.
 */
export async function extractTextFromPdfFile(file: File): Promise<string> {
  ensureWorker();
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buf, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      if (item && typeof item === "object" && "str" in item && typeof (item as { str: string }).str === "string") {
        parts.push((item as { str: string }).str);
      }
    }
    parts.push("\n");
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}
