# Report package verification

Report prepared: 3 October 2026.

- Compiled with Tectonic 0.17.0, including automatic reference reruns.
- ZIP extracted into a fresh temporary folder and independently recompiled successfully, confirming that all report dependencies are packaged.
- Compiled preview: 64 pages, A4, 11-point body, 1.5 body spacing.
- All 16 referenced figure files are present; five tables are included.
- Internal references, equation labels, citations, and figure paths resolve.
- Final compiler log contains no overfull boxes or undefined references.
- PDF pages were rasterised with macOS PDFKit and checked for layout, table wrapping, equations, captions, and figure placement.
- The only compiler notice concerns inputenc being unnecessary under XeTeX; it is retained for pdfLaTeX compatibility.
- Saved benchmark values were read from the packaged JSON/CSV. No new participant study, clinical assessment, runtime regression suite, or deployment was performed when preparing this report.

The source-hash manifest identifies the current implementation inspected. Historical tests remain attributed to their existing project records.
