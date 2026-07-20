# JD_BANK.md — synthetic job descriptions

Seventy invented job postings, `JD001`–`JD070`. Every company, role and detail is fabricated.
No real employer, product, school or person appears anywhere in this file.

Each entry is domain-matched to personas in `PERSONAS.md`: every persona has 2–3 plausible
target roles, and every JD names its targets on the `Targets:` line. A few JDs deliberately
target two personas where the role sits between their disciplines.

Match design, so gap analysis has something to work with:

- Each persona gets a mix of a clear lateral move, a stretch up a level, and where a third
  exists, a sideways move into an adjacent industry.
- **Every JD contains at least one requirement its target persona does not have.** A JD is
  never a restatement of a persona's skills list.
- No persona bullet or skill string is copied verbatim into a requirement. Overlap is real
  but partial and paraphrased, as it would be in the wild.

`Targets:` is generation metadata. It is scaffolding for building rows — never quote it,
and never let it leak into an assistant answer.

---

# Synthetic job description bank — part 1 (JD001–JD024)

## JD001 — Director of Revenue Strategy

- **jd_id:** JD001
- **Company:** Sablewood Resorts Group
- **Title:** Director of Revenue Strategy
- **Seniority:** Director
- **Location:** Denver, CO — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p01

**About the role**

Sablewood operates 63 owned and managed leisure properties, most of them in mountain and lake markets where demand swings hard by season. Revenue strategy has been run property by property for a decade and it shows: three different rate-loading methods, no shared demand view, and a forecast the finance team quietly reworks every month. This Director role is a rebuild mandate. You report to the SVP Commercial and inherit four regional revenue managers.

**Requirements**

- 8+ years in hotel or resort revenue management, including at least two spent covering a multi-property portfolio
- You have owned a seasonal pricing strategy end to end — length-of-stay controls, group displacement, the arguments with GMs that come with both
- Comfortable in SQL against a warehouse; we run Snowflake and you will be asked to write your own queries rather than wait for BI
- Track record of forecast accuracy inside 5% at 30 days, and a clear explanation of how you got there
- People leadership experience, or a credible case for why you are ready to start
- Working knowledge of OTA channel economics and parity enforcement
- Nice to have: exposure to a loyalty or CRM replatform, since ours lands in Q2

**Responsibilities**

- Set and defend the annual pricing strategy for all 63 properties
- Consolidate three legacy rate-loading processes into one governed workflow
- Chair the monthly commercial forecast review with regional leadership and finance
- Coach four regional managers on rate-shopping discipline and displacement analysis
- Own the revenue side of the loyalty replatform requirements

---

## JD002 — Director, Ambulatory Operations

- **jd_id:** JD002
- **Company:** Marrow Ridge Health
- **Title:** Director, Ambulatory Operations
- **Seniority:** Director
- **Location:** Columbus, OH — On-site
- **Employment type:** Full-time
- **Targets:** p02

**About the role**

Marrow Ridge Health runs 14 outpatient sites across central Ohio, including oncology infusion, procedural, and multispecialty clinics. Our ambulatory footprint grew faster than our operating structure, and the Director role exists to put one accountable leader over throughput, staffing, and regulatory readiness for the whole outpatient division. The position reports to the VP of Clinical Services and has four site managers as direct reports.

**Requirements**

- Seven or more years in healthcare operations with at least three managing managers or large clinical teams
- Master's degree in health administration, nursing, business, or a comparable field
- Deep familiarity with Epic scheduling and template design — you should be able to argue with an analyst about template build and win
- Demonstrated throughput work: chair time, room turnover, provider utilisation, or similar
- Survey experience. Joint Commission or CMS, with the paperwork trail to prove it
- Budget ownership at the multi-million-dollar level, including labour variance explanation to finance
- Preferred: experience standing up a new site or service line from lease signature through first patient

**Responsibilities**

- Own operational performance across 14 ambulatory sites, reporting monthly to the executive team
- Standardize scheduling templates, staffing grids, and escalation protocols across the division
- Lead accreditation and survey readiness for outpatient locations
- Partner with physician leaders on access targets and capacity planning
- Develop the four site managers, including a formal succession bench

---

## JD003 — Principal Engineer, Payments Platform

- **jd_id:** JD003
- **Company:** Alderport Financial
- **Title:** Principal Engineer, Payments Platform
- **Seniority:** Senior individual contributor
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p03

**About the role**

We move money for roughly two hundred marketplace and platform businesses. Our ledger works, mostly, but it was written in a hurry in 2019 and the seams are starting to show under volume. We are hiring a principal engineer to own the correctness story for the whole money layer — ledger, settlement, reconciliation — and to be the person other teams argue with before they change a posting rule. Reports to the head of platform engineering. No direct reports, real influence.

**Requirements**

- Ten years building backend systems, several of them in payments, banking, or another domain where being wrong costs money
- You have designed a double-entry ledger, or repaired someone else's
- Strong Go or Java; we are mostly Go, and we will not care if you learned it last year as long as the systems thinking is there
- Postgres at scale — sharding, migrations under load, the whole unpleasant business
- Event-driven experience with Kafka or equivalent, plus a real opinion on idempotency and exactly-once claims
- Familiarity with PCI-DSS scoping decisions
- We would like someone who has run a reconciliation process against processor settlement files, but will train the right person

**Responsibilities**

- Own the technical design of the ledger and settlement services
- Set the correctness bar: invariants, contract tests, replay tooling
- Review designs from six consuming teams and block the ones that would corrupt state
- Lead incident response for money-movement severity events
- Mentor senior engineers toward staff-level scope

---

## JD004 — Vice President of Manufacturing Operations

- **jd_id:** JD004
- **Company:** Hollandale Industries
- **Title:** Vice President of Manufacturing Operations
- **Seniority:** Vice president
- **Location:** Grand Rapids, MI — On-site
- **Employment type:** Full-time
- **Targets:** p04

**About the role**

Hollandale supplies molded and assembled components to automotive and appliance OEMs from four plants in Michigan, Indiana, and Tennessee. Two of those plants perform; two do not. The VP of Manufacturing Operations carries all four, reports to the COO, and sits on the operating committee that approves capital above $500K.

**Requirements**

- Fifteen years in manufacturing leadership, including at least five running a plant of 300 people or more
- Multi-site accountability — either today, or a documented stretch assignment covering more than one facility
- Engineering degree or equivalent technical grounding
- Lean and Six Sigma credentials that you actually deployed, not just earned
- IATF 16949 environments; you should know what a major finding costs in customer confidence
- Union environment experience including contract negotiation or administration
- Operating budget ownership north of $50M
- Willing to travel roughly 40%, weighted toward whichever plant is struggling that quarter

**Responsibilities**

- Drive OEE, scrap, and safety performance across four plants against board-approved targets
- Lead the annual capital plan and defend it to the operating committee
- Standardize the launch process so new customer programs stop depending on individual heroics
- Build and assess plant leadership talent, including succession for two plant managers near retirement
- Represent operations in customer quality escalations

---

## JD005 — Capital Programs Director

- **jd_id:** JD005
- **Company:** Ninebark Regional Water Authority
- **Title:** Capital Programs Director
- **Seniority:** Director
- **Location:** Portland, OR — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p05

**About the role**

Ninebark Regional Water Authority serves 610,000 residents across nine member jurisdictions and is entering the largest capital cycle in its history: treatment plant upgrades, seismic resilience work, and pipeline replacement totaling $740M over eight years. The Capital Programs Director reports to the Executive Director and is accountable to a member-appointed board. This is a classified position; a full background check and financial disclosure are required prior to appointment.

**Requirements**

- Ten years of progressively responsible experience delivering public infrastructure capital programs
- Bachelor's degree in engineering, planning, public administration, or a related field; a master's degree may substitute for two years of experience
- Demonstrated management of a capital portfolio valued at $200M or more
- You know public procurement law, alternative delivery methods, and contract administration
- Experience with federal grant compliance and the reporting obligations attached to it
- Proficiency with scheduling and cost-control systems; the Authority uses Primavera P6
- Demonstrated ability to communicate technical programme status to elected and appointed officials
- Experience with utility asset management planning is desirable

**Responsibilities**

- Direct delivery of the eight-year capital improvement programme, including schedule, budget, and change control
- Supervise six project managers and administer the on-call consultant bench
- Prepare monthly programme reports and quarterly board presentations
- Coordinate permitting and right-of-way sequencing with member jurisdictions
- Maintain the programme risk register and escalate items exceeding delegated authority

---

## JD006 — Retail Operations Analyst

- **jd_id:** JD006
- **Company:** Bellrose Outfitters
- **Title:** Retail Operations Analyst
- **Seniority:** Individual contributor
- **Location:** Charlotte, NC — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p06

**About the role**

Bellrose runs 88 outdoor and apparel stores in the Southeast. Our operations team makes labour, replenishment, and shrink decisions for all of them, and right now it makes those decisions off spreadsheets that four different people maintain. We want an analyst who has stood behind a register, not only in front of a dashboard — someone who can tell when a number is wrong because the store process is wrong. You will sit with the Director of Store Operations.

**Requirements**

- Three years in retail, analytics, or some combination; store experience counts heavily here
- SQL good enough to write your own joins and window functions against a transaction table
- Tableau or a comparable BI tool, including building something a district manager will actually open on a Monday
- Strong Excel, ideally including Power Query
- You can explain a labour model to a store manager without using the word "model"
- Comfort with ambiguity — several of our metrics are defined three ways and part of this job is picking one
- Helpful but not required: experience with workforce management or replenishment systems

**Responsibilities**

- Build and maintain the weekly labour, shrink, and in-stock reporting for 88 stores
- Partner with field leaders to diagnose underperforming locations
- Design and read simple tests, such as staffing changes piloted in a small store group
- Replace three legacy spreadsheets with governed reporting
- Document metric definitions so the company stops arguing about them

---

## JD007 — Senior Vice President, Supply Chain

- **jd_id:** JD007
- **Company:** Kettleman Foods
- **Title:** Senior Vice President, Supply Chain
- **Seniority:** Vice president
- **Location:** Memphis, TN — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p07

**About the role**

Kettleman Foods is a $2.4B branded and private-label food manufacturer with nine plants and seven distribution centers. Our supply chain has been managed as three separate functions — plan, make, deliver — and the seams cost us service and cash. The SVP role consolidates all three under one leader reporting to the CEO, with a seat on the executive committee and a standing agenda item at the board's operations review.

**Requirements**

- Fifteen-plus years in supply chain with at least five at the vice president level or above
- Full P&L or large budget ownership; ours is roughly $220M in logistics and warehousing spend alone
- You have led a network design study through to a board-approved capital decision
- WMS or TMS implementation experience across multiple sites, ideally including at least one cutover you would describe as painful
- S&OP ownership where demand, supply, and finance land on one number
- Organizational design experience: you have restructured a function and kept the people you wanted to keep
- MBA or equivalent commercial grounding preferred
- Food, beverage, or another regulated consumer environment is a plus; temperature-controlled experience especially

**Responsibilities**

- Lead planning, manufacturing logistics, warehousing, and transportation as one organisation
- Own service, cost per case, and working capital targets set with the CEO
- Present network and capital strategy to the board twice a year
- Build the leadership bench across seven direct reports
- Chair the monthly executive S&OP

---

## JD008 — Director of Product, Automation

- **jd_id:** JD008
- **Company:** Quillbase
- **Title:** Director of Product, Automation
- **Seniority:** Director
- **Location:** Seattle, WA — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p08

**About the role**

Quillbase gives operations teams at mid-market companies a way to build workflows without engineering. We have 5,800 paying accounts and an automation surface that is now the reason most of them renew. We are creating a Director of Product role over automation because one senior PM can no longer carry an area that touches three squads and every enterprise renewal conversation. Reports to the VP Product; two PMs report to you on day one.

**Requirements**

- Six or more years in product management, with meaningful time on a B2B platform
- Experience owning a revenue-bearing area — retention, expansion, or a pricing tier you helped design
- You run real discovery. We will ask about interviews you did and features you killed because of them
- Fluent enough in SQL and a product analytics tool to answer your own questions
- API product experience, including versioning and deprecation decisions that affected integrators
- First-line management experience, or a strong case that you are ready for it
- Executive communication: quarterly roadmap reviews here include customers in the room

**Responsibilities**

