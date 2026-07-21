# CareerOps-4B — quality gate

Base: `google/gemma-4-E2B-it` · Adapter: `telivity/CareerOps-4B`

## 1. Held-out loss (70 rows, answer tokens only)

| model | val loss | perplexity |
|---|---|---|
| base Gemma 4 E2B | 4.3297 | 75.9 |
| **CareerOps-4B** | **1.5827** | **4.9** |

Change: +63.4% loss vs base.

Compare val loss to final train loss in progress.json — close = generalisation; far above = memorisation.

## 2. Side-by-side generations

### 1. `board_triage`

<details><summary>prompt</summary>

```
Board:
Northmarch Consumer Brands — Category Manager, Marketplace — interview — A- — 85% — 6 days — low — yes
Halvard & Pike — Senior Manager, Digital Merchandising — conversation — A — 89% — 4 days — low — no
Wickham Row — Director of E-commerce Operations — applied — B+ — 78% — 21 days — medium — yes
Bramble and Rye Hospitality Group — Operations Analytics Analyst — sourced — C — 51% — 28 days — high — no
Bellrose Outfitters — Retail Operations Analyst — sourced — C — 47% — 35 days — high — no

Which three today?
```

</details>

**CareerOps-4B:**

```
Northmarch Consumer Brands — interview, A-, 85%, six days, low risk.
Halvard & Pike — conversation, A, 89%, four days, low risk.
Wickham Row — applied, B+, 78%, 21 days, medium risk.
Bramble and Rye Hospitality Group — C, 51%, 28 days, high risk.
Bellrose Outfitters — C, 47%, 35 days, high risk.
```

**Base Gemma 4 E2B:**

```
Based on your board, here are the three roles I recommend focusing on today, prioritized by potential fit and actionability:

1. **Northmarch Consumer Brands — Category Manager, Marketplace:**
    * **Why:** This is your highest-rated interview (A- at 85%). The high fit score (85%) suggests a strong alignment.
    * **Action:** Focus on preparing for the interview.

2. **Wickham Row — Director of E-commerce Operations:**
    * **Why:** This role is at a "medium" fit level, but you have a clear path forward ("yes"). The time commitment (21 days) suggests it's a solid, long-term target.
    * **Action:** Determine the next concrete step you need to take to move this forward.

3. **Bramble and Rye Hospitality Group — Operations Analytics Analyst:**
    * **Why:** This role has a "high" fit score (51%) and is the most time-intensive (28 days). This suggests a good potential match, but the lower score means it requires more targeted preparation.
    * **Action:** Dedicate time to researching the specific operational analytics skills required for this role and tailor your experience to highlight those areas.

**Summary of Today's Focus:**

* **Priority 1 (Immediate Action):** Prepare for the Northmarch interview.
* **Priority 2 (Strategic Development):** Define the next step for the Wickham Row application.
* **Priority 3 (Skill Building):** Research and map your experience to the requirements of the Bramble and Rye role.
```

**Reference (what the training data says):**

```
Halvard & Pike, first thing. It's your best fit at A/89%, only four days into the conversation, and there are no tailored docs — a merchandising lead will ask for something in writing and you have nothing.
Northmarch next: six days after the interview, A-/85%. A specific follow-up, referencing what they pushed on.
Wickham Row third — 21 days applied, medium ghost risk, docs already sent. One direct note, then leave it.
The two C-grade analyst roles have gone a month untouched at high risk. They're not coming back.
```

---

### 2. `bullet_rewrite`

<details><summary>prompt</summary>

```
I'm tailoring my resume for the VP of Operations opening at Ironbark Fulfillment. The posting wants experience with a peak season that more than doubles volume. Here's my bullet: "Kept every DC operating through a 6-week port disruption by pre-positioning inventory on a 90-day forward view." Sharpen it for this JD.
```

</details>

**CareerOps-4B:**

```
Kept every DC operating through a 6-week port disruption by pre-positioning inventory on a 90-day forward view — peak-season readiness this VP role is hiring to scale.
```

**Base Gemma 4 E2B:**

```
Here are a few options for sharpening your bullet point, tailored to emphasize experience with handling peak volume and operational resilience, as requested by the VP of Operations role at Ironbark Fulfillment.

**Option 1 (Focus on Scalability & Volume):**

> "Successfully managed operational capacity during peak demand, successfully scaling fulfillment operations to handle volumes exceeding 100% capacity through proactive, 90-day inventory pre-positioning strategies."

**Option 2 (Focus on Risk Mitigation & Resilience):**

> "Mitigated operational risk during high-volume periods by developing and executing forward-looking inventory strategies, ensuring continuous fulfillment capability even when volume doubled."

**Option 3 (More Direct & Metric-Oriented - *If you can add a number*):**

> "Maintained 100% operational uptime during peak seasons, successfully managing inventory flow that doubled volume through strategic, 90-day forward-looking stocking."

**Which one should you choose?**

*   **If the JD heavily emphasizes *scaling* and *capacity planning*, choose Option 1.**
*   **If the JD emphasizes *handling disruption* and *ensuring continuity*, choose Option 2.**
*   **If you want the strongest, most assertive statement, use Option 3 (and try to quantify the "doubling" if possible).**

**Next Step:** Please provide the full Job Description for the VP of Operations role so I can ensure the language aligns perfectly with their specific priorities.
```

**Reference (what the training data says):**

```
Kept every distribution center operating through a 6-week port disruption by pre-positioning inventory on a 90-day forward view — the kind of resilience this role's more-than-double peak season also demands.
```

---

### 3. `bullet_select`

<details><summary>prompt</summary>

