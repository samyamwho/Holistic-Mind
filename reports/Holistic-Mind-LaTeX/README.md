# Holistic Mind — LaTeX final-report project

Open `main.tex`. This is the expanded, editable master report requested by Samyam Shrestha. It follows the supplied A4 article sample and contains the project history, architecture, implementation, detailed five-stage recommendation engine, validation, critical evaluation, references, and four appendices.

## Overleaf

1. Choose **New Project → Upload Project** and select the supplied ZIP.
2. If needed, set **Main document** to `main.tex`.
3. Use **pdfLaTeX**. All required figures and bibliography entries are packaged.
4. Recompile. The table of contents, figure/table lists, equations, and cross-references update automatically.

The reference list is in `references.tex` using editable, author–date Harvard-style entries with `natbib`. It does not require BibTeX, Biber, shell escape, web access, or external accounts. Final BCU Harvard punctuation and source details should be reviewed against the institution's guidance.

## Local compilation

Run these commands from the project folder:

```sh
pdflatex -interaction=nonstopmode -halt-on-error main.tex
pdflatex -interaction=nonstopmode -halt-on-error main.tex
```

A complete local TeX installation must include the standard packages listed in `main.tex`. Alternatively, `tectonic main.tex` performs the required reruns. The compiled preview `main.pdf` is included once validation completes.

## Recommendation-engine additions

Section 5.4 contains the five-stage workflow diagram. Section 6.3 explains each stage individually:

1. Eligibility filtering and explicit restrictions.
2. Six-dimension suitability rules and adjustments.
3. ONNX MiniLM semantic similarity and journal-free context.
4. Conditional collaborative scoring from bounded interaction values.
5. Score blending, recency, support alignment, category diversity, explanations, persistence, and feedback.

It also contains equations, a worked scoring example, pseudocode, and a graph comparing cold-start and collaboration-active weights. The explanation distinguishes the Python embedding fallback from the mobile ranker and identifies limits observed in the source. Source inspection does not imply new runtime tests.

## Project structure

- `main.tex`: formatting, title/contents, chapter inputs, references, appendices.
- `cover.tex`: student, module, supervisor, and project title.
- `chapters/`: editable report sections and appendices.
- `references.tex`: author–date references, including corrected NarraGive authorship.
- `figures/`: all report figures, including two vector PDF diagrams.
- `figure-sources/`: editable TikZ source for the five-stage workflow and weighting graph.
- `figure-manifest.csv`: numbered figure-to-file mapping.
- `evidence/`: saved evaluation JSON, a summary CSV, source-hash manifest, and verification record.

The optional university logo path is `figures/bcu-logo.png`. Without that image, the cover uses the university's name as text; no image is missing from the report.

To rebuild the two vector diagrams, run `pdflatex` on their files in `figure-sources/` and copy the resulting PDFs to `figures/`. The packaged PDFs already work without this step. PNG copies are provided for reuse outside LaTeX.

## Evidence and assessment context

The report preserves completed implementation, historical screenshots, saved benchmark results, and planned user-study work as distinct evidence types. The benchmark charts use the journal-free production-input suite and the separate comfort suite. Their scores do not establish clinical effectiveness or collaborative performance.

The supplied T1 CMP6200 brief lists **5,000 words plus 10% tolerance**, with material beyond that not marked. It includes headings, tables, citations, and lists in the main-body count; front matter, references, and appendices are excluded. This master intentionally retains the requested detail rather than claiming compliance with that marking ceiling. A submission version would require substantial main-body editing and moving supporting detail into appendices.

The same supplied brief states that generative AI is prohibited unless specifically authorised for reasonable adjustments. This package is AI-assisted work. Its generation does not override the assessment's stated conditions. Use and submission need to follow the applicable course requirements and any authorisation you actually have; the package is not a declaration of independent authorship.

The supplied brief's submission date is 5 May 2026, whereas later project records run through October 2026. The report preparation date is therefore not presented as the official submission deadline. The cover preserves the project's supplied module codes and supervisor details. Eleven-point body text and 1.5 spacing reflect the assessment presentation guidance while retaining the supplied template's margins and title design.
