# CareerOps-4B — quality gate

Base: `google/gemma-4-E2B-it` · Adapter: `telivity/CareerOps-4B`

## 1. Held-out loss (70 clean val rows, answer tokens only)

| model | val loss | perplexity |
|---|---|---|
| base Gemma 4 E2B | 4.4886 | 89.0 |
| **CareerOps-4B** | **1.6773** | **5.4** |

Change: +62.6% loss vs base.

Compare val loss to final train loss in progress.json — close = generalisation; far above = memorisation.

## 2. Side-by-side generations

### 1. `app_operation`

<details><summary>prompt</summary>

```
Does editing the job description text save automatically, or do I need to click something?
```

</details>

**CareerOps-4B:**

```
It runs automatically. The text box at the top of the job posting card is the one you edit, and the "Save text" button appears when you've made a change. It saves the text to the posting without changing the job itself.
```

**Base Gemma 4 E2B:**

```
As the CareerOps assistant, I don't have a direct interface to perform actions within a job board or application system.

**To clarify what you mean, could you tell me:**

1. **What specific action are you referring to?** (e.g., editing a draft cover letter, updating a profile, modifying a job description you are reviewing?)
2. **Where are you performing this action?** (e.g., in a document, on a specific platform?)

**Generally, in our process:**

* **I provide the content (drafts, analysis, strategy).**
* **You are responsible for the final action (copying, pasting, submitting) based on my recommendations.**

If you are referring to a document I have generated for you, you will need to **copy the text** and paste it into your application system.

Let me know what you are working on, and I can tell you exactly what step you need to take!
```

**Reference (what the training data says):**

```
It autosaves — there's no save button for the JD box. Stop typing for about 800 milliseconds and CareerOps writes the text to the card; the hint then reads "· saved to the card ✓." That applies whether the JD arrived by auto-load, was pasted with no link, or is being edited afterward.
```

---

### 2. `board_triage`

<details><summary>prompt</summary>

```
Nothing has moved in three weeks and I've stopped looking at it.

role: Director, Ambulatory Operations - Marrow Ridge Health
stage: applied / fit A- / match 85% / 29 days / ghost high / docs yes

role: Operations Manager, Home Infusion - Wexley Care Partners
stage: conversation / fit B+ / match 76% / 23 days / ghost medium / docs yes

role: Clinical Informatics Analyst - Verity Ridge Health Network
stage: researched / fit B / match 67% / 34 days / ghost low / docs no

role: Associate Medical Writer - Osterby Clinical Communications
stage: sourced / fit C / match 40% / 41 days / ghost medium / docs no
```

</details>

**CareerOps-4B:**

```
Three weeks at applied with a high ghost risk is the signal, not the silence.
Marrow Ridge Health is the only role here that has gone quiet, so stop waiting for it to reply and stop waiting for anything.
Wexley Care Partners is the only live thread: 23 days into a conversation with medium risk. Send a note this week, not a follow-up.
Verity Ridge Health Network is 34 days researched at B/67% with no docs — that's a real decision point, not a ghost risk.
Osterby Clinical Communications at 41 days at C/40% is a dead thread. Close it.
Nothing is moving because nothing is being done. Pick one, write the note, and then decide what to do with the rest.
```

**Base Gemma 4 E2B:**

```
Here is your CareerOps overview and action plan.

## CareerOps Overview

**Current Status Summary:**

You have four active roles, with varying levels of engagement and fit.

*   **Director, Ambulatory Operations - Marrow Ridge Health:** High potential fit (85% match), but stalled (29 days) and currently "ghosting." This is your strongest potential target.
*   **Operations Manager, Home Infusion - Wexley Care Partners:** Strong fit (76% match), currently in the "conversation" stage (23 days), which suggests active engagement is needed to move it forward.
*   **Clinical Informatics Analyst - Verity Ridge Health Network:** Moderate fit (67% match), stalled (34 days), and "ghosting low."
*   **Associate Medical Writer - Osterby Clinical Communications:** Lower fit (40% match), stalled (41 days), and "ghosting medium."

**Key Takeaway:** You have a strong profile for operational/clinical leadership roles. The stagnation is likely due to a lack of targeted, high-impact follow-up or a mismatch in the application materials.

## How CareerOps Works

CareerOps functions as your dedicated, end-to-end job search partner. I manage the entire process for you:

1.  **Role Grading & Strategy:** I assess your profile against job requirements to determine the *actual* fit, not just the stated match percentage.
2.  **Material Tailoring:** I write highly specific, tailored résumés and cover letters using **only your real experience** to maximize relevance for each specific job.
3.  **Board Management:** I keep all job applications, notes, feedback, and materials organized in a central board.
4.  **Action Planning:** I decide precisely what you should work on *today* (e.g., "Revise the cover letter for Marrow Ridge Health focusing on X achievement").
5.  **Chasing & Follow-up:** I manage all necessary follow-up communications to keep momentum going.

**My Goal:** To move you from "applied" to "interviewing" by ensuring every application is perfectly targeted and that you are consistently engaging with the right opportunities.

---

## Today's Action Plan (What to Work On)

Based on the data, we need to prioritize the highest-potential role to break the current stagnation.

**🎯 Priority Focus: Director, Ambulatory Operations - Marrow
```

**Reference (what the training data says):**

```
Wexley is the recoverable one. Twenty-three days in conversation, but only medium ghost risk and the docs are ready. Write to your contact today and apply rather than waiting for them to restart it.
Marrow Ridge at 29 days applied and high ghost risk gets one closing note. If A- and 85% produced no reply in a month, it needs a person, not another portal check.
Verity Ridge has sat in researched 34 days with no docs. Write them or drop it, because 67% doesn't survive half-effort.
Osterby, C at 40% after 41 days: gone.
```

---

### 3. `bullet_rewrite`

<details><summary>prompt</summary>

```
Applying to Vermilion Trail Journeys for Operations Manager, Guided Travel. JD wants a per-passenger land cost built and defended line by line. My current bullet: "Cut per-passenger land cost 12% by renegotiating 31 supplier contracts and consolidating three ground handlers into one." Make it land better for this one.
```

</details>

**CareerOps-4B:**

```
Cut per-passenger land cost 12% by renegotiating 31 supplier contracts and consolidating three ground handlers into one — the per-passenger cost-defense work this operations manager role is hiring to own.
```

**Base Gemma 4 E2B:**