- Set automation strategy across three squads and defend the sequencing
- Manage and grow two product managers
- Own adoption and net revenue retention for the area
- Partner with sales and CS on packaging changes to the automation tier
- Run the customer advisory session on automation each quarter

---

## JD009 — Vice President of Clinical Operations, Post-Acute

- **jd_id:** JD009
- **Company:** Harborlight Senior Living
- **Title:** Vice President of Clinical Operations
- **Seniority:** Vice president
- **Location:** Baltimore, MD — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p09

**About the role**

Harborlight operates 11 skilled nursing and assisted living communities across Maryland and southern Pennsylvania, about 1,400 licensed beds. Quality is uneven: four communities hold strong CMS ratings, three are on a corrective plan, and the rest sit somewhere in between. The VP of Clinical Operations is accountable for closing that spread. The role reports to the Chief Operating Officer and works closely with the Chief Medical Officer.

**Requirements**

- Active RN license, or eligibility for licensure in Maryland; MSN or MHA strongly preferred
- Ten years in post-acute or long-term care nursing leadership, including multi-site accountability
- You have moved a facility's CMS Five-Star rating and can walk through exactly which measures you attacked
- Survey management experience with state agencies, including plan-of-correction authorship
- Command of MDS accuracy and its relationship to both quality measures and reimbursement
- Budget accountability across sites, with specific work on agency spend reduction
- Comfortable with PointClickCare reporting
- Experience with value-based arrangements or ACO partnerships is welcome, since two of our markets are moving that direction

**Responsibilities**

- Own clinical quality, survey outcomes, and readmission performance across 11 communities
- Lead the turnaround plan for the three communities under corrective action
- Standardize clinical policy and competency validation across the portfolio
- Build the staffing model, including internal float capacity, to reduce agency reliance
- Report quality performance to the board's quality committee each quarter

---

## JD010 — Manager, Network Planning

- **jd_id:** JD010
- **Company:** Windrose Air Group
- **Title:** Manager, Network Planning
- **Seniority:** Manager
- **Location:** Chicago, IL — On-site
- **Employment type:** Full-time
- **Targets:** p10

**About the role**

Windrose Air Group flies 94 narrowbody aircraft on a hub-and-spoke domestic network with two focus cities. Network planning currently sits under commercial as a three-analyst team without a dedicated leader, and the gap shows up every schedule publication. We are hiring a manager to own the team, the schedule, and the argument with fleet and crew planning that precedes every change.

**Requirements**

- Five to eight years in airline network planning, scheduling, or route profitability analysis
- You have built or maintained a schedule for a real operating carrier, not only studied one
- Fluency with DOT O&D data and competitive capacity sources
- Python or an equivalent language for optimisation and modelling work; our connection-bank tooling is Python
- SQL against a commercial data warehouse
- Slot filing experience for constrained airports
- Some supervisory experience preferred; this team has three analysts and a summer intern programme
- Bachelor's degree in aviation management, economics, industrial engineering, or similar

**Responsibilities**

- Own schedule design across the network, including hub bank structure and seasonal builds
- Lead route performance reviews and recommend additions, cuts, and re-gauges
- Manage slot compliance and filings for two constrained airports
- Coordinate freeze windows with crew planning, maintenance, and airports
- Develop three analysts and set the standard for how work gets documented

---

## JD011 — Senior Manager, Pricing and Analytics

- **jd_id:** JD011
- **Company:** Loftwren
- **Title:** Senior Manager, Pricing and Analytics
- **Seniority:** Senior manager
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p01

**About the role**

Loftwren builds pricing software for short-term rental operators — the people managing 200 to 4,000 units who cannot afford a revenue team. Our customers pay us to price better than they would themselves, so pricing quality is the product, not a support function. This role owns the pricing logic our models apply and translates operator instinct into rules that scale. You will work between the data science team and customer-facing operators.

**Requirements**

- Six years in revenue management, pricing, or commercial analytics in travel, hospitality, or a marketplace
- Real fluency in demand forecasting and the ways forecasts fail — compression, cannibalization, stale comp sets
- Python for analysis, particularly pandas; you do not need to ship production models but you need to read them
- SQL and hands-on time with a modern warehouse
- Experience explaining a pricing recommendation to a skeptical operator who has run their own rates for a decade
- Prior work on rate parity or distribution channel behavior
- Nice to have: you have written or specified requirements for a pricing engine rather than only using one

**Responsibilities**

- Define pricing rules and guardrails that ship into the product
- Review model output weekly and flag where recommendations diverge from market reality
- Run onboarding pricing reviews with new enterprise operators
- Partner with data science on feature ideas grounded in operator behavior
- Publish the quarterly market demand outlook customers rely on

---

## JD012 — Operations Manager, Home Infusion

- **jd_id:** JD012
- **Company:** Wexley Care Partners
- **Title:** Operations Manager, Home Infusion
- **Seniority:** Manager
- **Location:** Columbus, OH — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p02

**About the role**

We deliver infusion therapy in patients' homes across Ohio and Kentucky — about 2,600 active patients, a pharmacy in Columbus, and 70 field nurses who mostly work alone. The operations manager keeps that dispersed system coherent: nurse scheduling, referral intake, pharmacy coordination, and the escalation path when something goes wrong at 9pm in someone's living room. You report to the Regional Director of Operations.

**Requirements**

- Five years in healthcare operations, at least two managing clinical or field staff
- Clinical license helpful; a nursing background is common in this role but not mandatory
- Scheduling and capacity planning for a mobile workforce, or a strong analog from a site-based setting
- You have designed or rebuilt a workflow that crossed pharmacy, clinical, and intake teams
- Familiarity with infusion therapy, specialty pharmacy, or home health regulatory requirements
- Comfort with productivity and quality dashboards; ours are ugly and could use an owner with opinions
- Retention work matters here — turnover among field nurses is our single biggest cost driver

**Responsibilities**

- Own daily scheduling and staffing for 70 field nurses across two states
- Manage referral-to-first-dose turnaround and report it weekly
- Coordinate with the pharmacy team on preparation sequencing and delivery windows
- Handle clinical escalations and after-hours on-call rotation coverage
- Lead accreditation readiness for the home infusion service line

---

## JD013 — Staff Software Engineer, Core Ledger

- **jd_id:** JD013
- **Company:** Cadenza Payments
- **Title:** Staff Software Engineer, Core Ledger
- **Seniority:** Senior individual contributor
- **Location:** Austin, TX — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p03

**About the role**

Cadenza processes card and ACH volume for regional banks that would rather not build their own rails. The core ledger team is six engineers and owns the system of record for every transaction those banks see. Our current staff engineer is moving to the fraud org, and we need a replacement who is genuinely at home in accounting invariants, retries, and settlement edge cases.

**Requirements**

- 8+ years writing production backend code
- Direct experience with ledgers, accounting systems, or transaction processing
- Go, Java, or C# at depth; we run Go and Java side by side
- PostgreSQL, including query tuning and large data migrations
- Kubernetes and Terraform familiarity — you will not run the platform but you will debug on it
- Card authorization flow knowledge, including how a reversal actually behaves in the wild
- On-call participation is expected and shared across the team
- Bonus points for anyone who has taken systems out of PCI scope rather than adding to it

**Responsibilities**

- Design and build ledger features against a hard correctness bar
- Improve reconciliation coverage against bank and processor settlement files
- Reduce authorization path latency without weakening controls
- Write the design documents that other teams build against
- Share on-call and lead postmortems for ledger-impacting incidents

---

## JD014 — Plant Manager

- **jd_id:** JD014
- **Company:** Brightfield Provisions
- **Title:** Plant Manager
- **Seniority:** Director
- **Location:** Holland, MI — On-site
- **Employment type:** Full-time
- **Targets:** p04

**About the role**

Brightfield Provisions makes refrigerated sauces and dressings for grocery private label. Our Holland plant runs 280 people over three shifts and has been without a permanent plant manager for seven months, covered by an interim from corporate. The site has good equipment, a decent safety record, and a schedule attainment problem nobody has fixed. Reports to the VP of Operations.

**Requirements**

- You have spent a decade in manufacturing, at least three of those years as a plant manager or senior operations leader
- Food manufacturing is preferred but not required — we have hired successfully from automotive and consumer durables before
- SQF, HACCP, and food safety systems; if you are coming from outside food, expect to learn these fast and formally
- Lean or Six Sigma deployment at site level, not just training
- P&L ownership including labour, material, and overhead variance
- Union relationship experience; our plant is represented and the contract opens in two years
- Capital project delivery from justification through commissioning
- Bachelor's degree in engineering or operations, or equivalent plant experience

**Responsibilities**

- Own safety, quality, service, and cost for the Holland site
- Fix schedule attainment, starting with changeover performance on the two bottleneck lines
- Lead the site leadership team of seven and rebuild the supervisor development pipeline
- Deliver the annual capital plan, including a case packer replacement already approved
- Host customer and third-party audits

---

## JD015 — Senior Project Manager, Aviation Capital Projects

- **jd_id:** JD015
- **Company:** Rivergate Port and Airport Authority
- **Title:** Senior Project Manager, Aviation Capital Projects
- **Seniority:** Senior individual contributor
- **Location:** Portland, OR — On-site
- **Employment type:** Full-time
- **Targets:** p05

**About the role**

The Authority owns a regional airport, two marine terminals, and the industrial land around both. Aviation capital work over the next six years includes a terminal expansion, an apron rehabilitation, and a taxiway realignment funded largely through federal aviation grants. This position sits in the Capital Delivery division and manages assigned projects from programming through closeout. Appointment is subject to a security threat assessment and badging.

**Requirements**

- Minimum seven years managing public capital projects, including at least three years as the responsible project manager
- Federal grant-funded project experience; FAA programme familiarity preferred, FTA or FHWA experience considered comparable
- Knowledge of environmental review requirements under NEPA and applicable state law
- Demonstrated change-order and claims management on construction contracts
- Primavera P6 or comparable scheduling software
- Experience coordinating with utility owners, permitting agencies, and adjacent jurisdictions
- Written communication strong enough for board memoranda and grant reporting
- Professional Engineer license, AICP, or PMP certification is desirable

**Responsibilities**

- Manage assigned aviation projects across scope, schedule, budget, and grant compliance
- Prepare and administer consultant and construction contracts
- Lead design review gates and document decisions for the project record
- Prepare grant applications, reimbursement requests, and closeout documentation
- Brief division leadership and prepare materials for Authority commission meetings

---

## JD016 — Business Analyst, Distribution Operations

- **jd_id:** JD016
- **Company:** Palladia Logistics
- **Title:** Business Analyst, Distribution Operations
- **Seniority:** Individual contributor
- **Location:** Charlotte, NC — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p06

**About the role**

Palladia runs contract warehousing for consumer brands out of five facilities in the Carolinas and Georgia. Site leaders make labour and throughput decisions daily and mostly by feel. We want a business analyst who can put numbers underneath those decisions and, more importantly, get the site leaders to trust the numbers. Reports to the Director of Operations Excellence. Expect one day a week on a warehouse floor.

**Requirements**

- Two to five years in an analytical role; operations, retail, or supply chain backgrounds all work
- SQL — you will be querying labour, order, and inventory tables directly
- Dashboard building in Power BI or Tableau
- Excel modelling that survives someone else opening the file
- Ability to translate an operational question into a data question and back again
- Curiosity about the physical process; the best analysts here have walked the pick path
- Not required, but valued: any exposure to labour standards, scheduling systems, or inventory accuracy programs

**Responsibilities**

- Build reporting on labour productivity, throughput, and inventory accuracy across five sites
- Investigate performance gaps and present findings to site general managers
- Support quarterly customer business reviews with operational data
- Standardize metric definitions across sites that currently calculate them differently
- Automate recurring manual reports, starting with the daily site summary

---

## JD017 — Vice President of Operations

- **jd_id:** JD017
- **Company:** Ironbark Fulfillment
- **Title:** Vice President of Operations
- **Seniority:** Vice president
- **Location:** Memphis, TN — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p07

**About the role**

Ironbark is a third-party logistics provider running eight fulfillment centers for apparel, health, and home brands. Growth has come from signing customers faster than we can operationalize them, and three of our largest accounts are underwater on cost to serve. The VP of Operations owns all eight sites, the transportation function, and the operating model that decides whether a new customer is profitable. Reports to the President.

**Requirements**