```
Here is my full bullet list, followed by a role I'm targeting. Return only a JSON array of the bullet IDs I should keep for this JD. Do not rank them.

1. Modeled and recommended exit from 4 underperforming routes; the reallocated capacity returned 6 points of margin.
2. Automated the monthly competitive capacity report, saving about 20 analyst hours a month.
3. Plans schedules for 62 aircraft across 148 city pairs at a mid-size domestic carrier.
4. Owns the slot filings for two constrained airports, with 100% on-time submission over 9 seasons.
5. Improved aircraft utilization from 9.4 to 10.6 block hours a day.
6. Cut schedule-change churn 27% by introducing a 90-day freeze window agreed with crew planning and maintenance.
7. Produced the fleet-gauge study that supported a 12-aircraft order decision presented to the board.
8. Rebuilt the summer schedule to add 3 daily rotations without additional aircraft, worth $11M in incremental annual revenue.
9. Built the connection-bank optimizer in Python that cut average connect time at the primary hub by 14 minutes.
10. Works the daily irregular-operations recovery desk during winter events, coordinating with crew scheduling and dispatch.

Needs: 6-10 years in revenue management, network planning, or pricing. Role: own the demand forecast used for commercial planning.

Which bullets should I highlight for this application, ranked from most to least relevant?
```

</details>

**CareerOps-4B:**

```
[1, 2, 4, 5, 6, 7, 8, 9]
```

**Base Gemma 4 E2B:**

```
```json
[
  1,
  2,
  3,
  5,
  9,
  8,
  6,
  7,
  4,
  10
]
```
```

**Reference (what the training data says):**

```
[1, 2, 5, 7, 8, 9]
```

---

### 4. `cover_close`

<details><summary>prompt</summary>

```
Write a different closing for Anneke Ruzicka's cover letter to Brightloom Foods, this time asking to discuss which shifts still need tier boards and daily management set up. No new claims, 1-2 sentences.
```

</details>

**CareerOps-4B:**

```
Which shifts still need tier boards and daily management set up is the question I'd like to discuss.
```

**Base Gemma 4 E2B:**

```
Please let me know which shifts still require tier boards and daily management setup so we can discuss next steps.
```

**Reference (what the training data says):**

```
I'd like to hear which shifts still need tier boards and daily management stood up first. Let me know a good time to talk it through.
```

---

### 5. `cover_open`

<details><summary>prompt</summary>

```
Write the opening 1-2 sentences of a cover letter for the WMS Solutions Analyst role at Kettlebridge Depot. The posting describes their Sparks campus as three buildings running on one warehouse management instance, where cold-chain rules make every configuration change riskier than in dry goods. Hook on that specific detail.
```

</details>

**CareerOps-4B:**

```
Kettlebridge's Sparks campus runs three buildings on one WMS instance, and cold-chain rules make every configuration change riskier than in dry goods. That's the kind of configuration risk I'd want to be working on.
```

**Base Gemma 4 E2B:**

```
Here are a few options for the opening 1-2 sentences, depending on the tone you want to strike:

**Option 1 (Direct & Analytical):**
> I was immediately drawn to the WMS Solutions Analyst role at Kettlebridge Depot because the complexity of managing a single warehouse instance across three buildings, especially with the inherent risk of cold-chain configurations, presents a unique and compelling analytical challenge. My experience in [mention a relevant skill/area] aligns perfectly with the need to ensure precision and mitigate risk in this environment.

**Option 2 (Enthusiastic & Problem-Solving Focused):**
> The prospect of optimizing a warehouse management system where cold-chain integrity dictates every configuration change is precisely the type of high-stakes problem I thrive on solving. I am eager to apply my background in [mention a relevant skill/area] to ensure the efficiency and compliance of the Sparks campus operations.

**Option 3 (Concise & Role-Specific):**
> My background in [mention a relevant skill/area] has prepared me to tackle the specific challenges of a multi-building, cold-chain WMS environment, which I understand is central to the Kettlebridge Depot's operations. I am confident I can contribute immediately to ensuring the stability and accuracy of your warehouse management instance.
```

**Reference (what the training data says):**

```
Running three buildings on one WMS instance is hard enough before cold-chain rules make every configuration change riskier. That's the kind of environment where I'd want to work at Kettlebridge Depot.
```

---

### 6. `cover_proof`

<details><summary>prompt</summary>

```
For my Rowanmere Health Technologies Director of Client Experience cover letter, write one proof-point paragraph connecting this fact — I cut time-to-value for new enterprise accounts from 74 days to 38 through a redesigned onboarding program — to the posting's requirement for designing an onboarding program that shortens time-to-value in a measurable way.
```

</details>

**CareerOps-4B:**

```
I cut time-to-value for new enterprise accounts from 74 days to 38 through a redesigned onboarding program — the exact onboarding redesign this role is hiring to shorten time-to-value in a measurable way.
```

**Base Gemma 4 E2B:**

```
Here is a proof-point paragraph tailored for your cover letter:

"My experience directly aligns with your requirement for designing an onboarding program that shortens time-to-value in a measurable way. As Director of Client Experience, I redesigned the entire onboarding process for new enterprise accounts, successfully cutting the time-to-value from an average of 74 days down to just 38 days. This initiative demonstrates my capability to not only design effective, streamlined programs but also to implement them with clear, quantifiable results that directly impact client success metrics."
```

**Reference (what the training data says):**

```
Rowanmere wants time-to-value shortened in a measurable way, and that's precisely what a redesigned onboarding program did on my team: 74 days down to 38 for new enterprise accounts. That's the kind of measurable result I'd bring to Rowanmere's implementation handoff.
```

---

### 7. `followups`

<details><summary>prompt</summary>

```
Quillbase, Director of Product, Automation — interview stage, A fit, 90% match, product-sense panel 11 days ago, ghost risk medium, tailored docs yes.
```

</details>

**CareerOps-4B:**

```
Eleven days at interview stage with tailored docs is the longest you'll ever be in this board. Medium ghost risk means the risk is real, not a guess. Send a note today: "Quillbase's automation panel is a product-sense panel, and I'd like to hear what you're thinking." That's the only thing you can do.
```

**Base Gemma 4 E2B:**

