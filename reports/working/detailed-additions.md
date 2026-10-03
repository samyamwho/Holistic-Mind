§INSERT|# 2. Review of Existing Knowledge
## 1.5 Original motivation and intended users

The proposal defined Holistic Mind as a trauma-informed mobile application for adults seeking support with childhood-trauma-related difficulties, anxiety, and ADHD between therapy sessions (Shrestha, 2026a). That intended audience remains central to the project's design rationale. The application offers a private place to notice a current state, access a short practice, and reflect afterwards. The term trauma-informed describes an intention to respect choice, predictability, and personal comfort. It does not identify the software as a validated trauma treatment, and the application does not determine whether a user has trauma or ADHD.

The most useful element of the original proposal is its emphasis on the period between professional appointments. In that setting, a person may already have strategies they prefer but find it difficult to choose or remember one in a stressful moment. Holistic Mind organises a curated collection rather than expecting the person to search an unstructured information source. Its recommendations remain optional. A user can browse independently, avoid a particular type of practice, and provide feedback about an experience. This design addresses a concrete interaction problem while preserving the original supportive purpose.

The early proposal included a freemium commercial model and Firebase authentication. Later scope documentation placed subscription infrastructure outside the core academic deliverable. These changes distinguish the idea's commercial possibilities from what the final artefact actually implements. Likewise, the proposal's content counts describe intended delivery targets, not an audited inventory of the current catalogue. The benchmark's 14 exercises are evaluation fixtures, while the mobile application can display a larger managed catalogue. The report therefore avoids treating these different counts as interchangeable measures of completion.

## 1.6 Project evolution across previous submissions

The supplied reports form a useful sequence of decisions. The April interim report introduced a Design Science Research approach and a planned mixed-method study. The June progress review documented React Native selection, Firebase setup, initial authentication, and onboarding. Its supervisor questions asked whether a rule-based first version, explanation text, and comparison against random suggestions would be appropriate. The September final progress review then described a broader platform with custom authentication, PostgreSQL, a separate Python service, administration tools, and cloud-hosted content (Shrestha, 2026b; 2026c; 2026d).

Current implementation extends that sequence with explicit comfort preferences and device-only journal encryption. The original ethical intention was that journals should not be analysed for modelling. An intermediate implementation used limited journal context, as the September review acknowledged. The present recommendation route restores a stronger separation by sending no journal text at all. This is a substantive change to the privacy and personalisation design, not merely a change in terminology. It also requires the journal-free benchmark rather than the earlier journal-containing results to represent current application inputs.

A final dissertation should explain this evolution instead of flattening every earlier statement into a claim about the final system. Firebase remains part of the documented prototype history. The September review's claim of a deployed beta describes that reported stage, while the later encrypted journal changes were verified locally and have a separate rollout status. The proposed five-participant study remains a planned activity unless participant records and analysis are supplied. These distinctions allow the original ambitions to remain visible without overstating their completion.

§INSERT|# 3. Aims, Objectives, and Scope
## 2.6 Trauma-informed principles as design requirements

SAMHSA describes trauma-informed approaches through principles including safety, transparency, peer support, collaboration, empowerment and choice, and attention to cultural and historical context (SAMHSA, n.d.). These principles originate in wider organisational practice. Applying them to a mobile interface is an engineering interpretation that requires evaluation with its intended users. Holistic Mind chiefly operationalises choice, transparency, and predictable interaction; it does not implement every part of a comprehensive trauma-informed service.

Choice appears in optional practice selection and explicit comfort preferences. Predictability appears in short onboarding, visible navigation, and recognisable controls. Transparency appears in recommendation reasons and the explanation that journal recovery requires a separate key. The design avoids requiring a trauma narrative as the price of receiving a suggestion. Personalisation uses structured self-reports rather than an attempt to classify a person's history. The relevant question is whether these choices feel useful and respectful in practice, which cannot be answered by a software test alone.

Peer support is a clear example of a principle outside the present application. There is no evidenced moderated peer community or therapist relationship inside Holistic Mind. Cultural responsiveness is also incomplete: accepting Nepali text in an encrypted journal demonstrates text handling, not a fully localised or culturally validated intervention. Treating partial implementation honestly makes the term trauma-informed more precise. It identifies a design direction and review framework rather than certifying the application's overall suitability.

## 2.7 Digital mental health evidence and its limits