- Twelve-plus years in distribution, fulfillment, or 3PL operations, with several at the director level or higher
- Multi-site accountability covering at least 1,000 associates in total
- Transportation procurement and carrier contract negotiation
- WMS deployment or major upgrade experience across more than one facility
- You can build a cost-to-serve model and use it to renegotiate a customer contract
- Automation evaluation: you have run or advised a capital case for goods-to-person, sortation, or similar
- Comfort in front of customers, including quarterly business reviews where the news is bad
- Experience with a peak season that more than doubles volume

**Responsibilities**

- Run daily and strategic operations across eight fulfillment centers
- Own the operating budget, labour productivity targets, and cost per unit shipped
- Rebuild the customer onboarding process so new accounts launch to a standard
- Lead the automation capital plan for the two highest-volume sites
- Develop eight general managers, including two hired within the last year

---

## JD018 — Principal Product Manager, Platform APIs

- **jd_id:** JD018
- **Company:** Sunderly
- **Title:** Principal Product Manager, Platform APIs
- **Seniority:** Senior individual contributor
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p08

**About the role**

Sunderly sells embedded financial infrastructure — accounts, cards, and payouts that other software companies put inside their own products. Our APIs are the product; the dashboard is a courtesy. We are hiring a principal PM to own the developer-facing surface: what we expose, how we version it, and how we retire things without burning the trust of the 340 companies building on us. You will report to the Chief Product Officer and work daily with three engineering leads.

**Requirements**

- Seven years in product, with at least three on developer-facing or API products
- You have made a deprecation decision and lived through the customer conversations
- Technical enough to read an OpenAPI spec, argue about pagination, and write your own test calls
- SQL and analytics fluency; we expect PMs to pull their own adoption numbers
- Experience in payments, banking, or another regulated space — you should know why compliance says no sometimes
- Written communication that stands on its own, because half this company is asynchronous
- Prior work with a developer relations or solutions engineering function is a plus

**Responsibilities**

- Own the API roadmap, versioning policy, and deprecation process
- Run discovery with integration partners and translate it into interface decisions
- Define adoption and reliability metrics for each surface, and report on them monthly
- Partner with compliance on what can be exposed and under what controls
- Write the public-facing changelog and migration guides

---

## JD019 — Chief Nursing Officer

- **jd_id:** JD019
- **Company:** Blue Heron Health Alliance
- **Title:** Chief Nursing Officer
- **Seniority:** Vice president
- **Location:** Hagerstown, MD — On-site
- **Employment type:** Full-time
- **Targets:** p09

**About the role**

Blue Heron Health Alliance is a 190-bed community hospital with an attached rehabilitation unit and three outpatient clinics, serving a largely rural catchment in western Maryland. Our CNO is retiring after 16 years. The successor joins a stable executive team, an engaged medical staff, and a nursing workforce that has been strained by travel-labour dependence since 2021. The role reports to the CEO and sits on the board's quality committee.

**Requirements**

- Current or eligible Maryland RN license and an MSN, DNP, or MHA
- Ten years of nursing leadership with at least five at the director level or above
- Acute care accountability; post-acute or rehabilitation experience is a genuine asset given our unit mix
- Regulatory command — survey preparation, plan-of-correction authorship, and the discipline to sustain corrections
- Demonstrated reduction in contract labour spend while protecting quality
- Nursing budget ownership at scale, with credible variance management
- Track record building clinical career ladders and retention programs
- Comfort presenting to a community board that includes non-clinical members

**Responsibilities**

- Lead nursing practice, quality, and workforce strategy across the hospital and clinics
- Own the nursing budget and the plan to reduce agency reliance
- Chair the nursing leadership council and partner with medical staff on care standards
- Direct accreditation and state survey readiness
- Report quality and safety outcomes to the board quarterly

---

## JD020 — Manager, Commercial Network Planning

- **jd_id:** JD020
- **Company:** Northline Coach Company
- **Title:** Manager, Commercial Network Planning
- **Seniority:** Manager
- **Location:** Chicago, IL — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p10

**About the role**

Northline runs intercity coach service across 11 midwestern states, about 340 daily departures. Schedules are set the way they were in 2009: incrementally, defensively, and without much reference to what demand is actually doing. We want someone who has done rigorous network planning in a transport business — air, rail, or coach — to bring that discipline here. The team is two analysts today and will be four by next year.

**Requirements**

- Five years in network planning, scheduling, or capacity analysis for a passenger transport operator
- Route profitability modelling, including allocation of fixed cost to a route decision
- Python or R for modelling; our current tooling is Python and Excel and both are staying
- SQL against a booking and revenue warehouse
- You have recommended killing a route and made the case stick
- Working understanding of crew and equipment constraints — a schedule that ignores them is fiction
- Team leadership or mentoring experience
- We would like someone who has handled regulatory schedule filings, though our requirements are lighter than aviation

**Responsibilities**

- Own the seasonal schedule build and the network change calendar
- Model route additions, cuts, and frequency changes and present recommendations to commercial leadership
- Set the equipment assignment plan with maintenance and crew scheduling
- Produce the monthly competitive capacity view for the executive team
- Build the analytical standard the growing team will work to

---

## JD021 — Senior Manager, Revenue Science

- **jd_id:** JD021
- **Company:** Wanderfare Group
- **Title:** Senior Manager, Revenue Science
- **Seniority:** Senior manager
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p01, p10

**About the role**

Wanderfare Group runs a travel marketplace covering flights, hotels, and packaged trips for about nine million annual bookings. Revenue science sits between commercial and data science and is responsible for how we price our own margin, how we allocate inventory across partners, and how we forecast demand for planning. The function was built by two people and needs a leader who has priced real inventory in a real operating business.

**Requirements**

- Six to ten years in revenue management, network planning, pricing, or a closely related commercial analytics discipline
- Airline, hotel, cruise, or rail background — we care that you have priced perishable inventory, less about which kind
- Demand forecasting at a level where you can defend the model and its errors
- Python, specifically pandas and numpy, for your own analysis
- SQL, comfortably, against large booking tables
- You have presented a pricing or capacity recommendation to executives who disagreed with it
- Experience managing analysts, or a clear intention to move that way
- Familiarity with competitive capacity or rate-shopping data sources

**Responsibilities**

- Own the demand forecast used for commercial planning
- Set margin and pricing rules across flight and package inventory
- Lead a team of three analysts, growing to five
- Partner with data science on model development and with commercial on adoption
- Publish the weekly demand and yield read for the leadership team

---

## JD022 — Engineering Manager, Payments

- **jd_id:** JD022
- **Company:** Halberd Commerce
- **Title:** Engineering Manager, Payments
- **Seniority:** Manager
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p03

**About the role**

Halberd builds checkout and payment infrastructure for subscription businesses. The payments group is 14 engineers across two teams, currently reporting to a director who is stretched across four groups. We want a manager who came up as an engineer in payments and still reads the code — not to write it, but to know when a design review is going somewhere bad. Reports to the Director of Engineering.

**Requirements**

- Eight or more years engineering experience with recent depth in payments or financial systems
- Two years managing engineers, or extensive tech-lead work with a genuine appetite for the management path
- Strong systems background: distributed services, event streaming, and the failure modes of both
- You have run an on-call rotation and improved it measurably
- Experience with PCI-DSS or a comparable compliance regime in an engineering context
- Hiring and performance management, including at least one difficult conversation you would describe honestly
- Familiarity with card network rules and settlement timing
- Public speaking or internal tech-talk experience is welcome; we run a monthly engineering forum

**Responsibilities**

- Manage two payments teams, including career development for nine engineers
- Own delivery commitments and the quarterly planning cycle for the group
- Improve operational health: page volume, incident frequency, and time to detect
- Partner with product on roadmap sequencing and technical trade-offs
- Hire three engineers over the next two quarters

---

## JD023 — Operations Analytics Analyst

- **jd_id:** JD023
- **Company:** Bramble and Rye Hospitality Group
- **Title:** Operations Analytics Analyst
- **Seniority:** Individual contributor
- **Location:** Charlotte, NC — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p06

**About the role**

We operate 47 restaurants across four states, three brands, and a catering business that behaves like a fourth. Nobody currently owns the numbers between the POS and the monthly P&L, which means general managers get their results three weeks after they could have done anything about them. This is a new role. You will report to the Director of Operations and spend real time in restaurants, because a labour number without context is worse than no number.

**Requirements**

- Two or more years working with operational data — restaurant, retail, hospitality, or a similar high-transaction environment
- SQL for pulling transaction, labour, and inventory data yourself
- Tableau or Power BI, plus the judgment to keep a dashboard small enough to be used
- Excel or Google Sheets at a level where you can build a scheduling model from scratch
- Ability to write a short, plain summary of what a number means for a general manager who has six minutes
- Willingness to travel to restaurants roughly twice a month
- Any experience with labour scheduling or food cost systems is a real advantage

**Responsibilities**

- Deliver weekly labour, food cost, and sales reporting by location and brand
- Diagnose margin gaps at underperforming restaurants and brief the operations directors
- Build the analytical case for menu and staffing changes before they roll out
- Support the annual budget cycle with location-level forecasts
- Train general managers to read their own reports

---

## JD024 — Senior Director, Quality and Regulatory Affairs

- **jd_id:** JD024
- **Company:** Verdigris Care Network
- **Title:** Senior Director, Quality and Regulatory Affairs
- **Seniority:** Senior manager
- **Location:** Baltimore, MD — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p02, p09

**About the role**

Verdigris Care Network operates 19 post-acute and ambulatory sites across the mid-Atlantic under three different licensure categories, which means three different regulatory calendars and, until now, three different ways of preparing for them. The Senior Director of Quality and Regulatory Affairs consolidates that work into one programme. The role reports to the Chief Quality Officer and holds no direct site authority — influence here comes from being right and being early.

**Requirements**

- Eight years in healthcare quality, regulatory affairs, or clinical operations with quality accountability
- Clinical licensure or an advanced degree in a health field; we have hired nurses, administrators, and pharmacists into this seat
- Survey and accreditation experience across more than one regulatory body — CMS, Joint Commission, or state agencies
- Root cause analysis and corrective action methodology you can teach, not just perform
- Data literacy sufficient to challenge a quality dashboard's construction, not only its results
- Policy authorship for a multi-site organisation
- Strong facilitation skills; you will chair committees composed of people who do not report to you
- Experience with value-based reporting programs is helpful

**Responsibilities**

- Build one integrated survey readiness programme covering all 19 sites
- Lead root cause investigations for serious safety events and track corrective actions to closure
- Own the quality measure reporting calendar and its accuracy
- Standardize clinical policy across three licensure types
- Prepare quarterly quality reporting for the board and for network payer partners

---

## JD025 — Compliance Manager, Installment Lending

- **jd_id:** JD025
- **Company:** Coppervane Financial
- **Title:** Compliance Manager, Installment Lending
- **Seniority:** Manager
- **Location:** Salt Lake City, UT — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p11

**About the role**

Coppervane originates closed-end installment loans through a direct-to-consumer channel in 28 states and expects to be in 40 by the end of next year. The compliance function today is two analysts and an outside law firm, which is not a structure that survives a first examination. This role reports to the Chief Risk Officer and takes ownership of the consumer compliance programme end to end.

**Requirements**

- 6+ years in consumer financial services compliance, at least two of them managing people
- Working command of TILA/Reg Z, ECOA, and UDAAP as applied to unsecured consumer credit
- You have sat across from an examiner and can describe how that went
- State licensing experience, including NMLS filings and multi-state expansion sequencing
- Comfort building monitoring and testing plans from nothing rather than inheriting one
- Familiarity with Reg F and third-party collections oversight
- JD or CRCM helpful but not a gate; we care what you have actually run

**Responsibilities**

- Own the annual compliance risk assessment and the monitoring calendar that follows from it
- Review marketing, disclosures and product changes before launch, with a published turnaround commitment
- Run quarterly fair lending testing and brief results to the risk committee
- Manage two analysts and the co-sourced testing vendor
- Serve as the primary contact for state regulators and examination requests

---

## JD026 — Director, Regulatory Affairs

- **jd_id:** JD026
- **Company:** Halewood Bancorp
- **Title:** Director, Regulatory Affairs
- **Seniority:** Director
- **Location:** Denver, CO — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p11

**About the role**

Halewood is a $9B community bank holding company that has grown through three acquisitions since 2021 and is now large enough that its regulatory posture is a board-level topic. The Director of Regulatory Affairs is a new seat, created to consolidate examination management, regulatory change tracking and enterprise policy governance under one owner. Reports to the General Counsel with a dotted line to the Chief Compliance Officer.