```
Here is the summary and action plan based on the information provided:

**Candidate Profile Snapshot:**

* **Target Role:** Director of Product, Automation at Quillbase
* **Interview Stage:** Interview stage
* **Fit Assessment:** 90% match (Strong fit)
* **Feedback:** Product-sense panel interview 11 days ago.
* **Risk Assessment:** Ghost risk - Medium
* **Action Taken:** Tailored documentation was provided (Yes).

**Next Steps & Action Plan:**

1. **Review Interview Feedback:** Analyze the feedback from the product-sense panel to identify specific areas of strength and potential gaps.
2. **Prepare for Next Stage:** Based on the feedback, develop targeted talking points and case studies that directly address the product-sense panel's perspective on automation and product strategy.
3. **Tailor Materials:** Ensure all future materials (e.g., follow-up responses, case studies) explicitly map past experience to the requirements of the Director of Product, Automation role at Quillbase.
4. **Board Organization:** Ensure the candidate's board is organized to easily pull relevant experience for the next round of discussions.
5. **Follow-up Strategy:** Determine the appropriate, professional follow-up cadence for the next stage.

**What should you work on today?**

* **Task:** Draft 3-5 specific, high-impact STAR method stories that demonstrate product vision and strategic thinking related to automation, specifically framed for a Director of Product role.
* **Goal:** Prepare concrete evidence to counter any potential weak points identified in the product-sense panel interview.

**Do you have any specific job descriptions or materials you would like me to review now?**
```

**Reference (what the training data says):**

```
Eleven days after a product-sense panel with nothing back means the loop stalled somewhere internal, not on you. Write the recruiter Monday and ask a question they can actually answer: whether the role is still moving and what the next step would be. Skip any restatement of your enthusiasm — at an A and 90 percent, that's established. One message, then two weeks of quiet before you consider another.
```

---

### 8. `jd_parsing`

<details><summary>prompt</summary>

```
Parse the posting below into JSON — company, title, seniority, location, requirements. Just the JSON object, no explanation.

Ready to apply? Click below.

Sunderly is hiring: Principal Product Manager, Platform APIs
Location: Remote (US)
Level: Senior individual contributor

What you'll need:
- Written communication that stands on its own, because half this company is asynchronous
- SQL and analytics fluency; we expect PMs to pull their own adoption numbers
- Prior work with a developer relations or solutions engineering function is a plus

More jobs at this company →
```

</details>

**CareerOps-4B:**

```
{"company": "Sunderly", "title": "Principal Product Manager, Platform APIs", "seniority": "Senior individual contributor", "location": "Remote (US)", "requirements": ["Written communication that stands on its own, because half this company is asynchronous", "SQL and analytics fluency; we expect PMs to pull their own adoption numbers", "Prior work with a developer relations or solutions engineering function is a plus"]}
```

**Base Gemma 4 E2B:**

```
```json
{
  "company": "Sunderly",
  "title": "Principal Product Manager, Platform APIs",
  "seniority": "Senior individual contributor",
  "location": "Remote (US)",
  "requirements": [
    "Written communication that stands on its own, because half this company is asynchronous",
    "SQL and analytics fluency; we expect PMs to pull their own adoption numbers",
    "Prior work with a developer relations or solutions engineering function is a plus"
  ]
}
```
```

**Reference (what the training data says):**

```
{"company": "Sunderly", "title": "Principal Product Manager, Platform APIs", "seniority": "Senior individual contributor", "location": "Remote (US)", "requirements": ["Written communication that stands on its own, because half this company is asynchronous", "SQL and analytics fluency; we expect PMs to pull their own adoption numbers", "Prior work with a developer relations or solutions engineering function is a plus"]}
```

---

### 9. `match_grading`

<details><summary>prompt</summary>

```
Grade this candidate against this role. Return ONLY JSON, no other text: {"score":int,"summary":"...","strengths":[...],"gaps":[...]}

ROLE: Tessellate Software - VP, Customer Success (VP; construction project accounting for general contractors; $90M ARR)
NEEDS: led a CS organisation of 25+; ownership of a gross retention number; moved retention where churn had structural causes; CSM segmentation and capacity models; Gainsight as system of record; carried or designed an expansion quota; vertical software preferred; hire two directors; present retention to the board quarterly
CANDIDATE: Simone Aguilar - Head of Customer Success.
- Leads a 31-person customer success organisation covering $74M ARR
- Gross revenue retention 87% to 94% across a 900-account book
- Rebuilt onboarding, time-to-value 74 days to 38
- Health-scoring model predicts churn 90 days out at 71%
- Segment pods lifted CSM capacity 22 to 34 accounts
- Expansion revenue $4.1M to $12.6M after a CSM quota; no board exposure
SKILLS: Gainsight, segmentation strategy
```

</details>

**CareerOps-4B:**

```
{"score": 80, "summary": "Strong fit on the customer-success-leadership side, but the expansion quota and board-facing retention this VP role owns are missing.", "strengths": ["CS organisation size and scope match exactly: 31 people covering $74M ARR", "Gross retention 87% to 94% is a strong retention number", "Moved retention where churn had structural causes, with a 90-day health-scoring model at 71%", "CSM segmentation and capacity models are proven: segment pods lifted capacity from 22 to 34 accounts", "Gainsight is the system of record, and she has built it", "Vertical software experience is not shown, but the CSM model is transferable"], "gaps": ["No expansion quota carried or designed, and the role carries one", "No board exposure; retention is presented quarterly to the board"]}
```

**Base Gemma 4 E2B:**

```
```json
{
  "score":85,
  "summary": "Simone has strong, relevant experience in scaling CS organizations, managing large ARR books, and driving retention/expansion. The experience with segmentation, health scoring, and Gainsight aligns well with the needs. The main gap is the lack of direct board-level presentation experience.",
  "strengths": [
    "Leads a large CS organization (31 people) covering a significant ARR ($74M).",
    "Demonstrated success in gross revenue retention (87% to 94%).",
    "Experience in rebuilding onboarding/time-to-value, showing operational improvement.",
    "Developed a predictive health-scoring model for churn (90 days out at 71%).",
    "Proven ability to scale CSM capacity (lifting capacity from 22 to 34 accounts).",
    "Direct experience with expansion revenue, including setting and exceeding a quota ($4.1M to $12.6M).",
    "Proficiency in Gainsight and segmentation strategy."
  ],
  "gaps": [
    "Lacks explicit experience presenting retention metrics to a board quarterly.",
    "The candidate has no stated experience hiring or managing direct reports (needs to confirm if they managed directors/VPs).",
    "The role requires vertical software experience; this is not specified in the candidate's profile.",
    "The candidate explicitly states 'no board exposure', which is a direct mismatch for a key requirement."
  ]
}
```
```

