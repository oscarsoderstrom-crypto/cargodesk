import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * Extract all text from a PDF file (as File or ArrayBuffer).
 * Returns an object with { text, pages } where pages is an array of per-page text.
 */
export async function extractTextFromPDF(file) {
  let arrayBuffer;
  if (file instanceof File || file instanceof Blob) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    pages.push(strings.join(' '));
  }

  return {
    text: pages.join('\n'),
    pages,
    numPages: pdf.numPages,
  };
}

/**
 * Store a PDF file as base64 in IndexedDB (since we can't store Files directly long-term).
 */
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
