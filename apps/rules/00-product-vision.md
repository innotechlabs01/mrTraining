# MR Training — Product Vision

> The operating system for sports coaching.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Vision Statement](#2-vision-statement)
3. [Target Personas](#3-target-personas)
4. [Core Modules](#4-core-modules)
5. [Business Model](#5-business-model)
6. [Success Metrics](#6-success-metrics)
7. [Competitive Landscape](#7-competitive-landscape)
8. [Product Roadmap](#8-product-roadmap)
9. [Non-Goals](#9-non-goals)
10. [Technical Principles](#10-technical-principles)

---

## 1. Executive Summary

**MR Training** is a premium SaaS platform and the definitive "operating system for sports performance." It unifies the entire ecosystem of athletic development — coaches, athletes, academies, sports clubs, nutritionists, and physical therapists — under a single digital roof. The platform replaces the fragmented, manual workflows that dominate the coaching industry today: spreadsheets for programming, separate apps for nutrition, messaging platforms for communication, payment processors for billing, and analytics dashboards that never talk to each other.

The platform consolidates **fourteen interconnected domains** — Gym, Running, Tennis, Swimming, Cycling, CrossFit, Nutrition, Recovery, Community, Events, Payments, AI, Analytics, and CRM — into a coherent, opinionated product. A coach should be able to design a periodized training block, assign it to an athlete, track their nutrition and recovery, communicate with them in real time, collect payment, and analyze performance trends — all without leaving the platform.

**Why MR Training exists:** The coaching industry has matured. Coaches are no longer solo operators with a clipboard and a stopwatch. They run businesses. They manage rosters of athletes across multiple sports, run group sessions in person and online, sell programming globally, and need data-driven insights to optimize performance. Yet the tools available to them remain siloed, clunky, or built for enterprise teams with six-figure budgets. MR Training fills the critical gap between lightweight consumer fitness apps and prohibitively expensive enterprise sports management platforms.

**Who it serves:**

| Persona | Primary Need |
|---|---|
| **Coach** | Program design, athlete management, business operations, monetization |
| **Athlete** | Training access, progress tracking, communication, accountability |
| **Academy Admin** | Roster management, scheduling, billing, compliance, coach oversight |
| **Sports Club Manager** | Multi-team oversight, facility management, event operations, revenue |
| **Nutritionist** | Meal plan creation, dietary tracking, coach collaboration, client outcomes |
| **Physical Therapist** | Rehabilitation protocols, injury tracking, return-to-play clearance, coach integration |

**The opportunity:** Over 340,000 fitness coaches operate in the United States alone, with an estimated 1.2 million globally. The majority still rely on spreadsheets, WhatsApp, and manual billing. The global online coaching market is projected to exceed $35 billion by 2030. MR Training aims to capture 2-3% of this market by becoming the default operating system for coaches who want to grow beyond the limitations of fragmented tooling.

---

## 2. Vision Statement

> **MR Training will become the default platform through which coaches worldwide design, deliver, and monetize athletic development — making world-class coaching and performance support accessible to every athlete, regardless of geography or budget.**

This vision operates across four dimensions:

- **For coaches:** Eliminate operational overhead so they can focus on what they do best — coaching. Every minute spent on administrative tasks is a minute stolen from athlete development. MR Training automates the mundane, surfaces the insights, and lets the coach coach.
- **For athletes:** Democratize access to structured, personalized training, nutrition, and recovery guidance that was previously available only to elite-level competitors. Every athlete deserves a clear path to improvement.
- **For support professionals (nutritionists, physical therapists):** Provide a shared operating picture with coaches and athletes. Eliminate the information asymmetry that leads to conflicting advice and suboptimal outcomes.
- **For the industry:** Create a connected ecosystem where coaching knowledge is preserved, shared, and scaled — not trapped in individual coaches' notebooks, spreadsheets, and WhatsApp threads.

The long-term ambition is to become the **operating system** — not just a tool. When a coach runs their business on MR Training, every workflow touches the platform. When an athlete develops, MR Training is the record of that journey. When a nutritionist or physiotherapist collaborates on an athlete's care, MR Training is the shared source of truth.

---

## 3. Target Personas

### 3.1 Coach

**Profile:** Personal trainers, strength coaches, online coaches, sport-specific coaches (running, tennis, swimming, cycling, CrossFit). Ranges from solo operators managing 10–50 clients to head coaches embedded in academies managing 100+ athletes and assistant coaches.

**Key Behaviors:**
- Designs custom training programs (typically in spreadsheets, Google Docs, or pen and paper)
- Communicates with athletes via WhatsApp, Telegram, email, or SMS — often across 4+ separate channels
- Tracks athlete progress through check-ins, photos, measurements, and RPE forms
- Sells programming online (one-time programs, monthly subscriptions, group coaching)
- Needs to demonstrate tangible value to retain clients and justify pricing

**Pain Points:**
- Program design is tedious and repetitive — coaches rebuild similar blocks for similar athletes because they lack reusable, parameterized templates
- No single view of an athlete's training, nutrition, recovery, and injury history
- Communication is scattered across 5+ apps; critical messages get buried
- Invoicing and payment collection is manual, inconsistent, and awkward
- Hard to scale beyond 30–40 clients without hiring administrative staff
- Cannot easily collaborate with nutritionists or physical therapists on shared athletes

**Jobs to Be Done:**
1. "When I design a program, I want it to adapt to each athlete's context so I don't waste time customizing from scratch."
2. "When I check in with an athlete, I want all their data — training, nutrition, recovery, injuries — in one view so I can make informed decisions quickly."
3. "When I bill a client, I want it to be automatic so I don't have to chase payments or have awkward money conversations."
4. "When I collaborate with a nutritionist or PT on an athlete, I want them to see the full picture without me having to forward screenshots."

### 3.2 Athlete

**Profile:** Recreational to competitive athletes across any sport. Age range 16–60. May train independently under a remote coach, or as part of a team, academy, or club. Varies from beginners seeking accountability to elite competitors chasing marginal gains.

**Key Behaviors:**
- Follows prescribed training programs (daily workouts, weekly mileage, etc.)
- Logs workouts, metrics, RPE, body measurements
- Tracks nutrition (meals, macros, hydration) and recovery (sleep, soreness, readiness)
- Communicates with coach via in-app messaging for guidance, feedback, and adjustments
- Monitors progress over time through charts, PRs, and milestone tracking

**Pain Points:**
- Unclear what to do outside of supervised training sessions
- No structured way to track progress beyond the gym or the stopwatch
- Communication with coach is fragmented and delayed — text messages get buried, emails go unread
- Lack of accountability between sessions leads to inconsistent adherence
- Nutrition and recovery guidance is disconnected from training — different apps, different advice
- Cannot easily share data across their coach, nutritionist, and physical therapist

**Jobs to Be Done:**
1. "When I open the app, I want to know exactly what I need to do today — training, nutrition, recovery."
2. "When I complete a session, I want my coach to see it immediately and respond with feedback."
3. "When I look back over weeks or months, I want to see concretely how far I've come."
4. "When I work with multiple professionals, I want them all on the same page about my training, diet, and injuries."

### 3.3 Academy Admin

**Profile:** Operations managers and directors at sports academies — youth development programs, tennis academies, swimming clubs, multi-sport training facilities. Manages coaches, athletes, schedules, finances, parents, and compliance.

**Key Behaviors:**
- Oversees multiple coaches and their athlete rosters
- Manages class/session scheduling and facility/equipment bookings
- Handles billing, subscriptions, payroll, and financial reporting
- Ensures compliance with governing body requirements and insurance standards
- Communicates with parents about athlete progress, billing, and schedules
- Needs visibility across all programs, coaches, and sports

**Pain Points:**
- No centralized system for roster management across multiple sports and coaches
- Scheduling conflicts between coaches, athletes, and facilities are constant
- Revenue leakage from missed billing, inconsistent pricing, or late payments
- Difficulty measuring coach performance, athlete retention, and program profitability
- Parent communication is time-consuming and often falls to coaches instead of admins
- Compliance tracking (waivers, certifications, background checks) is manual and risky

**Jobs to Be Done:**
1. "When I look at my academy, I want a single dashboard showing all coaches, athletes, sessions, and revenue."
2. "When a parent asks about their child's progress or billing, I want to pull a comprehensive report in seconds."
3. "When I reconcile finances at month-end, I want every transaction tracked, categorized, and auditable."
4. "When I evaluate my programs, I want to see which coaches, sports, and sessions are driving retention and revenue."

### 3.4 Sports Club Manager

**Profile:** Managers of multi-sport clubs, community sports organizations, professional team operations, and recreational leagues. Manages teams, facilities, events, memberships, and stakeholder relations at scale.

**Key Behaviors:**
- Oversees multiple teams across different sports and age groups
- Manages facility utilization, equipment inventory, and maintenance schedules
- Plans and runs events (tournaments, tryouts, camps, fundraisers, socials)
- Tracks membership, dues, and revenue across programs
- Reports to boards, owners, or sponsors on organizational performance
- Needs organizational-level analytics, not just individual athlete data

**Pain Points:**
- Fragmented visibility across teams, sports, age groups, and facilities
- No unified member database — athlete records scattered across spreadsheets and coach notebooks
- Event management is entirely manual — registration, waivers, scheduling, results, billing — and disconnected from training data
- Facility scheduling is a nightmare of spreadsheets, conflicts, and double-bookings
- Cannot easily track which programs are profitable versus which are subsidized
- Member churn is hard to predict and even harder to prevent without data

**Jobs to Be Done:**
1. "When I run my club, I want one system that handles all sports, all teams, and all facilities — not separate tools for each."
2. "When I plan an event, I want to pull from my existing member base and manage everything — registration, payment, scheduling, results — in one place."
3. "When I report to the board or sponsors, I want real-time revenue, participation, and utilization data — not a week of spreadsheet wrangling."
4. "When a member goes quiet, I want the system to flag it so I can intervene before they churn."

### 3.5 Nutritionist

**Profile:** Sports nutritionists, dietitians, and nutrition coaches who work with athletes to optimize performance through diet. May work independently, embedded within academies/clubs, or in collaboration with coaches.

**Key Behaviors:**
- Creates personalized meal plans based on athlete goals, training load, and dietary preferences
- Reviews food logs and provides feedback on adherence and quality
- Tracks body composition changes (weight, body fat %, measurements, progress photos)
- Adjusts macro/micronutrient targets based on training phase (build, cut, maintenance, competition prep)
- Collaborates with coaches to align nutrition with the training plan
- Educates athletes on fueling strategies, supplementation, and hydration

**Pain Points:**
- No integration between nutrition tracking and the athlete's training program — working blind to actual training load
- Athletes use different apps for food logging (MyFitnessPal, Lose It, Cronometer) that don't share data with coaching platforms
- Meal plan creation is repetitive — similar plans for similar athletes, rebuilt from scratch each time
- Cannot easily see how dietary adherence correlates with training performance and recovery
- Communication with coaches is ad hoc (separate text threads, forwarded screenshots)
- Hard to demonstrate ROI and justify fees without integrated outcome data

**Jobs to Be Done:**
1. "When I create a meal plan, I want to see the athlete's training load and schedule so the nutrition aligns with their energy demands."
2. "When I review a food log, I want to see it alongside workout compliance and recovery data, not in isolation."
3. "When I collaborate with a coach, I want one shared view of the athlete so we give aligned, not conflicting, advice."
4. "When I report progress to the athlete (or their parents), I want to show nutrition adherence alongside performance improvements."

### 3.6 Physical Therapist

**Profile:** Sports physical therapists, athletic trainers, and rehabilitation specialists who manage athlete injuries, recovery protocols, and return-to-play progressions. May work in clinics, embedded in academies/clubs, or in private practice.

**Key Behaviors:**
- Assesses injuries and designs rehabilitation protocols
- Tracks recovery progression (range of motion, strength benchmarks, pain levels, functional tests)
- Communicates return-to-play clearance and activity restrictions to coaches
- Prescribes corrective exercises and mobility work
- Monitors re-injury risk factors and flags high-risk athletes
- Documents assessments and progress for insurance, compliance, and handoff purposes

**Pain Points:**
- No visibility into the athlete's actual training — PT works in a silo disconnected from the coach
- Return-to-play decisions are made without full context of the athlete's training load and history
- Rehabilitation exercises are prescribed on paper or in separate apps — athletes lose track, adherence suffers
- Communication with coaches is delayed and unstructured ("I emailed the coach but they didn't see it")
- Cannot track whether athletes are actually doing their prescribed exercises
- Difficult to demonstrate the impact of PT interventions on return-to-sport outcomes

**Jobs to Be Done:**
1. "When I assess an injury, I want to see the athlete's full training history leading up to it — load spikes, technique changes, prior injuries."
2. "When I clear an athlete for return to play, I want the coach to receive an immediate notification with specific restrictions and progressions."
3. "When I prescribe rehab exercises, I want them delivered to the athlete alongside their training program — one place, one source of truth."
4. "When I track recovery, I want to correlate rehab adherence with objective performance and pain metrics over time."

---

## 4. Core Modules

### 4.1 Training

The training module is the heart of MR Training. It supports multi-sport program design, session delivery, athlete logging, and performance tracking across every supported sport.

#### 4.1.1 Gym

- **Exercise Library:** Curated, categorized database with high-quality video demonstrations, muscle group mapping, equipment requirements, and movement standards. Covers compound lifts, isolation movements, bodyweight exercises, and specialty implements.
- **Program Builder:** Drag-and-drop periodization tool with reusable templates, auto-progression rules, deload logic, and customizable training phases (hypertrophy, strength, power, endurance, peaking, maintenance).
- **Session Designer:** Create individual workouts with sets, reps, intensity (%1RM, RPE, RIR), tempo, rest periods, supersets, circuits, and notes. Support for warm-up, main work, accessory work, and cool-down sections.
- **Template System:** Save and reuse program blocks as parameterized templates (e.g., "Hypertrophy Phase A," "Peaking Protocol for Powerlifting," "Off-Season General Prep"). Parameters adapt to individual athlete profiles.
- **Auto-Regulation:** AI-assisted load adjustment based on athlete feedback (RPE, soreness, fatigue, readiness scores). If an athlete reports high fatigue, the system suggests load reduction and flags the coach.
- **Equipment Profiles:** Track available equipment per athlete (full commercial gym, home gym with limited equipment, bodyweight only). Programs adapt exercise selection to available equipment.

#### 4.1.2 Running

- **Training Plan Builder:** Periodized running programs (base building, build phase, peak phase, taper) with intelligent mileage progression, intensity distribution, and workout density.
- **Workout Types:** Easy runs, recovery runs, tempo runs, threshold intervals, VO2max intervals, hill repeats, long runs, race-pace workouts, fartlek, strides. Each with configurable targets (pace, heart rate, power, RPE).
- **Heart Rate Zones:** Configurable zone system (5-zone or 7-zone) with automatic lactate threshold detection based on performance data. Support for heart rate, pace, and power-based training.
- **GPS Integration:** Import activity data from Strava, Garmin Connect, Apple Watch, Coros, and Suunto. Automatic workout matching — completed GPS activities are matched to prescribed sessions.
- **Race Predictor:** Performance modeling based on training load, recent race results, and historical data. Predicts race times across distances (5K, 10K, half marathon, marathon, ultra).
- **Injury Risk Scoring:** Monitors training load spikes using acute-to-chronic workload ratio (ACWR). Flags high-risk weeks and suggests load adjustments before injuries occur.
- **Shoe Tracking:** Log mileage on running shoes and receive replacement reminders based on manufacturer recommendations.

#### 4.1.3 Tennis

- **Match Analysis:** Log detailed match statistics — aces, double faults, first serve percentage, winners, unforced errors, break points converted, net points won. Historical trends and surface-specific breakdowns.
- **Training Plan Builder:** Periodized programs covering the four pillars — technical (stroke mechanics, footwork), tactical (patterns, decision-making), physical (strength, speed, endurance), and mental (focus, resilience, match psychology).
- **Video Integration:** Link external video analysis (from platforms like SwingVision, Coach's Eye, or direct uploads) to specific training sessions and match performances.
- **Tournament Calendar:** Track upcoming tournaments, seedings, and competition schedules. Periodize training around the competition calendar with automatic taper recommendations.
- **Surface-Specific Programming:** Adjust training emphasis and volume for clay, hard, or grass court seasons. Track surface-specific performance metrics.
- **On-Court Drills Library:** Curated drill catalog organized by skill focus (serve, return, groundstrokes, volleys, footwork, doubles tactics).

#### 4.1.4 Swimming

- **Pool Workout Builder:** Create structured workouts with intervals, distance, stroke type (freestyle, backstroke, breaststroke, butterfly, IM), intensity zones, and equipment requirements (fins, paddles, snorkel, kickboard, pull buoy).
- **Set Designer:** Build complex set structures — warm-up sets, pre-sets, main sets, kick sets, pull sets, drill sets, cool-down. Configurable send-off intervals and rest periods.
- **Video Analysis Integration:** Link to underwater camera feeds, Dartfish, or other video analysis platforms. Timestamp annotations tied to specific sets and drills.
- **Taper Planning:** Intelligent volume and intensity reduction protocols leading into competition. Configurable by event distance, athlete experience, and historical response.
- **Open Water Support:** Program outdoor sessions with distance, sighting drills, drafting practice, and environmental considerations (water temperature, currents, visibility).
- **Stroke Rate and Efficiency:** Track stroke count, stroke rate, distance per stroke, and SWOLF scores over time.

#### 4.1.5 Cycling

- **Power-Based Training:** Training zones via Functional Threshold Power (FTP) testing. Periodized power targets for every workout. Support for both indoor (smart trainer) and outdoor (power meter) training.
- **Structured Workout Builder:** Create detailed interval workouts — VO2max intervals, threshold blocks, sweet spot, tempo, endurance, recovery, and sprint work. ERG mode export for smart trainers (Wahoo, Tacx, Elite, Saris).
- **Route Planning:** Integration with Komoot, RideWithGPS, and Strava Routes for outdoor session planning. Elevation profiles, segment targeting, and estimated duration.
- **Race Modeling:** Time trial pacing strategies, road race power profiling, and event-specific preparation plans. Course analysis tools for key events.
- **Training Stress Score (TSS):** Track chronic training load (CTL), acute training load (ATL), and training stress balance (TSB) using the Performance Manager Chart model.
- **Bike Profiles:** Track multiple bikes (road, TT, gravel, mountain) with component tracking and maintenance reminders.

#### 4.1.6 CrossFit

- **WOD Builder:** Create custom workouts with all standard CrossFit formats — AMRAP, EMOM, For Time, Chipper, Ladder, Tabata, Rounds for Time. Built-in timer and scoring configurations.
- **Movement Library:** Comprehensive CrossFit movement database including gymnastics (pull-ups, muscle-ups, handstand walks), weightlifting (snatch, clean & jerk), and monostructural (running, rowing, assault bike). Each movement includes standards, scaling options, and video demonstrations.
- **Benchmark Tracking:** Track performance on all benchmark workouts — Girl WODs (Fran, Grace, Helen, etc.), Hero WODs, and custom benchmarks. Historical comparison with percentile rankings within the athlete's cohort.
- **Scaling Engine:** Intelligent scaling suggestions based on athlete history, movement proficiency, and injury flags. Automatically suggests appropriate scaling for prescribed workouts.
- **Competition Prep:** Structured programming for CrossFit competition season — Open prep, Quarterfinals, Semifinals. Event-specific preparation with weakness identification.
- **Strength Cycles:** Integrated strength progressions (Wendler 5/3/1, Starting Strength, Olympic lifting cycles) that complement metcon programming.

### 4.2 Nutrition

- **Meal Planning:** Template-based and AI-generated meal plans with macro and micronutrient targets. Supports dietary preferences and restrictions (vegan, vegetarian, keto, paleo, halal, kosher, allergies). Plans adapt to training phase (build, cut, maintenance, competition prep, race week).
- **Food Logging:** Barcode scanner, quick-add, meal copy, and photo-based logging. Integration with major food databases for accurate macro and micronutrient data.
- **Calorie and Macro Tracking:** Real-time dashboards against daily and weekly targets. Visual breakdown by meal and by macronutrient. Coach and nutritionist visibility into athlete adherence.
- **Supplement Tracking:** Log supplements with dosage, timing, compliance, and notes. Supplement protocol templates for common stacks (pre-workout, intra-workout, recovery, general health).
- **Hydration Monitoring:** Daily water intake tracking with configurable targets and smart reminders. Adjusts targets based on training volume, environmental conditions, and athlete body weight.
- **Nutrition-Centric Messaging:** Dedicated space for nutrition-specific communication between athlete, coach, and nutritionist. Keep dietary conversations organized and referenceable.
- **Body Composition Tracking:** Log weight, body fat percentage, circumferences, skinfold measurements, and progress photos with side-by-side comparisons over time.
- **Nutrition Analytics:** Correlate dietary adherence with training performance, body composition changes, and recovery metrics. Identify which nutritional strategies produce the best outcomes.

### 4.3 Recovery

- **Wearable Integration:** Connect with Whoop, Apple Watch, Garmin, Oura Ring, and Fitbit. Import sleep data, heart rate variability (HRV), resting heart rate, respiratory rate, and blood oxygen saturation automatically.
- **Readiness Scores:** Daily readiness assessment combining subjective inputs (soreness, fatigue, mood, stress, motivation) with objective data (sleep, HRV, resting HR). Configurable weighting and thresholds.
- **Mobility Programming:** Prescribed mobility flows, warm-up routines, cool-down sequences, and corrective exercise prescriptions. Video demonstrations for every movement. Integration with physical therapist prescriptions.
- **Injury Management:** Log injuries with body map location, diagnosis, severity, date of onset, and expected return date. Attach rehabilitation protocols and track adherence. Flag athletes with active injuries to all collaborating professionals.
- **Recovery Modality Tracking:** Log contrast baths, sauna sessions, ice baths, compression therapy, massage, foam rolling, and other modalities. Track frequency, duration, and subjective effectiveness.
- **Rest Day Recommendations:** AI-suggested rest or active recovery days based on cumulative training load, readiness scores, sleep quality, and upcoming competition schedule. Proactive, not reactive.
- **Sleep Hygiene Tools:** Sleep schedule recommendations, bedtime reminders, and sleep environment tips. Track consistency and quality over time.
- **Rehab Protocol Builder (for PTs):** Create structured rehabilitation progressions with exercises, sets, reps, intensity, frequency, and progression criteria. Track completion and adherence. Tie protocols to specific injuries.

### 4.4 Community

- **Feed:** Shared activity feed for athletes and coaches — workout completions, personal records, milestones, challenge entries, event results. Configurable privacy (public, group-only, coach-only, private).
- **Groups:** Create groups by sport, team, training level, goal, or interest (e.g., "Marathon Prep Spring 2026," "Olympic Weightlifting Club," "Academy U16 Squad"). Group-specific feeds, discussions, and challenges.
- **Discussion Threads:** Forum-style discussions within groups. Pinned posts, polls, Q&A format. Coach-moderated with the ability to highlight expert responses.
- **Challenges:** Create time-based challenges with configurable rules, scoring, and leaderboards (e.g., "30-Day Mobility Challenge," "100-Mile December," "Burpee Ladder"). Participation tracking and automated progress posts.
- **Leaderboards:** Optional competitive rankings within groups and challenges. Customizable scoring (total volume, consistency, improvement, etc.). Designed to motivate, not discourage.
- **Coach Profiles:** Public-facing profiles showcasing credentials, certifications, specialties, athlete testimonials, and sample programming. Discovery tools for athletes seeking coaching (future marketplace feature).
- **Athlete Profiles:** Personal dashboards showing training history, achievements, PRs, and competition results. Configurable privacy settings for what is shared publicly versus with coach only.

### 4.5 Events

- **Event Builder:** Create and publish events — competitions, tournaments, camps, tryouts, seminars, fundraisers, socials. Rich event pages with descriptions, schedules, location, pricing, and media.
- **Registration and Waivers:** Online sign-up with customizable registration forms and digital waiver acceptance. Age verification for youth events. Waitlist management for oversubscribed events.
- **Payment Collection:** Integrated ticketing for paid events. Tiered pricing (early bird, general, late), discount codes, and group registration. Financial reporting tied to club/academy dashboards.
- **Schedule Management:** Multi-day event scheduling with sessions, heats, lanes, courts, or fields. Conflict detection. Automated schedule publishing and updates.
- **Results and Scoring:** Post-event results entry with support for multiple scoring formats (timed, judged, points-based, head-to-head). Public results display and leaderboard generation.
- **Communication:** Automated event reminders, schedule updates, weather alerts, and post-event follow-ups. Segment messaging to registered athletes, waitlisted athletes, volunteers, and staff.

### 4.6 Payments and Subscriptions

- **Subscription Plans:** Coaches and academies can create tiered subscription offerings with configurable features, athlete limits, and pricing. Support for monthly, quarterly, and annual billing cycles.
- **One-Time Purchases:** Sell individual training programs, program blocks, consultations, assessments, and digital products. Instant delivery upon purchase.
- **Payment Processing:** Stripe integration for credit/debit cards, digital wallets (Apple Pay, Google Pay), ACH/bank transfers, and SEPA. PCI-compliant by design — no card data touches MR Training servers.
- **Invoicing:** Generate and send branded invoices with automated reminders. Support for partial payments, payment plans, and expense tracking.
- **Revenue Dashboard:** Real-time view of MRR, ARR, churn rate, customer lifetime value, and cohort analysis. Revenue attribution by product, plan, and athlete segment.
- **Coupon and Discount Engine:** Promotional codes, trial periods, referral discounts, loyalty rewards, and seasonal promotions. Usage limits, expiration dates, and audience targeting.
- **Multi-Currency Support:** Accept payments in major currencies (USD, EUR, GBP, AUD, CAD, CHF, JPY) with automatic conversion and localized pricing.
- **Payout Management:** Automated coach payouts with configurable schedules (daily, weekly, monthly). Multi-currency payout support. Tax documentation (1099 forms for US-based coaches).
- **Dunning Management:** Automated retry logic and athlete notification for failed payments. Grace periods, smart retry scheduling, and involuntary churn recovery.
- **Refund Management:** Configurable refund policies (no refunds, partial, full, within window) with admin approval workflows for exceptions.

### 4.7 AI Engine

- **Program Generation:** AI-assisted training program creation based on athlete profile (sport, goals, experience, equipment, schedule, injury history). Generates draft periodized plans that coaches review, modify, and approve — not black-box automation.
- **Load Optimization:** Machine learning models that continuously adjust training load recommendations based on performance trends, recovery signals, injury history, and upcoming competition schedule. Proactive load management, not reactive.
- **Natural Language Coach:** Conversational interface for coaches to query athlete data — "Show me John's bench press progression this quarter," "Which athletes haven't logged a session in 3+ days?", "Compare Sarah's 5K times against her training load the week before each race."
- **Predictive Modeling:** Forecast race/competition performance based on training data. Predict injury risk based on load patterns, recovery scores, and biomechanical flags. Predict plateaus before they happen and suggest interventions.
- **Automated Check-Ins:** AI-generated athlete check-in prompts based on recent training completion, adherence, subjective scores, and anomalies. Personalized, contextual, not generic.
- **Content Generation:** AI-powered workout descriptions, exercise substitution suggestions, coaching cues, and program notes. Reduce the time coaches spend writing repetitive content so they can focus on the athletes who need deeper attention.
- **Anomaly Detection:** Flag unusual patterns automatically — sudden performance drops, missed sessions after consistent adherence, abnormal recovery scores, rising injury risk indicators. Push notifications to coaches with suggested follow-up actions.

### 4.8 Analytics

- **Athlete Dashboards:** Individual performance views with trend analysis, PR tracking, volume and load charts, adherence rates, and comparative benchmarks against population norms (age, gender, sport, training age).
- **Coach Dashboard:** Roster-level views showing athlete adherence, engagement scores, risk flags, recent check-ins, and revenue per athlete. Prioritized list of athletes who need attention today.
- **Academy Dashboard:** Cross-coach and cross-sport performance analytics. Compare programs, coaches, and sports on retention, revenue, athlete satisfaction, and performance outcomes.
- **Club Dashboard:** Organization-wide metrics including revenue by program, facility utilization rates, member growth and churn, event profitability, and team performance trends.
- **Custom Reports:** Build and save custom report configurations — choose metrics, athletes, time periods, and visualization types. Schedule automated report delivery to stakeholders.
- **Export and API:** Data export in CSV, PDF, and JSON formats. RESTful API access for advanced analysis, custom integrations, and data pipeline connections.
- **Cohort Analysis:** Compare athlete groups by join date, plan tier, sport, coach, or custom segmentation. Understand which cohorts perform best and why.
- **Comparative Analytics:** Benchmark individual athletes against anonymized population data. "Your squat is in the 75th percentile for males aged 25–34 with 2–3 years training experience."

### 4.9 CRM

- **Athlete Database:** Centralized contact management with full training history, communication log, payment history, and engagement scoring. Every interaction with an athlete is recorded and searchable.
- **Pipeline Management:** Track athlete lifecycle from inquiry through active engagement — Inquiry → Consultation → Trial → Onboarded → Active → At-Risk → Churned → Reactivated. Conversion rate tracking at each stage.
- **Automated Workflows:** Trigger actions based on lifecycle events. Examples: send welcome sequence on sign-up, notify coach if athlete misses 3+ consecutive sessions, flag athlete as at-risk if engagement drops below threshold, send re-engagement campaign after 14 days inactive.
- **Tags and Segmentation:** Label athletes by sport, training level, plan tier, engagement status, goals, injuries, or custom criteria. Use segments for targeted communication, program assignment, and reporting.
- **Task Management:** Coach-facing task lists for follow-ups, check-ins, program updates, and administrative work. Auto-generated tasks from system events (e.g., "Review Alex's program — entering Week 4 of current block").
- **Notes and Activity Log:** Full, searchable history of every interaction — messages, check-ins, program changes, payment events, competition results, injury updates. The athlete's complete story in one timeline.
- **Referral Tracking:** Track athlete referrals through unique codes. Reward referrers with credits, discounts, or recognition. Measure referral program ROI.
- **Goal Setting and Review:** Set short-term and long-term athlete goals with measurable outcomes. Schedule periodic review checkpoints with automated reminders. Track goal achievement rate.

### 4.10 Communications

- **In-App Messaging:** Direct one-on-one and group messaging between coaches, athletes, nutritionists, and physical therapists. Rich media support (photos, videos, voice notes, file attachments). Organized by athlete and by topic.
- **Push Notifications:** Real-time alerts for session assignments, completed workouts, check-in requests, messages, payment confirmations, and system flags. Smart notification grouping to prevent alert fatigue.
- **Email Integration:** Send and receive emails within the platform. Automated transactional emails (welcome, billing, reminders). Marketing email integration for newsletters and campaigns. Connected inbox for coaches who prefer email.
- **SMS Integration:** Send text messages for time-sensitive communications — session reminders, last-minute schedule changes, urgent flags. Opt-in by athlete with clear frequency expectations.
- **Automated Sequences:** Drip campaigns for athlete onboarding, re-engagement of at-risk athletes, milestone celebrations (100th session, PR achieved, 1-year anniversary), and seasonal goal-setting prompts.
- **Broadcast Messaging:** Send announcements to all athletes, specific groups, or filtered segments. Rich formatting, scheduling, and delivery analytics (open rate, click rate).
- **Video Messaging:** Record and send short video messages for personalized feedback on technique, form, or performance. Face-to-camera coaching without scheduling a live call.
- **Announcement Board:** Pin important updates visible to all athletes within a group or team. "Next week's schedule change," "New program starts Monday," "Reminder: payment due Friday."
- **File Sharing:** Share documents, PDFs, spreadsheets, and images within athlete threads. Organized, searchable, and version-tracked.

---

## 5. Business Model

### 5.1 Pricing Tiers

| Feature | **Free** | **Pro** | **Enterprise** |
|---|---|---|---|
| **Price** | $0/mo | $49–$99/mo | Custom (annual contract) |
| **Athletes** | Up to 5 | Up to 100 | Unlimited |
| **Training Programs** | 3 active | Unlimited | Unlimited |
| **Sports** | 1 sport | All sports | All sports |
| **Nutrition Tracking** | Basic logging | Full nutrition suite | Full nutrition suite |
| **Recovery** | Basic tracking | Full recovery suite | Full recovery suite |
| **Community** | Read-only | Full participation | Full participation |
| **Events** | — | 3 events/month | Unlimited |
| **Payments** | — | Yes (2.9% + $0.30) | Yes (custom rates) |
| **AI Features** | — | Basic AI (program gen, check-ins) | Advanced AI (full suite) |
| **Analytics** | Basic athlete view | Full dashboards | Full + Custom reports |
| **CRM** | — | Full CRM | Full CRM + Automated workflows |
| **Communications** | In-app messaging only | Full communications stack | Full stack + SMS + API |
| **Support** | Community forum | Email support (24h SLA) | Priority + Dedicated CSM |
| **Custom Branding** | — | — | White-label, custom domain |
| **API Access** | — | — | Full REST API |
| **SSO/SAML** | — | — | SAML 2.0, OIDC |
| **Coach Seats** | 1 | 1 (additional $29/mo each) | Custom |
| **Nutritionist/PT Seats** | — | Included | Custom |

### 5.2 Revenue Streams

1. **Subscriptions (Primary):** Monthly and annual SaaS subscriptions from coaches, academies, and clubs. This is the core revenue engine, projected to represent 75%+ of total revenue. Annual plans are discounted 20% to improve retention and cash flow predictability.
2. **Transaction Fees:** Percentage-based fees on payment processing within the platform. As athlete-to-coach payment volume grows, this becomes a significant secondary revenue stream. Projected at 15% of total revenue by Year 3.
3. **Enterprise Contracts:** Custom annual contracts for large academies, clubs, national governing bodies, and professional organizations. Includes volume discounts, dedicated support, custom integrations, and SLAs. Projected at 5–10% of revenue by Year 3.
4. **Coach Marketplace (Future — Phase 4):** A marketplace where coaches sell training programs, templates, and educational content to other coaches. MR Training takes a platform fee (15–20%). This creates a two-sided marketplace and a new growth loop.
5. **Add-Ons and Premium Features:** Advanced AI features, custom analytics, white-label options, and premium integrations available as add-ons to Pro and Enterprise tiers. Small but high-margin revenue stream.

### 5.3 Pricing Strategy

- **Land and Expand:** The Free tier (up to 5 athletes, 1 sport, 3 active programs) eliminates adoption friction. Coaches experience the core value, hit the limits, and upgrade naturally as they grow. No feature-gating of the core coaching workflow — Free tier is genuinely useful, not crippled.
- **Value-Based Pricing:** Pricing scales with athlete count because that's the proxy for the coach's business size. A coach with 5 athletes earns less than a coach with 50; the platform fee should reflect that. Athlete-based scaling is transparent and predictable.
- **Annual Incentive:** 20% discount for annual commitments improves retention, reduces churn, and provides predictable revenue for the business. Annual plans also reduce payment processing overhead.
- **Academy and Club Pricing:** Volume discounts for organizations with multiple coach seats. Instead of per-coach pricing, academy pricing is based on total athlete count with included coach seats. This aligns incentives — the academy grows, MR Training grows with them.
- **Freemium Conversion Target:** 8–12% conversion from Free to Pro within 90 days. 25%+ conversion from Pro to Enterprise among qualifying organizations.

### 5.4 Unit Economics (Targets at Scale)

| Metric | Target |
|---|---|
| Customer Acquisition Cost (CAC) | <$150 (organic/content dominant) |
| Monthly Churn (Pro) | <3% |
| Lifetime Value (LTV) — Pro Coach | >$2,500 |
| LTV:CAC Ratio | >15:1 |
| Gross Margin | >80% |
| Payback Period | <3 months |

---

## 6. Success Metrics

### 6.1 Key Performance Indicators

| Category | Metric | Target (Year 1) | Target (Year 3) | Target (Year 5) |
|---|---|---|---|---|
| **Growth** | Registered coaches | 2,000 | 25,000 | 100,000 |
| **Growth** | Active athletes | 20,000 | 500,000 | 2,500,000 |
| **Growth** | Academy/Club accounts | 10 | 200 | 1,500 |
| **Revenue** | Monthly Recurring Revenue (MRR) | $50K | $1.5M | $8M |
| **Revenue** | Annual Recurring Revenue (ARR) | $600K | $18M | $96M |
| **Revenue** | Average Revenue Per Paying Coach (ARPC) | $45/mo | $65/mo | $80/mo |
| **Retention** | Coach monthly churn (Pro tier) | <5% | <3% | <2.5% |
| **Retention** | Athlete monthly retention | >85% | >90% | >92% |
| **Retention** | Annual coach retention | >65% | >75% | >80% |
| **Engagement** | DAU/MAU ratio (athletes) | 40% | 55% | 65% |
| **Engagement** | Avg. sessions logged/week/athlete | 3 | 4 | 5 |
| **Engagement** | Coach weekly active rate | 60% | 75% | 85% |
| **Satisfaction** | Net Promoter Score (NPS) | 50+ | 65+ | 70+ |
| **Satisfaction** | CSAT (support interactions) | 85% | 90% | 92% |
| **Conversion** | Free → Pro conversion (90-day) | 8% | 12% | 15% |
| **Conversion** | Pro → Enterprise conversion | 2% | 5% | 8% |
| **Platform Health** | Uptime | 99.5% | 99.9% | 99.95% |
| **Platform Health** | P95 API response time | <500ms | <300ms | <200ms |

### 6.2 North Star Metric

**Weekly Active Athletes Completing a Prescribed Session**

This single metric captures the core value loop of MR Training:
- A coach has designed and assigned a program → the platform delivered value to the coach.
- An athlete opened the app, followed the program, and logged completion → the platform delivered value to the athlete.
- Data flows back to the coach → the feedback loop closes.
- Revenue, retention, engagement, and satisfaction all flow from this fundamental behavior.

Every feature decision should be evaluated against the question: "Does this increase the number of weekly active athletes completing prescribed sessions?"

### 6.3 Counter-Metrics

Metrics to monitor alongside the north star to prevent perverse incentives:

| Counter-Metric | Why It Matters |
|---|---|
| Athlete burnout rate (voluntary inactivity >14 days) | Prevent over-training incentives |
| Coach support ticket volume | Early warning of UX or reliability issues |
| Payment dispute rate | Trust and satisfaction indicator |
| Athlete-to-coach message ratio | Ensures communication remains balanced |
| Feature bloat score (% of features used by <5% of users) | Guards against complexity creep |

---

## 7. Competitive Landscape

### 7.1 Direct Competitors

| Platform | Category | Strengths | Weaknesses | MR Training Advantage |
|---|---|---|---|---|
| **Trainerize** | Online coaching platform | Established brand (acquired by ABC Fitness), strong mobile app, good integrations (MyFitnessPal, Fitbit, Garmin), solid content library | Expensive per-athlete pricing ($5–$25/athlete), limited to gym/personal training, no sport-specific features, complex UX, limited analytics, no events or community | Multi-sport native, simpler flat-rate pricing, AI-first design, integrated nutrition/recovery/events/community |
| **TrueCoach** | Personal training software | Clean, focused UX, affordable pricing, good program builder, strong video demonstration library | Limited to one-on-one personal training, no nutrition (beyond basic logging), no recovery integration, no multi-sport support, no event management, minimal analytics | Full-spectrum coaching platform — not just gym programming. Integrated nutrition, recovery, communications, and business tools |
| **TeamBuildr** | Team strength and conditioning | Strong for collegiate and high school strength coaches, team roster management, good reporting, offline mode | No nutrition module, no recovery integration, limited analytics, no payment processing, no community features, steep learning curve | Unified single platform replacing 4–5 tools. Integrated payments, nutrition, recovery, and community. Accessible to solo coaches as well as teams |
| **Wodify** | CrossFit box management | Dominant in CrossFit affiliate space, solid WOD tracking and whiteboard, good for in-person box management, member check-in and billing | Single-sport focus (CrossFit only), weak remote coaching features, no nutrition or recovery, limited analytics, poor UX for athletes outside the box, no events | Multi-sport platform with full online coaching capabilities. CrossFit is one of six sports — coaches can program across disciplines |
| **TrainHeroic** | Team and individual strength training | Strong for team/strength programs, good athlete monitoring, growing marketplace for programs, solid mobile app | Enterprise-focused pricing (expensive for solo coaches), no nutrition module, no recovery integration, no payments or CRM, limited to strength sports | Accessible pricing for coaches at every stage. Broader feature set spanning nutrition, recovery, payments, and CRM |

### 7.2 Indirect Competitors and Adjacent Products

#### Whoop

**What it is:** Wearable fitness tracker focused on recovery — measures heart rate variability (HRV), resting heart rate, sleep, and respiratory rate. Delivers daily Strain, Recovery, and Sleep scores via a subscription model (hardware included with membership).

**Where it overlaps:** Recovery tracking, sleep monitoring, training load quantification (Strain Score), readiness assessment. Athletes who use Whoop want their coach to see this data.

**Where it doesn't compete:** Whoop is a consumer wearable company, not a coaching platform. It has no program builder, no nutrition tracking, no payment processing, no CRM, no community features, no events, and no multi-sport support. Whoop sells hardware + data; MR Training sells the operating system that uses that data to improve coaching outcomes.

**MR Training strategy:** Integrate deeply with Whoop via their API. Import Strain, Recovery, and Sleep scores automatically. Use this data to power readiness assessments, auto-regulation, and anomaly detection within MR Training. Position MR Training as the platform that makes Whoop data actionable for coaches — Whoop tells you your recovery score; MR Training tells you what to do about it.

#### Garmin

**What it is:** Leading GPS sports watch and fitness wearable manufacturer. Garmin Connect is their companion app and web platform for activity tracking, route planning, and performance analytics. Covers running, cycling, swimming, triathlon, golf, and outdoor activities.

**Where it overlaps:** Activity tracking (GPS-based workouts for running, cycling, swimming), training load metrics (Training Effect, Training Status, VO2max estimation), performance analytics, route planning. Garmin's ecosystem is the most feature-rich in endurance sports.

**Where it doesn't compete:** Garmin is a hardware-first company (watches, bike computers, sensors). Garmin Connect is an activity log and analytics dashboard for individuals — it is not a coaching platform. It has no program builder for coaches to assign workouts to athletes, no nutrition tracking (beyond basic calorie display), no recovery management beyond data display, no payments, no CRM, no community features beyond basic segments and challenges. Garmin's coaching features are limited to generic, pre-built training plans (Garmin Coach) — not a platform for professional coaches to manage their business.

**MR Training strategy:** Integrate deeply with Garmin Connect via their API. Automatically import completed activities and match them to prescribed sessions. Sync structured workouts to Garmin devices so athletes can execute coach-designed sessions on their watch. Use Garmin's rich performance data (VO2max, Training Status, Training Load, Lactate Threshold) as inputs to MR Training's analytics and AI. Position MR Training as the professional coaching layer on top of Garmin's hardware ecosystem — Garmin captures the data; MR Training turns it into personalized coaching and business operations.

#### Strava

**What it is:** The world's largest social network for athletes, with over 125 million users. Primarily used by runners and cyclists to track activities via GPS, compete on segments, share workouts, and connect with other athletes. Strong social features (kudos, comments, clubs, challenges).

**Where it overlaps:** Activity tracking (GPS-based), social feed and community, segments and leaderboards, clubs and groups, challenges, route discovery. Strava's social graph and community engagement are its strongest assets.

**Where it doesn't compete:** Strava is an athlete-facing social network, not a coaching platform. It has no program builder for coaches, no nutrition tracking, no recovery management (beyond showing sleep data from connected devices), no payments or business tools, no CRM, no athlete management, and very limited analytics for coaches. Strava's subscription features (Summit) are aimed at individual athletes seeking deeper analytics on their own data — not at coaches managing rosters of athletes. Strava Clubs are lightweight community features, not coaching business tools.

**MR Training strategy:** Integrate with Strava via their API for activity import. Use Strava as an activity data source — athletes can continue using Strava as their social fitness app while their workout data flows automatically into MR Training for coaching analysis and program compliance tracking. Position MR Training as the professional back-end that sits behind Strava — athletes use Strava for social motivation and segment competition; coaches use MR Training to design programs, manage athletes, and run their business. The data flows seamlessly between them.

### 7.3 Competitive Moat

1. **Network Effects (Demand Side):** As more coaches join MR Training, the community becomes more valuable — more discussion, more shared programs, more collaborative opportunities. As more athletes join, coaches have more data to benchmark against and more potential clients. A marketplace (Phase 4) amplifies these effects.

2. **Data Flywheel:** Every completed session, every meal logged, every recovery score imported improves the AI models. Better AI produces better program recommendations and predictions. Better outcomes improve athlete retention. Higher retention means more data. This flywheel accelerates over time and is difficult for competitors to replicate without scale.

3. **Switching Costs:** A coach who has built their entire business on MR Training — programs, athletes, payment plans, communication history, analytics history — faces enormous friction to switch. The more modules they adopt (training + nutrition + recovery + payments + CRM + community), the deeper the integration and the higher the switching cost. This is the "all-in-one" moat.

4. **Multi-Sport Breadth:** No competitor covers gym, running, tennis, swimming, cycling, and CrossFit in a single platform — let alone adding nutrition, recovery, community, events, payments, AI, analytics, and CRM on top. This breadth is defensible because each sport module requires deep domain expertise to build well. The integration between modules (e.g., running load affecting gym programming, or nutrition targets adapting to cycling volume) creates value that single-sport tools cannot replicate.

5. **Multi-Stakeholder Collaboration:** MR Training uniquely connects coaches, athletes, nutritionists, and physical therapists on one platform with shared data. This collaborative network effect — where each additional professional role makes the platform more valuable to all others — is extremely difficult to replicate. A nutritionist won't join a platform that only a few coaches use; a coach won't switch if their athletes' nutritionists and PTs are already on MR Training.

6. **Brand and Trust:** Coaches trust platforms that understand their craft. By building sport-specific depth (not just generic workout logging) and demonstrating genuine domain expertise in every module, MR Training earns the trust that converts trial users into vocal advocates.

---

## 8. Product Roadmap

### Phase 1: MVP (Months 1–4)

**Goal:** Validate the core coaching workflow — program design, athlete delivery, basic tracking, and payments. Prove that coaches will pay for a unified platform.

**Deliverables:**

- [ ] Authentication and user roles (Coach, Athlete, Admin)
- [ ] Exercise library (Gym focus — 500+ exercises with video demonstrations, categorized by muscle group, equipment, and movement pattern)
- [ ] Program builder with drag-and-drop periodization (weekly blocks, phases, mesocycles)
- [ ] Session designer (sets, reps, intensity as %1RM or RPE, tempo, rest periods, notes, supersets, circuits)
- [ ] Athlete dashboard ("Today's Workout" view, upcoming sessions, recent history)
- [ ] Workout completion logging (completed sets/reps/weight, RPE, notes, optional video/photo attachments)
- [ ] Basic progress tracking (body weight, measurements, progress photos with side-by-side comparisons)
- [ ] In-app messaging (direct coach-athlete messaging, file sharing, read receipts)
- [ ] Push notifications (session assigned, workout completed, new message, check-in requested)
- [ ] Stripe integration (subscription billing, coach sets their own plans and pricing)
- [ ] Coach subscription plans (Free and Pro tiers, feature-gated)
- [ ] Mobile-responsive web application (PWA-ready with offline support for workout logging)
- [ ] Basic onboarding flow (coach signup, profile setup, first athlete invite, first program creation)

**Exit Criteria:**
- 50 coaches actively using the platform (logged in within last 7 days, managing active athletes)
- 500+ athletes logging sessions
- 3+ sessions logged per athlete per week on average
- Coach NPS ≥ 40
- <5 critical bugs reported per week
- Initial paying customers (≥ 10 Pro subscriptions)

### Phase 2: Growth (Months 5–9)

**Goal:** Expand sport coverage beyond gym, add nutrition and recovery modules, build community features, and launch mobile apps. Transition from "gym programming tool" to "multi-sport coaching platform."

**Deliverables:**

- [ ] Running module (training plan builder, GPS import, heart rate zones, race predictor, injury risk scoring)
- [ ] Nutrition module (meal planning, food logging with barcode scanner, macro tracking, body composition tracking)
- [ ] Recovery module (wearable integration — Whoop, Apple Watch, Garmin; readiness scores, sleep tracking, mobility programming)
- [ ] Community feed (workout shares, PR celebrations, milestone posts, configurable privacy)
- [ ] Groups (create and join groups by sport, team, or interest)
- [ ] Events module (event creation, registration, waivers)
- [ ] CRM basics (athlete database, pipeline stages, tags, activity log, notes)
- [ ] Enhanced analytics (athlete dashboard v2 with trend analysis, coach dashboard with roster-level views)
- [ ] AI program generation (beta — draft program creation from athlete profile, coach review and approval required)
- [ ] Multi-sport program support (assign an athlete to gym + running simultaneously)
- [ ] Native mobile apps (iOS and Android, core features: workout logging, messaging, nutrition tracking)
- [ ] Nutritionist role (basic — view assigned athletes, create meal plans, log notes)
- [ ] Physical Therapist role (basic — view assigned athletes, log injuries, prescribe exercises)
- [ ] Integration APIs (Strava activity import, Garmin workout sync, Whoop recovery data)

**Exit Criteria:**
- 500 coaches actively using the platform
- 10,000+ athletes logging sessions
- $25K MRR
- Coach NPS ≥ 50
- 30-day Free → Pro conversion rate ≥ 10%
- Monthly coach churn (Pro) < 5%
- Mobile app ratings ≥ 4.0 stars (both platforms)

### Phase 3: Scale (Months 10–18)

**Goal:** Launch academy and club features, advanced AI capabilities, full CRM automation, and the foundation for the coach marketplace. Prove the platform at organizational scale.

**Deliverables:**

- [ ] Academy admin dashboard (multi-coach oversight, cross-sport analytics, program-level P&L)
- [ ] Club management features (facility scheduling and conflict detection, equipment inventory, multi-team oversight)
- [ ] Advanced AI (load optimization models, predictive performance modeling, anomaly detection with automated alerts, natural language query interface for coaches)
- [ ] Full CRM with automated workflows (lifecycle automation, task generation, re-engagement sequences, referral tracking)
- [ ] Event results and scoring (multi-format scoring, public leaderboards, results publication)
- [ ] Payments expansion (one-time purchases, digital product sales, invoicing, multi-currency with localized pricing)
- [ ] Communications expansion (email integration, SMS notifications, broadcast messaging, automated sequences)
- [ ] Analytics expansion (custom report builder, cohort analysis, comparative analytics against population benchmarks)
- [ ] Public API (RESTful API for data export, custom integrations, and ecosystem partners)
- [ ] Custom branding (white-label for academies — custom logo, colors, domain)
- [ ] Enterprise authentication (SSO via SAML 2.0 and OIDC for organizations)
- [ ] Tennis module (match analysis, tournament calendar, surface-specific programming)
- [ ] Cycling module (power-based training, FTP management, route planning integration)

**Exit Criteria:**
- 2,000 coaches actively using the platform
- 50,000+ athletes logging sessions
- $150K MRR
- 15+ academy/club accounts on custom contracts
- Coach NPS ≥ 60
- Monthly coach churn (Pro) < 3%
- System uptime ≥ 99.9%

### Phase 4: Enterprise (Months 19–30)

**Goal:** Enterprise contracts with major academies, clubs, and national governing bodies. Launch the coach marketplace. Begin international expansion with localization.

**Deliverables:**

- [ ] Enterprise tier with custom contracts, volume pricing, SLAs, and dedicated infrastructure
- [ ] Advanced role-based access control (RBAC) with granular permissions at the organization, program, and athlete level
- [ ] Coach marketplace (program/template store — coaches sell to coaches, platform takes 15–20%, ratings and reviews, featured placements)
- [ ] Multi-language support (Spanish, French, Portuguese, German, Japanese, Mandarin — starting with UI, expanding to exercise library and content)
- [ ] Region-specific compliance (GDPR, CCPA, LGPD, PIPL — data residency, right to deletion, consent management)
- [ ] Dedicated infrastructure for large organizations (isolated tenants, custom backup policies, advanced security configurations)
- [ ] White-label platform for governing bodies and large academies (fully branded, custom domain, configurable feature set)
- [ ] Integration marketplace (Garmin, Whoop, Strava, MyFitnessPal, Apple Health, Google Fit, Oura, TrainingPeaks, Zwift, Komoot — plug-and-play integrations managed in-platform)
- [ ] Advanced AI coaching assistant (conversational interface for coaches — "How has my sprint group's power output trended over this training block?", natural language program generation with conversational refinement)
- [ ] Swimming module (pool workout builder, set designer, taper planning, stroke analysis)
- [ ] CrossFit module (WOD builder, benchmark tracking, scaling engine, competition prep)

**Exit Criteria:**
- 10,000+ coaches actively using the platform
- 250,000+ athletes logging sessions
- $500K+ MRR
- 50+ academy/club enterprise accounts
- 5+ national governing body or professional organization contracts
- Coach NPS ≥ 65
- Monthly coach churn (Pro) < 2.5%
- System uptime ≥ 99.95%
- Marketplace GMV > $50K/month

---

## 9. Non-Goals

Explicitly out of scope for MR Training. These boundaries prevent scope creep, maintain strategic focus, and ensure the team says "no" to otherwise attractive opportunities that dilute the core mission.

1. **Not a social network.** Community features exist to support coaching relationships and athlete accountability, not to replace Instagram, TikTok, or Strava's social graph. We do not build content creation tools, influencer monetization features, or social media-style engagement mechanics (likes, follows, algorithmic feeds). The feed exists to celebrate athletic achievement within a coaching context, not to generate ad revenue.

2. **Not a hardware company.** We integrate with wearables (Whoop, Garmin, Apple Watch, Oura) and smart training equipment (Wahoo, Concept2, Peloton) — but we do not design, manufacture, or sell hardware. No proprietary sensors, no custom devices, no inventory risk. MR Training is the software layer that makes hardware data actionable.

3. **Not a medical platform.** We do not provide medical diagnosis, treatment recommendations, or clinical advice. Recovery features are wellness-oriented, not clinical. Injury tracking supports coach awareness, not medical record-keeping. Physical therapist features support collaboration, not telemedicine. Clear disclaimers are required at every touchpoint where health data is discussed.

4. **Not a video hosting platform.** We support video links and integrations (YouTube, Vimeo, Loom) for exercise demonstrations, technique analysis, and coach feedback — but we do not host, transcode, or stream video. Video is stored on existing platforms; MR Training references it.

5. **Not a general-purpose LMS (Learning Management System).** We do not build course authoring tools, certification tracking, SCORM compliance, or educational content delivery platforms. Coaches may share educational resources with athletes, but MR Training is not competing with Teachable, Kajabi, or Thinkific.

6. **Not a general booking/scheduling tool.** We do not replace Calendly, Acuity, Mindbody, or Vagaro for standalone appointment scheduling (haircuts, massages, general fitness classes). Session scheduling within MR Training is tied to training programs and coaching relationships, not general service booking.

7. **Not an athlete-coach matching marketplace.** We do not build a "find a coach" or "find an athlete" marketplace. Coach-athlete relationships on MR Training are direct, intentional, and pre-existing (or developed through the coach's own marketing). The future coach marketplace is for coaches selling programs to other coaches, not for athletes shopping for a coach.

8. **Not a sports betting or fantasy sports platform.** No gambling, no fantasy leagues, no wagering features of any kind. This is a hard boundary — MR Training is about athletic development, not gambling on athletic outcomes.

9. **Not a stock media library.** The exercise library is curated, coach-quality, and sport-specific — not a YouTube-scale repository of user-uploaded exercise videos. Quality, consistency, and coaching relevance over quantity. Every exercise in the library has standardized naming, categorization, and demonstration.

10. **Not a meal delivery or food ordering service.** Nutrition features enable tracking and planning — they do not order food, integrate with meal kit services, or connect to restaurant delivery platforms. Athletes are responsible for sourcing their own food.

11. **Not an insurance or liability platform.** We do not provide insurance products, liability coverage, or legal services for coaches. Coaches are responsible for their own professional insurance and liability management.

12. **Not a governing body compliance platform.** While MR Training supports compliance workflows (waivers, certifications, background checks), it does not replace specialized governing body systems (e.g., USA Swimming's SWIMS database, USTA's TennisLink). We integrate where possible; we do not replicate regulated systems.

---

## 10. Technical Principles

### 10.1 Architecture Philosophy

MR Training is built on **Clean Architecture** with **Domain-Driven Design (DDD)** principles. The domain is the center of the application; infrastructure, UI frameworks, and external services are implementation details that depend on the domain, not the other way around.

```
┌──────────────────────────────────────────────────┐
│              Presentation Layer                  │
│    (Next.js App Router, React, React Native)     │
├──────────────────────────────────────────────────┤
│              Application Layer                   │
│   (Use Cases, Application Services, DTOs,        │
│    Command/Query Handlers, Orchestration)        │
├──────────────────────────────────────────────────┤
│              Domain Layer                        │
│   (Entities, Value Objects, Aggregates,          │
│    Domain Events, Repository Interfaces,         │
│    Domain Services, Specifications)              │
├──────────────────────────────────────────────────┤
│              Infrastructure Layer                │
│   (PostgreSQL, Redis, Stripe, Cloudflare R2,     │
│    SendGrid, Twilio, External APIs, File Storage) │
└──────────────────────────────────────────────────┘
```

**Dependency Rule:** Dependencies point inward. The domain layer has zero external dependencies. The application layer depends only on the domain. The infrastructure layer implements interfaces defined by the domain and application layers. The presentation layer depends on the application layer (never directly on infrastructure).

### 10.2 Core Design Principles

1. **SOLID Compliance** — Every class and module has a single reason to change. Dependencies are inverted — high-level policy does not depend on low-level details. Abstractions are owned by the layer that uses them, not the layer that implements them.

2. **Domain Purity** — All business logic lives in the domain layer, expressed in the ubiquitous language of coaching. Entities and value objects are persistence-ignorant — they have no knowledge of databases, ORMs, or serialization formats. A `WorkoutSession` entity does not know whether it's stored in PostgreSQL, a document store, or an event stream.

3. **Repository Pattern** — Data access is abstracted behind interfaces defined in the domain layer. The domain layer declares what it needs (`AthleteRepository.findById()`); the infrastructure layer implements how. This enables testing domain logic in complete isolation and swapping storage implementations without touching business rules.

4. **Event-Driven Communication** — Cross-aggregate communication uses domain events. An aggregate ensures its own consistency within its boundary; communication between aggregates is eventually consistent via events. When `SessionCompleted` fires, the `RecoveryModule` recalculates load, the `AnalyticsModule` updates dashboards, and the `NotificationModule` alerts the coach — each independently and asynchronously.

5. **API-First Design** — Every feature is designed as an API contract before a UI is built. This enforces clean boundaries between client and server, enables parallel development, and ensures that mobile apps (Phase 2) and public API (Phase 3) are first-class consumers, not afterthoughts. OpenAPI specifications are the source of truth for API contracts.

6. **Multi-Tenancy from Day One** — Data isolation between coaches, academies, and clubs is architectural, not bolted on. Every database query is tenant-scoped. Row-Level Security (RLS) in PostgreSQL provides defense-in-depth. A coach at Academy A can never accidentally (or maliciously) access data from Academy B.

7. **Mobile-First Responsive Design** — The web application must deliver an excellent experience on mobile devices from Day One. Progressive Web App (PWA) capabilities (offline workout logging, push notifications, home screen installation) bridge the gap until native apps launch in Phase 2. Native apps will share business logic with the web app — the application layer is platform-agnostic.

8. **Scalability by Design** — Horizontal scaling, stateless application services, database read replicas, Redis caching layers, and CDN-edge content delivery are architected from the first line of code. The system is designed to handle 100,000 concurrent athletes from the start, even if it only serves 500 at launch. Scaling is configuration, not re-architecture.

9. **Observability as a Feature** — Structured logging, distributed tracing, and real-time metrics are built into every service. When something goes wrong in production, the team has the data needed to diagnose without reproducing locally. Monitoring dashboards are the first thing built for any new service.

10. **Security by Default** — HTTPS everywhere. Encrypted data at rest and in transit. Secrets never in code or environment variables (use a secrets manager). Principle of least privilege for all service accounts. Regular dependency scanning and security audits. GDPR and CCPA compliance are architectural, not retrofitted.

### 10.3 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend (Web)** | Next.js 15 (App Router) | Server Components, streaming SSR, excellent developer experience, Vercel-native deployment |
| **Frontend (Mobile)** | React Native (Expo) — Phase 2 | Code sharing with web (domain logic, API clients, types), mature ecosystem, OTA updates |
| **Backend API** | Node.js + TypeScript (strict mode) | Shared language with frontend, async-first runtime, enormous ecosystem, excellent for I/O-bound workloads |
| **Database** | PostgreSQL 16+ (managed via Supabase) | Relational integrity, JSON/JSONB support, full-text search, proven at scale, RLS for multi-tenancy |
| **Cache / Session Store** | Redis (Upstash or ElastiCache) | Session management, rate limiting, real-time pub/sub, job queues, leaderboard storage |
| **Authentication** | Clerk | Battle-tested, social login, multi-tenant RBAC, webhook-driven user sync, SAML/OIDC for Enterprise |
| **Payments** | Stripe (Connect for marketplace) | Industry standard, excellent developer experience, handles PCI compliance, multi-currency, payout automation |
| **File Storage** | Cloudflare R2 (S3-compatible) | Zero egress fees for media delivery, CDN-ready via Cloudflare, cost-effective at scale |
| **Search** | Meilisearch | Fast, typo-tolerant, self-hosted or cloud, excellent relevance out of the box |
| **Real-Time** | WebSockets (Socket.io or Supabase Realtime) | Live messaging, session tracking, collaborative features, presence detection |
| **Email** | Resend / SendGrid | Modern email API, React email templates, delivery analytics |
| **SMS** | Twilio | Reliable global SMS delivery, programmatic interface |
| **AI / ML** | OpenAI API + self-hosted models (future) | Program generation, analytics queries, anomaly detection, natural language interface |
| **Hosting** | Vercel (frontend) + Railway or Fly.io (backend services) | Edge deployment for frontend, auto-scaling for backend, global CDN |
| **Monitoring** | Sentry (errors) + PostHog (product analytics) + Grafana/Prometheus (infrastructure) | Full observability stack from Day One |
| **CI/CD** | GitHub Actions | Automated testing, linting, type checking, and deployment on every PR merge |

### 10.4 Code Quality Standards

- **TypeScript strict mode** — No `any` types in domain or application layer code. Full type safety across the stack. Generics over type assertions.
- **Test coverage targets** — Minimum 85% unit test coverage for domain layer (business logic must be bulletproof). Minimum 60% for application layer. Integration tests for all critical API paths. E2E tests for core user flows (signup → create program → assign athlete → log session).
- **Linting and formatting** — Biome (or ESLint + Prettier) with zero-warning policies. Pre-commit hooks via Lefthook or Husky. No exceptions or suppressions without documented justification.
- **Code review requirement** — Every PR requires at least one approving review before merge. No direct commits to `main`. Branch protection rules enforce this.
- **Documentation standards** — API documentation generated from OpenAPI specifications (never hand-written). Architecture Decision Records (ADRs) for all significant technical choices. README files in every package/directory explaining purpose, setup, and conventions.
- **CI/CD pipeline** — Automated linting, type checking, unit testing, integration testing, and build verification on every PR. Automated deployment to staging on merge to `main`. Production deployment requires manual approval.

### 10.5 Data Model Principles

- **Aggregates as consistency boundaries** — Each aggregate (e.g., `Athlete`, `TrainingProgram`, `WorkoutSession`, `MealPlan`, `Injury`) is a transactional consistency boundary. Business rules within an aggregate are always consistent. Cross-aggregate references use IDs, not object references — aggregates are independent.
- **Value Objects over primitives** — Use `Weight`, `Duration`, `HeartRate`, `Pace`, `Power`, `Distance`, `RPE`, `Reps` instead of raw `number` or `string`. Value objects are self-documenting, type-safe, and encapsulate validation. No more "is this weight in kg or lbs?" bugs.
- **Immutability where possible** — Value objects are immutable. Domain events are immutable and append-only. Historical data is preserved — an athlete's program from 6 months ago should look exactly as it did when assigned, even if the exercise library has since been updated.
- **Soft deletes, not hard deletes** — Nothing is ever truly deleted in production. "Delete" operations archive data. This enables recovery from mistakes, supports compliance (right to deletion is implemented as true deletion on archived data), and preserves analytical integrity.
- **Audit trails for every significant change** — Who changed what, when, and (optionally) why. Every mutation to core entities is logged. This supports debugging, compliance, dispute resolution, and trust.

### 10.6 Integration Architecture

- **External integrations are infrastructure** — Every third-party API (Stripe, SendGrid, Twilio, Whoop, Garmin, Strava) is accessed through an interface defined in the application layer. The domain layer never calls external services directly. This enables testing with mock implementations and swapping providers without touching business logic.
- **Webhook-first for real-time data** — Incoming data from wearables and third-party platforms arrives via webhooks whenever possible. Polling is a fallback, not the default. Webhook payloads are validated, queued, and processed asynchronously.
- **Idempotency is required** — All external API calls and webhook handlers are idempotent. Duplicate event delivery (which every webhook provider experiences) must not result in duplicate data or double-processing.
- **Circuit breakers and graceful degradation** — If an external service is unavailable (e.g., Stripe is down), the platform degrades gracefully. Payment processing queues requests for retry. Missing recovery data shows "Data Unavailable" rather than breaking the athlete dashboard. No external dependency can take down the core coaching workflow.

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **Aggregate** | A cluster of domain objects treated as a single unit for data changes. The consistency boundary in DDD. |
| **Value Object** | An immutable object defined by its attributes, not by an identity. Two `Weight` objects of 100kg are interchangeable. |
| **Entity** | An object defined by its identity, which persists through state changes. An `Athlete` has an identity that persists even as their weight, programs, and goals change. |
| **Domain Event** | A record of something meaningful that happened in the domain. Immutable, append-only, and triggers cross-aggregate reactions. |
| **Repository** | An interface for accessing and persisting aggregates. Abstracts the storage mechanism from the domain. |
| **Use Case / Application Service** | A single business operation orchestrated by the application layer. Coordinates domain objects to fulfill a specific user intent. |
| **DTO (Data Transfer Object)** | A simple, serializable object for crossing layer or network boundaries. No behavior, just data. |
| **MRR** | Monthly Recurring Revenue — the predictable monthly subscription revenue. |
| **ARR** | Annual Recurring Revenue — MRR × 12 for stable forecasting. |
| **ARPC** | Average Revenue Per (Paying) Coach. |
| **NPS** | Net Promoter Score — measures likelihood of recommendation on a 0–10 scale. |
| **CSAT** | Customer Satisfaction Score — post-interaction satisfaction rating. |
| **LTV** | Customer Lifetime Value — total expected revenue from a coach over their entire relationship with MR Training. |
| **CAC** | Customer Acquisition Cost — total sales and marketing spend divided by new customers acquired. |
| **Cohort** | A group of users sharing a common characteristic (e.g., sign-up month, plan tier, sport). Used for retention and behavior analysis. |
| **PWA** | Progressive Web App — a web application with native app-like capabilities (offline support, push notifications, home screen installation). |
| **RPE** | Rate of Perceived Exertion — a 1–10 scale measuring subjective training intensity. |
| **RIR** | Reps in Reserve — how many more reps could have been completed at the end of a set. |
| **TSS** | Training Stress Score — a composite measure of training load based on duration and intensity. |
| **CTL / ATL / TSB** | Chronic Training Load (long-term fitness), Acute Training Load (short-term fatigue), Training Stress Balance (form/freshness). The Performance Manager Chart model from cycling. |
| **FTP** | Functional Threshold Power — the highest average power a cyclist can sustain for approximately one hour. The foundation of power-based training zones. |
| **HRV** | Heart Rate Variability — the variation in time between heartbeats. A key recovery and readiness metric. |
| **ACWR** | Acute-to-Chronic Workload Ratio — compares recent training load (acute) to longer-term load (chronic) to assess injury risk. |
| **SAML / OIDC** | Security Assertion Markup Language / OpenID Connect — enterprise authentication protocols for Single Sign-On. |

---

*Document version: 2.0 | Last updated: July 2026 | Author: MR Training Product Team*