**Requirements**

- Roughly eight years across bank or nonbank regulatory compliance, with meaningful time at director or deputy level
- Demonstrated ownership of a supervisory examination cycle from information request through response and remediation tracking
- Deep familiarity with the consumer regulatory perimeter: fair lending, UDAAP, complaint management, marketing review
- Deposit-side regulation exposure — Reg E, Reg DD, overdraft practices — is a meaningful part of this book
- Ability to write for a board audience without losing the legal substance
- Experience integrating compliance functions after an acquisition would put you ahead of most applicants

**Responsibilities**

- Coordinate all examinations and act as the single point of contact for the bank's prudential regulators
- Maintain the regulatory change management process across 14 business lines
- Chair the enterprise policy committee and enforce the review cadence
- Build and lead a team of five, two of whom transfer in from existing compliance teams

---

## JD027 — Senior Manager, Model Risk Governance

- **jd_id:** JD027
- **Company:** Ardent Ledger Group
- **Title:** Senior Manager, Model Risk Governance
- **Seniority:** Senior manager
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p11, p18

**About the role**

We are a fifteen-year-old specialty lender that recently moved most of its underwriting decisions onto machine-learned models, and our governance did not move with it. Ardent needs someone who sits between the modelling team and the second line, understands both dialects, and can defend the framework to a validator. The role reports into Enterprise Risk.

**Requirements**

- Background spanning credit modelling and risk governance — we will consider strong candidates from either side who have credibly worked with the other
- Practical understanding of SR 11-7 style model risk management: inventory, tiering, validation, ongoing monitoring
- You have prepared documentation that survived an independent third-party model validation
- Fluency in the fair lending exposure of statistical underwriting models, including disparate impact and less-discriminatory-alternative analysis
- Enough Python or SQL to read a modeller's notebook and ask an uncomfortable question
- Prior work on CECL or IFRS 9 loss forecasting governance is a plus
- Clear writer; most of the deliverables here are documents

**Responsibilities**

- Maintain the model inventory and risk tiering across originations, collections and fraud
- Run the annual validation schedule and manage the external validation vendor
- Set monitoring thresholds with modelling teams and escalate breaches
- Prepare the model risk section of quarterly board risk reporting

---

## JD028 — Quality Engineer, Machining

- **jd_id:** JD028
- **Company:** Kestrel Precision Components
- **Title:** Quality Engineer, Machining
- **Seniority:** Individual contributor
- **Location:** Greenville, SC — On-site
- **Employment type:** Full-time
- **Targets:** p12

**About the role**

Kestrel machines high-tolerance shafts, housings and hydraulic fittings for aerospace and defence primes out of two South Carolina plants. A retirement and a new customer award have opened a quality engineering seat covering six cells on the Greenville site. You report to the Quality Manager and work day shift with occasional off-shift coverage during launches.

**Requirements**

- Degree in engineering or a technical field, plus 3–7 years in a machining or precision manufacturing environment
- Hands-on SPC — setting control limits, reacting to signals, and defending the plan to a customer
- 8D discipline and the patience to run a real root cause instead of a plausible one
- GD&T interpretation from customer prints
- AS9100 or IATF experience, including participation in internal audits
- Minitab or an equivalent statistical package
- CMM programming exposure is welcome; we run PC-DMIS on three machines

**Responsibilities**

- Own quality for six cells: control plans, FMEAs, reaction plans and first article inspections
- Lead customer corrective actions and hold the 30-day window
- Assemble and submit PPAP packages for new part numbers
- Run gauge R&R studies and drive measurement system improvements with the metrology team
- Coach operators on in-process checks and what the charts are telling them

---

## JD029 — Supplier Quality Engineer II

- **jd_id:** JD029
- **Company:** Vandry Surgical
- **Title:** Supplier Quality Engineer II
- **Seniority:** Senior individual contributor
- **Location:** Warsaw, IN — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p12

**About the role**

Vandry Surgical designs and sells orthopaedic implants and the instrument trays that go with them. About 70% of what we ship is made by someone else, so supplier quality is not a support function here — it is the quality system. This position joins a team of five and travels to supplier sites roughly 25% of the time.

**Requirements**

- Five years or more in quality engineering, ideally including responsibility for external manufacturing partners
- Strong grounding in statistical methods: capability studies, sampling plans, measurement system analysis
- Root cause investigation on supplier-caused nonconformances, with the written record to match
- Reading and challenging GD&T on machined and moulded components
- Medical device regulation — ISO 13485, 21 CFR 820, and risk management under ISO 14971 — or a credible plan for getting there fast
- Willingness to be the person who tells a supplier their corrective action is not adequate

**Responsibilities**

- Qualify new suppliers and run process validations (IQ/OQ/PQ) at their sites
- Disposition nonconforming material and drive supplier corrective action to closure
- Approve incoming inspection plans and adjust sampling based on supplier performance
- Represent supplier quality in design transfer for two active product programmes

---

## JD030 — Continuous Improvement Manager

- **jd_id:** JD030
- **Company:** Brightloom Foods
- **Title:** Continuous Improvement Manager
- **Seniority:** Manager
- **Location:** Cedar Rapids, IA — On-site
- **Employment type:** Full-time
- **Targets:** p12, p19

**About the role**

Brightloom bakes and packages shelf-stable snacks for private label and two of our own brands. We put a lot of capital into the Cedar Rapids site over the last three years and the equipment is now better than the routines running it. This role is here to fix that gap. You will report to the Plant Manager and have one CI engineer reporting to you.

**Requirements**

- 5+ years in food, beverage or another regulated manufacturing environment
- Hands-on SMED work — you can tell us what a changeover looked like before and after
- OEE and downtime analysis, and the discipline to distinguish a data problem from a process problem
- Facilitation skill: most of this job is running kaizen events with people who did not ask for one
- Working knowledge of HACCP and either SQF or BRC audit expectations
- Green Belt or Black Belt certification
- Autonomous maintenance routines owned at the operator level, not by the maintenance department

**Responsibilities**

- Build the site's annual CI plan and tie each project to a line on the plant P&L
- Facilitate kaizen and rapid changeover events across four production areas
- Stand up tier boards and daily management on shifts that do not yet have them
- Train supervisors and operators in problem solving and standard work
- Report savings and attainment monthly to the plant leadership team

---

## JD031 — Vice President, Customer Success

- **jd_id:** JD031
- **Company:** Tessellate Software
- **Title:** Vice President, Customer Success
- **Seniority:** Vice president
- **Location:** Boston, MA — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p13

**About the role**

Tessellate sells a construction project accounting platform to mid-market general contractors. We crossed $90M in ARR last year on the strength of new logos, and the board has now made retention the number one company priority for the coming two years. This is a first VP-level customer success hire; the function currently reports into the CRO through two directors.

**Requirements**

- You have led a customer success organisation of 25 people or more
- Ownership of a gross retention number, not just influence over it
- Track record moving retention several points in a business where churn had structural causes, not just service causes
- Experience designing CSM segmentation and capacity models
- Comfort operating Gainsight or a comparable platform as a system of record rather than a reporting toy
- Have carried or designed an expansion quota for a CS team
- Vertical software or a services-heavy customer base preferred

**Responsibilities**

- Set the retention and expansion targets and the operating cadence to hit them
- Rebuild health scoring so the leading indicators arrive early enough to act on
- Own executive relationships for the top accounts and run the escalation path with product
- Hire two directors and restructure the team beneath them
- Present the retention plan and progress to the board quarterly

---

## JD032 — Director of Client Experience

- **jd_id:** JD032
- **Company:** Rowanmere Health Technologies
- **Title:** Director of Client Experience
- **Seniority:** Director
- **Location:** Nashville, TN — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p13

**About the role**

Rowanmere provides revenue cycle software to hospital systems and physician groups. Our clients are large, slow to buy, slower to leave, and extremely unhappy when an implementation slips. The Director of Client Experience owns everything after the contract is signed: implementation, adoption, ongoing service relationships and renewal.

**Requirements**

- Seven or more years in client-facing leadership at a B2B software or services company
- Direct responsibility for renewal outcomes across a book of enterprise accounts
- Experience designing an onboarding programme and shortening time-to-value in a measurable way
- Fluency in running executive business reviews with senior client stakeholders
- Understanding of healthcare provider operations, or a demonstrated history of learning a complicated domain quickly
- HIPAA awareness and comfort working under client security review
- Team leadership across at least two functions

**Responsibilities**

- Lead implementation managers and client success managers as one organisation
- Define the health and adoption metrics that predict renewal and act on them
- Run quarterly business reviews for the twenty largest health system relationships
- Partner with product on a prioritised list of client-blocking defects
- Own the departmental budget and the client-facing technology stack

---

## JD033 — Head of Retention and Growth

- **jd_id:** JD033
- **Company:** Quillon
- **Title:** Head of Retention and Growth
- **Seniority:** Director
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p13

**About the role**

Quillon is a 140-person company selling contract lifecycle tooling to legal and procurement teams. We are profitable, growing about 40% a year, and honest about the fact that our post-sale motion has not kept up. You would be employee number five on the leadership team and would inherit eleven CSMs, a renewals specialist and a support lead.

**Requirements**

- Prior ownership of net and gross retention at a subscription business
- An account-planning motion you built that CSMs actually used, and a clear explanation of why they used it
- Analytical enough to interrogate a churn cohort yourself in Salesforce or SQL
- Experience compensating a customer-facing team, including quota and plan design
- Hiring and levelling: we expect the team to double
- Bonus if you have run support as well as success — the two report into this seat

**Responsibilities**

- Own gross retention, net retention and the renewal forecast
- Segment the book and set coverage ratios that match account value
- Redesign the CSM career ladder and compensation plan
- Build the voice-of-customer loop into the product planning cycle
- Report weekly on pipeline risk in the renewal base

---

## JD034 — Transportation Manager, Outbound

- **jd_id:** JD034
- **Company:** Drayline Distribution
- **Title:** Transportation Manager, Outbound
- **Seniority:** Manager
- **Location:** Fort Worth, TX — On-site
- **Employment type:** Full-time
- **Targets:** p14

**About the role**

Drayline is a regional distributor of building products serving contractors across Texas, Oklahoma and Louisiana. Three distribution centres feed roughly 800 outbound shipments a week, split between company-dedicated tractors and a contracted carrier base. The prior manager retired in April and the desk has been covered by the DC directors since.

**Requirements**

- 5+ years managing outbound truckload and LTL transportation
- Carrier procurement: you have run a lane bid and can explain how you set the award logic
- TMS experience — ours is a mid-market platform, and configuration knowledge matters more than the brand
- Load planning and cube optimisation across mixed-density freight
- DOT and FMCSA compliance, including hours-of-service and CSA scoring
- Supervision of dispatch staff across more than one shift
- Contractor and owner-operator fleet management would be genuinely useful here

**Responsibilities**

- Manage carrier relationships, rates and the quarterly scorecard review
- Direct nine dispatchers and planners across two shifts
- Own on-time-in-full and cost per mile as the two headline metrics
- Attack accessorial spend, starting with detention at the Houston yard
- Coordinate with DC operations on appointment scheduling and dock throughput

---

## JD035 — Director of Transportation

- **jd_id:** JD035
- **Company:** Sablecross Logistics
- **Title:** Director of Transportation
- **Seniority:** Director
- **Location:** Memphis, TN — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p14

**About the role**

Sablecross runs contract logistics for consumer packaged goods clients out of eleven facilities in the southeast. Transportation currently sits inside each site's P&L, which means eleven people negotiating with the same carriers. We are pulling it into one function and this is the person who will lead it.

**Requirements**

- A decade in transportation, including three or more years leading a multi-site or network-level function
- Network-level procurement: annual bids covering hundreds of lanes, not dozens
- Have built or materially rebuilt a transportation budget above $50M
- Experience standing up a centralised function where operations previously ran locally — the change management is the hard part of this job
- Analytics capability, whether that is Power BI, a TMS reporting layer, or a modelling tool
- People leadership through managers, including performance management
- Third-party logistics or dedicated fleet background preferred

**Responsibilities**

- Build the centralised transportation team and its operating model
- Run the annual carrier bid across the full network
- Set and defend the transportation budget with site leadership and finance
- Establish a single set of service and cost metrics reported weekly
- Own client-facing transportation commitments in contract renewals