```
Here is a revised bullet point tailored for the Operations Manager, Guided Travel role at Vermilion Trail Journeys, focusing on building and defending a per-passenger land cost line-by-line:

**Option 1 (Focus on Cost Structure & Defense):**

> "Developed and defended a detailed, line-by-line per-passenger land cost model, resulting in a 12% reduction in cost by renegotiating 31 supplier contracts and consolidating three ground handlers into one, ensuring cost predictability for future operations."

**Option 2 (More Action-Oriented):**

> "Established a transparent, line-by-line cost structure for per-passenger land services, achieving a 12% reduction through strategic renegotiation of 31 supplier contracts and streamlining ground handler operations to build a defensible, optimized cost baseline."

**Why these work:**

*   **Addresses the JD directly:** They use language like "line-by-line," "cost model," and "defend," which mirrors the requirement.
*   **Shows Ownership:** It shifts the focus from just *doing* the cut to *building and defending* the structure.
*   **Quantifies Impact:** It keeps the strong metric (12% reduction) while framing it within the required deliverable (the cost line).

**Which one should you use?**

*   Use **Option 1** if you want to emphasize the *process* of building the model.
*   Use **Option 2** if you want to emphasize the *strategic outcome* and the *defensibility* of the cost.

Let me know what you think, or if you'd like me to draft a few more variations!
```

**Reference (what the training data says):**

```
Cut per-passenger land cost 12% by renegotiating 31 supplier contracts and consolidating three ground handlers into one — land cost built and defended line by line, exactly what this operations manager role wants.
```

---

### 4. `bullet_select`

<details><summary>prompt</summary>

```
Here are all of Yolanda Prieto's resume bullets, numbered:

1. Built the department's first grants calendar and reporting tracker; on-time federal report submission went from 76% to 100%.
2. Administers 46 active federal and state grants totaling $88M for a county health and human services department.
3. Wrote or edited 19 grant applications last cycle with a 63% award rate, above the department's 41% historical rate.
4. Serves as the department's point of contact for two federal project officers.
5. Monitors 23 subrecipients including annual risk assessments and 9 on-site reviews a year.
6. Trained 40 program staff on Uniform Guidance allowability rules.
7. Closed out 14 expired awards with full drawdown and no returned funds.
8. Cut average subrecipient invoice turnaround from 34 days to 12.
9. Recovered $2.3M in previously unbilled reimbursable costs by rebuilding the indirect-cost allocation schedule.
10. Reduced the single-audit finding count from 7 to 0 across two consecutive audit years.

They're applying to a Contracts and Procurement Manager opening at Kingsford County, Washington. The job leads a newly centralized procurement division covering about $180M a year in spend, manages complex solicitations, supervises four buyers and a contracts specialist, and prepares contract award items for the Board of Commissioners. Which bullets carry the most weight for this specific opening, in priority order?
```

</details>

**CareerOps-4B:**

```
[1, 2, 3, 10, 8]
```

**Base Gemma 4 E2B:**

```
Here is the prioritization of Yolanda Prieto's resume bullets for the **Contracts and Procurement Manager** role at Kingsford County, Washington, based on the job description:

### Priority Order:

**1. (2) Administers 46 active federal and state grants totaling $88M for a county health and human services department.**
* **Why:** This demonstrates the ability to manage a large, complex portfolio of financial/contractual obligations (analogous to managing $180M in spend). It shows high-level fiduciary responsibility and scope management.

**2. (3) Wrote or edited 19 grant applications last cycle with a 63% award rate, above the department's 41% historical rate.**
* **Why:** This directly speaks to the core function of procurement/contracts: writing, managing, and successfully securing contracts/awards. The quantifiable success rate is highly valuable.

**3. (1) Built the department's first grants calendar and reporting tracker; on-time federal report submission went from 76% to 100%.**
* **Why:** This shows the ability to establish and implement new systems (process improvement) necessary for a "newly centralized procurement division." It proves capability in creating the necessary infrastructure.

**4. (8) Cut average subrecipient invoice turnaround from 34 days to 12.**
* **Why:** This demonstrates efficiency and process improvement, which is crucial for managing a procurement division and ensuring timely contract execution.

**5. (9) Recovered $2.3M in previously unbilled reimbursable costs by rebuilding the indirect-cost allocation schedule.**
* **Why:** This shows financial acumen and the ability to manage complex financial/contractual reconciliation, which is often a component of procurement oversight.

**6. (6) Trained 40 program staff on Uniform Guidance allowability rules.**
* **Why:** This demonstrates the ability to train and establish compliance standards, which is necessary when setting up new procurement policies.

**7. (5) Monitors 23 subrecipients including annual risk assessments and 9 on-site reviews a year.**
* **Why:** This shows oversight and risk management capabilities, relevant for supervising buyers and managing contract performance.

**8. (10) Reduced the single-audit finding count from 7 to 0 across two consecutive audit years.**
* **Why:** This speaks to risk mitigation and ensuring
```

**Reference (what the training data says):**

```
[2, 5, 9, 1, 8, 10]
```

---

### 5. `cover_close`

<details><summary>prompt</summary>

```
Second closing for the same Quillbase Director of Product, Automation letter. The posting mentions running the customer advisory session on automation each quarter as a responsibility. Write a different 1-2 sentence closing with a specific ask about that.
```

</details>

**CareerOps-4B:**

```
I'd welcome the chance to run the customer advisory session on automation each quarter, as I've run advisory sessions on my own product three times a year. When is the next one scheduled?
```

**Base Gemma 4 E2B:**

```
Here are a few options for a different 1-2 sentence closing, focusing on the customer advisory session responsibility:

**Option 1 (Direct & Action-Oriented):**
> I am eager to bring my experience in leading customer advisory sessions to your team. Could we discuss how I can immediately begin structuring and leading the quarterly automation advisory series?

**Option 2 (Value-Focused):**
> My background in driving product adoption aligns perfectly with your need for a regular customer advisory. I look forward to discussing the framework for launching and managing those sessions.

**Option 3 (Concise & Forward-Looking):**
> I am confident I can effectively manage and lead the quarterly customer advisory on automation. I welcome the chance to detail my proposed structure for these sessions.
```

**Reference (what the training data says):**

```
How the quarterly automation customer advisory session runs today, and what you'd want a new director to bring to it, is something I'm keen to hear about. Happy to find a time this week.
```

---

### 6. `cover_open`

<details><summary>prompt</summary>

```
I'm applying to Marrow Ridge Health for the Director, Ambulatory Operations role. The posting requires survey experience, Joint Commission or CMS, with the paperwork trail to prove it. Write a 1-2 sentence cover letter opener hooking on that specific requirement.
```

</details>

**CareerOps-4B:**

```
Marrow Ridge Health's requirement for survey experience with a documented paper trail is the one I'm most familiar with. I've led two Joint Commission surveys and have the documentation ready to show it.
```

**Base Gemma 4 E2B:**

```
Here are a few options for your cover letter opener, focusing directly on the required experience:

**Option 1 (Direct & Confident):**
> My background includes extensive experience managing operations that require rigorous compliance, specifically with Survey, Joint Commission, and CMS standards, ensuring a complete and auditable paperwork trail for all operations.

**Option 2 (Benefit-Oriented):**
> I possess the proven ability to manage complex ambulatory operations while maintaining strict adherence to regulatory standards, including Survey and Joint Commission requirements, which directly aligns with the needs of the Director, Ambulatory Operations role.

**Option 3 (Concise & Specific):**
> I have a strong track record of managing operations under Survey, Joint Commission, and CMS guidelines, providing the necessary documentation and compliance history required for this position.

**Which one resonates most with your personal style?** (I recommend Option 1 or 3 for maximum impact.)
```