Linardon et al. (2019) reviewed 66 randomised trials of app-supported smartphone interventions. Their findings support the potential of some interventions for several mental health outcomes, while noting variable trial quality and limited evidence for some outcomes. The review does not establish that Holistic Mind's specific content, recommendation rules, or intended audience will benefit. It also does not substantiate the earlier report's claim that fewer than 3% of apps use trauma frameworks. That percentage is consequently excluded from the final argument.

The distinction matters because a functioning application and an effective intervention are different achievements. Authentication, persistent journaling, and a reliable media player can be evaluated through technical and usability methods. Claims about symptom improvement require an appropriate study design and outcome measures. Holistic Mind's evaluation is presently concentrated on software functionality and relevance agreement with authored labels. The literature motivates further research, but its findings are not transferred as outcomes of this artefact.

## 2.8 Related recommender platforms and corrected sources

The earlier interim report identified work on recommending mental health applications. Its linked 2024 paper is authored by Tapuria and colleagues, rather than the author attribution used in that draft. Tapuria et al. (2024) describe requirements assessment, prototype development, and bench testing for a platform that recommends trusted mental health apps. Their emphasis on safety, confidentiality, and reliability is relevant to Holistic Mind, although recommending complete apps differs from ranking practices within one catalogue.

This comparison reinforces the importance of content quality and user requirements before algorithm complexity. Holistic Mind uses administered exercise metadata rather than choosing from independently assessed third-party applications. The administrator's publication decision therefore becomes part of the recommendation environment. Similarity scores cannot compensate for missing restrictions or unsupported descriptions. The project needs a content-review procedure alongside ranking evaluation, especially when the catalogue expands or descriptions change.

## 2.9 Literature synthesis and project positioning

Four bodies of work shape the final artefact: trauma-informed principles, evidence on digital interventions, hybrid recommendation, and privacy research. Their roles differ. Trauma-informed principles guide interaction decisions. Digital intervention evidence motivates research without validating this application. Hybrid recommendation provides a practical way to combine heterogeneous evidence. Privacy research challenges the assumption that semantic representations adequately conceal personal text. Keeping these roles distinct prevents a technology choice from becoming an unsupported clinical argument.

The project is positioned as an applied software contribution. Its originality lies in assembling an explicit daily workflow, comfort-aware eligibility, inspectable ranking, managed learning content, and device-side reflection within one system. It does not claim a first-of-its-kind app, a novel neural architecture, or an exhaustive market gap. The original proposal's focus remains meaningful without asserting that no competing application addresses similar needs. The stronger academic argument is to show the implemented mechanisms, evaluate them fairly, and identify the limits of the resulting evidence.

§INSERT|# 4. Project Design and Methodology
## 3.5 Requirements and implementation traceability

The requirements below connect the original supportive purpose to observable software behaviour. Priority indicates importance to the current artefact; it does not imply that a feature has passed production acceptance. The distinction between an implemented pathway and a verified release is retained throughout the report. Requirements for a study and independent review are included because they are part of evaluating the project, even though they are not user-interface features.

@table|Table 2. Functional requirements and current evidence.
Requirement|Priority|Implementation location|Evidence state
FR1 Account access and isolation|Must|Auth routes and context|Source; documented API checks
FR2 Onboarding and daily check-in|Must|Wellness API and Home|Source; stored choices checked
FR3 Explained recommendations|Must|Node route and Python engine|Saved benchmark; live request record
FR4 Explicit comfort exclusions|Must|Shared comfort policy|Regression and comfort-suite evidence
FR5 Encrypted reflection and recovery|Must|Journal context and API|Native/backend checks; rollout pending
FR6 Browse exercises and media|Must|Explore and exercise screens|Source; historical interface evidence
FR7 Structured learning library|Should|Library screens and admin|Source; interface evidence
FR8 Content publication management|Should|Admin and content routes|Source; earlier deployment record
FR9 Account controls and reminders|Should|Profile and notifications|Source; release checks incomplete
FR10 Representative usability study|Evaluation|Proposed study protocol|No completed study supplied
@end

Non-functional requirements are specified through behaviour that can be checked rather than generic promises. NFR1 requires ownership to be derived from the authenticated session. NFR2 requires new journal content to leave the device only as a validated encrypted envelope. NFR3 requires model and strategy identification so semantic and fallback runs are distinguishable. NFR4 requires readable controls, visible selected states, and recoverable failures. NFR5 requires content and ranking logic to remain maintainable through separate modules and versioned evaluation artefacts. Complete accessibility conformance and quantified uptime have not been measured.

