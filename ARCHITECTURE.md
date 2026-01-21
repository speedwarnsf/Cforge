# Concept Forge Architecture Documentation

**Last Updated:** January 2026
**Model:** GPT-5.2-pro
**Rhetorical Device Corpus:** 411 devices

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Theoretical vs Practical Implementation](#theoretical-vs-practical-implementation)
3. [Hybrid Generation Pipeline](#hybrid-generation-pipeline)
4. [CREATIVEDC Architecture](#creativedc-architecture)
5. [Rhetorical Device System](#rhetorical-device-system)
6. [Creative Lenses](#creative-lenses)
7. [Key Implementation Files](#key-implementation-files)
8. [Recent Changes](#recent-changes)

---

## System Overview

Concept Forge is an AI-powered advertising concept generator that combines:

- **CREATIVEDC**: Divergent-Convergent thinking with 5 creative personas
- **EvoToken-DLM**: Evolutionary token state machine (conceptual approximation)
- **411 Rhetorical Device Corpus**: Comprehensive rhetorical device integration
- **Multi-Arbiter Validation**: Quality gates for originality, audience fit, and award potential

---

## Theoretical vs Practical Implementation

### The White Paper Vision (EvoToken-DLM)

The theoretical EvoToken-DLM system describes true soft-token probability distributions at the vocabulary level, where tokens evolve through four states:

| State | Description |
|-------|-------------|
| `MASK` | Completely unknown token position |
| `SOFT_MASK_V` | Soft mask with vocabulary probability distribution |
| `SOFT_V` | Soft token with refined distribution |
| `DECODED` | Final decoded token |

In a true implementation, we would have:

```
logits = model.forward(prompt)           // Get raw scores for ~100k vocab tokens
logits = boost(logits, metaphor_vocab)   // Manipulate probabilities
logits = penalize(logits, used_phrases)  // Penalize repetition
token = sample(logits, temperature)      // Sample from modified distribution
```

### What We Actually Have (API Constraints)

**Access we lack:**

| Access Type | What It Would Enable | Why Unavailable |
|-------------|---------------------|-----------------|
| Logits access | Raw probability scores for all vocabulary tokens | OpenAI doesn't expose for GPT-4o/5.2-pro |
| Constrained decoding | Boost/penalize specific tokens during generation | Requires inference-time control |
| Model weights | Self-hosted inference with custom sampling | Proprietary, API-only access |
| Guided generation hooks | Inject constraints between token samples | API is request/response only |

**Why these restrictions exist:**
- **Safety**: Probability manipulation could bypass alignment safeguards
- **Cost**: Returning 100k logits per token is computationally expensive
- **IP Protection**: Core model behavior remains proprietary

### Our Pragmatic Approximation

We achieve similar creative outcomes through a different mechanism:

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHITE PAPER (Theoretical)                     │
├─────────────────────────────────────────────────────────────────┤
│  logits = model.forward(prompt)                                 │
│  logits = apply_rhetorical_constraints(logits, device)  ←───────│── Actual probability manipulation
│  logits = apply_coherence_penalty(logits, context)              │
│  token = sample(logits)                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  OUR IMPLEMENTATION (Practical)                  │
├─────────────────────────────────────────────────────────────────┤
│  response = LLM("generate using [rhetorical device]")   ←───────│── Black box generation
│  valid = validate(response, device_constraints)         ←───────│── Post-hoc validation
│  if (!valid) iterate_with_feedback()                    ←───────│── Refinement loop
└─────────────────────────────────────────────────────────────────┘
```

**Key differences:**

1. **Generation**: We prompt the LLM with constraints rather than manipulating token probabilities
2. **Validation**: We check outputs against constraints after generation, not during
3. **Iteration**: We use feedback loops to refine outputs that don't meet constraints
4. **State Machine**: We simulate EvoToken states conceptually, not mathematically

**Bottom line:** Our approach achieves similar creative outcomes through prompt engineering + constraint validation + iterative refinement. It's not mathematically equivalent to true soft-token evolution, but it works effectively within real-world API constraints.

---

## Hybrid Generation Pipeline

The hybrid pipeline combines CREATIVEDC divergent exploration with EvoToken-inspired evolution:

```
User Brief
    │
    ▼
┌─────────────────────────┐
│   Divergent Explorer    │  ← 5 creative personas generate raw ideas
│   (CREATIVEDC Phase)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Trope Variety         │  ← Select rhetorical devices (50% unexplored guarantee)
│   Selector              │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Progressive           │  ← Conceptual state machine evolution
│   Evolution Engine      │     MASK → SOFT_MASK_V → SOFT_V → DECODED
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Multi-Arbiter         │  ← Quality validation
│   Validation            │     (Originality, Audience, Awards)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Iterative Refinement  │  ← Feedback-driven improvement
│   Engine                │
└───────────┬─────────────┘
            │
            ▼
    Final Variants
    + Rhetorical Analysis
```

**Enabled by default** as of January 2026.

---

## CREATIVEDC Architecture

Five creative personas drive divergent thinking:

| Persona | Role | Thinking Style |
|---------|------|----------------|
| **Maverick** | Rule-breaker | Challenges conventions, finds unexpected angles |
| **Anthropologist** | Culture observer | Identifies human truths and behavioral insights |
| **Poet** | Language artist | Crafts memorable phrases with emotional resonance |
| **Provocateur** | Tension creator | Finds productive conflict and debate |
| **Empath** | Emotion connector | Builds deep emotional bridges with audiences |

Personas rotate through generations to ensure variety. Rotation modes:
- `sequential`: Round-robin through personas
- `random`: Random selection each generation
- `weighted`: Favor less-used personas

---

## Rhetorical Device System

### Corpus Size: 411 Devices

The full corpus includes classical rhetoric, modern advertising techniques, and academic frameworks.

### 50% Exploration Guarantee

**Problem solved:** Creative lenses were limiting users to ~17 tone-affiliated devices, preventing exploration of the full 411-device corpus.

**Solution:** Regardless of selected lens, at least 50% of rhetorical device selections come from unexplored devices in the full corpus.

```typescript
// server/utils/tropeVarietySelector.ts

const explorationQuota = Math.ceil(count / 2);  // 50% minimum
const toneQuota = count - explorationQuota;

// PHASE 1: Fill exploration quota from FULL corpus (ignoring tone)
for (const device of unexploredDevices) {
  if (explorationFilled >= explorationQuota) break;
  addDevice(device, 'unexplored');
}

// PHASE 2: Fill remaining with tone-matched devices
for (const device of toneMatchedDevices) {
  if (selected.length >= count) break;
  addDevice(device, 'tone_matched');
}
```

### Tone-Device Affinities

Each creative lens has ~17 affiliated devices that are prioritized for the tone quota:

| Tone | Sample Devices |
|------|----------------|
| Creative | metaphor, paradox, oxymoron, hyperbole, personification |
| Analytical | antithesis, chiasmus, syllogism, logos, ethos |
| Conversational | rhetorical_question, irony, hyperbole, hendiadys |
| Technical | metonymy, litotes, synecdoche, ellipsis, parallelism |
| Emotional | pathos, hyperbole, apostrophe, prosopopoeia |
| Persuasive | ethos, pathos, logos, antithesis, climax |

---

## Creative Lenses

User-facing lens options and their backend mappings:

| UI Lens | Tone Value | Description |
|---------|------------|-------------|
| Bold Concepting | `creative` | Unexpected visual metaphors and striking imagery |
| Strategic Persuasion | `analytical` | Logic-led benefits with clear reasoning |
| Conversational Hook | `conversational` | Casual, relatable, social-ready copy |
| Simplified Systems | `technical` | Complex ideas made accessible |
| Core Idea Finder | `summarize` | Distill transformation into essential words |

---

## Key Implementation Files

### Core Generation

| File | Purpose |
|------|---------|
| `server/routes/generateMultivariant.ts` | Main generation endpoint, hybrid mode toggle |
| `server/utils/hybridGenerationOrchestrator.ts` | Orchestrates full hybrid pipeline |
| `server/utils/divergentExplorer.ts` | CREATIVEDC persona-driven exploration |
| `server/utils/progressiveEvolution.ts` | EvoToken state machine (conceptual) |

### Rhetorical Devices

| File | Purpose |
|------|---------|
| `server/utils/tropeVarietySelector.ts` | 50% exploration guarantee logic |
| `server/utils/tropeConstraints.ts` | Device validation and pattern matching |
| `data/rhetorical-devices.json` | Full 411-device corpus |

### Quality Arbiters

| File | Purpose |
|------|---------|
| `server/utils/originalityArbiter.ts` | Novelty and freshness scoring |
| `server/utils/audienceArbiter.ts` | Target audience fit |
| `server/utils/awardPotentialArbiter.ts` | Creative award potential |
| `server/utils/adQualityArbiter.ts` | Overall advertising quality |

### Cost & Performance

| File | Purpose |
|------|---------|
| `server/utils/costTracker.ts` | Token usage and cost estimation |
| `server/utils/performanceMonitor.ts` | Timing and performance metrics |

---

## Recent Changes

### January 2026

#### Model Upgrade: GPT-4o → GPT-5.2-pro
- Updated all 21 files with GPT model references
- Added GPT-5.2-pro pricing: $0.01/1K input, $0.03/1K output
- Retained `gpt-4o-mini` for lightweight embedding tasks

#### 50% Rhetorical Device Exploration Guarantee
- File: `server/utils/tropeVarietySelector.ts`
- Ensures systematic exploration of full 411-device corpus
- Prevents lens selection from limiting device variety

#### Hybrid Mode Enabled by Default
- File: `server/routes/generateMultivariant.ts`
- Changed `enableHybridMode = false` to `enableHybridMode = true`
- All generations now use full CREATIVEDC + EvoToken pipeline

#### Rhetorical Analysis in Output
- Added `rhetoricalAnalysis` field to `hybridMetadata`
- Provides explanations of how each device was applied

#### TypeScript Error Resolution
- Fixed null-safety issues in `progressiveEvolution.ts`
- Added Supabase null checks in `trajectoryTraining.ts`
- Resolved type errors across 18 files

---

## API Pricing Reference

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| gpt-5.2-pro | $0.010 | $0.030 |
| gpt-4o | $0.005 | $0.015 |
| gpt-4o-mini | $0.00015 | $0.0006 |
| text-embedding-3-large | $0.00013 | — |
| text-embedding-3-small | $0.00002 | — |

---

## Deployment

- **Platform:** Vercel
- **Build Command:** `npm run build`
- **Output Directory:** `dist/public`
- **API Function:** `api/index.mjs`

---

*This document reflects the architecture as of January 2026. For questions or updates, refer to the codebase or contact the development team.*
