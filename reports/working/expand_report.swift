import Foundation
var s=try String(contentsOfFile:"reports/working/report.md",encoding:.utf8)
let additions=try String(contentsOfFile:"reports/working/detailed-additions.md",encoding:.utf8)
for part in additions.components(separatedBy:"§INSERT|").dropFirst(){let lines=part.components(separatedBy:"\n");let anchor=lines[0];let content=lines.dropFirst().joined(separator:"\n").trimmingCharacters(in:.whitespacesAndNewlines);s=s.replacingOccurrences(of:anchor,with:content+"\n\n"+anchor)}
s=s.replacingOccurrences(of:"The project is motivated by the difficulty",with:"The original proposal focuses on adults seeking support with trauma-related difficulties, anxiety, and ADHD between professional appointments (Shrestha, 2026a). The project is motivated by the difficulty")
s=s.replacingOccurrences(of:"The report follows the academic structure demonstrated by Rai (2026) and Fullel (2026), while presenting original project-specific analysis.",with:"The dissertation integrates the original proposal, interim reports, and final progress review with the current implementation and saved evaluation evidence.")
s=s.replacingOccurrences(of:"Google and Apple identity-token verification are present in source, with platform configuration requirements. Their implementation does not establish that every provider has been tested in a production-signed build.",with:"Google identity-token verification is present in source, with native and backend configuration requirements. Apple identity handling remains for compatibility, while its sign-in controls were removed from the mobile authentication screens on 3 October 2026. Current provider implementation does not establish a completed production-signed login test.")
s=s.replacingOccurrences(of:"The aim is to design, implement, and critically evaluate a mobile application",with:"Building on the original trauma-informed support aim, the aim is to design, implement, and critically evaluate a mobile application")
s=s.replacingOccurrences(of:"a15",with:"a15")
let extraLit="""
The NarraGive evaluation offers another relevant comparison. It examines content-based and collaborative recommendation of mental health recovery narratives, using measures including accuracy, precision, diversity, coverage, and unfairness (Rek et al., 2024). It also respects user-blocked narratives. Holistic Mind uses different content and a much smaller authored evaluation, but the shared lesson is to assess more than relevance alone. The paper's participant outcomes and dataset are not evidence about Holistic Mind.

Matthews and Rhodes-Maquire (2025) provide a scoping review specifically addressing personalisation and recommendation for mental health apps. This is a stronger source description than the abbreviated title and author details in the earlier interim bibliography. It supports positioning the project within an established research topic rather than presenting personalisation as an entirely new idea. The final report uses verified source identities and avoids inheriting unverified claims of market uniqueness.

"""
s=s.replacingOccurrences(of:"## 2.9 Literature synthesis",with:extraLit+"## 2.9 Literature synthesis")
// Replace preparation-only appendix with substantive evidence and evaluation appendices.
if let range=s.range(of:"# Appendix A. Evidence and submission details"){s=String(s[..<range.lowerBound])}
s += """
# Appendix A. Prior-report traceability

The previous reports contribute different kinds of evidence. The original proposal establishes the intended audience and initial objectives. The April interim report contributes methodology, scope, risk thinking, and a proposed study. The June review contributes prototype milestones and questions about explainability and evaluation. The September review contributes the broader platform description and historical screenshots. Current repository records provide later privacy, comfort, and simulator refinements. The Modern Data Stores coursework is a separate IoT project; its useful influence here is the discipline of relating data models, architecture, security, and evidence to requirements.

@table|Table 5. Source-to-report traceability. Duplicate June progress submissions describe the same reported milestone.
Supplied source|Material retained|Final-report location|Qualification
Holistic Mind App proposal|Audience, motivation, initial objectives|Chapters 1 and 3|Targets distinguished from outcomes
Sunway Interim Report|DSR, ethics, scope, study plan|Chapters 2–4; Appendix C|Sources checked; study not claimed complete
Interim Progress Review|React Native and Firebase prototype|Chapters 1, 6, and 8|Historical stage
Interim Progress Review (1)|Same June milestones and questions|Same evidence record|Not a second independent observation
Sunway Final Progress Review|Custom services, admin, media, reflection|Chapters 5–8; Figures 13–15|Dated historical implementation
Modern Data Store coursework|Clear technical rationale and evidence style|Data and testing presentation|IoT features/results not transferred
@end

Several statements required reconciliation. The initial five-state check-in evolved into six structured dimensions. Firebase was replaced by custom account and data services. The original commercial model did not become evidenced payment infrastructure. The original journal-exclusion intention was temporarily weakened by a journal-context implementation and later strengthened through device encryption and journal-free requests. The final progress review's deployed beta preceded locally verified encryption refinements. These distinctions are retained to make the development account consistent.

Figures 1 and 7 are existing October simulator images. Figures 13 and 14 reproduce interface evidence from the supplied September review, with the visible account email obscured in Figure 14. The remaining explanatory figures were prepared from source and documented decisions; benchmark charts reproduce saved evaluation artefacts. Historical screenshots are labelled by version/date and do not establish current physical-device acceptance. Originality declarations and acknowledgements from reference dissertations are not copied into this report.

# Appendix B. Reproduction and evidence checklist

A reviewer can begin with the application package scripts and the evaluation README. The production benchmark command is npm run benchmark:production, while npm run benchmark:comfort generates the separate restriction suite. The original journal-containing suite is retained for historical comparison. Strict ONNX mode must successfully load the configured model; a lexical run should remain separately labelled. Output files record engine version, backend identity, catalogue/scenario inputs, environment, seed, and source hashes. Repeating a command may overwrite that suite's standard output, so a custom output path should be used when preserving a saved result matters.

The relevant implementation paths are recommender/app/engine.py and schemas.py; backend/src/routes/recommendations.ts and data/comfortPreferences.ts; src/services/recommendations/; src/services/journal/; src/context/JournalContext.tsx; and backend/src/routes/journal.ts. Database definitions are in backend/src/db.ts. These are repository-relative paths and can change as the project evolves. Their inclusion provides a starting point for review rather than embedding source code or secrets into the dissertation.

The regression commands include npm run test:comfort, npm run test:journal, npm run recommender:test, and npm run recommender:typecheck. Mobile TypeScript, backend build, and web/native bundle exports check different integration boundaries. Journal API tests use synthetic fixtures and isolated database tooling; live native/backend tests require the intended services and installed app. A reviewer should record the date, source version, environment, commands, and results of any rerun. The saved passes cited in this report are attributed to their existing records rather than represented as new results.

The release checklist should verify the installed native version, API readiness, database migration status, recommendation model/version, storage policy, email delivery, provider client configuration, and journal recovery on an additional device. It should then exercise check-in, restriction enforcement, practice playback, encrypted reflection, attachment saving, history, logout, and deletion using synthetic accounts. Each item should have a recorded outcome and any limitation. No existing user's reflection should be used as an integration fixture.

# Appendix C. Proposed formative user-study protocol

This appendix develops the study proposed in the April interim report. It is a prospective protocol, not a completed study or an ethics approval. Recruitment should begin only after the institution's required review and after exercise content is suitable for the tasks. A minimum of five adult participants may support formative usability observations, but cannot provide representative clinical-effectiveness evidence. Participation should not require disclosure of a traumatic history or a diagnosis; any self-identification criteria require clear consent and data minimisation.

Participants would receive a plain-language explanation of purpose, activities, voluntary withdrawal, data handling, and the application's limits. Tasks would use synthetic account data and optional non-sensitive check-in choices. The facilitator would explain how to pause or stop, and participants could skip any practice. No recovery key from a participant's real journal should be collected. A demonstration vault or synthetic entry can be used to assess comprehension of setup and recovery without exposing personal reflections.

The task sequence would cover onboarding, completing a check-in, selecting a comfort preference, reading a recommendation reason, browsing an alternative practice, opening a learning resource, saving a synthetic reflection, locking the journal, and finding history or account controls. Observations would record completion, errors, requests for help, navigation confusion, and understanding of restrictions. Relevance ratings would be collected separately from comfort and perceived usefulness, so a relevant-looking suggestion is not automatically coded as beneficial.

A comparator, if included, should use the same eligible and reviewed content pool and differ only in selection method. Counterbalanced order can reduce simple learning effects, but the small study still remains formative. The study should not reproduce the offline random baseline's missing suitability rules in participant-facing tasks. Any accidental restriction violation should be recorded and investigated rather than hidden in an average relevance score.

A standard usability instrument can supplement task observations, provided its wording and scoring are reported accurately. Interviews should ask what participants expected, which explanations were useful, where control felt insufficient, and what made journal recovery confusing. Analysis can combine task counts with descriptive scores and transparent thematic summaries. In a small sample, individual difficulties are informative; a single aggregate satisfaction score should not conceal them. No clinical symptom-improvement claim follows from a short task session.

The final study report should state recruitment method, participant count, task protocol, consent and withdrawal handling, instrument version, missing responses, and analytic approach. Findings should distinguish observed behaviour from participant opinion and researcher interpretation. Retention should follow the approved research arrangement. Completing this protocol would address the original study objective and provide evidence for interface iteration, while stronger outcome claims would still require a separate research design.
"""
let refs="""
Hevner, A. R., March, S. T., Park, J. and Ram, S. (2004) 'Design Science in Information Systems Research', MIS Quarterly, 28(1), pp. 75–105. https://aisel.aisnet.org/misq/vol28/iss1/6/.

Linardon, J., Cuijpers, P., Carlbring, P., Messer, M. and Fuller-Tyszkiewicz, M. (2019) 'The efficacy of app-supported smartphone interventions for mental health problems: a meta-analysis of randomized controlled trials', World Psychiatry, 18(3), pp. 325–336. https://pmc.ncbi.nlm.nih.gov/articles/PMC6732686/.

Matthews, P. and Rhodes-Maquire, C. (2025) 'Personalisation and Recommendation for Mental Health Apps: A Scoping Review', Behaviour & Information Technology, 44(10), pp. 2389–2404. https://doi.org/10.1080/0144929X.2024.2356630.

Rek, B. et al. (2024) 'The Implementation of Recommender Systems for Mental Health Recovery Narratives: Evaluation of Use and Performance', JMIR Mental Health, 11, e45754. https://pmc.ncbi.nlm.nih.gov/articles/PMC11015364/.

SAMHSA (n.d.) Trauma-Informed Approaches and Programs. https://www.samhsa.gov/mental-health/trauma-violence/trauma-informed-approaches-programs. Accessed 3 October 2026.

Tapuria, A., Alexander, J., Marchal, A., Cong, C., Meinert, E., Shankar, R., Ananthakrishnan, A. and Lakey, B. (2024) 'Development of a Mental Health Apps Recommender Platform', Studies in Health Technology and Informatics, 316, pp. 1871–1872. https://doi.org/10.3233/SHTI240796.

Shrestha, S. (2026a) Holistic Mind App: A Trauma-Informed Mental Wellness Mobile Application. Project I proposal. User-supplied PDF: Holistic Mind App by Samyam Shrestha.pdf.

Shrestha, S. (2026b) The Holistic Mind: A Trauma-Informed, AI-Powered Mobile Application for Mental Health Self-Regulation. Project Interim Report, CMP6200/DIG6200, 27 April. User-supplied PDF: Sunway Interim Report.pdf.

Shrestha, S. (2026c) The Holistic Mind: Interim Progress Review. CMP6200/DIG6200, 14 June; reporting period 27 April–14 June. User-supplied PDFs: Interim Progress Review Samyam Shrestha.pdf and Samyam Shrestha Interim Progress Review (1).pdf; duplicate milestone evidence.

Shrestha, S. (2026d) The Holistic Mind: Final Progress Review. CMP6200/DIG6200, 2 September. User-supplied PDF: Sunway Final Progress Review.pdf.

Shrestha, S. (n.d.) Design and Evaluation of a MongoDB-Based IoT Data Platform with MQTT and Smart Automation for IoThings Home Automation Solutions. CMP6207 Modern Data Stores consultancy report. User-supplied PDF: Samyam Shrestha Modern Data Store.pdf. Separate project; used for technical presentation, not Holistic Mind implementation evidence. The supplied cover does not establish an unambiguous submission year.

"""
s=s.replacingOccurrences(of:"# Appendix A. Prior-report traceability",with:refs+"# Appendix A. Prior-report traceability")
// Keep the reference list in alphabetical order rather than appending new citations by drafting order.
let parts=s.components(separatedBy:"# References\n\n")
if parts.count==2,let index=parts[1].range(of:"# Appendix A.") {
 let refText=String(parts[1][..<index.lowerBound]);let appendix=String(parts[1][index.lowerBound...])
 let entries=refText.components(separatedBy:"\n\n").filter{!$0.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty}.sorted{$0.localizedCaseInsensitiveCompare($1) == .orderedAscending}
 s=parts[0]+"# References\n\n"+entries.joined(separator:"\n\n")+"\n\n"+appendix
}
try s.write(toFile:"reports/working/report-detailed.md",atomically:true,encoding:.utf8)
print("Detailed manuscript assembled")