## 3.6 Reconciliation of original objectives

The original project objectives included a five-state check-in, fixed breathwork and somatic content counts, a rule-based recommendation engine with preference learning, Firebase-backed access, and evaluation with at least five intended users. The final artefact preserves the purpose of these objectives while changing their implementation. A six-dimension check-in provides more structured context than a single five-state choice. The custom API and PostgreSQL replace Firebase for account and data operations. The rule-based foundation is retained within the hybrid recommendation service.

Preference learning is implemented through interaction aggregation and conditional neighbour evidence, not automatic retraining of MiniLM after each practice. The final content system supports managed exercises and curriculum resources, but the earlier numerical content targets should be audited against a dated export before being marked complete. The freemium idea has not become an evidenced payment system. These are sensible scope decisions, provided the report describes them as changes rather than treating every initial objective as achieved in its original form.

The user-study objective is the most significant incomplete research commitment. Earlier reports describe intended recruitment, SUS-based usability assessment, relevance ratings, and interviews. No participant-level data, completed questionnaires, consent records, interview analysis, or results accompany the current material. The dissertation therefore presents the study design as future evaluation and uses the authored benchmark for its actual ranking evidence. Appendix C provides a concrete protocol that can be used to close that gap without manufacturing a study outcome.

§INSERT|# 5. Artefact Design
## 4.5 Design Science Research framing

Hevner et al. (2004) describe design science as research through building and evaluating information-system artefacts. This provides the methodological foundation proposed in the April interim report. Holistic Mind instantiates that approach through an application, a recommendation mechanism, and a privacy architecture that respond to a defined problem. The research contribution is assessed through documented behaviour and evaluation, rather than the existence of code alone.

The project's problem phase identified fragmented daily support and the burden of choosing content. The construction phase developed the mobile interface and connected services. Evaluation then exposed practical issues: native dependencies missing from a build, secure-storage signing requirements, recommendation exclusions, and the impact of removing journal context. These findings prompted targeted refinements. The resulting learning is specific to the artefact: restrictions need a shared policy, privacy changes need new evaluation inputs, and native integration needs installed-build verification.

A limitation of the research process is that technical evaluation progressed further than evaluation with intended users. The artefact therefore has stronger evidence for data flow and restriction enforcement than for perceived usefulness. A mature DSR account should acknowledge that imbalance and specify what the next evaluation cycle must resolve. The report does so through a study protocol, independent content-review priorities, and a release-verification plan. This is a defensible partial research outcome rather than a claim that construction alone proves the design successful.

## 4.6 User-centred design activities and boundaries

The earlier reviews emphasised friendly onboarding and the risk of making sensitive questions clinical or overwhelming. That rationale is reflected in short options, supportive wording, and the ability to choose a support goal without describing traumatic experiences. Interface refinement also addressed spacing, card size, text wrapping, and navigation. These activities show attention to the user's interaction burden, although developer-led iteration is different from systematic observation of a representative user group.

The next user-centred cycle should test the user's understanding of the complete journey. A participant should be able to explain what a check-in contributes, distinguish a suggestion from an instruction, identify how to avoid a practice, and understand the recovery consequences of encrypted journaling. Observing these tasks would be more informative than asking only whether the screen looks attractive. It would also reveal whether privacy explanations create confusion or prevent a person from completing setup.

## 4.7 Feasibility and resource constraints

The April plan described a nine-month project, while the repository contains a fifteen-week development journal. These sources represent different planning views rather than interchangeable records of elapsed effort. The dissertation uses dated submissions to establish major milestones and the development journal to describe work phases. It does not infer an exact completion percentage from either. That avoids an apparent discrepancy being resolved through invented dates or effort estimates.

Technical feasibility rests on the existing integration of mature components: a shared mobile codebase, typed API modules, relational persistence, object storage, and a compact pretrained embedding model. Operational feasibility is more demanding because the project now contains multiple services and native dependencies. A stopped API can prevent sign-in despite correct Google configuration. A stale container can return an older ranking version despite updated source. These examples show why service readiness and version identification are practical requirements.