**Reference (what the training data says):**

```
{"score":83,"summary":"She has run this job at slightly smaller scale and moved the number that matters. Board exposure and the vertical are the gaps.","strengths":["A 31-person customer success organisation clears the stated 25+ threshold","Gross retention ownership is explicit: 87% to 94% across a 900-account book","Churn had structural causes; onboarding rebuilt, time-to-value 74 days to 38","Segmentation and capacity modelling proven: segment pods lifted CSM capacity 22 to 34","Gainsight is core, health scoring predicts churn 90 days out at 71%, and expansion grew $4.1M to $12.6M"],"gaps":["No board presentation experience; this role reports retention to the board quarterly","Construction project accounting and general contractors are outside her record; vertical software preferred","Her book is $74M against a $90M business, and hiring two directors is untested"]}
```

---

### 10. `prioritisation`

<details><summary>prompt</summary>

```
Just three and I'm stuck on all of them.
Fenwick Housing Institute · Senior Research Associate, Housing Policy · interview · B+ · 80% · 5 days · low · yes
Foothill Community Health Alliance · Grants Manager · applied · A- · 85% · 24 days · high · yes
Ninebark Regional Water Authority · Capital Programs Director · researched · C · 63% · 11 days · medium · no
```

</details>

**CareerOps-4B:**

```
Three roles, three statuses.
Ninebark is the one to drop. C, 63%, eleven days researched, no tailored docs — it's a dead thread.
Foothill is the real one: A-, 85%, 24 days applied, high ghost risk. Write the follow-up this week.
Fenwick is the tiebreaker. B+, 80%, five days at interview, low risk. Send the docs you've been told you'd be using.
If you can't get a decision from Fenwick by Friday, that's when you decide whether to let the board sit or move it.
```

**Base Gemma 4 E2B:**

```
Here is an analysis of your current job search status:

## Job Search Status Summary

| Role | Status | Grade | Score | Progress | Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fenwick Housing Institute** (Senior Research Associate, Housing Policy) | Interview | B+ | 80% | 5 days | **Focus on interview preparation/follow-up.** |
| **Foothill Community Health Alliance** (Grants Manager) | Applied | A- | 85% | 24 days | **Follow up on application status.** |
| **Ninebark Regional Water Authority** (Capital Programs Director) | Researched | C | 63% | 11 days | **Re-evaluate fit or pivot strategy.** |

---

## Recommendations & Action Plan

### 1. Fenwick Housing Institute (Senior Research Associate, Housing Policy) - **Priority: High**

*   **Grade Analysis (B+ / 80%):** This is a strong signal. You are competitive, but there is room for refinement to secure the offer.
*   **Action Today:**
    *   **Prepare for the next stage:** Identify 3-5 specific, high-level policy questions related to housing research that you can answer using your past experience.
    *   **Draft a tailored talking track:** Ensure your narrative directly connects your past research/policy work to the specific needs of the Fenwick Institute.
    *   **Follow-up:** If you haven't already, send a brief, professional thank-you note reiterating your interest and offering a specific, relevant thought on a recent topic in their field.

### 2. Foothill Community Health Alliance (Grants Manager) - **Priority: Medium**

*   **Grade Analysis (A- / 85%):** Excellent performance. You are a strong candidate.
*   **Action Today:**
    *   **Chase Status:** Send a polite, professional follow-up email to the contact person regarding the timeline for the Grants Manager role.
    *   **Preparation:** If the interview is imminent, prepare specific examples of grant management, budget tracking, and stakeholder communication from your past roles to showcase readiness for the Grants Manager duties.

### 3. Ninebark Regional Water Authority (Capital Programs Director) - **Priority: Low/Strategic**

*   **Grade Analysis
```

**Reference (what the training data says):**

```
First, Fenwick Housing Institute — five days into an interview, B+/80%, docs already tailored. Prepare for it; nothing else here has a date attached.
Second, Foothill Community Health Alliance. A-/85% is the better fit, and it still ranks below an interview: 24 days applied at high ghost risk means the file is cold. Send one follow-up and treat silence as an answer.
Third, Ninebark Regional Water Authority. C/63%, eleven days researched, no docs — a capital programs directorship is a different career, not a next step.
Drop Ninebark. Then source two more housing-policy roles; a three-role board can't absorb a single no.
```

---

### 11. `resume_analysis`

<details><summary>prompt</summary>

```
Quick fit check. My role: Warehouse Systems Analyst, 780,000 square-foot fulfillment center, 52,000 units a day. I led the labor management system configuration giving the site engineered standards on 14 activity types, reduced cycle-count variance from 1.9% to 0.4% by moving to daily ABC counting, and ran the wave-planning redesign that cut late-cutoff order miss rate from 3.1% to 0.6%. I documented 22 SOPs that became the template for two sister sites. The job: WMS Solutions Analyst at Kettlebridge Depot, Sparks, NV - configuring WMS changes in staging before they hit the floor, taking over reporting, and being first escalation for scanning and conveyor issues.
```

</details>

**CareerOps-4B:**

```
Strong fit on the core work. Your labor-management background is a direct match for the labor-management system configuration this role wants, and the cycle-count and wave-planning results show you can translate a process change into a measurable improvement. The documentation work also lines up with the SOP-template work this posting mentions. The gap is the WMS-specific part: nothing here shows you configuring a WMS, staging logic, or scanning/conveyor troubleshooting, which is the main technical ask of this role.
```