---

## JD036 — Logistics Manager

- **jd_id:** JD036
- **Company:** Petrichor Beverage Company
- **Title:** Logistics Manager
- **Seniority:** Manager
- **Location:** San Antonio, TX — On-site
- **Employment type:** Full-time
- **Targets:** p14

**About the role**

Petrichor produces sparkling water and cold-brew coffee at two plants and ships to distributors, club retail and a small but growing direct channel. Logistics has been handled inside the supply chain planning team; the volume no longer allows that. This position reports to the Director of Supply Chain and is the first dedicated logistics hire.

**Requirements**

- Degree in supply chain, logistics or a related discipline, or the equivalent in years on the dock
- Four to eight years across inbound and outbound freight
- Rate negotiation with truckload carriers and freight brokers
- Temperature-sensitive or beverage freight handling, including the pallet economics that go with it
- Freight audit and payment — someone here needs to catch the invoices that are wrong
- Excel modelling at a level where you build the analysis rather than request it
- Retail vendor compliance programmes and chargeback avoidance, ideally with a club or mass customer

**Responsibilities**

- Tender, track and troubleshoot outbound loads to distributors and retail DCs
- Negotiate annual rates and manage a base of roughly 30 carriers
- Own freight cost per case and report it monthly against plan
- Improve trailer utilisation on the mixed-SKU distributor lanes
- Manage the inbound flow of packaging materials between the two plants

---

## JD037 — Grants and Contracts Administrator, Senior

- **jd_id:** JD037
- **Company:** Havenridge County Human Services Department
- **Title:** Senior Grants and Contracts Administrator
- **Seniority:** Senior individual contributor
- **Location:** Albuquerque, NM — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p15

**About the role**

The Department administers behavioural health, housing stability and child welfare programmes funded by a mix of federal formula awards, state general fund appropriations and discretionary grants. This position sits in the Fiscal Services Bureau and carries the department's most complex award portfolio, including two awards currently under corrective action. Position is classified; salary is set by the county schedule and is non-negotiable.

**Requirements**

- Bachelor's degree in public administration, accounting or a related field, plus four years of grants administration experience; additional qualifying experience may substitute for education on a year-for-year basis
- Fluency in 2 CFR Part 200, including procurement standards and allowability determinations
- Preparation of federal financial reports (SF-425 and SF-270) and drawdown reconciliation
- Subrecipient monitoring, including risk assessment and on-site review documentation
- Single audit preparation and response to findings
- Ability to explain a cost principle to a programme manager who does not want to hear it
- Experience with indirect cost rate proposals is desirable

**Responsibilities**

- Administer approximately 20 awards from notice of award through closeout
- Conduct annual subrecipient risk assessments and lead on-site fiscal reviews
- Prepare and certify federal and state financial reports by their submission deadlines
- Serve as fiscal liaison to assigned federal project officers
- Provide technical assistance and training to programme staff on allowability and documentation

---

## JD038 — Grants Manager

- **jd_id:** JD038
- **Company:** Foothill Community Health Alliance
- **Title:** Grants Manager
- **Seniority:** Manager
- **Location:** Santa Fe, NM — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p15

**About the role**

Foothill is a nonprofit network of eleven federally qualified health centres across northern New Mexico. Roughly 60% of our revenue arrives as grant funding from HRSA, the state, and a set of private foundations that all want different things reported in different formats. We are hiring a Grants Manager to lead a small team and bring order to a portfolio that has outgrown its processes.

**Requirements**

- Six years in grants work, with some portion supervising or coordinating others
- Federal grant compliance under Uniform Guidance, ideally including HRSA or another HHS operating division
- Strong proposal development — you have written narratives and budgets that were funded
- Foundation reporting and relationship management alongside the federal work
- Financial reconciliation skills; you will work closely with the controller on drawdowns and allocations
- Someone who is patient with clinicians and firm about deadlines

**Responsibilities**

- Supervise two grants coordinators and a part-time writer
- Own the annual grants calendar, from opportunity screening through report submission
- Lead the HRSA Service Area Competition application in the coming cycle
- Reconcile grant revenue and expenditure monthly with finance
- Prepare the grants portion of the annual audit workpapers

---

## JD039 — Contracts and Procurement Manager

- **jd_id:** JD039
- **Company:** Kingsford County, Washington
- **Title:** Contracts and Procurement Manager
- **Seniority:** Manager
- **Location:** Spokane, WA — On-site
- **Employment type:** Full-time
- **Targets:** p15, p20

**About the role**

Kingsford County procures roughly $180M a year in goods, professional services and construction across nineteen agencies. Purchasing authority is currently decentralised and the Board of Commissioners has directed that it be consolidated under a central Contracts and Procurement division. This position leads that division and reports to the County Administrator.

**Requirements**

- Five or more years in public procurement or public contract administration
- Command of competitive solicitation methods: invitation to bid, request for proposals, sole source justification, cooperative purchasing
- Familiarity with federal procurement standards where grant funds are involved
- Experience negotiating and administering technology and professional services agreements, including master services agreements
- Track record working with elected officials or an appointed board on contract approvals
- Public records law and contract retention obligations
- NIGP-CPP, CPPO or equivalent credential, or willingness to obtain one within two years

**Responsibilities**

- Establish countywide procurement policy and the delegated authority thresholds beneath it
- Manage complex solicitations, including the upcoming public safety radio system replacement
- Supervise four buyers and a contracts specialist
- Advise agency directors on contract structure, risk allocation and renewal timing
- Prepare contract award items for Board agendas and answer questions in session

---

## JD040 — Vice President, Commercial

- **jd_id:** JD040
- **Company:** Windward Voyages
- **Title:** Vice President, Commercial
- **Seniority:** Vice president
- **Location:** Fort Lauderdale, FL — On-site
- **Employment type:** Full-time
- **Targets:** p16

**About the role**

Windward operates six small-ship vessels on river and coastal itineraries in Europe and South America, carrying about 70,000 guests a year. Two additional ships arrive in the next thirty months and the commercial function has to be ready to fill them. The VP Commercial owns revenue management, distribution and the marketing P&L, and sits on the executive committee.

**Requirements**

- Senior commercial leadership in cruise, tour operating, hospitality or airline — an industry where inventory perishes
- Direct ownership of a yield or net revenue metric at portfolio scale
- Deployment and itinerary planning judgement: which ship goes where, and what that does to the fare curve
- Distribution strategy across direct, trade and OTA channels, including cost-to-serve analysis
- Experience leading through directors across more than one discipline
- Board-level presentation of pricing and capacity investment cases
- Comfort in a company where the pricing system is older than you would like

**Responsibilities**

- Set fare architecture, discount policy and the deposit schedule across all itineraries
- Own net yield per passenger night and the annual revenue plan
- Lead the deployment planning cycle jointly with marine operations
- Manage revenue management, reservations, trade sales and marketing as one organisation
- Build the commercial case for the two incoming vessels and present it to the board

---

## JD041 — Senior Vice President, Revenue and Distribution

- **jd_id:** JD041
- **Company:** Cinderpeak Resorts
- **Title:** Senior Vice President, Revenue and Distribution
- **Seniority:** Vice president
- **Location:** Denver, CO — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p16

**About the role**

Cinderpeak owns and operates fourteen mountain and desert resort properties, plus a vacation-ownership business that shares inventory with the transient hotel rooms in ways nobody has fully modelled. We are looking for a senior commercial leader to bring one pricing and distribution discipline across both. The role reports to the Chief Commercial Officer.

**Requirements**

- Fifteen years in commercial or revenue leadership, including several at vice president level
- Multi-property or multi-unit revenue management, with real accountability for total revenue rather than rooms alone
- Distribution economics: brand.com, OTA, wholesale, group — you know what each channel actually costs
- Ancillary and on-property revenue programmes
- Have led a pricing or inventory system replacement and lived through the cutover
- Organisational leadership of 50+ across several functions
- Vacation ownership or timeshare exposure is a genuine advantage and rare, so we will teach it if the rest is there

**Responsibilities**

- Set pricing strategy and inventory controls across the portfolio
- Own channel mix and the cost of distribution as a reported metric
- Lead revenue management, central reservations and distribution partnerships
- Partner with resort general managers on total-revenue planning and forecast accuracy
- Present portfolio commercial performance to the executive committee monthly

---

## JD042 — Healthcare Data Analyst

- **jd_id:** JD042
- **Company:** Larkfield Health System
- **Title:** Healthcare Data Analyst
- **Seniority:** Individual contributor
- **Location:** Madison, WI — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p17

**About the role**

Larkfield's analytics team supports quality, operations and finance across four hospitals and thirty ambulatory sites. Most of our requests today arrive as a question from a clinical leader and leave as a Power BI page. We want an analyst who came from inside healthcare and does not need the clinical context explained before they can start.

**Requirements**

- Two or more years working with healthcare data — clinical, laboratory, claims or operational
- SQL you write yourself, including joins across messy source systems and window functions when the question needs them
- Power BI or Tableau, with an eye for a report a clinician will actually open twice
- Enough Python or R to handle the analyses that do not fit in a query
- Understanding of HIPAA and minimum necessary access
- Experience with Epic Clarity or Caboodle is a strong plus; if you have worked with any Epic module we would like to talk
- The ability to ask a nurse manager the third question rather than accepting the first answer

**Responsibilities**

- Own the dashboards for throughput, turnaround time and quality measures
- Investigate data quality discrepancies between source systems and the warehouse
- Support quality improvement teams with measure definitions and baseline analyses
- Document data definitions in the enterprise data dictionary
- Present findings to operational leaders who are not analysts

---

## JD043 — Clinical Informatics Analyst

- **jd_id:** JD043
- **Company:** Verity Ridge Health Network
- **Title:** Clinical Informatics Analyst
- **Seniority:** Senior individual contributor
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p17

**About the role**

Verity Ridge is a physician-led network of specialty clinics in seven states. Clinical informatics here means translating between the people who deliver care and the people who configure the systems, and neither group has enough time for the other. This role sits with the Chief Medical Information Officer and covers laboratory, imaging and results workflows in particular.

**Requirements**

- Clinical background — laboratory science, nursing, pharmacy or a comparable licensed discipline — combined with hands-on data or systems work
- Interface and messaging literacy: HL7 v2 segments, result routing, and what happens when a message fails quietly
- SQL for validation and audit work
- Experience validating a system change against a clinical workflow before it goes live
- CAP and CLIA requirements as they apply to result reporting and retention
- Formal informatics coursework or certification, or equivalent demonstrated depth
- Change control and validation documentation habits — this is a regulated environment

**Responsibilities**

- Gather workflow requirements from clinical departments and translate them into build specifications
- Test and validate configuration changes to results and orders workflows
- Investigate result discrepancies between the source system and the chart
- Maintain autoverification rule documentation and review it on the scheduled cycle
- Support the data governance committee with lineage and definition questions

---

## JD044 — Director of Credit Risk

- **jd_id:** JD044
- **Company:** Stonebrook Credit
- **Title:** Director of Credit Risk
- **Seniority:** Director
- **Location:** New York, NY — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p18

**About the role**

Stonebrook lends to small businesses through a mix of term loans and revolving lines, with a receivables book just past $1.4B. Underwriting has been driven by policy rules and a vendor score since founding, and the loss curve has been acceptable rather than good. We want a credit leader who will rebuild the decision engine and own the outcome.

**Requirements**

- Eight or more years in consumer or small business credit risk, including team leadership
- Scorecard development experience end to end — data, build, deployment, monitoring
- Python and SQL at working level; you will read your team's code
- Loss forecasting and reserve setting, including CECL methodology
- Champion-challenger design and the statistical honesty to call a test that lost
- Small business credit is different from consumer; prior exposure to commercial cash-flow or bank statement underwriting would shorten your ramp considerably
- Presenting credit performance to a board risk committee or a capital provider

**Responsibilities**

- Own credit policy, line assignment and pricing risk inputs across both products
- Lead a team of eight analysts and data scientists
- Rebuild the origination scorecard and manage the deployment
- Set and defend the quarterly loss forecast with finance
- Report portfolio performance to the risk committee and to warehouse lenders during diligence

---

## JD045 — Vice President, Risk Analytics

- **jd_id:** JD045
- **Company:** Northfell Capital Partners
- **Title:** Vice President, Risk Analytics
- **Seniority:** Vice president
- **Location:** Charlotte, NC — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p18