Content production is a separate resource constraint. Audio, video, written guidance, and curriculum structures require review and consistent metadata as well as upload tooling. The administration dashboard reduces release friction, but it does not remove that editorial workload. A staged content release is more feasible than assuming every proposed module can be produced and validated immediately. The original idea of optional later modules should remain a roadmap rather than a reason to delay validation of the core daily loop.

## 4.8 Risk management and ethical feasibility

The earlier reports identify recruitment difficulty, content delays, recommendation complexity, possible participant distress, and platform-release constraints. Their mitigation ideas remain useful, but Firebase billing risks are no longer an adequate description of the current system. Current operational risks include multi-service availability, public and private storage configuration, recovery-key loss, unsuitable metadata, and the compatibility of native builds with backend changes.

@table|Table 3. Current project risk register. Ratings are qualitative planning judgments, not measured incident probabilities.
Risk|Likelihood|Impact|Control or next action
Unreviewed exercise metadata|Medium|High|Independent review; version catalogue
Lost journal recovery material|Medium|High|Clear backup confirmation; recovery tests
Outdated app or container version|Medium|High|Version checks; coordinated release
Wrong storage access configuration|Medium|High|Separate public content from private data
Recruitment or ethics delay|Medium|Medium|Approve protocol before scheduling study
Media or content production delay|Medium|Medium|Publish reviewed core content in stages
Native signing or module mismatch|Medium|Medium|Test installed signed builds
Unclear recommendation explanation|Medium|Medium|Task-based usability assessment
@end

Risk management should be proportionate to actual operations. Synthetic test accounts and fixtures permit technical verification without exposing real reflective histories. A future study with the intended audience requires its own consent process and support arrangements. The application should not ask participants to disclose a trauma story to qualify for a usability task. No claim of ethics approval, clinical review, or regulatory compliance is made merely because these controls appear in a plan.

§INSERT|# 6. Implementation
## 5.6 Relational modelling and consistency

The database design builds on a clear separation between account identity, private activity, content, and recommendation evidence. A user row provides the ownership reference for profiles, sessions, onboarding, check-ins, journals, and recorded practice. Managed content has its own identifiers and publication lifecycle. Recommendation requests retain model version and context, while returned items preserve position, score components, reason, and exploration status. This supports a later explanation of which engine produced a displayed result.

Several source-defined constraints make application assumptions explicit. Email addresses are unique and normalised. Check-ins are unique per user and date, allowing a same-day update without creating multiple daily records. Recommendation items are unique within a request and occupy distinct positions. Feedback values have bounded helpfulness and enumerated state-change fields. Foreign-key cascades support deletion of user-linked data, but records outside the application database, such as retained exports or copied recovery keys, require separate handling.

PostgreSQL's JSONB fields accommodate variable answer and envelope structures without abandoning relational ownership. Arrays store exercise tags and goals, while constraints restrict activation and intensity values. This is a more appropriate account of flexibility than assuming every varying field requires a document database. The Modern Data Stores coursework provides a useful precedent for matching storage to workload, but Holistic Mind does not implement that coursework's MongoDB replica set or MQTT ingestion.

Indexes correspond to frequent access patterns: user-and-date lookup for check-ins, user-and-created-time retrieval for reflections and practice events, and publication-order lookup for exercises and courses. Their existence is source evidence, not a measured database-performance result. A future load test should inspect query plans and concurrency under realistic catalogue and account volumes. Small local datasets cannot establish the scaling behaviour of a deployed service.

## 5.7 API contracts and sequence design

A recommendation request is a coordinated sequence rather than a direct model call. Authentication establishes the user. The Node route loads the latest check-in and published recommendable content, derives restrictions, aggregates interactions, and prepares a pseudonymous context. The Python response identifies the model and strategy and supplies up to the requested number of items. The Node layer records the request and items, allowing subsequent events and feedback to be tied to what was actually returned. Figure 12 summarises this sequence.

@figure|sequence|Figure 12. Source-grounded recommendation request sequence, including authentication, contextual queries, constrained ranking, and persistence of returned items.|6.5

The contract has meaningful error states. A missing check-in prevents recommendation generation rather than permitting the client to fabricate server context. An unavailable published catalogue differs from an eligible set emptied by restrictions. A service failure may activate the application's separate fallback, while a successful empty result must remain empty. Each state has a different user-facing implication and should remain distinguishable in integration tests.