**Base Gemma 4 E2B:**

```
Here is your quick fit check:

**Overall Fit Assessment: Strong Potential**

**Alignment Breakdown:**

*   **Warehouse Systems Analyst (Your Experience):**
    *   **Strengths:** Deep, quantifiable experience in WMS/system configuration, process improvement (cycle-count variance reduction, wave-planning redesign), SOP development, and cross-site standardization.
    *   **Key Skills:** System configuration, process optimization, data-driven problem-solving, documentation.
*   **WMS Solutions Analyst (Target Role):**
    *   **Requirements:** Configuring WMS changes in staging, taking over reporting, first escalation for scanning/conveyor issues.
    *   **Key Skills:** WMS configuration/change management, operational troubleshooting, reporting, escalation management.

**How You Fit:**

Your experience directly maps to the core functions of the target role.

*   **Configuration/Change Management:** Your work configuring the labor management system and redesigning wave-planning shows you can handle system changes.
*   **Operational Troubleshooting/Escalation:** Your role as the first point of contact for system-related issues (implied by leading system configuration) aligns well with being the first escalation point for scanning and conveyor issues.
*   **Reporting:** You have experience driving metrics (cycle-count variance, order miss rate), which translates directly to taking over and managing reporting.

**Actionable Next Steps for Tailoring:**

1.  **Resume Focus:** Reframe your achievements to emphasize **WMS configuration/change implementation** rather than just "labor management system configuration." Use language like "configured WMS changes," "managed system rollout," and "optimized workflow logic."
2.  **Cover Letter Focus:** Directly map your success in reducing error rates (3.1% to 0.6%) to the need for operational stability and accuracy in the new role. Highlight your ability to handle system-level issues (scanning/conveyor) as a proven escalation point.

**Next Step for CareerOps:**

To proceed, please provide the **specific job description** for the WMS Solutions Analyst role at Kettlebridge Depot. I will then:

1.  Parse the JD for required keywords and priorities.
2.  Draft a **tailored resume summary** and a **draft cover letter** using *only* the experience you provided.
3.  Organize your current job board/pipeline.
4.  Determine the **top 3
```

**Reference (what the training data says):**

```
Direct match: your wave-planning redesign and cycle-count accuracy work map exactly to their task-interleaving and inventory accuracy requirements, and writing 22 SOPs that became a template for two sister sites shows the documentation habit this role needs for training supervisors. Your labor management system configuration also covers ground they value. Gap: their environment is cold-chain and lot-tracking specific, which your background doesn't show experience with, though the JD notes they'll train for it. Confirm availability for occasional weekend cutovers and second-shift reachability, both explicitly required.
```

---

### 12. `resume_summary`

<details><summary>prompt</summary>

```
Write a general resume summary for Anneke Ruzicka, Production Manager in Cedar Rapids, IA, leading with achievements. Use these facts: she raised line throughput 21% by rebalancing the changeover sequence and standardizing two shift-handoff routines, cut changeover time from 78 minutes to 34 using SMED across 7 format changes, and improved schedule attainment from 82% to 96% over three quarters.
```

</details>

**CareerOps-4B:**

```
Production Manager who raises throughput and schedule attainment by rebalancing changeover sequences and standardizing shift-handoff routines. Cut changeover time from 78 minutes to 34 using SMED across 7 format changes, and improved schedule attainment from 82% to 96% over three quarters.
```

**Base Gemma 4 E2B:**

```
Here are a few options for Anneke Ruzicka's resume summary, tailored to highlight her achievements. Choose the one that best fits the tone of the roles she is targeting.

---

### Option 1: Achievement-Focused & Impact-Driven (Strongest for Operations/Continuous Improvement roles)

**Highly accomplished Production Manager with a proven record of driving significant operational efficiency and performance improvement in manufacturing environments. Expertise in Lean methodologies, SMED, and process rebalancing. Successfully increased line throughput by 21% and drastically reduced changeover time from 78 minutes to 34 minutes across seven format changes. Consistently improved schedule attainment from 82% to 96% within three quarters, demonstrating a strong commitment to operational excellence and reliable output.**

### Option 2: Concise & Metric-Heavy (Good for quick scanning by recruiters)

**Results-oriented Production Manager specializing in process optimization and throughput maximization. Achieved measurable results by rebalancing changeover sequences, cutting changeover time by 55% (from 78 min to 34 min) using SMED. Drove schedule reliability, increasing attainment from 82% to 96% over three quarters. Seeking roles where operational excellence and quantifiable process improvement are key drivers.**

### Option 3: Role-Specific (Good if targeting roles focused on leadership and process design)

**Production Manager skilled in leading cross-functional teams to implement high-impact process improvements. Expertise includes SMED application for rapid changeover reduction and standardization of shift routines to enhance operational consistency. Successfully elevated line throughput by 21% and improved schedule adherence from 82% to 96%. Adept at transforming complex production challenges into streamlined, high-performing operations.**

---

**Recommendation:** **Option 1** is the most comprehensive as it uses strong action verbs and clearly links the actions (rebalancing, standardizing) to the impressive results (throughput increase, time reduction, attainment improvement).
```

**Reference (what the training data says):**

```
Raised line throughput 21% by rebalancing the changeover sequence and standardizing two shift-handoff routines. Cut changeover time from 78 minutes to 34 using SMED across 7 format changes, and improved schedule attainment from 82% to 96% over three quarters. Consistent record of moving floor metrics through operator-level process changes.
```

---

### 13. `search_strategy`

<details><summary>prompt</summary>

```
All C fits. I am a clinical lab scientist in Madison moving into healthcare data analysis. Titles 'data analyst'. Keywords 'SQL, Power BI, Python'. Locations 'Madison'. I get generic analyst roles at insurance and marketing firms that want three years as an analyst.
```

</details>

**CareerOps-4B:**