**About the role**

Northfell buys and services consumer receivables portfolios and increasingly originates alongside bank partners. Risk analytics is currently three separate pockets of people reporting to three different executives, producing three different views of the same portfolio. The VP of Risk Analytics is being hired to consolidate them and to be the single analytical voice the investment committee trusts.

**Requirements**

- A decade or more in credit or portfolio analytics, with experience at director level or above
- Vintage, roll-rate and cohort analysis at a level where you spot the anomaly before the report does
- Modelling depth in Python, including gradient-boosted methods, plus the judgement to know when a simpler model is the right answer
- Model governance and validation experience under a regulated framework
- Collections and recovery analytics — a meaningful part of this book is post-charge-off
- Building and merging teams; the consolidation is the first six months of this job
- Comfort presenting to an investment committee that will challenge your assumptions

**Responsibilities**

- Consolidate three analytics groups into one function with common definitions
- Own portfolio forecasting for pricing new portfolio acquisitions
- Set the model governance standard and the validation calendar
- Build the reporting layer the investment committee and bank partners both use
- Manage a team of roughly fifteen across modelling, strategy and reporting

---

## JD046 — Production Manager, Packaging

- **jd_id:** JD046
- **Company:** Palisade Converting
- **Title:** Production Manager, Packaging
- **Seniority:** Manager
- **Location:** Des Moines, IA — On-site
- **Employment type:** Full-time
- **Targets:** p19

**About the role**

Palisade converts paperboard and flexible film into printed packaging for food and pet-food customers. The Des Moines plant runs eight lines across three shifts and has been through two years of steady growth without a corresponding upgrade in how the floor is managed. You would own production for the flexible film side of the plant, about 70 operators, and report to the Plant Manager.

**Requirements**

- Five years in production supervision or management in a continuous or high-changeover environment
- Shift-based leadership — you have managed people you do not see every day
- Quick changeover methodology and a real example of applying it
- Schedule attainment and overtime control as metrics you have personally moved
- Food safety expectations under SQF or BRC, including audit readiness in the production area
- SAP or a comparable ERP for production confirmation and material movement
- Equipment commissioning experience is valued; we have capital coming next year

**Responsibilities**

- Manage three shift supervisors and the operator group across eight lines
- Hold the weekly schedule and escalate constraints to planning early
- Run the daily management meeting and keep the tier boards honest
- Own the production area's safety performance and the corrective actions behind it
- Develop the operator skills matrix and drive multi-skill certification

---

## JD047 — Chief Information Officer

- **jd_id:** JD047
- **Company:** Three Rivers Regional Authority
- **Title:** Chief Information Officer
- **Seniority:** Vice president
- **Location:** Tacoma, WA — On-site
- **Employment type:** Full-time
- **Targets:** p20

**About the role**

The Authority is a special-purpose regional body operating water, wastewater and solid waste services for eleven member jurisdictions, with 1,100 employees and its own governing board. Technology is currently split between a small internal team and a set of contracts that nobody has looked at closely since 2019. The Board has authorised a CIO position to bring the whole picture under one accountable executive.

**Requirements**

- Technology leadership across roughly ten years, four of them senior, in the public sector or another heavily regulated setting
- Demonstrated ownership of a major enterprise system implementation — ERP, billing, asset management or similar — including the budget for it
- Cybersecurity governance against a recognised framework, and experience presenting security posture to a non-technical board
- Public procurement and contract negotiation for technology services
- Operational technology awareness: SCADA and utility control environments live alongside the business network here
- Understanding of records retention and public disclosure obligations
- Ability to testify publicly and answer hostile questions in an open meeting

**Responsibilities**

- Lead a department of approximately 40 staff and a $24M combined operating and capital budget
- Deliver the customer billing system replacement now in procurement
- Establish the Authority's first formal cybersecurity programme and incident response plan
- Rationalise the application portfolio and the vendor contracts behind it
- Advise the Executive Director and Board on technology investment and risk

---

## JD048 — Senior Manager, Digital Merchandising

- **jd_id:** JD048
- **Company:** Halvard & Pike
- **Title:** Senior Manager, Digital Merchandising
- **Seniority:** Manager
- **Location:** Los Angeles, CA — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p21

**About the role**

Halvard & Pike sells furniture, rugs and small home goods through our own site and two owned retail showrooms. Digital is now 68% of the business and the merchandising function has outgrown the person who built it. This role reports to the VP of Digital and owns everything a customer sees between the homepage and the add-to-cart button.

**Requirements**

- 6+ years in e-commerce or online merchandising, at least two of them managing people
- You've owned category taxonomy and site search relevance for a catalogue in the tens of thousands of SKUs
- Comfortable designing and reading A/B tests without waiting on an analyst to interpret them
- Hands-on time in a PIM or product content workflow tool
- Google Analytics 4 to the point where you can build your own funnel views
- Having worked on a headless or composable storefront is a plus, since we are mid-migration
- Willingness to sit in the showroom two days a week and watch real people shop

**Responsibilities**

- Set the category and landing page strategy across nine departments, refreshed seasonally
- Run the test roadmap: hypothesis, sizing, readout, decision
- Manage three merchandisers and partner daily with planning on markdown timing
- Own the weekly site performance review with digital marketing and creative
- Keep the launch calendar honest when creative slips

---

## JD049 — WMS Solutions Analyst

- **jd_id:** JD049
- **Company:** Kettlebridge Depot
- **Title:** WMS Solutions Analyst
- **Seniority:** Individual contributor
- **Location:** Sparks, NV — On-site
- **Employment type:** Full-time
- **Targets:** p22

**About the role**

Kettlebridge Depot operates temperature-controlled distribution for regional grocery and foodservice customers. Our Sparks campus runs three buildings on one warehouse management instance, and cold-chain rules make every configuration change riskier than it would be in dry goods. The analyst in this seat sits between operations and the corporate systems team and reports to the Site Systems Supervisor.

**Requirements**

- 3–6 years supporting a tier-one WMS in a live distribution environment
- SQL strong enough to write your own operational reports against the warehouse database
- Hands-on with slotting logic, wave planning, or task interleaving — tell us which and what you changed
- Understanding of cycle counting and inventory accuracy programmes
- Familiar with RF device fleets and barcode scanning hardware
- Cold-chain, lot tracking or FEFO experience is genuinely useful here, though we will train the right person
- Able to work occasional weekend cutovers and be reachable during the second shift

**Responsibilities**

- Configure and test WMS changes in the staging environment before they touch the floor
- Take over reporting for site leadership and retire the manual extracts still in use
- Act as first escalation for scanning, conveyor and label issues across two shifts
- Document standard operating procedures and train supervisors on new workflows
- Support the annual peak ramp, including onboarding seasonal headcount into the system

---

## JD050 — Vice President of Engineering

- **jd_id:** JD050
- **Company:** Marrowlane Health
- **Title:** Vice President of Engineering
- **Seniority:** Vice president
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p23

**About the role**

We build scheduling and care-coordination software for outpatient specialty clinics — about 2,400 practices today, growing faster than our platform was designed for. Our founding CTO is moving to a product-and-partnerships focus and we are hiring a VP of Engineering to own delivery, reliability and the shape of the organisation. You would inherit 61 engineers in seven teams and report to the CEO.

**Requirements**

- Track record leading engineering organisations of 50 or more through a growth phase
- Deep familiarity with multi-tenant SaaS architecture and the migrations that come with it
- You've run an SRE or reliability function with real error budgets, not aspirational ones
- Fluent in DORA-style delivery metrics and what actually moves them
- Budget ownership at the eight-figure level, including vendor and cloud spend
- HIPAA and healthcare interoperability experience — HL7, FHIR, or equivalent regulated-data work
- Clear written communication; roughly a third of this job is memos

**Responsibilities**

- Own delivery across seven teams and the quarterly planning cycle with product
- Build and defend the reliability programme, including on-call health and postmortem follow-through
- Hire and level engineering leadership; run the promotion calibration process
- Set the technical direction on the platform's next architecture step alongside the CTO
- Represent engineering to the board and to enterprise health-system prospects

---

## JD051 — Operations Manager, Guided Travel

- **jd_id:** JD051
- **Company:** Vermilion Trail Journeys
- **Title:** Operations Manager, Guided Travel
- **Seniority:** Manager
- **Location:** Denver, CO — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p24

**About the role**

We run small-group hiking and cultural trips in twelve countries, about 190 departures a season. Everything works until it doesn't — a road closes, a hotel oversells, a guide gets sick — and the operations manager is the person who makes the trip happen anyway. The role reports to the Director of Product and Operations and sits alongside two other regional managers.

**Requirements**

- At least five years in tour operations, DMC work, or ground handling
- You have negotiated with hotels, transport providers and local guides in more than one currency
- Costing experience: you can build a per-passenger land cost and defend every line of it
- Comfortable owning crisis response — weather diversions, medical evacuations, border delays
- Strong Excel; we run our costing models there and will keep doing so
- Spanish or Portuguese would help with our South America portfolio but is not required
- Willing to travel roughly six weeks a year on inspection trips

**Responsibilities**

- Own supplier contracting and annual rate negotiation for your assigned regions
- Maintain the supplier scorecard and act on the ones that slip
- Manage a team of four coordinators plus the on-call duty rota
- Cost and operationally validate new itineraries before they go on sale
- Debrief every incident report and feed changes back into the guide briefing pack

---

## JD052 — Associate Medical Writer

- **jd_id:** JD052
- **Company:** Osterby Clinical Communications
- **Title:** Associate Medical Writer
- **Seniority:** Individual contributor
- **Location:** Nashville, TN — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p25

**About the role**

Osterby is a mid-size medical communications agency. We write the slide decks, manuscripts, advisory board summaries and standard response documents that pharmaceutical medical affairs teams put in front of clinicians. This is an entry-to-agency role and we hire clinicians into it regularly — pharmacists, nurses, PhDs — because the science background matters more than the agency background.

**Requirements**

- Advanced clinical or scientific degree (PharmD, PhD, MD, or equivalent)
- Demonstrated ability to read primary literature critically and summarise it accurately for a specialist audience
- Some record of formal writing — protocols, monographs, published articles, or regulatory documents
- Working understanding of therapeutic-area evidence in oncology, infectious disease or critical care
- Comfort taking heavy editorial feedback and turning a draft around inside 48 hours
- Prior agency or industry experience is welcome but not expected; we teach the client-service side
- Familiarity with AMA style and reference management tools

**Responsibilities**

- Draft slide decks, congress materials and standard response letters against client briefs
- Verify every claim to source and maintain the annotated reference package
- Join client calls to take direction and, over time, present your own drafts
- Work with editorial and the account lead to keep projects inside scope and timeline
- Maintain therapeutic-area knowledge through ongoing literature monitoring

---

## JD053 — Data Analyst I, Lending

- **jd_id:** JD053
- **Company:** Prairiestone Credit Group
- **Title:** Data Analyst I, Lending
- **Seniority:** Individual contributor
- **Location:** Kansas City, MO — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p26

**About the role**

Prairiestone is a consumer lender serving members across five Midwestern states, mostly auto and personal loans. Our analytics team is four people and we are adding a fifth at the junior end. We would rather hire someone who reasons carefully and writes clearly than someone with two extra years of tooling experience, and we have hired career changers into this team twice before.

**Requirements**

- Solid SQL — joins, window functions, and the discipline to check your own row counts
- Python for analysis work, particularly pandas
- Real grounding in statistics: distributions, hypothesis testing, when a difference is not a difference
- Ability to explain a model result to someone who has never taken a statistics course
- Any exposure to lending, credit or financial services data, whether professional, academic or through a portfolio project
- A degree in a quantitative field, or an analytics programme plus evidence you can do the work
- Nice to have: version control habits and some experience with a BI tool such as Tableau

**Responsibilities**

- Build and maintain reporting on originations, approval rates and early delinquency
- Pull ad hoc analyses for the credit and marketing teams, usually with a two-day turnaround
- Document data definitions so the same metric means the same thing in every deck
- Support the credit team's test readouts with clean before-and-after comparisons

---

## JD054 — Controls Engineer

- **jd_id:** JD054
- **Company:** Delderfield Foods
- **Title:** Controls Engineer
- **Seniority:** Individual contributor
- **Location:** Toledo, OH — On-site
- **Employment type:** Full-time
- **Targets:** p27

**About the role**