**Reference (what the training data says):**

```
Survey readiness that holds up under Joint Commission or CMS scrutiny takes more than good intentions, it takes a documented trail. That's the discipline I want to bring to Marrow Ridge's outpatient division.
```

---

### 7. `cover_proof`

<details><summary>prompt</summary>

```
Same Drayline posting, different proof point: connect this fact — I reduced accessorial charges $1.7M a year by fixing detention drivers at two facilities and enforcing a scheduled-appointment policy — to the posting's requirement to attack accessorial spend, starting with detention at the Houston yard.
```

</details>

**CareerOps-4B:**

```
I cut accessorial charges $1.7M a year by fixing detention drivers at two facilities and enforcing a scheduled-appointment policy — the exact accessorial-spend attack this role wants, starting with detention at the Houston yard.
```

**Base Gemma 4 E2B:**

```
Here is the analysis and suggested action based on your request:

## CareerOps Action Plan

**Goal:** Tailor your application materials (resume/cover letter) for the "Same Drayline" posting by directly connecting your proven achievement to the specific requirement of the job posting.

**Job Posting Requirement:** Attack accessorial spend, starting with detention at the Houston yard.

**Your Proof Point:** Reduced accessorial charges by **$1.7M a year** by fixing detention drivers at two facilities and enforcing a scheduled-appointment policy.

---

### 1. Resume/Cover Letter Strategy

**How to Connect Them (Drafting Focus):**

*   **Instead of:** Listing the achievement generally.
*   **Focus on:** Framing the achievement as a direct, quantifiable solution to the employer's stated problem.

**Suggested Language Hooks:**

*   "My experience directly aligns with your need to attack accessorial spend. At [Previous Company], I successfully targeted detention charges, resulting in a **$1.7M annual reduction** by implementing driver training and a scheduled-appointment policy at two facilities, demonstrating a proven ability to drive down these costs immediately."
*   "I am prepared to immediately address the accessorial spend at the Houston yard. I have a track record of success in this area, having reduced related charges by **$1.7M annually** through process improvement (driver training and scheduling enforcement)."

### 2. Next Steps for You (What to Work On Today)

**Today's Focus:** **Drafting the tailored content.**

1.  **Review the Job Posting:** Identify 2-3 other key phrases in the posting related to "cost reduction," "accessorials," or "operational efficiency."
2.  **Draft the Targeted Statement:** Write a 3-4 sentence summary for your cover letter that uses the **$1.7M figure** and explicitly mentions **detention/accessorials** to show immediate relevance.
3.  **Update Resume Bullet:** Rewrite your most relevant bullet point to lead with the *result* and the *method* (fixing drivers/scheduling) rather than just the task.

### How CareerOps Works (Explanation)

CareerOps functions as your dedicated career strategist. I manage the entire job search lifecycle:

1.  **Diagnosis:** I analyze job postings to identify the core skills and pain points they are trying to solve.
2.  **Mapping:** I map your real
```

**Reference (what the training data says):**

```
Attacking detention is where I'd start at the Houston yard too, because it's already worked for me: fixing detention drivers at two facilities and enforcing a scheduled-appointment policy cut accessorial charges $1.7M a year. That's a playbook ready to point at Houston.
```

---

### 8. `followups`

<details><summary>prompt</summary>

```
Saltmoor Expeditions again, Director of Global Operations, but the conversation track - their COO called 9 days ago and asked me for references. Stage conversation, A-, 82%, ghost risk low, docs ready. I've been sitting on it.
```

</details>

**CareerOps-4B:**

```
Nine days at conversation stage with a COO asking for references is a soft ask, not a hard one. Send the references today, and then close the row. A- at 82% with docs ready means you've done the work; the next step is the ask.
```

**Base Gemma 4 E2B:**

```
Here is the CareerOps analysis and action plan based on the information provided:

## CareerOps Analysis & Action Plan

**Client Profile Snapshot:**

* **Target Role:** Director of Global Operations at Saltmoor Expeditions.
* **Current Status:** Conversation track established, COO requested references 9 days ago.
* **Performance Grade:** A- (82%).
* **Risk Assessment:** Ghost risk is low.
* **Readiness:** Documents are ready.
* **Current Action:** Inactive/Waiting.

**CareerOps Grade & Feedback:**

* **Grade:** **A- (82%)**
* **Feedback:** Strong performance in securing the conversation and managing the reference request. The 82% suggests high confidence and readiness.
* **Area for Improvement (Focus for Next Stage):** Proactive follow-up management. While the process is set, the next step requires active management to ensure the process moves forward efficiently.

**Next Steps & Recommendations (What to work on today):**

1. **Develop a Proactive Follow-Up Strategy:** Since the documents are ready, the next step is to initiate contact to move the process forward.
    * **Action:** Draft a concise, professional follow-up email to the COO (or the appropriate contact) that:
        * References the previous conversation/request.
        * Confirms the documents are attached/ready.
        * Asks for the next step in the process.
    * **Goal:** Move the process from "ready" to "in-progress."

2. **Prepare for Next Stage:** While waiting for a response, use this time to prepare for the next potential interview stage.
    * **Action:** Identify 3-5 specific operational challenges relevant to Saltmoor Expeditions' scope (based on your experience) and draft brief, high-impact STAR method responses for those challenges.

**How CareerOps Works (Explanation):**

CareerOps functions as your dedicated, end-to-end career management partner. I manage the entire job search lifecycle for you, ensuring maximum efficiency and strategic alignment.

1. **Assessment & Grading:** I evaluate your performance against specific role requirements and provide a quantifiable grade (e.g., A-, 82%) based on the data provided.
2. **Strategy & Tailoring:** I ensure all materials (resumes, cover letters) are hyper-tailored to the specific job posting or company needs.
3. **Board
```

**Reference (what the training data says):**

```
He asked for references nine days ago - send them. That is the follow-up. No commentary beyond a line naming each person and why they're relevant to global operations. Doing the thing that was asked, on the same thread, restarts the process without any nudge at all. Get it out today; a reference request left for two weeks reads as disorganized.
```

---

### 9. `jd_parsing`

<details><summary>prompt</summary>

```
Extract company, title, seniority, location, and requirements from this JD as raw JSON. Nothing else in your reply.

Careers / All Jobs / Search Results

Junipero Parcel is hiring: Vice President, Last-Mile Delivery
Location: Philadelphia, PA — Hybrid, 3 days on-site
Level: Vice president

Requirements: Owned a nine-figure operating budget with accountability for cost per stop or equivalent unit economics. Peak season planning at volumes that double or more. You have expanded a delivery network into new metros and know what breakeven density actually costs.

This description is a summary and may not include every duty.
```

</details>

**CareerOps-4B:**

```
{"company": "Junipero Parcel", "title": "Vice President, Last-Mile Delivery", "seniority": "Vice president", "location": "Philadelphia, PA — Hybrid, 3 days on-site", "requirements": ["Owned a nine-figure operating budget with accountability for cost per stop or equivalent unit economics", "Peak season planning at volumes that double or more", "You have expanded a delivery network into new metros and know what breakeven density actually costs"]}
```

