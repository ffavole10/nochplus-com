// Lightweight client-side document text extraction for QBR uploads
// Supports PDF (via pdfjs-dist), plain text, markdown.
// DOCX is not supported client-side; user gets a friendly error.

type PromiseWithResolversConstructor = PromiseConstructor & {
  withResolvers?: <T>() => {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
  };
};

function ensurePromiseWithResolvers() {
  const pc = Promise as PromiseWithResolversConstructor;
  if (typeof pc.withResolvers === "function") return;
  pc.withResolvers = function <T>() {
    let resolve!: (v: T | PromiseLike<T>) => void;
    let reject!: (r?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

async function loadPdfJs() {
  ensurePromiseWithResolvers();
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  return pdfjsLib;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return await file.text();
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await (pdfjs as any).getDocument({ data: new Uint8Array(buf) }).promise;
    const out: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      out.push(tc.items.map((it: any) => it.str).join(" "));
    }
    return out.join("\n\n");
  }
  if (name.endsWith(".docx")) {
    throw new Error("DOCX parsing isn't supported in-browser. Please save as PDF or TXT and try again.");
  }
  // Fallback: try as text
  return await file.text();
}
