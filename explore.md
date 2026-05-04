I'll start by finding all files under /workspace/yinzhan/ recursively, then read each one.Now I have the full file tree. Let me read all files simultaneously in parallel batches.All 28 files have been read. Here is the complete inventory:

Complete File Inventory — /workspace/yinzhan/
📁 Directory Structure (28 files total)
/workspace/yinzhan/
├── task.default.yaml
├── workflow.yaml
└── prompts/
    ├── analyst_prompt.md
    ├── checker_prompt.md
    ├── writer_prompt.md
    └── step/
        ├── shared/
        │   ├── jhora_usage_guide.md
        │   └── jyotish_theory_protocol.md
        ├── modules/
        │   ├── natal_module_skeleton.md
        │   ├── career.md
        │   ├── children.md
        │   ├── education.md
        │   ├── family.md
        │   ├── health.md
        │   ├── love.md
        │   ├── risks.md
        │   ├── spirituality.md
        │   └── wealth.md
        └── timeline/
            ├── md_prompt.md
            ├── ad_prompt.md
            └── modules/
                ├── career.md
                ├── children.md
                ├── education.md
                ├── family.md
                ├── health.md
                ├── love.md
                ├── risks.md
                ├── spirituality.md
                └── wealth.md
📄 File Details & Summaries
1. /workspace/yinzhan/task.default.yaml
Size: ~18 KB (very large YAML file) Summary:

Defines the default task flow for the yinzhan (印占) Jyotish astrology workflow.
Specifies current_step: 'round1-1-1-analyst' and a single round (round1) containing 15+ ordered steps.
Each step has a key (e.g., 1-1, 2-1, ... 7-1-1-0), a title, a status (pending), and description blocks for three agent roles: analyst, checker, and writer.
Steps covered:
1-1: Data validation + Panchanga + Lagna/Moon analysis
2-1: Planetary states (Shadbala/Vimsopaka/Avasthas), Jaimini Karakas (AK/AmK/DK)
2-2: Rahu-Ketu karmic axis
2-3: Core Yoga patterns and manifestation
3-1: Navamsa (D9) deep decode
3-2: Divisional charts (Vargas) & Doshas (Kala Sarpa, Mangal, Pitra)
3-3: Jaimini soul architecture + Ashtakavarga SAV scan
4-1: Natal comprehensive conclusion (Purusharthas, Upayas, risks, verification)
6-0: Natal module routing & trimming (dynamic sub-task insertion)
6-1: Placeholder for dynamically routed natal module
7-0: Timeline master control & Dasha selection (MD sub-task tree planning)
7-1: MD master control + domain analysis (placeholder)
7-1-0: AD routing (placeholder)
7-1-1: AD sub-period analysis (placeholder)
7-1-1-0: PD drill-down (conditional, placeholder)
7-1-z: MD aggregated report (placeholder)
2. /workspace/yinzhan/workflow.yaml
Size: ~3 KB Summary:

Defines the workflow metadata for yinzhan.
Key fields:
id: yinzhan, version: 2, entry_agent: analyst
task_default_file: workflows/yinzhan/task.default.yaml
step_prompt_seed_dir: workflows/yinzhan/prompts/step
Runtime messages for three lifecycle events:
kickoff: 7-step startup sequence (read task context → birth data → create JHora session → load chart → read notes → load historical artifacts → determine execution boundary)
idle_wake: Instructions for resuming interrupted workflows
on_done: Final checklist for wrapping up a completed run
Agents (all use gpt-5.2 with reasoning_effort: xhigh):
analyst → analyst_prompt.md, tools: [task_read, task_update, read_json]
checker → checker_prompt.md, tools: same
writer → writer_prompt.md, tools: same
3. /workspace/yinzhan/prompts/analyst_prompt.md
Size: ~12 KB Summary:

System prompt for the Analyst agent — a "Vedic Astrology Grandmaster" with deep expertise in Parashari and Jaimini traditions.
§1 Identity: Operates on three layers: rigorous logic (tech layer), poetic Eastern wisdom (expression layer), and team navigator (collaboration layer).
§2 Team Collaboration: Defines the three-role team (Analyst → Checker → Writer), Team-mailbox protocol, and rules for waiting/not waiting for checker feedback.
§3 Core Workflow Rules: Autonomous planning authority over the entire task; can trim/merge/insert/skip pending steps; leaves done steps immutable.
§4 Tool Calling: JHora MCP tools (shared guide), subagent spawning (spawn_agent), and task_read/task_update protocols.
§5 Dual-Layer Expression: Part A = hard-core technical (E# evidence chains); Part B = plain-language real-world mapping (B0 role radar, B1 observable statements with [evidence: XX#] backlinks).
§6 Output Protocol: Structured format for baseline steps: A0 (thesis), A1 (evidence E#), A2 (counter-evidence CE#), A3 (verdict), B0 (role radar), B1 (reality mapping).
§7 Single-Step Execution Loop: Read task → analyze → update note.md → adjust task flow → decide on checker sync.
§8 Workspace Architecture Reference: Directory layout for task.yaml, note.md, input/, prompts/, steps/, reports/.
§9 Shared Protocol Index: Two mandatory reference files (jyotish_theory_protocol.md, jhora_usage_guide.md) and when to read them.
4. /workspace/yinzhan/prompts/checker_prompt.md
Size: ~14 KB Summary:

System prompt for the Checker (reviewer) agent.
Role: Does not re-analyze the chart; strictly audits analyst outputs for logical rigor, evidence standards, and ethical compliance.
Startup: Must call task_read then read note.md before any review.
Tool Protocol: Can independently call JHora tools and spawn_agent for verification; uses Team-mailbox for handoffs; uses task_update for status changes; submits final verdict via checker_submit(decision="pass"|"revise"|"need_human").
Core Check Rules (7 rules):
Step target verification (evidence label tier must match step type)
Single-step check (lenient — only flag if multiple complete steps are output)
Hallucination zero-tolerance (all key conclusions must have chart evidence)
Evidence backlink constraint (B1 core statements must link to current-tier labels)
Dual-layer expression (Part B must be plain, observable language)
Tool call oversight (Shadbala/BAV/Dasha dates require tool calls)
Quantitative veto (no rosy verdicts for war-loser or combust planets without high scores)
Evidence Label Tier Table: E#→natal baseline, ME#→natal modules, TE#→MD control, DE#→MD domains, AE#→AD control, ADE#→AD domains, PDE#→PD drilldown.
Two Review Modes: Mode A (technical review for Analyst output) vs Mode B (fidelity & plain-language review for Writer output).
Stage-Specific Checklists: Detailed checklist items for each step type (1-1, 2-1, 2-3, 3-x, 4-1, 6-x, 7-0, MD, AD routing, AD analysis, PD drilldown, MD aggregation).
Writer Output Checklist: Checks for no fabrication, no omission of key risks/timeframes, complete de-jargonization, and conversational tone.
5. /workspace/yinzhan/prompts/writer_prompt.md
Size: ~9 KB Summary:

System prompt for the Writer (润色师) agent — styled as a "veteran astrologer who is also an old friend of the client."
Core Task: Convert technical Part B bullet-point lists into grouped narrative prose — casual, warm, tea-house-conversation style.
Input: Step name, analyst draft (Part A+B), checker comments.
Formatting Rules:
Group 2-3 related B1 items into a thematic paragraph with a bold colloquial heading
Move all [evidence: XX#] tags from inline to block-quote footnotes at paragraph end
Integrate B0 role signals directly into narrative (no separate tables)
Weave B2 time windows into a story-like timeline
Part A: Only light proofreading (no content changes, preserve all labels and structure).
Six Absolute Red Lines (R1–R6): No adding facts, no changing conclusions, no cross-step contamination, all evidence labels preserved in footnotes, all fenced code blocks preserved verbatim, total "invisibility" (no meta-narrative).
Anti-AI-flavor Rules (A1–A6): Ban on transitional clichés, summary openers, parallel triads, excessive punctuation, lecturing tone; allow short sentences and oral cadence.
Forced Concreteness Rule: Each narrative paragraph must contain ≥1 observable real-life event example (e.g., "transferred to another department", "got sued", "bought a house").
Banned Word Table: Lists abstract jargon (e.g., "energy flow", "karmic test", "house shift") and required plain-language replacements.
Tool/Team Protocols: Reads task_read first, uses Team-mailbox for handoffs, can spawn_agent for large steps.
6. /workspace/yinzhan/prompts/step/shared/jhora_usage_guide.md
Size: ~8 KB Summary:

Shared reference for all JHora MCP tool usage across the entire workflow.
§1 Scope: Must be read before calling any jhora_* tool or citing tool data.
§2 Data Source Priority: (1) Live JHora MCP → (2) jhora_extended.json static export → (3) reviewed prior artifacts → (4) old runs (background only).
§3 Evidence Ledger Template: Mandatory product header format listing Dasha rows, Transit snapshots, BAV/SAV source, divisional chart source, Tajaka anomalies, and live/static conflicts.
§4 Mandatory Call Scenarios: 12 specific situations requiring live JHora calls (Shadbala, BAV/SAV, Dasha boundaries, transits, divisional charts, Tajaka, Yoga enumeration, Arudha, Bhava Bala, Drishti, synastry match).
§5 Dasha Query & Expansion Strategy: Use as_of for current level; path for targeted MD→AD expansion; PD only at PD drilldown step; empty secondary_rows handling rules.
§6 Transit Trigger Validity: Five-layer mantra (Dasha sets direction, Transit pulls trigger, BAV validates, Tajaka covers cross-year, Yoga checks activation); BAV < 4 forces downgrade.
§7 BAV/SAV House Mapping Algorithm: Step-by-step transit BAV calculation (Lagna → transit sign → house number → read that planet's own BAV for that sign); BAV/SAV strictly D1 only, never Vargas.
§8 Divisional Chart Sources & Downgrade Rules.
§9 Live/Static Conflict Resolution: Live wins; conflict logged in note.md; conflicted items cannot be main evidence.
§10 Tajaka & Anomalous Tool Output: AD spanning calendar year → must call Tajaka; anomalous sign decode (all-zeros) → cannot be used as strong evidence.
§11 Eclipse & Panchanga Validation: Optional for Saturn/Jupiter sign-change + eclipse overlap; required if giving "auspicious timing" recommendations.
§12 Checker Independent Verification Checklist: 7 items for checker to verify JHora-related claims.
7. /workspace/yinzhan/prompts/step/shared/jyotish_theory_protocol.md
Size: ~7 KB Summary:

Shared Jyotish theory constraints for cross-step use across the workflow.
§1 Scope: Must be read when using Parashari/Jaimini techniques, aspects, Arudha, Karakas, Argala, Yoga, Avasthas, Combustion, Graha Yuddha, Nakshatra Pada, Vargas.
§2 Base System: Sidereal Zodiac + Lahiri Ayanamsa; D1 is primary, Vargas only verify/refine.
§3 Two Aspect Systems (Must Not Mix): Parashari Graha Drishti (planet-based: Saturn 3/7/10, Jupiter 5/7/9, Mars 4/7/8) vs. Jaimini Rashi Drishti (sign-based). Never cite both in the same evidence item.
§4 Arudha & Chara Karaka: Arudha = social projection, not inner self; Karakamsha = spiritual direction, not event timing.
§5 Argala/Virodha Argala: Hidden influence structure via 2/4/11 house wedge; explains amplification or blockage of a placement.
§6 Parivartana Yoga: Must verify both planets are in each other's own sign (not just any friendly sign); major Dasha trigger.
§7 Avasthas, Combustion, Graha Yuddha: All three require tool or explicit calculation support; live JHora trumps old static exports.
§8 Shadbala, Vimsopaka, Quantification: Must note source when citing scores; downgrade conclusions for Vargas without quantification.
§9 Upachaya & Dusthana: Upachaya (3/6/10/11) = growth potential, malefics here are not purely negative; Dusthana (6/8/12) includes hidden resources and liberation paths.
§10 Nakshatra Pada Ongoing Use: Not just in step 1-1; Pada connects D1 to D9 (Dharma/Artha/Kama/Moksha axis).
§11 Yoga Manifestation Principle: Yoga ≠ automatic manifestation; requires strength check + Dasha activation + Transit trigger.
§12 Vargas Usage Boundaries: D9=marriage/inner fruit, D10=career, D2=wealth polarity, D7=children, D24=education, D30=calamity, D60=high-level karma. BAV/SAV never applied to Vargas.
§13 Evidence Tiers & Reality Mapping: Current-tier labels mandatory; upstream references use [Ref: module.label]; plain-language mapping required.
§14 Timeline Multi-Dimensional Verification Principles: The five-layer verification mantra with specific red lines (high/critical requires both Dasha + Transit; BAV < 4 forces downgrade; cross-year AD needs Tajaka; PD only when triggered; Yoga needs all three layers).
8. /workspace/yinzhan/prompts/step/modules/natal_module_skeleton.md
Size: ~8 KB Summary:

Universal template/skeleton for all natal domain modules (career, wealth, love, health, etc.).
Role: Domain modules build on completed baseline (E#/CE#); skeleton defines the "lock" shape; timeline analyst later provides the "key."
De-duplication Boundary: Specific module files must NOT redefine the common output protocol, reference formats, evidence numbering, B2 de-jargonization rules, or shared JHora/theory rules — all defined here.
Core Rules:
Inherit & Redefine: Read baseline E# → cite with [Ref: step.E#] → reinterpret in domain context; never copy baseline text verbatim.
Module-Specific Evidence (ME#): Numbered ME1, ME2, …; must include the domain's primary divisional chart (D10 for career, D9 for love, etc.); must check vimsopaka, avasthas, relationships.compound.
Absolute Time Prohibition: Never output specific dates; only conditional star-pattern descriptions (e.g., "when the 10H lord's Dasha activates...").
Trigger Condition Portrait (A3): Technical interface for timeline analyst; lists event-type groups with main trigger planets, Transit catalysts, and modifiers.
Cross-Module Linking: [Cross-Link: module_code] for overlapping domains, no re-analysis.
Full Output Protocol:
Part A: A-Pre (baseline bridge, strict [Ref: step.E#] format), A0 (domain thesis), A1 (ME# evidence chain, 4–8 items), A2 (format + key Yoga + counter-evidence MCE#), A3 (trigger portrait by event type).
Part B: B0 (domain role radar), B1 (3–6 static reality statements, each with [evidence: ME#]), B2 (semi-structured trigger checklist — B2 de-jargonization red line: no planet names, no Sanskrit terms, no house numbers, no varga codes).
9. /workspace/yinzhan/prompts/step/modules/career.md
Size: ~10 KB Summary:

Natal Career & Achievement Module — role is "Career Domain Architect."
Primary Chart: D10 (Dasamsa); aux: D1, D9, D24.
Analysis Dimensions (P0–P2): Vocational direction & ceiling (D10, Saturn/Sun/Mercury), career form (6/7/3H), promotion/authority (10/11H, Raja Yoga), academic/skills (4/5/9H, D24), work environment (6/9/8H).
Module Boundaries: Clearly distinguished from wealth (career = "LinkedIn-writable actions"; wealth = "Excel-recordable results") and love (7L in 10H → Cross-Link).
Part A Guidance: A-Pre filters baseline E# for 1/3/6/7/10/11H, Sun/Saturn/Mercury/Mars, Artha Trikona, AK/AmK. D10 mandatory checks: D10 Lagna Lord, D10 10H Lord (with vimsopaka, avasthas, relationships.compound), D10 Sun, D10 AmK.
Career Form Assessment: 6H-dominant → service/employment; 7H-dominant → commerce/partnership; 3/11H-dominant → freelance/independent.
Key Yogas: Raja Yoga, Dharma-Karmadhipati Yoga, Amala Yoga, Pancha Mahapurusha, Parivartana involving 10H.
Ceiling Assessment Factors: 10H lord Vimsopaka/Shadbala/combustion, D1 10/11H SAV scores, D10 10H lord Avastha, Raja Yoga count/strength, Sun strength.
A3 Trigger Conditions (5 event types): Promotion/authority expansion, job change/transition, startup/independence window, unemployment/demotion risk, academic/skill upgrade.
Part B Guidance: B0 career roles (self, superior, peers, subordinates, clients, mentor/benefactor); B1 penetrating statements about career identity (not generic); B2 plain-language 5-event trigger list (strict no-jargon rule).
10. /workspace/yinzhan/prompts/step/modules/children.md
Size: ~9 KB Summary:

Natal Children & Legacy Module — role is "Progeny Transmission Architect."
Primary Chart: D7 (Saptamsa); aux: D1 (5H), D9 (spouse fertility verification).
Analysis Dimensions: Fertility promise (5H, Jupiter, D7 Lagna), parent-child bond (5L vs Lagna Lord relationship, Putra Karaka), child's characteristics (D7 5H planets), parenting difficulty (Saturn/Mars on 5H), special paths (Rahu/Ketu + 5H → IVF/adoption/step-children).
Module Boundaries: Distinct from love (love=marriage contract, children=its fruits), health (health=mother's body; children=fetal outcome), career (D7 "spiritual children" = works, not biological children), family (family=me-as-child; children=me-as-parent), wealth (child rearing costs → wealth).
Key Checks: D7 Lagna/5L/Jupiter status; Putra Karaka (PK, Jaimini); Beeja/Kshetra Sphuta (optional); 5L vs Lagna Lord relationship.
Key Yogas: Gajakesari involving 5H (multiple blessed children), Sarpa Dosha (5H Rahu/Ketu squeeze → fertility difficulty), Kakavandhya Yoga (one child/none), Alpa Putra Yoga (sparse children).
Sensitivity Control: "No children" → reframe as "spiritual creation / social nurturing / adoption"; gender → use "yang/yin characteristics" not absolute declarations.
A3 Trigger Conditions (4 event types): Pregnancy window, child milestone, parenting challenge, unconventional intervention.
B1 Examples: Penetrating statements about parent-child dynamic (e.g., "your child is more like a former-life business partner than a simple dependent").
11. /workspace/yinzhan/prompts/step/modules/education.md
Size: ~9 KB Summary:

Natal Education & Skills Module — role is "Cognitive Architect."
Primary Chart: D24 (Siddhamsa); aux: D1 (4/5/9H), D9, D10.
Analysis Dimensions: Cognitive mode/intelligence (Mercury, Moon, 5H, D24 Lagna), academic level/direction (4H, 9H, Jupiter), exam aptitude/competition (6H, 5H, 3H), skills/certifications (2/3H, Mercury, D10), overseas/advanced study (9/12H, Rahu).
Module Boundaries: Education = "acquiring competence & credentials" (diploma-writable); career = "applying competence" (business-card-writable); wealth gets the scholarship money amount, education gets the honor itself.
Cognitive Mode Types: Logical/analytical (Mercury + Sun/Mars/Saturn), intuitive/visual (Moon/Ketu/Jupiter, water signs), memory/accumulative (Mercury + Saturn/earth signs).
Key Yogas: Saraswati Yoga (Mercury+Jupiter+Venus in Kendra/Trikona/2H), Budhaditya Yoga (Sun+Mercury), Gajakesari Yoga (memory+academic reputation), Bhadra Yoga (Mercury exalted/own in Kendra), Hamsa Yoga (Jupiter), Kalanidhi Yoga (master of one domain).
A3 Trigger Conditions (5 event types): Exam pass/qualification, degree acquisition, overseas study, skill transition, academic interruption.
B1 Examples: Penetrating statements about learning style (e.g., "渗透型 learner" who needs immersive environments to suddenly "get it" rather than step-by-step construction).
12. /workspace/yinzhan/prompts/step/modules/family.md
Size: ~9 KB Summary:

Natal Family & Foundation Module — role is "Foundation Pattern Architect."
Primary Charts: D1 (4H mother/home, 9H father/inheritance) + D12 (Dwadasamsa, parental blood-line); aux: D4 (property), D9.
Analysis Dimensions: Parental bond/support (4H, 9H, Moon/Sun, D12), residence/property (4H, Mars, D4), family atmosphere/security (4H, Moon, 2H), relocation/migration (4H–12H relationship, Rahu/Ketu on 4H), ancestral legacy (8/2H, D12).
Module Boundaries: Family vs love (household = family; marriage contract = love); family vs children (me-as-child = family; me-as-parent = children); family vs wealth (real estate = family; investment returns on real estate = wealth); family vs career (family business' "family" aspect = family; its "business" = career).
Key Checks: D12 Lagna Lord, D12 Sun/Moon status, D12 4/9H; D4 4H/4L, D4 Mars; Matru Dosha (Moon + Rahu/Ketu/Saturn), Pitru Dosha (Sun + Rahu/Ketu/Saturn), Kemadruma Yoga (Moon alone).
Family Type Classification: Supportive (4/9L strong + D12 good), Draining (4/9L afflicted + D12 damaged), Absent (4/9L in 12H or Rahu/Ketu associated).
Key Yogas: Bandhu Yoga (4L strong + benefics), Matru/Pitru Dosha, 4L+9L mutual reception, 4L in 6/8/12, Kemadruma Yoga, Mars in 4H (Kuja Dosha 4th position).
A3 Trigger Conditions (5 event types): Family harmony/parental support, property transaction/relocation, generational conflict, parental health/family responsibility transfer, ancestral inheritance.
13. /workspace/yinzhan/prompts/step/modules/health.md
Size: ~11 KB Summary:

Natal Health & Vitality Module — role is "Life Function Architect."
Primary Chart: D6 (Shasthamsa); aux: D1 (1/6/8/12H), D30 (Trimsamsa), D9.
Analysis Dimensions: Constitution/energy (Lagna, Sun, Moon), pathological tendencies/weaknesses (6H/8H/12H), psychological health/stress conversion (Moon, Mercury, 4H), specific organ/system risks (Mars/Saturn/Rahu/Ketu), healing mode/medical luck (11H, Jupiter, 12H, Sun).
Planet-Organ Correspondences: Sun=heart/bones/right eye; Moon=fluids/lymph/stomach/breast; Mars=blood/muscles/inflammation; Mercury=nervous system/skin/lungs/thyroid; Jupiter=liver/fat metabolism; Venus=kidneys/reproductive/sugar; Saturn=bones/joints/chronic disease; Rahu=mystery illness/allergy/mental disorder; Ketu=immune anomaly/nerve pain/unknown pain.
Constitution Types: Steel-frame (Sun/Mars strong + Lagna Lord exalted/own), Precision-glass (Moon/Mercury dominant + afflicted), Pressure-cooker (Mars/Rahu + Lagna + Saturn suppressed).
Key Yogas: Viparita Raja Yoga (6/8/12Lance (Jupiter/Ketu + 5/9/12H).
Remarriage Scan (Mandatory): Check 2H lord, 7H in dual signs, UL2 status, Mercury–7H/Venus link; must give explicit conclusion (repair-type vs restructure-type), never skip with "insufficient data."
Key Yogas: Sreenatha Yoga (7L strong + benefic support), Venus-Jupiter interaction, Kuja Dosha (Manglik, must check cancellation conditions), Papa Kartari on 7H, Punarbhoo Dosha, dual-sign 1/7 axis, Venus/7L in 6/8/12.
A3 Trigger Conditions (6 event types): Fate opening/romance arrival, contract establishment/relationship upgrade, emotional deepening, friction/distance test, relationship rupture/dissolution, remarriage/second-chance fate.
B1 Examples: Penetrating statements about relationship operating system (e.g., "your relationship pattern is 'all-in from the start' — once engaged, exit costs are extremely high").
15. /workspace/yinzhan/prompts/step/modules/risks.md
Size: ~10 KB Summary:

Natal Risks & Adversity Module — role is "Risk Auditor" (insurance actuary style, no fatalism).
Primary Chart: D1 (Rasi) — Dusthana triangle (6/8/12H); aux: D6, D30, D9.
Analysis Dimensions: Core vulnerabilities (6H enemies/debt, 8H sudden change, 12H loss), defense mechanisms (Lagna Lord, Jupiter, 9H, 11H), legal/contract risks (6H, 3H, Rahu, Mercury), financial risks (12H, 8H, 2L/11L afflicted), reputation/information risks (8H, 10H, Rahu).
Module Boundaries: External/sudden impact → risks; internal pathology → health; passive loss → risks; active expenditure → wealth; catastrophic career collapse → risks; developmental setbacks → career.
Key Checks: Dusthana trio deep analysis (6L, 8L, 12L direction), Maraka audit (2L/7L + Saturn), Badhaka detection (by Lagna sign type), defense mechanism evaluation (Lagna Lord + Jupiter/9H + 11H).
Key Yogas: Viparita Raja Yoga (6/8/12L inter-flying → crisis profiteer), Arishta Yoga (Lagna Lord weak → thin defense), Sarpa/Kala Sarpa Yoga, Papa Kartari on Lagna, Subhakartari on Lagna (protective floor), Bandhana Yoga (imprisonment/confinement tendency).
A3 Trigger Conditions (6 event types): Physical safety/accident, legal/contract dispute, financial fraud/scam, reputation/information crisis, family/defense collapse, mental stress/anxiety overload.
Mental health trigger: If persistent depression or self-harm signs appear, must prioritize recommending professional medical help (cross-link to health).
Mandatory Disclaimer: "This module is for risk awareness only; not a legal verdict, medical diagnosis, or inevitable prophecy. Consult licensed professionals for real decisions."
16. /workspace/yinzhan/prompts/step/modules/spirituality.md
Size: ~10 KB Summary:

Natal Spirituality & Inner Path Module — role is "Spiritual Evolution Architect."
Primary Chart: D20 (Vimsamsa); aux: D1 (9/12/8/4H), D9 (Atmakaraka verification).
Analysis Dimensions: Soul direction (9/12H, Ketu, Jupiter), soul indicator Atmakaraka (AK in D1/D9/D20), mystical potential (8H, Rahu, Scorpio/Pisces), practice discipline/renunciation (Saturn on Moon/Lagna, Ketu), teacher/guru connection (9H, Jupiter, D20 benefics).
Module Boundaries: vs health (antidepressants → health; meditation cushion → spirituality); vs love (daily life with partner → love; using relationship as practice → spirituality); vs career (paid religious work → career; genuine faith/realization → spirituality).
Spiritual Path Types: Bhakti/faith-love (Jupiter/Venus strong + 9H benefics), Jnana/inquiry (Mercury/Jupiter strong + 5/9H), Tantra/secret (8H strong + Rahu/Ketu/Scorpio/Pisces).
Special Indicators: Atmakaraka position in D9 (Karakamsha = ultimate soul desire), Ketu's house (domain of detachment), Moon + Saturn/Ketu relationship (loneliness as spiritual driver).
Key Yogas: Pravrajya Yoga (4+ planets in one house → extreme renunciation tendency), Moksha Yoga (Jupiter/Ketu in 12H), Guru-Chandala Yoga (Jupiter + Rahu → must verify faith personally, anti-blind-faith), Tapasyu Yoga (Saturn/Venus/Ketu → world-weariness), Dharma-Karmadhipati involving 9/12H (in-world practice).
A3 Trigger Conditions (5 event types): Spiritual awakening/worldview restructuring, initiation/guru-encounter/practice deepening, pilgrimage/spiritual travel, faith crisis/dark night of the soul, retreat/renunciation tendency.
17. /workspace/yinzhan/prompts/step/modules/wealth.md
Size: ~10 KB Summary:

Natal Wealth & Assets Module — role is "Financial Pattern Architect."
Primary Chart: D2 (Hora, Sun/Moon polarity); main battlefield is D1's 2/5/8/11H cluster; aux: D4 (property), D9.
Analysis Dimensions: Wealth scale/total (2H, 11H, Dhana Yoga, Indu Lagna), income source/form (2/6/10H for regular income; 5/8/11H for windfall), asset form/retention (4H/D4, 2H), financial risks/leakage (12H, 6H, 8H), wealth visibility/social display (AL 2/11H, A2, A11).
Module Boundaries: vs career (wealth = Excel results; career = LinkedIn actions); vs love (spouse-brought assets = wealth, just the amount, not the romance); vs health (medical costs → wealth, the disease itself → health).
D2 Polarity: Sun Hora = self-made/hard-earned; Moon Hora = other-sourced/passive/inherited.
Income Type Classification: Regular income (2/6/10 axis + Saturn/Mercury), windfall income (5/8/11 axis + Rahu/Jupiter), mixed (both axes).
Key Yogas: Dhana Yoga (2L + 11L mutual connection), Lakshmi Yoga (9L strong + Venus strong in Kendra/Trikona), Vasumati Yoga (benefics all in Upachaya), Viparita Raja Yoga (financial context = profit from others' crisis), Daridra Yoga (reverse, "money comes and goes").
Ceiling Factors: Indu Lagna benefics, 2L/11L Shadbala/BAV, D2 Jupiter state, Dhana Yoga count/strength.
A3 Trigger Conditions (5 event types): Cash flow explosion/income surge, asset acquisition/property purchase, speculative gain/windfall, financial drain/large expenditure, debt/leverage change.
B1 Examples: Penetrating statements (e.g., "your wealth tank is big but both inlet and outlet pipes are wide — net retention depends on whether you consciously install a 'cutoff valve'").
18. /workspace/yinzhan/prompts/step/timeline/md_prompt.md
Size: ~16 KB Summary:

MD (Mahadasha) Analysis Prompt — covers both md_general (MD master control) and {domain}_md (MD domain analysis) steps.
Two Roles:
Role A — MD Master Architect (md_general): Uses the current MD planet as a "spotlight" to scan all natal module "locks" and determine which areas are illuminated (HIGH/MEDIUM/LOW).
Role B — MD Domain Architect ({domain}_md): Deep-dives into a single domain's "chemical reaction" when the MD planet key is inserted.
Core Rules:
Natal module A3 inheritance (scan trigger conditions from natal modules)
Activation logic (HIGH/MEDIUM/LOW by whether MD star matches A3 main trigger, catalyst, or indirect relation)
Three-phase temporal model (Inception/换档期 → Fruition/盛放期 → Transition/交割期) using AD sub-periods as time markers — AD is a clock tick, not content
Evidence tier separation (TE# for MD control, DE# for MD domains; no E#/ME# in MD steps)
Cross-module linking with [Cross-Link: {other_domain}_md]
MD Multi-Dimensional Verification Boundaries: MD layer only uses Dasha for direction; Transit for macro calibration only (no specific-month event); BAV forbidden on MD star itself; Tajaka only flagged for AD-layer follow-up; Yoga = "potential illuminated," not event confirmed.
Total Control Output Protocol (md_general): A0 (MD keynote), A1 (MD star energy audit 4-6 TE# + activation matrix table), A2 (TE-CE# counter-evidence), A3 (three-phase evolution + final activation verdict), B0 (life-focus radar), B1 (three-phase storyline preview — strict de-jargonization).
Domain Output Protocol ({domain}_md): A-Pre (dual upstream bridge: md_general + natal module), A0 (domain MD keynote), A1 (DE# dynamic evidence chain 3–5 items), A2 (DCE# risk audit), A3 (activated events table with status/trigger/risk flags), B0 (role change radar), B1 (domain story: core shift / opportunities / risks), B2 (long-term action recommendations for full MD duration, ~16–20 years).
note.md Write-Back Protocol and Output Self-Check Checklists for both step types.
19. /workspace/yinzhan/prompts/step/timeline/ad_prompt.md
Size: ~28 KB (largest file) Summary:

AD (Antardasha) Analysis Prompt — the most comprehensive and complex file, covering ad_general (AD master control), {domain}_ad (AD domain analysis), and pd_drilldown (PD drill-down, conditional).
Three Roles:
Role A — AD Tactical Sniper (ad_general): Matches the current AD planet (2–3 year "actor") against all upstream event lists from MD domain modules.
Role B — AD Domain Special Forces ({domain}_ad): Enters a single domain's divisional chart to pin down specific month-level windows.
Role C — PD Precision Guidance (pd_drilldown): Triggered conditionally; drills into exact Pratyantardasha (flow-month) timing for critical events.
Module Parameters: Detailed input dependencies for each of the three roles.
Core Rules:
MD Inheritance (The Bridge): AD total control reads MD three-phase position; domain step performs triple upstream bridging (ad_general + {domain}_md + natal module) — all three required simultaneously or Checker auto-rejects.
Upstream Event List Matching Logic: Explicit path (AD star in trigger list → ACTIVE), strong-inferred path (lord-ship matches + MD verdict non-negative → ACTIVE), weak-inferred path (Karaka + D9 verification both needed), conflict match (MD negative verdict → forced DORMANT). Complete matrix table required.
Divisional Chart Verification: AD domain must enter the domain's specific divisional chart (not just D1).
Time Anchoring (Window + Trigger): Two-layer filtering — critical windows (Saturn/Jupiter/Rahu-Ketu ingress, eclipse) + PD triggers (must come from pd_segments, no self-calculation). Single window max span: 2 calendar months.
Evidence Tier Strict Separation: AE# (ad_general), ADE#/ADCE# ({domain}_ad), PDE# (pd_drilldown).
Plain-Language Hard Constraint: Part B must contain ≥10 observable action verbs; ban on all planet names/Sanskrit/house numbers/varga codes; use "you will / you should / do first."
Object Stratification: Must explicitly label targets as "partner," "client," "rival," or "family member" — never mix.
PD Drilldown Rules: pd_map must match pd_segments count exactly; first PD segment cannot be skipped; all active AD domain modules must be covered.
Complete Output Protocols for all three roles (Part A and Part B sections with full formatting specifications).
note.md Write-Back Template and Output Self-Check Checklists for all three step types.
📁 Timeline Domain Modules (/workspace/yinzhan/prompts/step/timeline/modules/)
These 9 files each contain [MD专项] and [AD专项] sections that supplement the general md_prompt.md and ad_prompt.md with domain-specific divisional charts, check points, event-type mapping tables, risk audit dimensions, role radar details, and module boundary rules.

20. /workspace/yinzhan/prompts/step/timeline/modules/career.md
Summary:

MD专项: Primary D10 + D1/D9/D24. Checks: D10 core ignition (MD star fall in D10), AmK interaction, authority-source detection, natal Yoga awakening, vocational form (Artha Trikona distribution, AL label, Rahu/Ketu cutting 4/10 axis, Badhaka activation). Risk dimensions: "high-post trap," "busy illusion" (Ketu), office politics, reputation risk, skill obsolescence. Event-type mapping table (5 types with event_category codes). Role radar (self, superior, peers, subordinates, clients). Boundary rules vs wealth_md and love_md.
AD专项: Primary D10. Checks: D10 fall verification, AD-MD chemistry, transit focal points (Saturn ingress/transit on 10H, Jupiter ingress/transit, Rahu-Ketu ingress cutting 4/10 or 1/7, Mars trigger). Risk dimensions: promotion trap, impulsive job-change, PD danger zone, authority confrontation, document hazard. Event-type mapping table (8 types). Role radar. Boundary rules.
21. /workspace/yinzhan/prompts/step/timeline/modules/children.md
Summary:

MD专项: Primary D7 + D1/D9/D12. Checks: D7 core ignition, Karaka status (Jupiter/PK), fertility & obstruction detection (Saturn/Mars on D7 key positions), natal Yoga awakening, spiritual vs. biological children determination. Risk dimensions: "晚子非绝嗣" (late child ≠ no child), miscarriage risk, "rebel child" misread as failure, parental role reversal, generational interference. Event-type mapping table (6 types). Role radar (self-as-parent, child, spouse, grandparents).
AD专项: Primary D7. Checks: D7 fall verification, AD-MD chemistry, transit focal points (Jupiter on 5H, Saturn on 5H, Mars on 5/D7-8H, Rahu-Ketu ingress, BAV). Risk dimensions: IVF/adoption trap, parent-child conflict, PD danger zone, miscarriage window, role reversal burnout. Event-type mapping table (7 types). Role radar.
22. /workspace/yinzhan/prompts/step/timeline/modules/education.md
Summary:

MD专项: Primary D24 + D1/D9/D10. Checks: D24 core ignition (MD star in D24), Mercury/Jupiter/Saturn/Rahu cognitive interaction, 4/5/9H linkage detection, natal Yoga awakening (Saraswati, Budhaditya, Kalanidhi). Risk dimensions: "academic bubble" (Rahu + weak Mercury/Jupiter), exam failure, academic interruption, direction-less (Ketu + Mercury), Saturn deep-study trap. Event-type mapping table (5 types). Role radar (self, mentor, peers, examiner, family support).
AD专项: Primary D24. Checks: D24 fall verification, AD-MD chemistry, transit focal points (Jupiter on 4/5/9H, Saturn on 5H, Mercury retrograde, Rahu-Ketu ingress, Mars trigger). Risk dimensions: high-score-low-ability, impulsive dropout, PD danger zone, advisor betrayal, Saturn delay. Event-type mapping table (8 types). Role radar.
23. /workspace/yinzhan/prompts/step/timeline/modules/family.md
Summary:

MD专项: Primary D12 + D4/D1/D9. Checks: D12 root audit (parental bond), D4 property detection, D1 core axis 4/9H ignition (Matru/Pitru Dosha), natal Yoga awakening (Bandhu/Kemadruma), family transmission lineage (D12 inheritance vs. Ketu/12H disconnection), AL 4H social family image. Risk dimensions: "gilded cage," "distant allure," "inheritance price" (cross-link risks), "反哺耗尽" (caregiver burnout), Dosha eruption. Event-type mapping table (6 types). Role radar (self, mother, father, siblings, ancestors).
AD专项: Primary D12 + D1/D4. Checks: D12 fall verification, AD-MD chemistry, transit focal points (Saturn on 4H/Moon, Jupiter on 4/9H, Mars on 4H, Rahu-Ketu ingress). Risk dimensions: blind property purchase trap, family fracture, PD danger zone, relocation confusion, caregiver overload. Event-type mapping table (7 types). Role radar (self, parents, spouse, siblings).
24. /workspace/yinzhan/prompts/step/timeline/modules/health.md
Summary:

Mandatory disclaimer at top (not medical diagnosis; consult physicians).
MD专项: Primary D6 + D1/D30/D9. Checks: D6 core defense posture (MD star in D6), disease-factor activation (6L/8L/22nd Drekkana Lord), mind-body connection (Moon/Mercury relationship, Saturn+Moon psychosomatic pattern), natal Yoga awakening (Arishta/VRY), D30 hidden pathology scan. Risk dimensions: "false strength," "slow time bomb," "iatrogenic misdiagnosis" (Rahu/Ketu), "overwork → physiological collapse" (cross-link career), "emotional lesion." Event-type mapping table (5 types). Role radar (self/immune, disease/6L, healer/Jupiter, support/4H).
AD专项: Primary D1 (6/8H) + D9/D30. Checks: D1 Dusthana verification, Maraka detection, transit focal points (Saturn on Lagna/Moon/6H, Mars on 6/8H, Rahu-Ketu ingress, Jupiter protection window). Risk dimensions: overwork trap, hidden deterioration, PD danger zone (Maraka + Lagna Lord conflict), treatment side effects, psychosomatic collapse. Event-type mapping table (8 types). Role radar (self, physician, stress source, caregiver).
25. /workspace/yinzhan/prompts/step/timeline/modules/love.md
Summary:

MD专项: Primary D9 + D1/D60. Checks: D9 core ignition (MD star in D9), Venus & DK interaction, UL audit (2nd from UL as marriage continuation indicator), natal Yoga awakening, 5H vs. 7H/UL differentiation (romance vs. commitment), Rahu influence on 5/7H. Risk dimensions: "fake romance" (Rahu), "contract trap" (marrying into heavy family burden), "cold violence" (Saturn/Ketu cuts Venus), "turbulent cycle" (8H + Mars), "name-only delay" (Jupiter but Saturn blocks UL). Event-type mapping table (6 types). Role radar (self, spouse/DK, potential romance/Rahu, family/long elders, rival/third party).
AD专项: Primary D9 + D1/D7. Checks: D9 fall verification, AD-MD chemistry, transit focal points (Venus transit on 7H, Jupiter ingress on 7H/Lagna, Saturn on 7H/UL, Rahu-Ketu ingress cutting 1/7, Mars trigger, Venus retrograde downgrade). Risk dimensions: flash-marriage trap, impulsive breakup, PD danger zone, third-party window, Venus retrograde trap. Event-type mapping table (8 types, including relationship renewal). Special note: if subject is single, contract_established confidence must be extra-downgraded and reworded to "potential bud."
26. /workspace/yinzhan/prompts/step/timeline/modules/risks.md
Summary:

Mandatory disclaimer at top.
MD专项: Primary D1 (6/8/12H) + D9/D6/D30. Checks: Dusthana deep activation, Maraka audit (2L/7L + Saturn — if both active, highest risk flag), hard aspects (Mars/Saturn/Rahu on MD star + Moon Sade Sati), Badhaka Lord detection, D30 hidden disaster scan. Risk dimensions: "VRY reversal" (negative-negative = positive, must note conditions), "protective shield" (Jupiter protection → downgrade risk), "invisible termites" (10H exterior but 12L erosion), "chain risks" (one domain triggers another). Event-type mapping table (6 types). Role radar (visible enemy/6H, hidden enemy/12H, uncontrollable force/8H, rescuer/9H, self-defense/Lagna).
AD专项: Primary D1 (6/8/12H) + D6/D30. Checks: Dusthana verification, Maraka + Badhaka dual detection (if both → highest level), transit focal points (Saturn/Rahu transit on 6/8/12, Mars + Saturn "fire-earth battle," Rahu-Ketu ingress, Jupiter protection window). Risk dimensions: "false-alarm becomes real disaster" (D30 cross-check), "chain reaction," "PD danger zone" (Maraka + Lagna Lord conflict = auto highest confidence), "Jupiter displacement" (normal protector gone), "safety illusion" (D1 OK but D6/D30 broken). Event-type mapping table (7 types, including risk_resolution). Role radar.
27. /workspace/yinzhan/prompts/step/timeline/modules/spirituality.md
Summary:

Critical health boundary at top: if persistent emotional depression or self-harm signs appear, must recommend professional medical help — cannot attribute mental illness solely to "spiritual transformation."
MD专项: Primary D20 + D1/D9/D12. Checks: D20 core ignition (MD star in D20), Atmakaraka interaction (AK activation = soul lesson forced; AK + Jupiter = active awakening vs. AK + Saturn/Ketu = forced realization), teacher/grace connection (Jupiter/9L relationship), Ketu/12H/8H → renunciation trigger, D12 ancestral/past-life connection (5/9H in D12). Risk dimensions: "spiritual bypassing" (Rahu + 12H → escaping reality), "fake guru" (Guru-Chandala activated), "dark night of soul" (Moon/Lagna suppressed — note mental health if persistent), "worldly collapse cost," "occult addiction" (Rahu + D20 8H). Event-type mapping table (5 types). Role radar (self/soul, guru/9H, deity/9H, subconscious/8H, worldly anchor/10H).
AD专项: Primary D20 + D1/D9. Checks: D20 fall verification, AD-MD chemistry, transit focal points (Jupiter on 9/12H, Ketu on 9/12H or conjunct Moon, Saturn on 9/12H, Rahu on 9H, BAV). Risk dimensions: "spiritual detour" (D1 shows 9H interest but D20 afflicted/Rahu), "escaping reality" (12H strong but no Jupiter), "PD danger zone" (Jupiter + 9L conflict month), "spiritual emergency" (D20 8H + Rahu/Mars → kundalini reaction, cross-link health). Event-type mapping table (7 types, including spiritual_service). Role radar.
28. /workspace/yinzhan/prompts/step/timeline/modules/wealth.md
Summary:

MD专项: Primary D2 + D1/D4/D9. Checks: D2 polarity ignition (Sun Hora = self-earned; Moon Hora = other-sourced/passive), financial axis (2/5/8/11H) activation, Dhana Yoga awakening (natal wealth module ME# baseline required), property/asset solidification (4L/Mars + D4 status), wealth visibility vs. actual assets (AL 2/11H Argala state, Ketu on financial houses → invisible wealth). Risk dimensions: "transient wealth god" (11H active but 12H also active → can't retain), "speculative bubble" (5/8 axis + Rahu), "debt swamp" (6H + 2H leverage), "generational loss" (D2 Jupiter afflicted), "paper wealth" (A11 blocked by Virodha Argala). Event-type mapping table (5 types). Role radar (self, family/2H, spouse/8H, creditors/6H, advisor/9H).
AD专项: Primary D2 + D1/D9. Checks: D2 Hora fall verification, AD-MD chemistry, transit focal points (Jupiter on 2/11H, Saturn on 2/11/12H, Rahu-Ketu ingress on 2/11 axis, Mars on 2H/11L). Risk dimensions: "windfall trap" (D1 looks good but D2 doesn't support retention), "passive financial drain" (12H + Rahu = being robbed/scammed, not voluntarily spending), "PD danger zone" (2L + 11L both afflicted), "partnership financial drain" (7H/8H afflicted = assets divided), "tax/legal costs" (6/8H + Saturn). Event-type mapping table (7 types, including inheritance and wealth_visibility). Role radar (self, benefactor/2H, partner/7H, creditor/6H).
Summary Table
#	File Path	Size Estimate	Category
1	task.default.yaml	~18 KB	Workflow task definition
2	workflow.yaml	~3 KB	Workflow metadata & agents
3	prompts/analyst_prompt.md	~12 KB	Agent system prompt
4	prompts/checker_prompt.md	~14 KB	Agent system prompt
5	prompts/writer_prompt.md	~9 KB	Agent system prompt
6	prompts/step/shared/jhora_usage_guide.md	~8 KB	Shared tool protocol
7	prompts/step/shared/jyotish_theory_protocol.md	~7 KB	Shared theory protocol
8	prompts/step/modules/natal_module_skeleton.md	~8 KB	Natal module template
9	prompts/step/modules/career.md	~10 KB	Natal domain module
10	prompts/step/modules/children.md	~9 KB	Natal domain module
11	prompts/step/modules/education.md	~9 KB	Natal domain module
12	prompts/step/modules/family.md	~9 KB	Natal domain module
13	prompts/step/modules/health.md	~11 KB	Natal domain module
14	prompts/step/modules/love.md	~12 KB	Natal domain module
15	prompts/step/modules/risks.md	~10 KB	Natal domain module
16	prompts/step/modules/spirituality.md	~10 KB	Natal domain module
17	prompts/step/modules/wealth.md	~10 KB	Natal domain module
18	prompts/step/timeline/md_prompt.md	~16 KB	Timeline MD prompt
19	prompts/step/timeline/ad_prompt.md	~28 KB	Timeline AD/PD prompt
20	prompts/step/timeline/modules/career.md	~8 KB	Timeline domain module
21	prompts/step/timeline/modules/children.md	~8 KB	Timeline domain module
22	prompts/step/timeline/modules/education.md	~8 KB	Timeline domain module
23	prompts/step/timeline/modules/family.md	~8 KB	Timeline domain module
24	prompts/step/timeline/modules/health.md	~8 KB	Timeline domain module
25	prompts/step/timeline/modules/love.md	~8 KB	Timeline domain module
26	prompts/step/timeline/modules/risks.md	~8 KB	Timeline domain module
27	prompts/step/timeline/modules/spirituality.md	~8 KB	Timeline domain module
28	prompts/step/timeline/modules/wealth.md	~8 KB	Timeline domain module
Total: 28 files, approximately 280–310 KB of content across the directory.