**Base Gemma 4 E2B:**

```
```json
{
  "company": "Junipero Parcel",
  "title": "Vice President, Last-Mile Delivery",
  "seniority": "Vice president",
  "location": "Philadelphia, PA — Hybrid, 3 days on-site",
  "requirements": [
    "Owned a nine-figure operating budget with accountability for cost per stop or equivalent unit economics.",
    "Peak season planning at volumes that double or more.",
    "Expanded a delivery network into new metros.",
    "Know what breakeven density actually costs."
  ]
}
```
```

**Reference (what the training data says):**

```
{"company": "Junipero Parcel", "title": "Vice President, Last-Mile Delivery", "seniority": "Vice president", "location": "Philadelphia, PA — Hybrid, 3 days on-site", "requirements": ["Owned a nine-figure operating budget with accountability for cost per stop or equivalent unit economics", "Peak season planning at volumes that double or more", "You have expanded a delivery network into new metros and know what breakeven density actually costs"]}
```

---

### 10. `match_grading`

<details><summary>prompt</summary>

```
Grade this candidate against this role. Return ONLY JSON, no other text: {"score":int,"summary":"...","strengths":[...],"gaps":[...]}

ROLE: Steadmoor Distribution - Continuous Improvement Analyst, Network Operations (Senior individual contributor; parcel carrier, nine cross-dock facilities and a contracted delivery fleet)
NEEDS: four or more years in logistics or supply chain analytics; SQL and a BI tool, Power BI; process improvement method, root cause discipline or DMAIC; warehouse throughput or route-level delivery economics; be in facilities rather than modelling from a desk; findings become standard work for other sites; Green Belt a plus
CANDIDATE: Jared Whitlock - Store Operations Lead, Charlotte, NC.
- Taught himself SQL; built a Tableau dashboard covering 11 stores
- Wrote the district's holiday staffing playbook, used by 11 stores
- Spends his time in the operation, not behind a desk
SKILLS: SQL, Tableau, process documentation
```

</details>

**CareerOps-4B:**

```
{"score": 40, "summary": "He has the analytical tools and the operational mindset, but the role is a step up in scope and the methods he's used are not his own.", "strengths": ["SQL and a BI tool, Power BI, are both covered by his Tableau work", "He spends his time in the operation, not behind a desk", "Process documentation is his documented output, which is the standard work this role is hiring to create"], "gaps": ["No warehouse throughput or route-level delivery economics experience", "No root cause discipline or DMAIC, and no Green Belt", "The role is facilities rather than modelling from a desk, and his background is retail operations", "The role is a senior individual contributor role, and he's currently a store operations lead"]}
```

**Base Gemma 4 E2B:**

```
```json
{
  "score":65,
  "summary": "Jared has relevant operational experience and self-taught analytical skills (SQL, Tableau) which align with the data/process needs. His experience writing a playbook that is adopted by multiple sites demonstrates a focus on creating standard work, which is a key requirement. However, the direct experience in logistics/supply chain analytics and specific process improvement methodologies (like DMAIC) needs to be explicitly mapped. The 'facilities' requirement is met by being in the operation, but the depth of experience in throughput/route economics needs verification.",
  "strengths": [
    "Experience in operational roles (Store Operations Lead) suggests a facility-based mindset.",
    "Self-taught SQL and built a Tableau dashboard, demonstrating analytical capability.",
    "Wrote a playbook used by 11 stores, showing ability to create and implement standard work.",
    "Spends time in the operation, satisfying the 'facilities rather than modelling' requirement."
  ],
  "gaps": [
    "Lack of explicit four or more years in dedicated logistics or supply chain analytics experience.",
    "Need to demonstrate direct experience with route-level delivery economics or warehouse throughput analysis.",
    "Need to explicitly map process improvement methodology (e.g., DMAIC) experience.",
    "Need to confirm proficiency in Power BI (only Tableau is mentioned).",
    "Need to demonstrate that findings directly resulted in standard work adoption across multiple sites."
  ]
}
```
```

**Reference (what the training data says):**

```
{"score": 38, "summary": "His operational analysis instincts are good and the setting is wrong. Warehouse throughput and route economics are both new, and the role sits above his level.", "strengths": ["SQL and dashboard building in Tableau are established; Power BI is a tool change, not a skill change", "He spends time in the operation rather than modelling it from a desk, which the posting values", "Process documentation is a listed skill, and his holiday staffing playbook is used by 11 stores"], "gaps": ["No logistics operations experience; nine cross-dock facilities and a contracted delivery fleet are outside his work", "Neither warehouse throughput nor route-level delivery economics is in his record", "No formal process improvement method: DMAIC, root cause discipline, or a Green Belt", "Four or more years in logistics or supply chain analytics is not met", "A senior individual contributor setting standard work for other sites is above his scope"]}
```

---

### 11. `prioritisation`

<details><summary>prompt</summary>

```
Career-switch board, and I know some of these are reaches. Rank them and be honest about the reaches.
Bellrose Outfitters | Retail Operations Analyst | interview | B+ | 81% | 5 | low | docs yes
Bramble and Rye Hospitality Group | Operations Analytics Analyst | applied | B | 74% | 10 | low | docs yes
Palladia Logistics | Business Analyst, Distribution Operations | researched | B | 70% | 14 | medium | docs no
Wickham Row | Director of E-commerce Operations | sourced | C | 56% | 22 | high | docs no
```

</details>

**CareerOps-4B:**

```
Bellrose Outfitters first — interview, B+ at 81%, docs done.
Bramble and Rye Hospitality Group second, applied, B at 74%, ten days in applied with docs ready.
Palladia Logistics third, researched, B at 70%, fourteen days at medium ghost risk, docs still unwritten.
Wickham Row fourth, C at 56%, twenty-two days sourced, high risk, and no docs.
Wickham Row is the one to drop.
```

**Base Gemma 4 E2B:**

```
Here is an analysis and ranking of your career-switch board, focusing on the "reach" factor based on the information provided:

## Career-Switch Board Analysis & Ranking

I will rank these based on a combination of **Relevance/Fit (Grade)** and **Reach (Difficulty/Unlikelihood)**, using the provided metrics (Grade, Score, Reach Level, Docs Required).

| Rank | Company | Role | Grade | Score | Reach Level | Docs Required | Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Wickham Row** | Director of E-commerce Operations | C | 56% | **High** | No | Highest reach, but the potential payoff is highest if you can bridge the gap. |
| **2** | **Bellrose Outfitters** | Retail Operations Analyst | B+ | 81% | Low | Yes | Strongest fit (highest grade), lowest reach. A solid starting point. |
| **3** | **Bramble and Rye Hospitality Group** | Operations Analytics Analyst | B | 74% | Low | Yes | Good fit, slightly lower score than Bellrose, but still a manageable target. |
| **4** | **Palladia Logistics** | Business Analyst, Distribution Operations | B | 70% | Medium | No | Medium reach. Good potential, but the lack of documentation might make the application harder to tailor. |

---

### Honest Assessment of "Reach"

Here is a breakdown of what "Reach" means in this context:

* **High Reach (Wickham Row):** This is the most challenging. It suggests a senior or specialized role, potentially in a field (E-commerce Director) that requires a very specific, high-level combination of experience.
* **Medium Reach (Palladia Logistics):** This is a good target. The reach is moderate, suggesting the role is accessible if your existing experience can be framed correctly, but it requires a solid application.
* **Low Reach (Bellrose Outfitters & Bramble and Rye):** These are your **safety/strong targets**. They are the most accessible based on your current profile, meaning you have the highest probability of success for these roles.

**Key Takeaway:** You have a good mix. You have one high-risk/high-reward target (Wickham Row) and two solid
```