Delderfield Foods runs two high-speed packaging plants in northwest Ohio producing private-label sauces and dressings. We are replacing three filling lines over the next two years and need a controls engineer who can support the existing estate while the new equipment lands. Reports to the Plant Engineering Manager.

**Requirements**

- Hands-on PLC programming, Allen-Bradley preferred; you should be comfortable in Studio 5000 without a reference manual open
- HMI development experience and an opinion about what makes a good fault screen
- 5+ years in a manufacturing environment on 24-hour operations
- Servo drive and VFD configuration, plus practical electrical troubleshooting
- Understanding of LOTO and arc-flash requirements; trainer designation is a plus
- Food or beverage experience, or any hygienic-design environment, would shorten your ramp
- Associate degree in a technical discipline or equivalent time served on the floor

**Responsibilities**

- Diagnose and resolve controls faults on filling, capping and case-packing equipment
- Write and revise PLC and HMI code, with change control through the engineering log
- Support factory acceptance testing and commissioning for the new filler installations
- Extend the predictive maintenance sensor programme to the second plant
- Coach maintenance technicians on ladder-logic troubleshooting

---

## JD055 — Director of E-commerce Operations

- **jd_id:** JD055
- **Company:** Wickham Row
- **Title:** Director of E-commerce Operations
- **Seniority:** Director
- **Location:** Atlanta, GA — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p21, p29

**About the role**

Wickham Row is a specialty apparel and accessories retailer with 140 stores and a digital business that has doubled in three years without anyone redesigning how the two connect. This is a new director role created to own that seam: site operations, fulfilment routing, buy-online-pickup-in-store, and the operational reporting that tells us whether any of it is working. Reports to the SVP of Retail and Digital.

**Requirements**

- 8+ years across retail or e-commerce operations, including at least three leading a team
- Direct experience with omnichannel fulfilment — ship-from-store, BOPIS, or curbside at fleet scale
- Track record rolling out an operational change to a large store estate and making it stick
- Fluency in P&L mechanics and expense ownership
- Comfortable with Power BI or an equivalent tool for building the scorecard you will be judged by
- Experience with a merchandising or PIM workflow is useful; you will partner closely with that team
- Direct-to-consumer brand background welcome, department-store background less so

**Responsibilities**

- Own the operational side of digital order flow from placement to customer handoff
- Lead the next phase of BOPIS expansion, including store labour impact
- Build one shared scorecard for digital and field leadership
- Manage a team of six across site operations and fulfilment analytics
- Chair the weekly cross-functional review with merchandising, supply chain and store operations

---

## JD056 — Senior Manager, Fulfillment Systems

- **jd_id:** JD056
- **Company:** Tarnwell Logistics Group
- **Title:** Senior Manager, Fulfillment Systems
- **Seniority:** Senior manager
- **Location:** Reno, NV — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p22

**About the role**

Tarnwell provides third-party fulfilment for consumer brands out of five buildings in Nevada, Texas and Georgia. Each site has drifted into its own WMS configuration and the result is that nothing transfers between them. We are hiring a senior manager to bring the estate back to a common standard and to lead the small systems team that will do it. This role reports to the Vice President of Operations.

**Requirements**

- 6+ years in warehouse systems, industrial engineering or fulfilment operations
- You have configured a WMS, not just filed tickets against one
- Experience with labour management systems and engineered standards
- SQL and a reporting tool; you will be asked for numbers in meetings and expected to have them
- People leadership, formal or matrixed, over at least two analysts
- Multi-site work is strongly preferred — the hard part of this job is the politics, not the software
- Travel to the other four sites roughly one week a month

**Responsibilities**

- Define and enforce a common WMS configuration standard across five buildings
- Lead a team of four systems analysts and set their project priorities
- Own the labour standards programme and its annual re-study cycle
- Run implementation for new client onboardings, from slotting design through go-live
- Report site systems performance monthly to the operations leadership group

---

## JD057 — Senior Vice President, Engineering

- **jd_id:** JD057
- **Company:** Basalt Systems
- **Title:** Senior Vice President, Engineering
- **Seniority:** Vice president
- **Location:** Minneapolis, MN — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p23

**About the role**

Basalt Systems builds compliance and workflow software for regional banks and credit unions. We closed a growth round last year, acquired a smaller competitor in the spring, and now have 130 engineers spread across two codebases and three time zones. The SVP of Engineering will report to the CEO and own the integration as well as the ongoing organisation.

**Requirements**

- Prior experience at the VP level or above in a software organisation of 100+
- You have run a post-acquisition platform integration and can describe what went badly
- Strong grasp of regulated-industry engineering: audit trails, data residency, evidence for examiners
- Organisational design experience — levelling frameworks, span of control, promotion process
- Cloud cost discipline at meaningful scale
- Executive presence with a board and with enterprise customers; some of this job is on the road
- Prior technical due diligence work is a differentiator

**Responsibilities**

- Consolidate two engineering organisations onto one operating model and career framework
- Sequence the platform integration and hold the roadmap commitments made at deal close
- Own the engineering budget, vendor contracts and infrastructure spend
- Partner with the Chief Product Officer on annual planning and release cadence
- Build the leadership bench: hire two directors and develop the internal candidates behind them

---

## JD058 — Director of Global Operations

- **jd_id:** JD058
- **Company:** Saltmoor Expeditions
- **Title:** Director of Global Operations
- **Seniority:** Director
- **Location:** Phoenix, AZ — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p24

**About the role**

Saltmoor runs expedition travel — polar voyages, desert crossings, high-altitude trekking — for about 9,000 guests a year. Operations currently sits under three regional leads with no one owning the whole picture, and the cost base shows it. We are creating a director role to consolidate that. You report to the Chief Operating Officer and take on the regional managers as direct reports.

**Requirements**

- Ten years in travel operations with at least four managing managers
- Demonstrated supplier consolidation or cost-per-passenger reduction across a multi-country portfolio
- Owned a crisis-response function, including the escalation path to executives and to families
- Multi-currency budgeting and contract compliance
- Experience standing up an operations function rather than inheriting a working one
- Familiarity with expedition-specific requirements — permits, remote medical support, charter logistics — is a plus
- Second language useful; the role covers eleven operating regions

**Responsibilities**

- Consolidate supplier contracting and set a single negotiation calendar across regions
- Manage three regional operations managers and a central support team
- Own the operational cost line and its variance reporting to the COO
- Set the risk assessment standard for every itinerary before it goes on sale
- Lead operational readiness for two new regions launching next season

---

## JD059 — Clinical Content Lead

- **jd_id:** JD059
- **Company:** Emberline Health
- **Title:** Clinical Content Lead
- **Seniority:** Individual contributor
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p25

**About the role**

Emberline builds medication management software used by hospital pharmacy departments — dosing support, interaction checking, and stewardship reporting. Our clinical content is currently maintained by two people who are both stretched, and the roadmap for next year assumes a third. This is a clinician-facing role inside a product organisation, reporting to the Director of Clinical Informatics.

**Requirements**

- PharmD or equivalent, with active or recently active licensure
- Real inpatient practice experience; we want someone who has verified orders, not only read about it
- Antimicrobial stewardship or pharmacokinetic dosing background
- You've written protocols or clinical guidance that other people had to follow
- Comfortable working from data — pulling dispensing or utilisation data and drawing a conclusion from it
- Prior software or health-tech experience is a bonus, but the harder half of this job is clinical judgement
- Able to translate between clinicians and engineers without either side losing the thread

**Responsibilities**

- Own the clinical rules content for the dosing and stewardship modules
- Review and approve content changes against current literature and guidelines
- Work with product managers to spec new clinical features and define acceptance criteria
- Support customer pharmacy teams during implementation and content customisation
- Maintain the evidence file backing every published rule

---

## JD060 — Analyst, Portfolio Reporting

- **jd_id:** JD060
- **Company:** Cordwain Financial
- **Title:** Analyst, Portfolio Reporting
- **Seniority:** Individual contributor
- **Location:** Kansas City, MO — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p26

**About the role**

Cordwain Financial services and holds instalment loan portfolios for bank partners. Portfolio reporting is what the partners see monthly, what the warehouse lenders see quarterly, and what the credit team argues about weekly. The analyst in this role produces all of it. Reports to the Manager of Portfolio Analytics.

**Requirements**

- 1–3 years in an analytical role, or a strong quantitative background plus a demonstrable analytics portfolio
- SQL as a daily working language
- Python or R for anything the warehouse cannot do
- Understanding of regression and classification basics and the metrics used to evaluate them
- Precision under deadline — reporting dates do not move and errors are visible to external parties
- Written clarity; every number you publish needs a sentence explaining what changed
- Familiarity with vintage or roll-rate analysis would put you ahead, though we will teach it

**Responsibilities**

- Produce the monthly partner reporting package end to end
- Maintain the automated pipelines behind delinquency and loss curves
- Investigate month-over-month movements before anyone else asks about them
- Build ad hoc cuts for the credit strategy team during test readouts

---

## JD061 — Category Manager, Marketplace

- **jd_id:** JD061
- **Company:** Northmarch Consumer Brands
- **Title:** Category Manager, Marketplace
- **Seniority:** Manager
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p21

**About the role**

Northmarch owns six direct-to-consumer brands in kitchenware, outdoor and pet. Roughly 40% of our volume now moves through third-party marketplaces rather than our own storefronts, and we manage that channel with a spreadsheet and hope. This role owns the marketplace category end to end and reports to the General Manager, Digital Channels.

**Requirements**

- Five or more years in merchandising, category management or marketplace channel work
- Direct experience managing listings, content and pricing on at least one major marketplace platform
- Assortment and markdown decision-making; you should be able to argue for taking a hit early
- Analytical comfort with conversion, attach rate and search visibility metrics
- Product content and attribute discipline at scale — this category lives or dies on data quality
- Nice to have: exposure to retail media or sponsored placement budgets
- Occasional travel to our Ohio distribution centre and to brand summits

**Responsibilities**

- Own assortment, pricing and content for six brands across the marketplace channel
- Build the listing quality standard and the audit process behind it
- Partner with planning on inventory allocation between owned site and marketplace
- Run the monthly channel review with brand general managers
- Manage one specialist and a content agency relationship

---

## JD062 — Continuous Improvement Analyst, Network Operations

- **jd_id:** JD062
- **Company:** Steadmoor Distribution
- **Title:** Continuous Improvement Analyst, Network Operations
- **Seniority:** Senior individual contributor
- **Location:** Philadelphia, PA — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p22, p30

**About the role**

Steadmoor moves parcels and pallets for regional retailers through nine cross-dock facilities and a contracted delivery fleet. Our operating metrics are good on average and terrible in the tails, and nobody currently owns finding out why. This is a network-level analytical role sitting inside operations, not in a corporate analytics team, and it reports to the Senior Director of Network Operations.

**Requirements**

- Four or more years in logistics operations, industrial engineering or supply chain analytics
- SQL and a BI tool — Power BI is what we use
- Process improvement method under your belt: root cause analysis, DMAIC, or equivalent, applied to real operations
- Understanding of either warehouse throughput or route-level delivery economics; both is unusual and welcome
- Ability to spend time in facilities rather than modelling them from a desk
- Clear documentation habits — your findings become standard work for other sites
- Green Belt or similar certification is a plus, not a requirement

**Responsibilities**

- Diagnose performance gaps between facilities and quantify the operating cost of each
- Build the network-level reporting the operations leadership team reviews weekly
- Run improvement projects from problem statement through to sustained result
- Write the standard operating procedures that carry a fix from one site to the rest

---

## JD063 — Supplier Performance Manager

- **jd_id:** JD063
- **Company:** Beacon Halloway Events
- **Title:** Supplier Performance Manager
- **Seniority:** Manager
- **Location:** Chicago, IL — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p24

**About the role**

We produce corporate conferences and incentive travel programmes — around 260 events a year, most of them off-site, many of them international. Suppliers are the whole product: venues, transport, AV, ground handlers. This role exists because our supplier costs and our supplier quality are both managed anecdotally, by whoever booked the job.

**Requirements**

- Background in event operations, travel operations, hospitality procurement or DMC management
- You have run competitive supplier negotiations and held the line on rates
- Built or maintained a vendor scorecard that changed who got the business
- Multi-currency cost tracking and invoice dispute resolution
- Strong Excel modelling; we do not have a procurement system and are not buying one this year
- Team leadership experience, ideally over coordinators rather than senior specialists
- Comfortable travelling to roughly fifteen events a year to see suppliers in action

