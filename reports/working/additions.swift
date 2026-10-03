import Foundation
let path = "reports/working/report.md"
var s = try String(contentsOfFile:path, encoding:.utf8)
let changes:[(String,String)] = [
("# 3. Aims, Objectives, and Scope", """
## 2.5 Implications for this project

The reviewed ideas suggest three practical design principles. Context should be represented in a form the system can inspect, restrictions should be applied before relevance scoring, and evaluation should measure several competing outcomes. Holistic Mind uses short structured questions to make the first principle concrete, shared comfort mapping for the second, and separate quality, fill, and violation measures for the third. Together, these choices make failures easier to locate than a single opaque model output would permit.

There is also a clear gap between recommendation research and this application's eventual use. General-purpose semantic models are trained for broad language similarity rather than this exercise catalogue. Authored relevance judgments may reward descriptions that match familiar language without establishing personal usefulness. The project therefore needs domain-specific review and user-centred evidence before moving from technical feasibility to stronger effectiveness claims. This gap motivates the critical evaluation rather than undermining the value of building and testing a bounded prototype.

# 3. Aims, Objectives, and Scope
"""),
("## 5.3 Data model and ownership", """
A practical example clarifies the interaction. A user reports feeling scattered and selects focus as the immediate support need. If the same user also avoids breath holds, the recommendation pathway must remove exercises requiring that action before deciding which remaining practice best matches focus. The interface should present the resulting options as suggestions with reasons, and the user may still choose another activity through Explore. Reporting discomfort provides additional evidence for future exclusions. This example illustrates the intended sequence, not a new measured test case or a claim about the user's eventual response to a practice.

## 5.3 Data model and ownership
"""),
("## 6.4 Encrypted journaling", """
The interaction aggregation also deserves scrutiny. Current backend code combines explicit feedback and event values over a bounded recent period, groups them by user and exercise, and limits the returned interaction dataset. Averaging is simple to inspect, but may suppress disagreement between a completed activity and an uncomfortable experience. Sparse observations, repeated clicks, and differences in how users provide ratings can distort neighbour similarity. Future analysis should examine these behaviours before adjusting weights or increasing the influence of collaboration. A pseudonymous identifier helps separate the service from direct account identifiers, but does not remove the sensitivity of the behavioural record.

## 6.4 Encrypted journaling
"""),
("## 8.3 Answers to research questions", """
## 8.3 Usability, maintenance, and practical impact

The application's practical value lies in reducing the steps between noticing a state and finding an available activity. That value remains plausible rather than measured. A user study should examine whether check-in questions are understandable, whether comfort choices accurately describe what people wish to avoid, and whether recommendation reasons help users make decisions. It should also observe skipped questions and declined practices, because these behaviours may reveal friction that a favourable satisfaction score alone would miss.

Maintenance is equally relevant to future impact. A published exercise can change wording, media, or metadata without changing the ranking code. Such updates may alter semantic similarity or eligibility, making catalogue versioning and regression checks valuable. Journal envelope versions and native cryptography dependencies also require coordinated compatibility. The project should retain reproducible evaluation snapshots while documenting when their catalogue or engine no longer matches a release. This would improve the usefulness of both favourable and unfavourable historical results.

## 8.4 Answers to research questions
"""),
("## 8.4 Future work and conclusion", "## 8.5 Future work and conclusion")]
for (a,b) in changes { s = s.replacingOccurrences(of:a, with:b) }
try s.write(toFile:path, atomically:true, encoding:.utf8)