**Reference (what the training data says):**

```
The interview is the whole board right now. Bellrose Outfitters first: B+, 81%, five days in, docs tailored, and it's the most direct translation of store operations into an analyst seat.
Bramble and Rye Hospitality Group second — applied ten days ago at 74%, low risk, tailored. Wait one more week before nudging.
Palladia Logistics third: 70%, fourteen days researched, nothing written.
Wickham Row fourth, and it's the reach you asked about — a director title at 56% with high ghost risk after 22 days.
Drop Wickham Row. The other three are the actual switch.
```

---

### 12. `resume_analysis`

<details><summary>prompt</summary>

```
I direct last-mile delivery across 22 metro markets — 1,900 daily routes, 6.4M parcels a year — and I cut cost per stop from $4.62 to $3.71 through route densification and a mixed employee/contractor model. I also negotiated the delivery service partner contract template we now use with 64 contracted fleets, and I own a $140M delivery operating budget. There's a Director of Field Operations role at Tallow Creek Market Group in Atlanta that pairs 48 grocery stores with a same-day delivery operation, wants either store labor model or route-level delivery economics experience, and P&L ownership with the ability to defend a variance to a CFO. How do I compare?
```

</details>

**CareerOps-4B:**

```
Your route-level economics work is a direct match for their delivery requirement — you cut cost per stop from $4.62 to $3.71 and own a $140M delivery budget, both the same store-labor model this role is trying to build. The contract negotiation experience with 64 fleets also lines up with their need to build a delivery service partner contract template. The gap is the scale: your 1,900 daily routes across 22 markets is a large delivery footprint, but Tallow Creek's 48 stores are smaller, and the role is about building a delivery operation from the ground up, not running an existing one. The P&L ownership is also a stretch — your budget is $140M, and this role is a $110M delivery budget with a CFO who will scrutinize every dollar.
```

**Base Gemma 4 E2B:**

```
This is a great starting point. As your CareerOps assistant, my goal is to align your experience directly with the needs of the **Director of Field Operations** role at Tallow Creek Market Group.

Here is a breakdown of how your experience compares to the job requirements, followed by an action plan.

---

### 1. Role Requirement Analysis vs. Your Experience

| Job Requirement (Tallow Creek) | Your Relevant Experience | Alignment Strength | How to Frame It |
| :--- | :--- | :--- | :--- |
| **Pairs 48 grocery stores with a same-day delivery operation.** | Direct last-mile delivery across 22 metro markets (1,900 daily routes). | **High.** You have proven experience managing complex, high-volume, multi-stop logistics. | Focus on the *scale* and *complexity* of managing multiple, geographically dispersed points of service. |
| **Wants either store labor model or route-level delivery economics experience.** | Cut cost per stop from \$4.62 to \$3.71 through route densification and a mixed employee/contractor model. | **Very High.** You have direct, quantifiable experience in optimizing economics and designing operational models. | Highlight the specific *methodology* (route densification, mixed model) and the *financial impact* (cost reduction). |
| **P&L ownership.** | Own a \$140M delivery operating budget. | **High.** You have clear, large-scale financial ownership. | Emphasize the scope of responsibility and the accountability required to manage a significant budget. |
| **Ability to defend a variance to a CFO.** | Negotiated the delivery service partner contract template. | **Medium-High.** This shows negotiation and contract-level financial acumen, which supports defending operational variances. | Frame contract negotiation as demonstrating the ability to structure agreements that control costs and protect the bottom line. |

### 2. CareerOps Assessment & Strategy

**Overall Fit Grade: Strong Potential (A-)**

Your background is highly relevant because you bridge **large-scale operational execution** with **direct P&L/cost ownership** and **contractual negotiation**.

**Key Areas to Emphasize in Materials:**

1.  **Economics & Efficiency:** Do not just state you cut costs. Structure your bullet points around the *process*: **Challenge $\rightarrow$ Action (Methodology) $\rightarrow$ Result (Metric)**.
```

**Reference (what the training data says):**

```
The route-level delivery economics are a direct match — your cost-per-stop reduction and the contracted-fleet template cover exactly what the posting asks for on the delivery side, and the $140M budget demonstrates P&L ownership at a scale beyond what defending a CFO variance would require. Gap: nothing here shows store labor model experience, and this role explicitly pairs delivery with 48 physical grocery stores you'd also need to run. Risk: grocery is a different business than parcel delivery, and your background doesn't show retail store operations at all, just the delivery layer. You'd cover half the job well and start from zero on the other half.
```

---

### 13. `resume_summary`

<details><summary>prompt</summary>

```
Write a leadership-focused resume summary for Imani Sørlie using only these facts: she facilitated a 14-member stakeholder working group of local governments, developers and tenant advocates to consensus on a formula change; she trains new analysts on her agency's methodology standards and peer-review process; she has presented findings to the agency's oversight board 7 times in two years.
```

</details>

**CareerOps-4B:**

```
Imani Sørlie leads through consensus and clarity: she facilitated a 14-member stakeholder working group of local governments, developers and tenant advocates to consensus on a formula change, trains new analysts on her agency's methodology standards and peer-review process, and has presented findings to the agency's oversight board 7 times in two years.
```

**Base Gemma 4 E2B:**