Journal operations have a different contract. Vault creation stores an encrypted check value, new entry writes accept envelopes, and normal reads return encrypted entries. A dedicated legacy path exposes older records only to the authenticated owner for migration. Media operations validate account and entry relationships. Separating these routes helps the interface explain whether it needs login, journal unlock, recovery material, or a retry of the network operation. A single generic save failure would obscure those distinctions.

## 5.8 Media and publication lifecycle

The content pipeline separates record creation from media upload and publication. An administrator requests a signed upload, transfers the asset to S3-compatible storage, and associates its reference with the appropriate record. Media and catalogue states distinguish drafts from ready or published content. The current upload helpers use a fifteen-minute expiry. A valid signed operation does not guarantee that the resulting media is correctly encoded or that its associated guidance has been reviewed, so readiness checks remain necessary.

Learning resources may be public or publicly retrievable according to deployment configuration, while encrypted journal attachments follow a different API and storage path. The existence of public educational media should not lead to treating private reflection as another content upload. The administrator's content-promotion scripts also have a different purpose from a backup of account data. These distinctions are inherited from the project's final progress review and made more explicit in the current design.

§INSERT|# 7. Validation and Testing
## 6.6 Screen-by-screen implementation

The Home screen presents the daily check-in as the main action and follows it with suggested tools and progress information. The check-in stores six values: state, body, energy, stress, focus, and support. Comfort preferences are additional optional choices rather than a seventh inferred mental-health measurement. The final step can exclude self-touch, breath holds, head or eye scanning, and inward body scans. These choices apply to the stored check-in, so the user should not assume that they are permanent account-wide settings.

Explore provides independent access to exercise categories and available audio. A person can use it when no recommendation has been generated or when they prefer another activity. Exercise detail screens support the relevant guidance format, including timed breathing, guided material, and media playback. Recommendation feedback is associated with the returned practice context when available. Opening, starting, and completing are distinct events; none is treated as direct proof of benefit. Figure 13 shows earlier Home and Explore interfaces from the September progress review.

@figure|home_explore|Figure 13. Historical Home and Explore interfaces reproduced from Shrestha's final progress review dated 2 September 2026. Catalogue counts and interface details describe that captured version.|5.4

Journal supports prompted packs and free writing behind an unlock/setup gate. The free-writing editor manages title, text, attachments, save state, and unsaved changes. Navigation away from a draft asks whether it should be discarded. The current Journal security page centralises recovery and locking controls rather than placing a large control panel beneath every journal or history view. This refinement reduces visual clutter while keeping sensitive operations accessible through Profile.

Profile groups account details, password/security actions, preferences, reminders, and history. History brings together recorded check-ins, practice information, and reflections that can be decrypted while the vault is unlocked. The September screenshots show an earlier form of those screens (Figure 14). The report uses them as development evidence, not as proof that every current control has been exercised on a physical device. The captions preserve that date so interface history does not become an implicit release certification.

@figure|history_profile|Figure 14. Historical Profile and History screens from the 2 September 2026 progress review. The account email is obscured for presentation; journal security controls have since been reorganised.|5.4

## 6.7 Curriculum and audio implementation

The learning Library is distinct from the short-practice catalogue. It uses courses, modules, and chapter records to organise longer material, with media and interactive chapter types defined in the backend. Chapter progress supports returning to a learning sequence. AudioPlayerContext provides a shared player state, and a compact player remains available across appropriate screens. This design avoids requiring the user to reopen the originating screen simply to pause a recording.

PDF viewing is handled separately from video and audio playback, with native and web implementations. The current code also includes interactive questions and multiple-choice content structures. Their availability allows the administrator to mix explanatory text, media, and participation within a course. It does not prove that the educational sequence has been assessed for learning effectiveness. A course can be technically navigable while still needing editorial review of its pacing, wording, and intended audience.

For usability, playback should remain predictable when navigating, receiving an interruption, or reopening the app. Those scenarios deserve native release testing because a web export cannot fully exercise platform audio behaviour. Likewise, successful PDF retrieval should be tested with large files, unsupported formats, and network errors. These priorities extend the final progress review's useful observation that apparently small interface defects can affect the overall experience.

## 6.8 Detailed ranking calculations and selection

The rules component combines exact matches to normalised metadata with additional activation and intensity adjustments. Current field weights assign 0.34 to support, 0.22 to state, 0.12 to body, 0.10 each to energy and stress, and 0.08 to focus. Additional adjustments can increase or reduce the clipped result. These values are implementation choices rather than validated psychological measurements. A more interpretable model is not automatically a more accurate clinical model.

