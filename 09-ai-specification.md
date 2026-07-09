# MR Training — AI Specification

**Version 1.0 — 2026**

---

## Table of Contents

1. [AI Philosophy](#1-ai-philosophy)
2. [Architecture Overview](#2-architecture-overview)
3. [AI Services](#3-ai-services)
4. [Model Strategy](#4-model-strategy)
5. [Data Pipeline](#5-data-pipeline)
6. [Integration Points](#6-integration-points)
7. [Safety and Governance](#7-safety-and-governance)
8. [Monitoring and Evaluation](#8-monitoring-and-evaluation)

---

## 1. AI Philosophy

### 1.1 Core Principles

AI in MR Training is not a chatbot sidebar. It is embedded in the workflows where it reduces friction, generates options, and surfaces insights — always with a human in the loop for approval. The AI is a teammate, not a replacement. It should always assist, never interrupt, never replace humans.

**Always assist. Never replace.** Every AI-generated output requires human review before it affects an athlete's training, nutrition, or recovery. The AI proposes; the coach decides. The AI analyzes; the coach interprets. The AI automates the routine so the coach can focus on the exceptional.

**Explainability is mandatory.** Every AI recommendation includes a confidence score and a natural-language explanation of its reasoning. A coach should understand why the AI suggested reducing an athlete's squat volume — "Based on a 15% drop in HRV over the past 3 days combined with a 22% training load increase, this pattern preceded overtraining in 73% of similar cases in our dataset." Not "AI recommends deload."

**Contextual awareness.** The AI knows the athlete, the coach, the program, the training phase, the injury history, the nutrition plan, and the recovery data. It does not generate generic recommendations from a prompt alone — it synthesizes all available context to produce personalized output.

**Data privacy is absolute.** Athlete training data is never used to train shared models without explicit consent. Every organization's data is logically isolated. Federated learning techniques are employed where beneficial, but training data never leaves the MR Training infrastructure to train third-party models.

### 1.2 Design Constraints

- Human-in-the-loop for all actionable outputs (program modifications, nutrition plan changes, injury risk interventions)
- Confidence thresholds: recommendations below 70% confidence are flagged as "low confidence" and presented as suggestions, not recommendations
- Latency targets: workout generation < 5 seconds, insight generation < 2 seconds, anomaly detection < 1 second
- All AI interactions are logged immutably for audit, improvement, and compliance
- Athletes can opt out of AI features entirely — the platform must function fully without AI

---

## 2. Architecture Overview

### 2.1 System Topology

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Go/Fiber)                    │
│  POST /ai/generate-workout                                   │
│  POST /ai/generate-nutrition                                 │
│  POST /ai/insights/:athleteId                                │
│  POST /ai/report/:athleteId                                  │
│  POST /ai/anomaly-detect/:athleteId                          │
└─────────────┬───────────────────────────────────────────────┘
              │ gRPC
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Engine Service (Go)                     │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Prompt Builder   │  │ Context      │  │ Output         │ │
│  │ - Template mgmt  │  │ Assembler    │  │ Validator      │ │
│  │ - Few-shot       │  │ - Athlete    │  │ - Schema check │ │
│  │ - Sport-specific │  │   history    │  │ - Safety filter│ │
│  │ - Personalization│  │ - Program    │  │ - Plausibility │ │
│  └────────┬────────┘  │   data       │  └────────┬───────┘ │
│           │           │ - Org context│           │         │
│           ▼           │ - Model      │           ▼         │
│  ┌─────────────────┐  │   guidelines │  ┌────────────────┐ │
│  │ LLM Router       │  └──────┬───────┘  │ Response Cache  │ │
│  │ - Model selection │        │          │ - Dedup         │ │
│  │ - Provider failover│       │          │ - TTL by type   │ │
│  │ - Cost tracking   │        │          │ - Invalidation  │ │
│  └────────┬────────┘         │          └────────────────┘ │
│           │                  │                              │
│           ▼                  ▼                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              LLM Providers (External API)                 ││
│  │  OpenAI GPT-4o  │  Anthropic Claude  │  Self-hosted      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                 │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │ PostgreSQL    │  │ Redis Cache    │  │ Vector Store     │  │
│  │ - Training    │  │ - Embeddings   │  │ - pgvector       │  │
│  │   data        │  │ - Session ctx  │  │ - Exercise       │  │
│  │ - Athlete     │  │ - Rate limits  │  │   embeddings     │  │
│  │   profiles    │  │                │  │ - Similarity     │  │
│  └──────────────┘  └────────────────┘  │   search        │  │
│                                         └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Service Architecture

The AI Engine is a separate Go service communicating with the main API server via gRPC. This separation provides:

- **Independent scaling** — AI workloads are bursty and compute-intensive; the API server is steady-state. Scaling them independently optimizes cost.
- **Provider isolation** — LLM provider API keys and network access are confined to the AI service, reducing the blast radius of a credential leak.
- **Independent deployment** — Model updates, prompt improvements, and provider changes deploy without touching the main API.
- **Resource isolation** — Memory-intensive embedding operations and GPU-accelerated inference do not compete with the API server's database connection pool.

Communication between the API server and the AI Engine uses gRPC with protobuf contracts, supporting both synchronous request-response (for generation) and streaming (for real-time insights and progressive rendering).

### 2.3 Request Lifecycle

```
1. Coach clicks "Generate Workout" → API server receives POST /ai/generate-workout
2. API server validates request, checks rate limits, verifies permissions
3. API server returns 202 Accepted with status_url
4. API server enqueues job via NATS JetStream
5. AI Engine worker picks up job:
   a. Context Assembler fetches athlete data, program history, coach preferences
   b. Prompt Builder constructs system prompt with sport-specific templates, few-shot examples
   c. LLM Router selects provider based on cost, latency, availability
   d. Request sent to LLM provider
   e. Response received, parsed, validated against schema
   f. Output Validator checks safety, plausibility, domain constraints
   g. Result stored in ai_generated_content table with status pending_review
   h. Status URL updated to completed
6. Frontend polls status_url → receives result when ready
7. Coach reviews, edits, and applies (or rejects) generated content
```

---

## 3. AI Services

### 3.1 Workout Generation

**Purpose:** Generate complete training programs or individual workouts from natural language descriptions, contextualized by athlete profile, training history, and coach preferences.

**Inputs:**
- Natural language description ("4-day upper/lower split for intermediate lifter, hypertrophy focus, no Olympic lifts")
- Athlete context (sport, goals, experience level, injury flags, equipment availability, estimated 1RMs)
- Coach context (specialties, preferred exercise categories, programming philosophy)
- Constraints (duration weeks, days per week, max session duration, equipment limitations)

**Outputs:**
- Structured workout program with phases, workouts, exercises, sets, reps, intensity
- Explanation of programming decisions
- Confidence score per exercise recommendation
- Suggested alternatives for flagged exercises (e.g., "Replace barbell back squat with goblet squat due to athlete's reported lower back sensitivity")

**Template System:** Sport-specific prompt templates encode domain expertise. The running workout template includes pace zones, periodization logic, and injury-risk heuristics that a generic LLM prompt would lack. Templates are versioned and A/B tested against coach acceptance rates.

**Quality Gates:**
- Schema validation: output must conform to WorkoutProgram/Workout/WorkoutExercise schemas
- Business rule validation: no exercises requiring equipment the athlete lacks, no exercises contraindicating active injuries
- Volume sanity check: total weekly volume within 2 standard deviations of the athlete's recent average
- Progressive overload check: prescribed loads follow a progressive pattern, not random

### 3.2 Nutrition Plan Generation

**Purpose:** Generate meal plans aligned with training phase, dietary preferences, macro targets, and food availability.

**Inputs:**
- Athlete context (goals, training phase, macro targets, dietary restrictions, allergies)
- Preferences (meal frequency, cuisine preferences, cooking time constraints)
- Coach/nutritionist guidelines (meal timing relative to training sessions, preferred food categories)

**Outputs:**
- 7-day meal plan with breakfast, lunch, dinner, snacks
- Per-meal macro breakdown
- Grocery list grouped by category
- Nutritional analysis (micronutrient adequacy check)

**Special Considerations:**
- Hydration targets adjusted by training volume and environmental conditions
- Pre/intra/post-workout nutrition timing aligned to the athlete's training schedule
- Supplement recommendations integrated with meal plan
- Cultural and religious dietary restrictions handled explicitly (halal, kosher, fasting schedules)

### 3.3 Performance Insights

**Purpose:** Analyze athlete data to surface non-obvious patterns, trends, and correlations that inform coaching decisions.

**Inputs:**
- Athlete's complete training history
- Recovery data (sleep, HRV, resting HR, readiness, soreness)
- Nutrition adherence and body composition trends
- Competition results and benchmark test outcomes

**Outputs:**
- Narrative insights in natural language ("Your sprint times have improved 3.2% since increasing hip mobility work in your warm-up routine")
- Anomaly flags ("Resting HR is 8 bpm above your 30-day baseline — this preceded illness in 2 of your last 3 occurrences")
- Trend predictions ("At your current rate of progression, projected 5K time by race day is 22:15 ± 45 seconds")
- Coaching recommendations ("Consider increasing carbohydrate intake on double-session days — athletes with your training volume see 12% better recovery when carbs exceed 4g/kg on those days")

**Confidence Scoring:** Each insight includes a confidence score (0-1) and the factors that influenced it. Insights below 0.7 confidence are labeled as "observations" rather than "recommendations."

### 3.4 Anomaly Detection

**Purpose:** Continuously monitor athlete data streams for statistically significant deviations that warrant coach attention.

**Detection Categories:**
- **Training anomalies:** Sudden performance drops, missed sessions after high adherence, unusual RPE patterns, volume spikes exceeding ACWR thresholds
- **Recovery anomalies:** HRV decline exceeding 2 standard deviations, sleep deprivation patterns, rising resting heart rate trends
- **Behavioral anomalies:** Reduced app engagement, decreased logging frequency, missed check-ins
- **Health anomalies:** New injury reports, rapid weight changes, abnormal body composition shifts

**Implementation:** Statistical process control using rolling z-score thresholds with configurable sensitivity per organization. Machine learning models (isolation forests, LSTM autoencoders) for multivariate anomaly detection across training load, recovery, and nutrition dimensions simultaneously.

**Alerting:** Anomalies are surfaced on the coach dashboard in the "Needs Attention" section, ranked by severity and urgency. Coaches can configure notification preferences per anomaly category.

### 3.5 Coach Assistant (Natural Language Query)

**Purpose:** Conversational interface for coaches to query athlete data in natural language, reducing the time spent navigating dashboards and reports.

**Query Examples:**
- "Show me John's bench press progression this quarter"
- "Which athletes haven't logged a session in 3+ days?"
- "Compare Sarah's 5K times against her training load the week before each race"
- "Which of my athletes are at highest risk of injury based on recent load patterns?"
- "What's the average program adherence for my tennis athletes versus my gym athletes?"

**Architecture:** Text-to-SQL pipeline with strict security constraints:
1. Natural language query → LLM generates parameterized SQL
2. SQL validated against allowlisted tables and columns (never allows DDL, DML, or access to billing/payment data)
3. Organization-scoped: queries are automatically filtered to `WHERE organization_id = $current_org`
4. Results formatted as structured data or natural language response depending on query type
5. Audit log records every query for compliance

### 3.6 Automated Check-Ins

**Purpose:** Generate contextual, personalized check-in prompts for athletes based on their recent activity, adherence, and physiological data.

**Patterns:**
- Post-milestone: "You just hit 50 workouts with Coach Sarah. What's been the biggest change you've noticed?"
- Anomaly follow-up: "Your HRV dropped 15% this week. How are you feeling — any unusual stress or fatigue?"
- Engagement recovery: "Haven't seen you in a few days. Everything okay? Your program is still here when you're ready."
- Pre-competition: "Race day is in 5 days. How's your confidence level? Anything you want to adjust in the final days?"

**Rules:**
- Maximum one AI check-in per athlete per day
- Coach can review and customize before sending
- Athlete can opt out of automated check-ins
- Response sentiment analysis flags concerning replies for coach escalation

---

## 4. Model Strategy

### 4.1 Provider Selection

MR Training uses a multi-provider strategy to optimize for cost, latency, and capability:

| Provider | Model | Primary Use | Fallback |
|----------|-------|------------|----------|
| OpenAI | GPT-4o | Workout generation, nutrition plans, complex synthesis | Claude 3.5 Sonnet |
| Anthropic | Claude 3.5 Sonnet | Performance reports, coach assistant, check-ins | GPT-4o |
| Self-hosted | Mistral/Mixtral | Anomaly detection scoring, text classification, embeddings | — |

Provider selection is dynamic based on:
- **Cost budget per request type** (workout gen: $0.02 max, insights: $0.005 max, anomaly detection: essentially free via self-hosted)
- **Latency SLO** (workout gen: 5s p95, insights: 2s p95, anomaly detection: 1s p95)
- **Provider availability** (automatic failover with circuit breaker pattern)
- **Quality benchmark scores** (periodic evaluation of each provider on MR Training-specific test suites)

### 4.2 Prompt Engineering

Prompts are version-controlled artifacts, not strings hidden in code. Each prompt template is stored as a YAML file with:
- System prompt definition
- Few-shot examples (real, anonymized training data)
- Output schema (JSON Schema for structured outputs)
- Constraints and safety rules
- Version and changelog

```
ai/prompts/
├── workout-generation/
│   ├── gym/
│   │   ├── v2.3-hypertrophy.yaml
│   │   ├── v2.1-strength.yaml
│   │   └── v1.8-conditioning.yaml
│   ├── running/
│   │   ├── v3.0-marathon.yaml
│   │   └── v2.5-base-building.yaml
│   └── shared/
│       └── safety-rules.yaml
├── nutrition/
│   ├── v1.5-meal-plan.yaml
│   └── v1.2-carb-loading.yaml
└── insights/
    ├── v2.0-performance.yaml
    └── v1.8-anomaly.yaml
```

### 4.3 Fine-Tuning Strategy

Fine-tuning is reserved for classification and extraction tasks where smaller, cheaper models can match or exceed general-purpose LLM performance:

- **Exercise classification and normalization** — Map free-text exercise descriptions ("bench," "flat bench," "bb bench") to canonical exercise library entries. Fine-tuned DistilBERT achieves 97% accuracy at 1/100th the cost of GPT-4.
- **RPE prediction** — Predict session RPE from workout volume, intensity, and athlete history. LSTM model trained on historical workout data.
- **Injury risk scoring** — Classify athletes into risk tiers based on multivariate training load, recovery, and historical patterns. XGBoost model trained on anonymized population data.
- **Nutrition food recognition** — Classify food items from barcode scans and text descriptions. Fine-tuned on USDA and Open Food Facts databases.

### 4.4 Embeddings and Vector Search

Exercise and workout similarity search uses embeddings stored in pgvector:

- Exercise embeddings for semantic search ("leg push" → squat variations, leg press, lunges)
- Workout embeddings for program recommendation ("similar to this athlete's program")
- Athlete embeddings for cohort comparison (identifying similar athletes for benchmarking)

Embeddings are generated using OpenAI's `text-embedding-3-large` model and cached in Redis with a 30-day TTL. Exercise library embeddings are generated offline and stored with each exercise record.

---

## 5. Data Pipeline

### 5.1 Training Data Management

**What is NOT used for training:**
- Individual athlete identifiable data (workout logs, nutrition entries, recovery logs, messages) — never used to train shared or third-party models without explicit opt-in consent
- Payment and billing data — never accessible to AI systems
- Private messages and communications — never processed by AI except for sentiment classification in opt-in check-in responses
- Authentication credentials and session data

**What IS used for training:**
- Anonymized, aggregated workout templates created by coaches (opt-in, with coach consent)
- Exercise library data (public domain)
- Nutrition food databases (USDA, Open Food Facts — public domain)
- System-generated performance benchmarks and population statistics
- Synthetic data generated from anonymized patterns

### 5.2 Data Preparation

For fine-tuning and evaluation:
1. **Anonymization pipeline** — Strips PII, replaces athlete IDs with synthetic identifiers, aggregates data below minimum group sizes (k-anonymity with k=10)
2. **Quality filtering** — Removes incomplete workouts (less than 50% of sets logged), removes sessions flagged as test/experimental by coaches
3. **Normalization** — Canonicalizes exercise names, normalizes weight units to kg, normalizes distance units to km
4. **Balancing** — Ensures representation across sports, experience levels, and training phases to prevent model bias

### 5.3 Evaluation Datasets

Held-out evaluation datasets are maintained for each AI service:

| Dataset | Size | Purpose | Update Frequency |
|---------|------|---------|-----------------|
| Workout Quality Eval | 500 coach-reviewed programs | Measure workout generation quality (coach acceptance rate) | Monthly |
| Exercise Classification Eval | 10,000 labeled free-text entries | Measure classification accuracy | Quarterly |
| Anomaly Detection Eval | 1,000 labeled anomaly events | Measure precision/recall | Monthly |
| Insight Quality Eval | 200 coach-rated insights | Measure insight actionability and accuracy | Monthly |

### 5.4 A/B Testing Framework

Prompt and model changes are A/B tested on a subset of consenting organizations before full rollout:
1. New prompt/model deployed to 5% of organizations
2. Metrics tracked: coach acceptance rate, coach edit rate (how much they modify AI output), time-to-publish (how long from AI generation to coach publishing)
3. Statistical significance evaluated weekly
4. Rollout to 100% when acceptance rate is ≥ 5% improvement with p < 0.05, or rollback if degradation is detected

---

## 6. Integration Points

### 6.1 API Endpoints

| Endpoint | Method | Latency Target | Async |
|----------|--------|---------------|-------|
| `/ai/generate-workout` | POST | 5s p95 | Yes (202 + polling) |
| `/ai/generate-nutrition` | POST | 5s p95 | Yes (202 + polling) |
| `/ai/generate-meal-plan` | POST | 5s p95 | Yes (202 + polling) |
| `/ai/insights/:athleteId` | POST | 2s p95 | Yes (202 + polling) |
| `/ai/report/:athleteId` | POST | 10s p95 | Yes (202 + polling) |
| `/ai/anomaly-detect/:athleteId` | POST | 1s p95 | No (synchronous) |
| `/ai/status/:requestId` | GET | 100ms | N/A |

All async endpoints return `202 Accepted` with a `status_url`. The client polls the status URL or receives a webhook callback on completion.

### 6.2 Event-Driven AI Triggers

AI processing is triggered automatically by domain events:

| Domain Event | AI Action |
|-------------|-----------|
| `workout.completed` | Recalculate athlete metrics, check for anomalies, generate insights |
| `program.published` | Pre-generate weekly workout variations for coach review |
| `athlete.registered` | Generate initial program recommendations based on goals and experience |
| `recovery.log_created` | Update readiness score, check recovery anomalies |
| `nutrition.entry_logged` | Update nutrition adherence, compare against plan, surface deviations |
| `injury.reported` | Flag exercises contraindicated by injury, suggest alternatives, notify assigned PT |
| `milestone.achieved` | Generate personalized celebration message draft for coach |

### 6.3 AI-Generated Content Lifecycle

```
[AI Generates] → status: pending_review
      │
      ▼
[Coach Reviews] ──→ [Coach Edits] ──→ [Coach Approves] → status: published
      │                    │
      ▼                    ▼
[Coach Rejects]     [Coach Requests
 status: rejected    Regeneration]
      │                    │
      ▼                    ▼
[Feedback logged]   [AI regenerates
 for model           with feedback]
 improvement]
```

All states are tracked in `ai_generated_content` table. Rejection reasons are categorized and analyzed to improve prompt templates. Content that is published becomes immutable — the coach can create a new version, but the original AI output is preserved for audit.

---

## 7. Safety and Governance

### 7.1 Safety Constraints

Hard constraints enforced at the output validation layer:

- **No medical diagnosis.** The AI never claims to diagnose, treat, or cure any medical condition. Injury-related outputs refer athletes to qualified professionals.
- **No dangerous programming.** Exercise prescriptions are validated against the athlete's experience level, injury flags, and equipment availability. A beginner with no spotter will never receive a 1RM test prescription.
- **No body image harm.** Nutrition recommendations never promote extreme caloric deficits, fad diets, or weight targets below healthy BMI ranges. Body composition language is neutral and health-focused.
- **No PED or supplement endorsement.** The AI never recommends performance-enhancing drugs, unregulated supplements, or off-label pharmaceutical use.
- **No demographic bias.** Training recommendations are based on individual performance data, not population stereotypes. Age, gender, and ethnicity are never used as predictive features for performance potential — only as modifiers for physiological reference ranges where evidence-based.
- **No competitive sabotage.** Coaches cannot query AI for data or insights about athletes they do not manage. Organization boundaries are enforced at the query level.

### 7.2 Content Filtering

All AI outputs pass through a content safety filter before storage:

1. Toxicity detection (Perspective API or self-hosted model)
2. PII leakage detection (regex patterns + ML classifier)
3. Domain-specific rule engine (exercise safety, nutrition safety, scope boundary checks)
4. Manual review queue for flagged outputs (confidence < 0.5 on safety checks)

### 7.3 Audit Trail

Every AI interaction is logged immutably:

```
ai_interactions table:
- id, organization_id, user_id
- request (JSONB): full prompt, context, parameters
- response (JSONB): full AI output, raw and parsed
- model, provider, tokens_in, tokens_out, latency_ms, cost_cents
- status: completed, rejected, edited, applied
- reviewed_by, reviewed_at, applied_at
- safety_flags: array of triggered safety rules
```

This audit trail serves three purposes:
1. **Accountability** — Every AI-influenced decision can be traced to its origin
2. **Improvement** — Prompt template effectiveness is measured by acceptance/edit/rejection rates
3. **Compliance** — Regulatory requirements for AI-influenced decisions in health-adjacent domains

### 7.4 Athlete Consent and Control

- Athletes are explicitly informed about AI features during onboarding and can opt out globally
- Per-feature opt-out: an athlete can disable AI-generated meal plans while keeping AI-powered recovery insights
- Athletes can request a copy of all AI-generated content about them
- Coaches are informed when an athlete has opted out of AI features — they will not see AI insights for that athlete

---

## 8. Monitoring and Evaluation

### 8.1 Operational Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| AI request success rate | > 99.5% | < 99% |
| P95 latency (workout gen) | < 5s | > 8s |
| P95 latency (insights) | < 2s | > 4s |
| Provider API error rate | < 1% | > 3% |
| Cost per request (workout gen) | < $0.02 | > $0.05 |
| Safety filter flag rate | < 2% | > 5% |
| Prompt cache hit rate | > 60% | < 40% |

### 8.2 Quality Metrics

| Metric | Measurement | Target |
|--------|------------|--------|
| Coach acceptance rate | % of AI outputs applied without edits | > 70% |
| Coach edit rate | Average % of content modified before publishing | < 15% |
| Time to publish | Time from AI generation to coach publishing | < 2 minutes (median) |
| Regeneration rate | % of outputs where coach requests regeneration | < 10% |
| Athlete satisfaction | Survey score from athletes receiving AI-influenced programming | > 4.2/5 |
| Insight actionability | % of AI insights that result in a coach action (message, program change) | > 40% |

### 8.3 Bias Monitoring

Quarterly bias audits evaluate AI outputs across demographic dimensions:
- Are training volume recommendations equivalent across genders for athletes with equivalent performance metrics?
- Do nutrition recommendations vary by ethnicity when controlling for dietary preferences and goals?
- Is anomaly detection sensitivity equivalent across age groups?

Deviations exceeding 5% trigger investigation and remediation.

### 8.4 Continuous Improvement Loop

```
[Coach uses AI feature]
        │
        ▼
[Coach accepts, edits, or rejects]
        │
        ▼
[Feedback aggregated and analyzed]
        │
        ▼
[Prompt templates updated]
        │
        ▼
[A/B test on 5% of coaches]
        │
        ▼
[Metrics evaluated]
        │
        ▼
[Full rollout or rollback]
```

This loop runs bi-weekly for actively developed features and monthly for stable features.