```
Here are a few options for a leadership-focused resume summary for Imani Sørlie, based *only* on the facts provided. Choose the one that best fits the tone of the roles she is targeting.

---

### Option 1: Impact & Consensus Focused (Strongest for Policy/Government Roles)

**Highly effective leader skilled in driving complex, cross-sector consensus and ensuring high-quality analytical standards. Proven ability to facilitate diverse stakeholder groups (local governments, developers, tenant advocates) to achieve consensus on critical policy changes. Adept at building internal capacity by training analysts in rigorous methodology and peer-review processes, and effectively communicating complex findings to executive oversight boards.**

### Option 2: Training & Governance Focused (Strongest for Management/Program Roles)

**Results-oriented professional specializing in governance, stakeholder management, and team development. Expertise in leading high-stakes working groups to achieve agreement on complex formulas and ensuring operational excellence through standardized training. Successfully developed internal expertise by mentoring analysts on agency methodology and presenting data-driven recommendations to oversight bodies.**

### Option 3: Concise & Achievement-Driven (Good for quick scanning)

**Leadership-focused expert with a track record of driving consensus among diverse stakeholders and ensuring analytical rigor. Successfully managed complex working groups to achieve policy agreement and enhanced organizational standards by training staff and presenting findings to executive oversight boards multiple times within a two-year period.**

---

**CareerOps Explanation:**

As your CareerOps assistant, my role is to be your dedicated career strategist. I manage your job search end-to-end by:

1. **Grading Fit:** Assessing how well your experience matches specific job requirements.
2. **Content Creation:** Writing highly tailored resumes and cover letters using *only* your actual experience to maximize impact.
3. **Market Analysis:** Parsing job postings to identify keywords and required skills.
4. **Organization:** Maintaining a clear, organized board of all your materials (resumes, notes, job targets).
5. **Action Planning:** Deciding precisely what you should work on today to move your search forward.
6. **Accountability:** Chasing follow-ups to ensure momentum.

**How this applies to your summary:** The options above translate your actions (facilitating, 
```

**Reference (what the training data says):**

```
Imani Sørlie facilitated a 14-member stakeholder working group of local governments, developers and tenant advocates to consensus on a formula change. She trains new analysts on her agency's methodology standards and peer-review process, and has presented findings to the agency's oversight board 7 times in two years.
```

---

### 14. `search_strategy`

<details><summary>prompt</summary>

```
High ghost risk on almost everything. How do I tell which postings are real before I spend an hour tailoring a resume?
```

</details>

**CareerOps-4B:**

```
Filter by "ghost risk" and set it to "high" — that's the only way to cut the noise. Then, sort by "days since applied" descending. The ones at the top are the ones you've already lost a week or more on, so drop them. The rest are fresh enough to still be tailored.
```

**Base Gemma 4 E2B:**

```
As your CareerOps assistant, my goal is to ensure you spend your time on opportunities with the highest probability of success.

Here is how we filter for "real" postings:

1. **Analyze the Job Description (JD) for Specificity:**
    * **Look for Concrete Requirements:** Real jobs list specific tools, technologies, methodologies, or quantifiable achievements.
        * **Red Flag:** Vague terms like "great communicator," "self-starter," or "team player" without any supporting technical or functional context.
        * **Green Flag:** "Must have experience with Python for data processing," or "Responsible for managing a budget of $50k/month."
    * **Check for Role Alignment:** Does the required skill directly map to a skill you have *documented* in your experience? If the JD asks for "Agile experience" and your resume only shows project management, it's a mismatch.

2. **Evaluate the Posting Source:**
    * **Prioritize Verified Sources:** Postings from established, reputable industry recruiters, direct company career pages, or well-known industry-specific job boards are generally higher quality than generic, unvetted aggregators.
    * **Be Skeptical of "Too Good to Be True":** If the salary range is extremely high for an entry-level role, or the requirements are impossibly broad, proceed with caution.

3. **The "Reverse Check" (Your Filter):**
    * **Identify the Core Skill:** For any posting, isolate the **one or two non-negotiable skills** they emphasize.
    * **Check Your Documentation:** Immediately search your existing experience/projects for a bullet point that *exactly* mirrors that requirement.
    * **If you have a direct match:** The posting is likely real and worth tailoring.
    * **If you have a *tangential* match (e.g., you used a similar tool but not in the context they need):** It's a potential fit, but the tailoring effort will be higher.
    * **If you have *no* documented match:** Flag it as **High Ghost Risk** and defer tailoring until we can confirm the role's legitimacy or you have a stronger profile.

**In summary: Don't spend an hour tailoring until the JD provides 2-3 concrete, verifiable requirements that directly align with your documented experience.**

How would you like to start? Please provide a job posting you are considering,
```

**Reference (what the training data says):**

```
Check three things in about two minutes each. First, open the posting from the card and see whether the employer's own careers page still lists it; aggregator copies outlive the original constantly. Second, look for a posted or refreshed date, and treat anything older than eight weeks with no update as low priority. Third, check whether the same title has been posted repeatedly this year, which usually means a comp or bar problem rather than a fake role. Order your board by that assessment and tailor only for the top of it. Two searches a day is enough once you are filtering this way.
```

---

### 15. `skills_filter`

<details><summary>prompt</summary>

```
Cinderpeak Resorts is hiring a Senior Vice President, Revenue and Distribution. Requirements include fifteen years in commercial or revenue leadership, multi-property revenue management with accountability for total revenue, distribution economics across brand.com, OTA, wholesale and group, ancillary and on-property revenue programs, and having led a pricing or inventory system replacement. Here's my full skills list: commercial strategy, cruise revenue management, net yield optimization, itinerary deployment planning, distribution channel strategy, direct-to-consumer growth, trade partner management, pricing architecture, onboard revenue, marketing P&L, demand forecasting, contact center operations, executive presentation, organizational leadership, capital investment cases, loyalty program strategy, Salesforce, Power BI. Which should I include?
```

</details>

**CareerOps-4B:**

```
["commercial strategy", "distribution channel strategy", "pricing architecture", "demand forecasting", "executive presentation", "organizational leadership"]
```

**Base Gemma 4 E2B:**

```
Here is an analysis of your skills against the requirements for the Senior Vice President, Revenue and Distribution role at Cinderpeak Resorts.

### Skill Mapping Analysis

| Job Requirement | Your Skills | Match Strength | Notes & Recommendations |
| :--- | :--- | :--- | :--- |
| Fifteen years in commercial or revenue leadership | commercial strategy, executive presentation, organizational leadership, marketing P&L | **Good** | You have the leadership and P&L experience, but you need to ensure your experience clearly spans 15 years in a senior revenue role. |
| Multi-property revenue management with accountability for total revenue | commercial strategy, net yield optimization, demand forecasting, marketing P&L | **Good** | "Net yield optimization" and "demand forecasting" are strong indicators of multi-property accountability. |
| Distribution economics across brand.com, OTA, wholesale and group | distribution channel strategy, trade partner management, pricing architecture | **Good** | These map directly to the required channels. Ensure your experience explicitly covers the *economics* of these channels. |
| Ancillary and on-property revenue programs | onboard revenue, loyalty program strategy | **Good** | These are direct matches. |
| Having led a pricing or inventory system replacement | (No direct match) | **Weak** | This is a specific technical requirement. You need to frame a past project where you led a system replacement. |

### Recommendation for Resume/Application Focus

**Include the following skills and frame your experience to directly address the requirements:**

1. **Distribution Channel Strategy:** (Direct match)
2. **Pricing Architecture:** (Direct match)
3. **Net Yield Optimization:** (Strong indicator of revenue accountability)
4. **Trade Partner Management:** (Covers wholesale/group aspects)
5. **Marketing P&L:** (Covers the business/commercial leadership aspect)
6. **Organizational Leadership / Executive Presentation:** (Covers the senior leadership requirement)

**Action Item for You:**

*   **For the "System Replacement" requirement:** You must revise your resume or prepare a specific bullet point detailing a time you successfully led the replacement of a pricing or inventory system. If you don't have that exact experience, we need to focus on framing a major system *optimization* project as a replacement/transformation.

**Next Step:** Please provide your current resume or a summary of your relevant work history so I can start tai
```