The exercise document includes title, category, description, recommendation tags, support goals, intended states, activation level, and physical intensity. Current context is represented by key-value descriptions of the check-in answers. When ONNX outputs token-level states, the engine performs attention-mask-aware mean pooling and then normalises the resulting vectors. Dot products between these unit vectors provide cosine similarity. Negative similarities are clipped to zero before entering the weighted ranking calculation.

The score can be understood through a hypothetical calculation. If an eligible practice has R = 0.60, C = 0.70, and H = 0.40, the cold-start base score is 0.72 × 0.60 + 0.23 × 0.70 + 0.05 × 0.40 = 0.613. A recency penalty of 0.18 reduces that to 0.433. These invented values illustrate arithmetic only; they are not a recorded persona result or a probability of helpfulness. The final list can still differ from this scalar order because category diversity and support alignment affect selection.

Recency penalties start at 0.18 for recent exposure, decay by 0.72 across grouped request history, and are capped at 0.42. During greedy selection, each already selected item from a category introduces a 0.08 category penalty for subsequent choices from that category. If the complete most recent set would repeat, the last slot may be replaced by an unseen, support-aligned eligible candidate. This behaviour encourages variation without allowing explicitly excluded exercises to return through exploration.

The service distinguishes cold-start and collaborative strategies in its output. A qualifying neighbourhood uses positive similarity between users with overlapping ratings and maps predicted feedback into a bounded component. Items without a qualifying collaborative estimate receive a neutral internal default when collaboration is active. That mechanism merits longitudinal evaluation, particularly when recent feedback is sparse or contradictory. The benchmark does not contain the interaction history necessary to evaluate this behaviour.

## 6.9 Authentication, provider configuration, and reminders

Password hashing uses Argon2id in the current backend. Session handling, verification codes, and recovery actions are separate from journal recovery. Google sign-in requires matching native and backend client configuration as well as a reachable application API. The 3 October change record describes a simulator network failure caused by a stopped API and a new readiness check that presents a more specific failure message. It also states that a complete Google login still needs user retry. A configured provider should therefore not be described as end-to-end verified merely from source inspection.

Apple sign-in controls were removed from current login and signup screens on 3 October. Backend identity handling remains for existing Apple-linked accounts and account deletion. This corrects the earlier report's broader account-feature description. The final artefact should be documented at its current visible capability, with retained backend compatibility explained separately. It would be misleading to list Apple sign-in as a present mobile action simply because provider verification code remains in the repository.

Reminder scheduling uses Expo Notifications and local daily triggers when permission is granted. Current code schedules the daily check-in at 09:00 and practice at 18:00, with Android channel handling and a test reminder. The onboarding's preferred time is a separate stored value; its presence does not establish fully custom reminder scheduling. Web does not use these native local notifications. A release test should verify permission refusal, setting changes, cancellation on logout, and behaviour across device time changes.

## 6.10 Journal media and atomicity

Current source extends reflection beyond text through encrypted image and audio attachments. Media encryption binds the account, media identifier, key identifier, kind, content type, and entry association into authenticated data. This protects against substituting encrypted bytes into a different purpose or record. The journal context and attachment composer coordinate the draft, while the backend validates encrypted media and supports a combined entry-and-media operation. Encrypted user media is distinct from ordinary published exercise media.

The with-media endpoint uses a database transaction for the entry and related attachment records, allowing the server-side write to succeed or roll back as a unit. Client state still matters: recording, selecting an image, encryption, network transfer, and retry can fail before that transaction begins. The server's atomicity does not protect an unsaved local draft from being deliberately discarded. Tests should distinguish these stages rather than interpreting one transaction check as a complete attachment-workflow validation.

## 6.11 Deployment evolution and release status

The September final progress review reports a beta deployment using Railway, Vercel, and Cloudflare R2 alongside local Docker services. It also reports managed-content export/import without private user data. This is valuable historical evidence and should be retained. The report preparation did not independently query those deployments, inspect release logs, or exercise their live account operations. Later local encryption and security refinements therefore have their own validation and rollout boundaries.