```
Your titles and keywords are the problem, not the location. 'Clinical laboratory scientist' is a title that gets filtered out by every data analyst posting, and 'SQL, Power BI, Python' is the exact stack most of those roles list as a preference, not a requirement. Change titles to 'clinical laboratory scientist, laboratory scientist, clinical laboratory analyst' and add 'laboratory quality, CLIA, CAP, accreditation' to keywords. Then search 'healthcare data analyst' and 'clinical laboratory analyst' in your region. That is where the roles actually are.
```

**Base Gemma 4 E2B:**

```
Understood. I am your CareerOps assistant. My goal is to help you transition from a Clinical Lab Scientist to a Healthcare Data Analyst, specifically targeting roles in Madison, focusing on SQL, Power BI, and Python.

Here is the plan to get started:

### Phase 1: Assessment & Foundation

**1. Current Profile Assessment (What I need from you):**
To start, please provide me with the following:
* **Your current resume (or a summary of your experience/achievements).**
* **A list of 3-5 specific projects, tasks, or achievements from your clinical lab work that involved:**
    * Data collection/management.
    * Identifying trends or anomalies.
    * Using any tools (even basic Excel functions) that relate to data manipulation.
* **Any specific coursework, certifications, or personal projects you have done related to SQL, Power BI, or Python.**

**2. Target Market Analysis (What I will do):**
Once I have your background, I will:
* **Parse 5-10 current job postings** for "Data Analyst" roles in Madison/Wisconsin healthcare/insurance sectors.
* **Identify the exact required skill overlap** between your clinical background and the required technical skills (SQL, Power BI, Python).
* **Create a "Skill Gap Analysis"** to pinpoint exactly what you need to emphasize or learn to bridge the gap between your current experience and the target roles.

**3. Strategy Outline (What we will build):**
We will focus on three core areas:
* **Resume Transformation:** Rewriting your clinical experience to frame lab work as data-driven problem-solving.
* **Portfolio Development:** Identifying 2-3 small, relevant projects you can build to showcase SQL/Power BI/Python proficiency.
* **Targeted Outreach:** Developing a strategy for applying to roles that value domain knowledge (Clinical/Lab) combined with technical skills.

**What is the first piece of information you can provide?**
```

**Reference (what the training data says):**

```
Generic analyst titles hide the one thing that makes you competitive, which is that you already work inside a hospital. Change titles to 'healthcare data analyst, clinical informatics analyst, clinical data analyst' and add 'laboratory, Epic, HL7, turnaround time, HIPAA' to keywords. That flips your lab background from a gap into the qualification. Add 'Remote, Milwaukee' to locations. Three runs a day on that set. Health systems and specialty clinic networks run their own hiring pages and list there first, so check every system within an hour of Madison directly and use Add role for anything the scan missed.
```

---

### 14. `skills_filter`

<details><summary>prompt</summary>

```
Considering a home infusion operations role and want help narrowing my skills list. Full list:

clinical operations, Epic (Ambulatory, Cadence), staffing and scheduling, patient throughput, Lean healthcare, root cause analysis, Joint Commission readiness, infection control, nurse retention programs, capacity planning, budget ownership, quality metrics (HCAHPS), policy authoring, interdisciplinary rounding, vendor negotiation, change management, RN licensure (Ohio)

The role is Operations Manager, Home Infusion at Wexley Care Partners in Columbus, hybrid, covering about 2,600 active patients and 70 field nurses across two states. They want 5 years in healthcare operations with at least two managing clinical or field staff, scheduling and capacity planning for a mobile workforce, experience rebuilding a workflow that crosses pharmacy, clinical, and intake teams, familiarity with infusion therapy or home health regulatory requirements, comfort owning productivity and quality dashboards, and a real focus on retention since field nurse turnover is their biggest cost driver. Which skills are relevant here?
```

</details>

**CareerOps-4B:**

```
clinical operations, staffing and scheduling, patient throughput, Lean healthcare, root cause analysis, nurse retention programs, capacity planning, budget ownership, quality metrics (HCAHPS), policy authoring, interdisciplinary rounding, vendor negotiation
```

**Base Gemma 4 E2B:**

```
Here is an analysis of your skills against the requirements for the Operations Manager, Home Infusion role at Wexley Care Partners, followed by recommendations on which skills to emphasize.

### Skill Relevance Analysis

| Your Skill | Relevance to Job Requirements | Assessment |
| :--- | :--- | :--- |
| **Clinical Operations** | Directly relevant to managing the operational flow of home infusion. | **High** |
| **Epic (Ambulatory, Cadence)** | Relevant for understanding the EMR/system used for patient management. | **High** |
| **Staffing and Scheduling** | Directly addresses the need for scheduling a mobile workforce and managing field nurses. | **High** |
| **Patient Throughput** | Directly addresses capacity planning and managing the volume of 2,600 patients. | **High** |
| **Lean Healthcare** | Relevant for rebuilding workflows and improving efficiency. | **High** |
| **Root Cause Analysis** | Relevant for identifying and solving operational bottlenecks. | **Medium-High** |
| **Joint Commission Readiness** | Relevant for regulatory compliance in a healthcare setting. | **Medium** |
| **Infection Control** | Standard requirement, relevant for home care operations. | **Medium** |
| **Nurse Retention Programs** | **Crucial.** Directly addresses the requirement to focus on retention as a major cost driver. | **High (Must Emphasize)** |
| **Capacity Planning** | Directly addresses the need for capacity planning for a mobile workforce. | **High** |
| **Budget Ownership** | Relevant for operational management and cost control. | **Medium-High** |
| **Quality Metrics (HCAHPS)** | Directly addresses the need to own productivity and quality dashboards. | **High** |
| **Policy Authoring** | Relevant for creating standardized processes. | **Medium** |
| **Interdisciplinary Rounding** | Relevant for rebuilding workflows that cross pharmacy, clinical, and intake teams. | **High** |
| **Vendor Negotiation** | Relevant for managing external relationships (e.g., vendors, potentially staffing agencies). | **Medium** |
| **Change Management** | Relevant for rebuilding workflows. | **High** |
| **RN Licensure (Ohio)** | A baseline requirement, not a core operational skill, but necessary for context. | **Low (Baseline)** |

---

### Recommended Skill Prioritization for Your Job Search

To maximize your fit
```