**Reference (what the training data says):**

```
["commercial strategy", "cruise revenue management", "net yield optimization", "distribution channel strategy", "direct-to-consumer growth", "trade partner management", "pricing architecture", "onboard revenue", "demand forecasting", "executive presentation", "organizational leadership"]
```

---

### 16. `stage_moves`

<details><summary>prompt</summary>

```
Loftwren | Senior Manager, Pricing and Analytics | applied | 27 days | B+ fit | 76% match | ghost risk high | docs tailored. The posting is off their careers page and the recruiter's mailbox bounces.
```

</details>

**CareerOps-4B:**

```
Twenty-seven days at high ghost risk with no recruiter contact is a real reason to stop. The posting is off their careers page and the mailbox bounces — that's not a hiring channel. Send one email to the general HR inbox, not the recruiter, and ask specifically to be added to the pricing and analytics pipeline for this role. That's the only thing you can control.
```

**Base Gemma 4 E2B:**

```
Here is the CareerOps analysis and action plan based on the information provided:

## CareerOps Analysis & Action Plan

**Role:** Senior Manager, Pricing and Analytics at Loftwren
**Status:** Applied (27 days ago)
**Fit Grade:** B+
**Match Score:** 76%
**Risk Assessment:** Ghost risk is high.
**Current Status:** Application is not being tracked effectively (posting is off the careers page, recruiter mailbox bounces).

---

### 1. Role Fit Assessment (B+ Grade, 76% Match)

**Strengths (Why the 76% Match?):**
*   *Action Required:* I need your actual resume/experience to confirm this.
*   *Hypothesis:* The 76% match suggests a strong overlap in core responsibilities (Pricing, Analytics) but potential gaps in specific domain knowledge or seniority level expectations.

**Weaknesses/Gaps (Why not A+?):**
*   *Action Required:* I need your resume to identify where the 24% gap lies.
*   *Hypothesis:* The mismatch might be in the specific tools, industry context, or the exact scope of "Senior Manager" responsibilities as defined by Loftwren.

**Ghost Risk Assessment (High):**
*   **Risk:** High. The lack of feedback/tracking means we don't know if the application was seen or if the process is broken.
*   **Mitigation Strategy:** We need to immediately pivot from passive application to active engagement.

---

### 2. Immediate Action Plan (What to Work On Today)

**Priority 1: Application Re-engagement & Tracking (Immediate)**

1.  **Verify Application Status:** Check if there is an alternative application portal or direct contact method for Loftwren.
2.  **Develop Targeted Outreach:** Draft a highly personalized, brief message (LinkedIn InMail or direct email) referencing a specific achievement from your experience that directly maps to the job description's requirements.
3.  **Resume Tailoring:** Create a **"Loftwren-Optimized" version** of your resume, ensuring the language used mirrors the job description's keywords and focuses on quantifiable results relevant to pricing/analytics.

**Priority 2: Content Creation (Next Steps)**

1.  **STAR Method Prep:** Prepare 3-5 detailed STAR method stories based on your experience that demonstrate success in:
```

**Reference (what the training data says):**

```
applied → closed. Nobody rejected you — the req is off the page and the recruiter's mailbox bounces, so there is no one left to make a decision. You end it. Twenty-seven days at high ghost risk had already told you this. The tailored pricing docs still travel.
```

---

### 17. `app_operation`

<details><summary>prompt</summary>

```
What does the onboarding wizard actually ask me for?
```

</details>

**CareerOps-4B:**

```
The onboarding wizard asks for your full name, email, and phone number. It also asks whether you're comfortable with our cookie policy, and whether you've read and understood our remote work policy.
```

**Base Gemma 4 E2B:**

```
As the CareerOps assistant, I don't have access to a specific "onboarding wizard" you might be referring to, as I manage your job search based on the information you provide to me.

**To tell you exactly what the wizard asks for, you need to tell me which wizard you are referring to.**

However, generally, an onboarding process for a CareerOps service like mine is designed to gather the following information so I can start working effectively for you:

1. **Your Background/Experience:** Details about your past roles, responsibilities, and achievements.
2. **Target Roles/Industries:** What kind of jobs are you looking for?
3. **Career Goals:** What are your priorities (e.g., salary range, work-life balance, specific skill development)?
4. **Preferred Application Style:** How you like your materials (e.g., formal, creative, results-driven).
5. **Any Specific Constraints or Preferences:** Things you absolutely *must* include or *must* avoid.

**If you can tell me the context (where you saw the wizard), I can give you a much more precise answer!**
```

**Reference (what the training data says):**

```
Five numbered sections under "Let's set up your job search 👋": "1 · What roles are you after?" (target titles, keywords, seniority, locations), "2 · About you" (name, phone, LinkedIn, location), "3 · Paste your résumé," "4 · AI" (optional keys), and "5 · How you'll actually use it."
```

---

### 18. `board_triage`

<details><summary>prompt</summary>

```
quick one — I open this board every morning and do nothing. break the tie for me.

Halvard & Pike / Senior Manager, Digital Merchandising / interview / A / 92% / 2 days / low / docs yes
Wickham Row / Director of E-commerce Operations / conversation / A- / 83% / 8 days / low / docs no
Northmarch Consumer Brands / Category Manager, Marketplace / applied / B+ / 75% / 24 days / medium / docs yes
Bellrose Outfitters / Retail Operations Analyst / sourced / C / 49% / 30 days / high / docs no
```

</details>

**CareerOps-4B:**

```
Halvard & Pike is the only role worth opening. Two days into an interview at A and 92%, docs already tailored, and nothing else here is close.
Wickham Row is the second stop: eight days in conversation at A-/83%, docs missing.
Northmarch Consumer Brands is a B+ at 75% and 24 days applied — it's a real application, not a warm intro.
Bellrose Outfitters is a C at 49% and 30 days sourced.
Drop Bellrose.
```

**Base Gemma 4 E2B:**