A release of the present source requires coordinated backend schema, journal API, and native application versions. The latest encrypted clients expect envelope-based writes, while older plaintext clients are incompatible with that contract. Media configuration, API readiness, private recommender networking, email delivery, and native provider settings also require environment-specific checks. These are operational dependencies of the implemented system, not new features promised by this dissertation.

Figure 15 summarises the main changes across the supplied reports and repository records. It shows the shift from a proposed Firebase-backed app to a relational multi-service platform, followed by stronger comfort and journal boundaries. The graphic is evidence of documented design evolution. It is not an independent verification of every historical deployment claim or an assertion that the proposed participant study has been completed.

@figure|evolution|Figure 15. Project evolution across the April and June submissions, September final review, and later local refinements. Reported beta deployment and current encryption rollout are shown as distinct stages.|6.5

§INSERT|# 8. Critical Evaluation, Conclusion, and Future Work
## 7.5 Metrics, timing, and uncertainty

Precision and NDCG answer related but different questions. Precision measures the proportion of the requested four slots occupied by exercises with labels of at least two. NDCG rewards stronger labels placed earlier. Recall divides relevant returns by all relevant labelled items for that scenario. MRR concerns the position of the first relevant item. Coverage and category diversity describe catalogue use rather than whether any individual user benefits. Reading these measures together prevents one favourable result from standing in for the complete recommendation experience.

The benchmark's negative-label measure is named safety_violation_rate in the saved output, but its meaning is disagreement with authored negative labels. It is not an observed adverse-event rate. Explicit-exclusion violations are a separate property: an exercise can violate an authored label even when the user supplied no corresponding restriction. Conversely, a strongly relevant exercise may be excluded by a user's expressed preference. That is why the comfort suite's unchanged ideal relevance labels can limit interpretation of recall and NDCG.

Timing describes warm, in-process ranking. The saved production chart reports mean times of approximately 0.01 ms for random, 95.24 ms for semantic-only, 0.22 ms for rules, and 79.74 ms for hybrid. The hybrid's lower time than text-only in this run is not proof of universal speed superiority; candidate filtering and measurement variation affect the workload. Model load, tokeniser setup, database queries, HTTP transport, and mobile rendering are excluded. User-perceived delay requires a separate end-to-end measurement.

Bootstrap intervals reflect uncertainty over these authored scenarios. They do not compensate for a biased catalogue, uncertain labels, or a missing held-out dataset. Some comfort cases share a source persona, limiting independence further. The correct conclusion is that the saved runs make technical comparison transparent and reproducible under their recorded conditions. A stronger research claim requires additional data and a design that distinguishes development choices from final evaluation.

## 7.6 Verification matrix and regression priorities

@table|Table 4. Verification evidence by system layer. These are recorded or source-observed results, not newly rerun application tests for this report.
Layer|Evidence source|Supported conclusion|Outstanding check
Mobile types and exports|September/October change records|Recorded checks passed|Production-signed device release
Comfort policy|Shared mapping; regression suite|Declared exclusions exercised|Usability of preference wording
Journal crypto/API|Synthetic tests and live API record|Round trips; ownership; migration|Independent security assessment
Native key storage|15 September simulator record|Key persists after restart|Physical-device recovery/reinstall
Ranking quality|18 September saved ONNX runs|Authored relevance comparison|Unseen scenarios; expert labels
Administration/content|Source and September review|Managed publication implemented|Editorial and load validation
Provider login|Source and 3 October change record|Configuration and readiness work|Complete current Google login
Usability/effectiveness|Earlier proposed protocol|Research design available|Consented participant evaluation
@end

The regression plan should focus on failures with consequences across layers. A declared exclusion should survive backend mapping, Python filtering, diversity selection, and local fallback. An account change should clear the active journal session. A repeated encrypted save should not create duplicate entries. A migration retry should not overwrite an already encrypted record. Recommendation feedback should reject references that do not belong to an owned returned request. These checks test requirements rather than duplicating implementation details.

More recent features require particular care when interpreting older results. The September native record concerns the tested journal modules and synthetic fixtures at that time. It cannot automatically validate later attachment composition or reorganised security screens. The October build/export and journal-test record adds evidence for recent changes, but still identifies hands-on recovery UI and physical-device Google sign-in as pending. A versioned verification matrix makes these differences visible to a reviewer.

## 7.7 Planned user acceptance evaluation