**Reference (what the training data says):**

```
["clinical operations", "staffing and scheduling", "capacity planning", "quality metrics (HCAHPS)", "nurse retention programs", "change management", "RN licensure (Ohio)"]
```

---

### 15. `stage_moves`

<details><summary>prompt</summary>

```
Vandry Surgical, Supplier Quality Engineer II. Fourteen days in conversation, A- fit, 85% match, ghost risk low, docs ready. The recruiter said this morning that the posting is live and I should submit through it.
```

</details>

**CareerOps-4B:**

```
Fourteen days in conversation with a recruiter who says the posting is live is a sign the process has stalled, not that it's dead. Send the tailored resume and cover letter today, and ask specifically to bypass the recruiter and go to the hiring manager. A- at 85% with docs ready is the strongest case you have.
```

**Base Gemma 4 E2B:**

```
Here is the action plan based on the information provided:

**1. Job Application Strategy:**

*   **Action:** Submit the application for the "Supplier Quality Engineer II" role at Vandry Surgical immediately.
*   **Focus:** Ensure the submitted materials (resume/cover letter) are highly tailored to the requirements of the job description, leveraging the 85% match.

**2. Next Steps for You (The Candidate):**

*   **Task 1 (Immediate):** Confirm the exact link/portal where the posting is live.
*   **Task 2 (Preparation):** Review the job description one last time to ensure your submitted materials directly address the key responsibilities and required skills.
*   **Task 3 (Follow-up Prep):** Prepare for potential screening calls by solidifying your talking points based on your experience matching the role.

**3. CareerOps Tracking Update:**

*   **Role:** Supplier Quality Engineer II, Vandry Surgical
*   **Fit Score:** A- (85% Match)
*   **Risk Assessment:** Ghost risk low.
*   **Status:** Application submission pending.
*   **Next Action for CareerOps:** Once submitted, track the application status and prepare for the next stage (e.g., screening call).

**What would you like me to do next?** (e.g., Draft a tailored cover letter based on your experience, or set a follow-up reminder.)
```

**Reference (what the training data says):**

```
Recruiter told you to submit, so conversation → applied. Fourteen days of back-and-forth with docs already ready is long enough. Apply through the live posting today and email the recruiter the confirmation — an A- at 85% should not get lost in an applicant queue.
```

---

### 16. `board_triage`

<details><summary>prompt</summary>

```
everything on my board has gone quiet and I hate opening it. cinderpeak resorts SVP revenue and distribution, conversation, A-, 86%, 33 days, ghost risk high, docs ready. wanderfare group senior manager revenue science, applied, B, 64%, 41 days, high, docs ready. loftwren senior manager pricing and analytics, applied, B, 61%, 38 days, medium, yes. sablewood resorts group director of revenue strategy, researched, B+, 77%, 22 days, low, no.
```

</details>

**CareerOps-4B:**

```
Nothing is quiet because nothing is open. Cinderpeak is the only real thing here: conversation, A-, 86%, docs ready, 33 days, high ghost risk. Write the follow-up today.
Wanderfare at 64% and 41 days is a real risk, but it's not a ghost risk yet — docs are ready, so it's a one-day nudge, not a week-long chase.
Loftwren at 61% and 38 days is the one to drop.
Sablewood at 77% and 22 days is the only role worth keeping.
```

**Base Gemma 4 E2B:**

```
Here is an analysis and action plan based on your current board status:

## Board Analysis Summary

| Role | Status | Score | Time Since Last Activity | Risk Level | Next Step Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cinderpeak Resorts SVP Revenue & Distribution** | Conversation | A- | 33 days | High (Ghost Risk) | **High Priority Follow-up.** Need to re-engage. |
| **Wanderfare Group Senior Manager Revenue Science** | Applied | B | 41 days | High | **Medium Priority Follow-up.** Need to gauge interest. |
| **Loftwren Senior Manager Pricing & Analytics** | Applied | B | 38 days | Medium | **Medium Priority Follow-up.** Need to confirm next steps. |
| **Sablewood Resorts Group Director of Revenue Strategy** | Researched | B+ | 22 days | Low | **Low Priority Nurture.** Keep on the radar, but not an immediate push. |

---

## Action Plan for Today

**Today's Focus: Re-engagement & Information Gathering**

1. **Cinderpeak Resorts (High Priority):**
    * **Action:** Send a brief, value-driven follow-up email. Focus on a specific recent industry trend or a relevant insight you have that connects to their current challenges in revenue/distribution.
    * **Goal:** Re-open the conversation and determine if they are still actively looking or if the timing is off.

2. **Wanderfare Group (Medium Priority):**
    * **Action:** Send a brief, low-pressure check-in. Ask a specific, open-ended question about their current priorities in revenue science.
    * **Goal:** Gauge current interest level without demanding an immediate commitment.

3. **Loftwren (Medium Priority):**
    * **Action:** Send a brief note confirming your interest and asking if they have any updates on their internal process or timeline.
    * **Goal:** Confirm if they are still in the running or if they have moved forward internally.

4. **Sablewood Resorts (Low Priority):**
    * **Action:** **No immediate action.** Keep the file organized. Schedule a reminder to check in again in 3-4 weeks, or wait for a new relevant role to surface.

---

**Next Steps for
```

**Reference (what the training data says):**

```
Thirty-three quiet days at Cinderpeak is the number that matters, and it's still your best role — A-, 86%, docs already built. Go around the recruiter today and ask a cruise contact for a warm intro to the commercial lead.
Sablewood is second: B+, 77%, 22 days in researched, no docs. Build them and apply this week.
Wanderfare and Loftwren are both B-grade, 64% and 61%, past 38 days with everything already sent. Two down-level roles don't earn a fourth touch. Stop spending on them.
```

---

### 17. `bullet_rewrite`

<details><summary>prompt</summary>