**Responsibilities**

- Own the preferred supplier programme and its annual rate negotiations
- Maintain the scorecard and lead quarterly performance conversations with key vendors
- Standardise booking confirmations and rate sheets to reduce invoice disputes
- Support programme managers on costing for new client proposals
- Manage two supplier coordinators

---

## JD064 — Associate Pricing Analyst

- **jd_id:** JD064
- **Company:** Ashgrove Mutual Insurance
- **Title:** Associate Pricing Analyst
- **Seniority:** Individual contributor
- **Location:** Overland Park, KS — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p26

**About the role**

Ashgrove Mutual writes personal auto and homeowners coverage in eleven states. The pricing team supports rate filings, competitive analysis and the ongoing monitoring that tells us whether a rate change did what we said it would. We hire associates from a range of backgrounds — actuarial students, statistics graduates, teachers, engineers — and we support exam progress if you want it.

**Requirements**

- Strong quantitative foundation, particularly regression and applied statistics
- Working SQL; you will spend a large share of your week in the data warehouse
- Scripting in R or Python for modelling and data preparation
- Ability to present a technical result to underwriting and product colleagues in plain terms
- Attention to detail sufficient for filings that go to state regulators
- Actuarial exam progress is welcome but not a screening requirement
- Insurance experience is not expected; curiosity about how rates are actually built is

**Responsibilities**

- Prepare data and exhibits supporting state rate filings
- Monitor loss ratio and retention trends by segment and flag movements to the pricing manager
- Build competitive rate comparisons across our filing states
- Document methodology so a reviewer can reproduce your work six months later

---

## JD065 — Maintenance and Automation Supervisor

- **jd_id:** JD065
- **Company:** Halbrook Stamping Works
- **Title:** Maintenance and Automation Supervisor
- **Seniority:** Manager
- **Location:** Toledo, OH — On-site
- **Employment type:** Full-time
- **Targets:** p27

**About the role**

Halbrook Stamping Works supplies structural stampings and welded assemblies to heavy-truck manufacturers from a single 340,000 square-foot plant. Our maintenance department has three shifts and no supervisor on nights, which is where most of our downtime lives. This is a promotion-shaped role: we expect to hire a strong technician or lead who is ready to run the department.

**Requirements**

- Deep hands-on background in industrial maintenance — PLCs, robotics, hydraulics, electrical
- Some leadership exposure: shift lead, crew lead, trainer, or informally running a team
- CMMS use and preventive maintenance scheduling
- Downtime analysis and the discipline to chase root cause rather than reset the fault
- Safety credibility, particularly around LOTO and arc flash
- Stamping, welding or press experience preferred; robot programming experience strongly preferred
- Budget exposure would help, since this role owns the spare parts spend

**Responsibilities**

- Supervise 14 maintenance technicians across three shifts
- Own the preventive and predictive maintenance schedule and its completion rate
- Lead downtime reduction projects on the press lines and weld cells
- Manage spare parts inventory, standardisation and the annual maintenance budget
- Develop the technician skills matrix and run the internal training plan

---

## JD066 — Senior Research Associate, Housing Policy

- **jd_id:** JD066
- **Company:** Fenwick Housing Institute
- **Title:** Senior Research Associate, Housing Policy
- **Seniority:** Senior individual contributor
- **Location:** Sacramento, CA — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p28

**About the role**

The Fenwick Housing Institute is an independent research organisation funded by philanthropy and state contracts. We publish on housing production, affordability and displacement, and our work gets cited in legislative hearings on both coasts. This position joins a research team of nine and reports to the Research Director.

**Requirements**

- Graduate degree in public policy, economics, urban planning, sociology or a related field
- Five-plus years producing applied policy research, in government, academia or a research organisation
- R or Stata for analysis, plus SQL for working with administrative datasets
- Spatial analysis capability — QGIS, ArcGIS, or PostGIS
- Publication record: reports, briefs, or peer-reviewed work where you were the primary author
- Comfort presenting findings to non-researchers, including elected officials and advocacy groups
- Familiarity with parcel-level or assessor data would be a real advantage

**Responsibilities**

- Design and execute research projects from question through to published report
- Curate the analytical datasets underlying the institute's housing production estimates
- Draft policy briefs and testimony materials for legislative audiences
- Review colleagues' methodology as part of the internal peer-review process
- Represent the institute's findings in convenings and press conversations

---

## JD067 — Manager, Research and Evaluation

- **jd_id:** JD067
- **Company:** Ridgeline Policy Collaborative
- **Title:** Manager, Research and Evaluation
- **Seniority:** Manager
- **Location:** Remote (US)
- **Employment type:** Full-time
- **Targets:** p28

**About the role**

Ridgeline is a small consultancy that evaluates state and local programmes — workforce, housing stability, benefits access — for the agencies that run them and the foundations that fund them. We are twenty-two people and we are hiring our fourth manager. The person in this role carries a portfolio of three to five concurrent engagements and supervises two analysts.

**Requirements**

- Seven or more years in programme evaluation, policy analysis or applied social research
- Managed an evaluation from design through client delivery, including the uncomfortable findings
- Quantitative methods depth — quasi-experimental designs, cost-per-outcome analysis, or equivalent
- Fluent in R; we work in R and will not convert to your preferred stack
- Stakeholder facilitation, including groups whose interests genuinely conflict
- Writing that survives contact with a public audience: plain language, defensible claims
- Experience with federal or state grant-funded programmes and their reporting requirements

**Responsibilities**

- Lead evaluation engagements end to end, including scoping, budget and client relationship
- Supervise and develop two analysts across projects
- Design methodology and defend it in front of technical advisory panels
- Present findings and recommendations to agency leadership and funder boards
- Contribute to proposals and help win the next round of work

---

## JD068 — Vice President, Retail Operations

- **jd_id:** JD068
- **Company:** Marchand Outfitters
- **Title:** Vice President, Retail Operations
- **Seniority:** Vice president
- **Location:** Denver, CO — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p29

**About the role**

Marchand Outfitters operates 175 outdoor and technical apparel stores, and we are in the middle of a repositioning: fewer, larger stores, more service, more inventory turns. The VP of Retail Operations owns the field organisation through that transition, reports to the Chief Stores Officer, and inherits four regional vice presidents.

**Requirements**

- Multi-unit retail leadership across 100+ locations, with district or regional structure beneath you
- Ownership of a store operating expense budget in the tens of millions
- You've designed or replaced a labour model and lived through the rollout
- Shrink reduction results you can quantify
- Experience closing and consolidating stores as well as opening them
- Track record building a succession pipeline that actually fills openings internally
- Strong analytics instincts; our field leaders run on a daily scorecard and will expect you to interrogate it

**Responsibilities**

- Lead the field organisation of four regional VPs and 22 district managers
- Own store operating standards, labour model and expense performance for the fleet
- Drive the store consolidation programme, including transfer and severance planning with HR
- Set the operational agenda for the annual field leadership conference
- Partner with merchandising and supply chain on inventory flow and in-stock performance

---

## JD069 — Director of Field Operations

- **jd_id:** JD069
- **Company:** Tallow Creek Market Group
- **Title:** Director of Field Operations
- **Seniority:** Director
- **Location:** Atlanta, GA — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p29, p30

**About the role**

Tallow Creek runs 48 grocery stores in the Southeast plus a same-day delivery operation built on top of them. The two halves of the business are managed by two separate teams that do not agree on much. This director role owns both — store operations standards and the delivery network that depends on them — and reports to the Chief Operating Officer.

**Requirements**

- At least eight years in operations leadership, retail or delivery, with multi-site accountability
- Experience with either store labour models or route-level delivery economics, and the appetite to learn the other
- Managed a distributed workforce through managers, including hourly and contracted labour
- P&L ownership and comfort defending a variance in front of a CFO
- Rollout experience: you have taken a change to more than thirty sites at once
- Familiarity with telematics, task management or workforce management platforms
- Grocery or perishables background is a plus given the margin structure

**Responsibilities**

- Own operating standards and labour planning across 48 stores and the delivery fleet
- Run the weekly operating review covering in-stock, on-time delivery and labour productivity
- Lead the picker-productivity programme that determines whether delivery reaches breakeven
- Manage six area directors and the central operations support team
- Sponsor the next wave of market expansion, including site readiness and hiring plans

---

## JD070 — Vice President, Last-Mile Delivery

- **jd_id:** JD070
- **Company:** Junipero Parcel
- **Title:** Vice President, Last-Mile Delivery
- **Seniority:** Vice president
- **Location:** Philadelphia, PA — Hybrid, 3 days on-site
- **Employment type:** Full-time
- **Targets:** p30

**About the role**

Junipero Parcel is a regional carrier delivering across the Northeast and mid-Atlantic for e-commerce shippers who have decided they want an alternative to the national networks. We are at 34 markets and plan to be at 55 within three years. The VP of Last-Mile owns the delivery organisation, the contracted fleet base and the economics of both, reporting to the President.

**Requirements**

- Executive-level operations leadership in parcel, courier or last-mile delivery
- You have expanded a delivery network into new metros and know what breakeven density actually costs
- Deep understanding of contracted delivery partner models — contracts, compliance, partner economics
- Owned a nine-figure operating budget with accountability for cost per stop or equivalent unit economics
- Driver safety programme leadership, including telematics-based coaching
- Peak season planning at volumes that double or more
- Experience negotiating at the contract-template level with legal, not just at the rate level

**Responsibilities**

- Lead the last-mile organisation through regional managers across all active markets
- Own cost per stop, on-time delivery and first-attempt success as the primary operating metrics
- Direct the market launch pipeline, from feasibility through to route density targets
- Manage the delivery partner network, including contract terms and performance remediation
- Build and defend the annual peak plan with capacity, hiring and contingency scenarios

---


---

## Coverage map

Every persona has 2–3 targets; no persona has more or fewer.

| persona | current title | matching JD ids |
|---|---|---|
| p01 | Senior Revenue Manager | JD001, JD011, JD021 |
| p02 | Clinical Operations Manager | JD002, JD012, JD024 |
| p03 | Staff Backend Engineer | JD003, JD013, JD022 |
| p04 | Plant Operations Director | JD004, JD014 |
| p05 | Program Manager, Transit Capital Delivery | JD005, JD015 |
| p06 | Store Operations Lead | JD006, JD016, JD023 |
| p07 | VP of Supply Chain | JD007, JD017 |
| p08 | Senior Product Manager | JD008, JD018 |
| p09 | Director of Nursing, Post-Acute | JD009, JD019, JD024 |
| p10 | Airline Network Planning Analyst | JD010, JD020, JD021 |
| p11 | Compliance Manager, Consumer Lending | JD025, JD026, JD027 |
| p12 | Quality Engineer | JD028, JD029, JD030 |
| p13 | Head of Customer Success | JD031, JD032, JD033 |
| p14 | Transportation Manager | JD034, JD035, JD036 |
| p15 | Grants and Contracts Administrator | JD037, JD038, JD039 |
| p16 | VP of Commercial, Cruise and Expedition | JD040, JD041 |
| p17 | Clinical Laboratory Scientist (switcher) | JD042, JD043 |
| p18 | Director of Credit Risk | JD027, JD044, JD045 |
| p19 | Production Manager | JD030, JD046 |
| p20 | Director of Information Technology, County Government | JD039, JD047 |
| p21 | E-commerce Merchandising Manager | JD048, JD055, JD061 |
| p22 | Warehouse Systems Analyst | JD049, JD056, JD062 |
| p23 | VP of Engineering | JD050, JD057 |
| p24 | Tour Operations Manager | JD051, JD058, JD063 |
| p25 | Hospital Pharmacist (switcher) | JD052, JD059 |
| p26 | High School Mathematics Teacher (switcher) | JD053, JD060, JD064 |
| p27 | Controls and Automation Technician | JD054, JD065 |
| p28 | Senior Policy Analyst, State Housing Agency | JD066, JD067 |
| p29 | Director of Store Operations | JD055, JD068, JD069 |
| p30 | Director of Last-Mile Delivery | JD062, JD069, JD070 |

Dual-target roles: JD021 (p01, p10) · JD024 (p02, p09) · JD027 (p11, p18) ·
JD030 (p12, p19) · JD039 (p15, p20) · JD055 (p21, p29) · JD062 (p22, p30) · JD069 (p29, p30).
