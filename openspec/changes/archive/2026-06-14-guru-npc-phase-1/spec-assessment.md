# Spec Assessment: guru-npc-phase-1

## Verdict

**No spec required** — this is a pure implementation change as declared in the proposal.

## Reasoning

The proposal declares zero entries under both **New Capabilities** and **Modified Capabilities**. The instruction contract (sdd-spec Step 2) treats the Capabilities section as authoritative — no entries means no spec files to create.

This assessment validates that declaration:

### Why this qualifies as a no-spec change

| Factor | Assessment |
|--------|------------|
| **External contract** | Unchanged. The system still provides a Gurú message for a given set of conditions. Consumers still call `generateGuruNpcMessage` with the same inputs. |
| **Return type** | Enriched from `string` to `GuruNpcOutput`, but that's an implementation detail of the AI module — downstream components destructure the new shape. No external API contract changes. |
| **UI presentation** | Mood indicators, certainty bars, and tips are presentation-layer additions to existing Astro components. The visual contract is implicitly defined by component props, not spec-level behaviors. |
| **Fallback behavior** | Still returns content when Gemini is unavailable. Same structure, same branches — only the return shape changes. |
| **Success criteria** | Already documented in the proposal (5 items) and the tasks (Phases 4-7). No spec-level ambiguity to resolve. |

### Boundary consideration

The `GuruNpcOutput` type (`mood`, `certainty`, `message`, `tip`, `source`) introduces a **structured data contract** that future NPC phases (2-6) will extend. If Phase 2 adds visual NPC redesign with mood-driven animations, that phase likely warrants a full spec because it introduces new user-facing behavior. At that point, the `GuruNpcOutput` type should be referenced in the spec's existing types section.

### Risk of not having a spec

- Low risk for this phase — the implementation is straightforward (type → prompt → parser → UI → test)
- If future phases depend on specific mood/certainty semantics not documented here, consider backfilling a spec at Phase 2

## Current Pipeline State

| Phase | Status |
|-------|--------|
| Proposal | ✅ Done |
| Spec | ⏭️ Skipped (assessment: no spec needed) |
| Design | ✅ Done (implicit — tasks exist) |
| Tasks | ✅ Done (Phases 1-3 completed, 4-7 pending) |
| Apply | 🔄 In progress |