The original minimum-five-participant study remains a useful formative proposal. Participants would complete representative tasks, give practice-relevance ratings, and discuss perceived control and confusion. Standard SUS scoring can be used if the instrument is administered without changing its measurement assumptions; an adapted questionnaire should be reported as adapted rather than presented as a standard SUS score. A small study would identify issues and guide iteration, not establish population effectiveness.

A random comparator requires additional care because the software's purpose includes restrictions. A fair user-study comparator should randomise within the same eligible, independently reviewed pool rather than deliberately offer excluded practices. The current offline baseline's omission of suitability rules is acceptable as a clearly documented diagnostic comparison, but does not justify presenting inappropriate content to participants. Appendix C specifies how a future protocol could separate relevance, comfort, task completion, and optional qualitative feedback.

§INSERT|# References
## 8.6 Reflection on development decisions

The strongest continuity across the earlier submissions is the commitment to a supportive, non-diagnostic interaction. The June review's concern about sensitive onboarding shaped later choices to collect short structured answers rather than a personal trauma narrative. Its question about explainable recommendations is addressed through returned reasons and score components. Its question about evaluation beyond random suggestions is addressed through four baseline approaches. The final system therefore develops several early research questions into concrete mechanisms and evidence.

Replacing Firebase was the most substantial architectural change reported in the final progress review. It introduced redevelopment of authentication, data access, and administration, but enabled direct control over relational records and recommendation coordination. The decision is defensible for the resulting artefact, although the supplied material does not document a formal total-cost or security comparison with Firebase. The report should explain the observed benefits without treating a custom backend as inherently superior. Greater control also transfers operational and security responsibilities to the project.

The journal redesign illustrates a second important learning point. An apparently useful recommendation input can conflict with the product's privacy intention. Removing journal context reduced the available semantic evidence and slightly lowered saved NDCG compared with the historical benchmark. The project addressed that trade-off by publishing a journal-free evaluation instead of continuing to promote scores from an input path the app no longer uses. This is stronger research practice than retaining a favourable but mismatched historical result.

Native debugging also changed the understanding of completion. The required module and keychain signing problems showed that an exported JavaScript bundle is not equivalent to a working installed app. The stale recommender container showed that source version and running version can diverge. The October sign-in issue showed that provider configuration is insufficient when the application server is stopped. Each problem crossed a boundary between software layers, supporting the final review's emphasis on systems thinking and maintainability.

## 8.7 Practical impact and commercial scope

The original proposal's freemium idea describes one possible business model, but the current academic contribution does not depend on subscriptions. Introducing paid access would require payment and entitlement handling, clear content boundaries, and a decision about which practices remain available without charge. It would also introduce new usability and retention questions. None of those questions is resolved by the existing recommendation metrics. The report therefore treats monetisation as optional future product work.

Potential impact is concentrated in a coherent routine, clearer content selection, and greater control over reflective privacy. These benefits are plausible from the design but need observation with intended users. A larger library could also create new selection burden if categories and reasons become confusing. More engagement is not automatically better: repeated use might indicate usefulness, habit, distress, or simple curiosity. The project should avoid optimising solely for completion counts and instead assess what users want from the routine.

## 8.8 Prioritised completion roadmap

The first priority is content and metadata review. An independent reviewer should examine descriptions, restrictions, suitability labels, and the three unresolved benchmark cases. The output should be a dated, versioned catalogue and documented label decisions. The second priority is physical-device and release verification, covering provider sign-in, native key storage, recovery on another device, interruptions, attachments, and deletion. These activities close important evidence gaps without introducing a new recommendation feature.

The third priority is a consented formative usability study focused on the complete daily journey and journal setup. It should measure successful task completion, the interpretation of recommendation reasons, and understanding of comfort choices and key-loss consequences. The fourth is ranking research: separate development and unseen scenarios, compare common eligibility policies where appropriate, and evaluate longitudinal feedback and rotation. Only after these foundations are stronger should the project increase collaborative influence or add another personalisation input.

Future journal-aware support should be designed as a separate local-processing capability if pursued. It must not weaken the existing encryption promise by quietly uploading decrypted content or embeddings. Key rotation, recovery-material compromise, background locking, and legacy-backup retention are also concrete privacy priorities. This roadmap preserves the original ambition while directing effort toward validation and control. Holistic Mind's contribution is a functioning, inspectable artefact and a clear account of how its design evolved; its remaining research and release work are identifiable rather than concealed.