```
Trying to punch up this bullet for a Vice President, Risk Analytics application at Northfell Capital Partners: "Manages 12 analysts and data scientists across strategy, modelling and portfolio monitoring." They're consolidating three fractured analytics groups into one function. Give me a stronger version.
```

</details>

**CareerOps-4B:**

```
Manages 12 analysts and data scientists across strategy, modelling and portfolio monitoring — the exact function Northfell is consolidating from three fractured groups.
```

**Base Gemma 4 E2B:**

```
Here are a few stronger options, depending on the specific angle you want to emphasize for a VP, Risk Analytics role. Choose the one that best aligns with the core competencies of the job description you are targeting:

**Option 1: Emphasizing Leadership & Transformation (Strongest for a consolidation role)**

> "Led and scaled a cross-functional team of 12 analysts and data scientists, successfully consolidating three disparate analytics functions into a unified, high-performing risk analytics unit."

**Option 2: Emphasizing Scope & Impact (Good for showing breadth of responsibility)**

> "Directed a team of 12 analysts and data scientists, overseeing strategy, quantitative modeling, and portfolio monitoring to drive data-informed risk decision-making across the firm."

**Option 3: Emphasizing Strategic Oversight (Good for a VP level)**

> "Provided strategic oversight and management for 12 analysts and data scientists, ensuring the integrity and standardization of risk analytics processes across strategy, modeling, and portfolio monitoring."

**Why these are stronger:**

* **Action Verbs:** They start with strong verbs (Led, Directed, Provided) instead of the passive "Manages."
* **Quantifies the Achievement:** They explicitly state the *result* of the management (consolidation, standardization, driving decision-making).
* **Elevates the Role:** They shift the focus from *managing people* to *managing a function/strategy*.

**Recommendation:** **Option 1** is the most powerful for a role involving organizational change, as it directly addresses the "consolidating three fractured groups" context.
```

**Reference (what the training data says):**

```
Manages 12 analysts and data scientists across strategy, modelling and portfolio monitoring — team-building at the scale this VP role needs to merge three fractured analytics groups into one.
```

---

### 18. `bullet_select`

<details><summary>prompt</summary>

```
Here is my full bullet list, followed by a role I'm targeting. Return only a JSON array of the bullet IDs I should keep for this JD. Do not rank them.

1. Directs operations for 210 specialty stores across 14 states, $1.1B in annual sales and about 4,800 employees.
2. Improved four-wall operating margin 2.4 points over three years without closing stores.
3. Cut chain-wide shrink from 1.9% to 1.1%, worth roughly $8.8M a year.
4. Rolled out a new labor model to all 210 stores, saving 340,000 annual hours while lifting mystery-shop scores from 81 to 92.
5. Reduced store manager turnover from 34% to 19% by rebuilding onboarding and the bonus structure.
6. Launched buy-online-pickup-in-store across the fleet in 5 months, now 14% of digital orders.
7. Consolidated 31 operational reports into a single daily scorecard used by 12 district managers.
8. Owns a $92M store operating expense budget.
9. Led the pilot and rollout of a mobile task-management app; task completion visibility went from unmeasured to 94%.
10. Opened 38 new stores over four years with average time-to-plan-sales of 7 months against a 10-month target.
11. Built the succession pipeline that filled 11 of 14 district manager openings internally.

Which should I highlight first for this one?
```

</details>

**CareerOps-4B:**

```
[1, 2, 3, 4, 6, 7, 8, 10]
```

**Base Gemma 4 E2B:**

```
Please provide the job description you are targeting.
```

**Reference (what the training data says):**

```
[1, 4, 6, 7, 9]
```

---

### 19. `cover_close`

<details><summary>prompt</summary>

```
For my Rowanmere Health Technologies Director of Client Experience cover letter, write the closing 1-2 sentences. The posting says the role runs quarterly business reviews for the twenty largest health system relationships. Ask specifically to discuss those reviews.
```

</details>

**CareerOps-4B:**

```
I'd welcome a conversation about how the quarterly business reviews for the twenty largest health system relationships are currently run.
```

**Base Gemma 4 E2B:**

```
Here are a few options for the closing 1-2 sentences, depending on the tone you want to strike:

**Option 1: Direct and Action-Oriented**

> I am eager to discuss how my experience leading quarterly business reviews for major health system relationships aligns with your needs. I look forward to the opportunity to detail my approach to managing those high-stakes reviews.

**Option 2: Confident and Focused**

> I welcome the chance to elaborate on my success in managing quarterly business reviews for large health systems. I am available to schedule a conversation to explore how I can immediately drive success in this area.

**Option 3: Brief and Enthusiastic**

> I am very keen to discuss the specifics of running your quarterly business reviews for the twenty largest health system relationships. Thank you for your consideration; I look forward to hearing from you soon.
```

**Reference (what the training data says):**

```
I'd appreciate a conversation about how quarterly business reviews for your twenty largest health system relationships are structured today.
```

---

### 20. `cover_open`

<details><summary>prompt</summary>

```
Write cover_open (≤50 words, 1-2 sentences) for Colby Iyengar, a Kansas City high school math teacher applying to the Data Analyst I, Lending opening at Prairiestone Credit Group. Hook on this line from the posting: 'Would rather hire someone who reasons carefully and writes clearly than someone with two extra years of tooling experience; has hired career changers into this team twice before.' No resume recap, no generic openers like 'I am excited to apply.'
```

</details>

**CareerOps-4B:**

```
I'd rather hire someone who reasons carefully and writes clearly than someone with two extra years of tooling experience — that's the kind of hiring I'd want to be part of at Prairiestone.
```

**Base Gemma 4 E2B:**

```
Leverage your high school math teaching experience to demonstrate strong analytical reasoning and clear communication. My background proves I can quickly master complex data concepts and translate findings into actionable insights for lending decisions.
```

**Reference (what the training data says):**

```
Prairiestone has hired career changers into its analytics team twice before, and I'd like to be the third: a math teacher who reasons carefully with data and writes clearly enough that a room full of non-statisticians follows along.
```

---