```
As your CareerOps assistant, my goal is to maximize your job search efficiency and effectiveness.

Here is my analysis and recommendation for what you should work on today:

### **Analysis of Your Board**

| Company | Role | Status | Grade | Fit Score | Time to Hire | Level | Docs Needed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Halvard & Pike | Senior Manager, Digital Merchandising | Interview | A | 92% | 2 days | Low | Yes |
| Wickham Row | Director of E-commerce Operations | Conversation | A- | 83% | 8 days | Low | No |
| Northmarch Consumer Brands | Category Manager, Marketplace | Applied | B+ | 75% | 24 days | Medium | Yes |
| Bellrose Outfitters | Retail Operations Analyst | Sourced | C | 49% | 30 days | High | No |

**Key Observations:**

1.  **Highest Potential:** The **Halvard & Pike** role has the highest fit score (92%) and is in the interview stage, suggesting a strong alignment.
2.  **Highest Effort/Longest Cycle:** **Bellrose Outfitters** requires the most time (30 days) and has the lowest current fit score (49%), indicating it might require more tailored material or is a weaker match.
3.  **Actionable Next Steps:** You have an active interview with Halvard & Pike, which should be prioritized for follow-up.

### **My Recommendation for Today**

**🎯 Focus Today: Halvard & Pike (Senior Manager, Digital Merchandising)**

**Action Plan:**

1.  **Follow-up:** Since you are in the interview stage, I recommend drafting a concise, high-impact follow-up email to the hiring contact. This should reference a specific point from the interview to reinforce your fit and show engagement.
2.  **Preparation:** Spend 1-2 hours reviewing the job description one last time to ensure you have 1-2 specific, data-driven examples ready to discuss merchandising success.

**Secondary Task (If time allows):**

*   **Wickham Row:** Since this is a "conversation" stage, I recommend preparing 3 strong, specific questions to ask them to demonstrate strategic thinking, moving the conversation forward.

---

###
```

**Reference (what the training data says):**

```
Two days after a Halvard & Pike interview at A/92% — that's your whole morning. Write the follow-up while the conversation is still fresh in your head.
Wickham Row is the step up and it has no tailored docs after eight days of conversation. Build them before that thread cools.
Northmarch: 24 days applied, medium ghost risk. One recruiter note, then stop checking it daily.
Bellrose is a C at 49% and thirty days untouched. That role is why you freeze when you open the board. Delete it.
```

---

### 19. `bullet_rewrite`

<details><summary>prompt</summary>

```
Trying to punch up this bullet for a Grants Manager application at Foothill Community Health Alliance: "Cut average subrecipient invoice turnaround from 34 days to 12." They want someone who reconciles grant revenue and expenditure monthly with the controller. Give me a stronger version.
```

</details>

**CareerOps-4B:**

```
Cut average subrecipient invoice turnaround from 34 days to 12 — the monthly reconciliation cadence this grants manager role runs with the controller.
```

**Base Gemma 4 E2B:**

```
Here are a few stronger options, tailored to emphasize the reconciliation and financial control aspects relevant to a Grants Manager role:

**Option 1 (Focus on Accuracy and Compliance):**
> "Streamlined the subrecipient invoice reconciliation process, reducing the average turnaround time from 34 days to 12 days, ensuring timely and accurate financial reporting for grant compliance."

**Option 2 (Focus on Process Improvement and Control):**
> "Developed and implemented a standardized reconciliation workflow for subrecipient invoices, cutting the average processing time by 40% (from 34 to 12 days) and establishing a robust monthly reconciliation process with the controller."

**Option 3 (More Action-Oriented/Impact-Focused):**
> "Improved grant financial operations by optimizing the subrecipient invoice lifecycle, decreasing the average invoice turnaround time from 34 days to 12 days, which directly supported accurate monthly revenue and expenditure reconciliation."

**Which one should you choose?**

*   **If the job description heavily emphasizes compliance and accuracy:** Choose **Option 1**.
*   **If the job description emphasizes process improvement and system building:** Choose **Option 2**.
*   **If you want the strongest, most direct statement of impact:** Choose **Option 3**.

**Key takeaway:** All options shift the focus from just "cutting time" to *why* it matters (accuracy, compliance, and supporting reconciliation).
```

**Reference (what the training data says):**

```
Cut average subrecipient invoice turnaround from 34 days to 12 — the financial reconciliation discipline this grants manager role will run jointly with the controller every month.
```

---

### 20. `bullet_select`

<details><summary>prompt</summary>

```
Vice President, Customer Success at Tessellate Software (Boston, MA). Bullets:
1. Leads a 31-person customer success organization covering $74M in annual recurring revenue.
2. Raised gross revenue retention from 87% to 94% in two years across a 900-account book.
3. Built the health-scoring model that now predicts churn 90 days out with 71% precision.
4. Cut time-to-value for new enterprise accounts from 74 days to 38 through a redesigned onboarding program.
5. Grew expansion revenue from $4.1M to $12.6M by giving CSMs a structured account-planning motion and a quota.
6. Restructured the team into segment pods, which lifted CSM capacity from 22 to 34 accounts each without a satisfaction drop.
7. Reduced CSM attrition from 29% to 12% after rebuilding the career ladder and compensation plan.
8. Partnered with product to launch an in-app adoption program that moved a key feature from 19% to 58% usage.
9. Runs quarterly business reviews for the top 40 accounts personally.
10. Owns a $3.9M departmental budget and the customer success technology stack.
11. Cut the escalation queue from an average of 41 open items to 9 by introducing a defined severity framework with product.

Needs: led a customer success organization of 25 people or more. Role: rebuild health scoring so leading indicators arrive early enough to act on.

Given this JD, which bullets carry the most weight? List them in priority order.
```

</details>

**CareerOps-4B:**

```
[3, 1, 6, 7, 10, 4, 8]
```

**Base Gemma 4 E2B:**

```
Here is the prioritization of your bullets based on the provided Job Description (JD):

**Priority Order:**

1. **Built the health-scoring model that now predicts churn 90 days out with 71% precision.** (Directly addresses the need to "rebuild health scoring so leading indicators arrive early enough to act on.")
2. **Leads a 31-person customer success organization covering $74M in annual recurring revenue.** (Addresses the scale/size requirement: "led a customer success organization of 25 people or more.")
3. **Reduced CSM attrition from 29% to 12% after rebuilding the career ladder and compensation plan.** (Demonstrates ability to build and improve the team structure, which is often a key component of scaling success organizations.)
4. **Grew expansion revenue from $4.1M to $12.6M by giving CSMs a structured account-planning motion and a quota.** (Shows impact on revenue growth, a key metric for a VP role.)
5. **Restructured the team into segment pods, which lifted CSM capacity from 22 to 34 accounts each without a satisfaction drop.** (Demonstrates operational restructuring and scaling capability.)
6. **Raised gross revenue retention from 87% to 94% in two years across a 900-account book.** (Shows direct impact on core success metric—retention.)
7. **Cut time-to-value for new enterprise accounts from 74 days to 38 through a redesigned onboarding program.** (Shows ability to improve the customer journey/onboarding process.)
8. **Cut the escalation queue from an average of 41 open items to 9 by introducing a defined severity framework with product.** (Shows ability to improve operational efficiency and reduce friction.)
9. **Partnered with product to launch an in-app adoption program that moved a key feature from 19% to 58% usage.** (Demonstrates cross-functional influence on product adoption.)
10. **Runs quarterly business reviews for the top 40 accounts personally.** (Shows high-level engagement and strategic oversight.)
11. **Owns a $3.9M departmental budget and the customer success technology stack.** (Demonstrates P&L/resource management.)

**Summary Rationale:**

The top priority is the **Health Scoring** bullet because it is the most direct match for the specific skill
```

**Reference (what the training data says):**

```
[2, 1, 6, 3, 5, 9, 11]
```

---
