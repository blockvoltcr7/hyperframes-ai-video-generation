# Video Plan

**Mode:** idea
**Subject:** How Vector Databases Work
**URL:** (idea-mode)
**Composition ID:** HowVectorDatabasesWork  (1920x1080 @ 30fps)
**Silent target duration:** 40s
**Uses diagrams:** yes

## scene1 — HOOK — The lookup problem (nominal 0s → 8s)
- **Beat:** Traditional databases find exact matches; vector databases find *similar* ones — and that distinction is the whole idea.
- **On-screen text:** "Your database can't find 'similar'."
- **Animation:** `typewriter`
- **Visuals:** Text types itself on screen character by character. Below it, a ghost SQL query fades up — `SELECT * WHERE meaning = ?` — with a red strikethrough, signaling the impossibility. High contrast dark background.
- **Diagram:** none
- **Transition out:** slide-left

## scene2 — CONCEPT — Everything becomes a point (nominal 8s → 20s)
- **Beat:** Any data — text, image, audio — can be converted to a list of numbers (an embedding). Similar items land close together in that high-dimensional space.
- **On-screen text:** "Every item becomes a point in space."
- **Animation:** `stagger-in`, `fade-up`
- **Visuals:** A sparse 2D scatter plot builds up: dots stagger in and self-organize into loose clusters labeled "cats", "dogs", "cars". Arrows show that nearby dots share meaning. The word "embedding" fades up beneath the plot.
- **Diagram:** none
- **Transition out:** slide-left

## scene3 — MECHANICS — Index, don't brute-force (nominal 20s → 32s)
- **Beat:** Comparing a query vector to every stored vector is too slow at scale. Specialized indexes (e.g., HNSW) partition the space so the database skips 99% of comparisons.
- **On-screen text:** "Indexes skip 99% of comparisons."
- **Animation:** `diagram-reveal`
- **Visuals:** A flow diagram reveals node by node: **Query** → **Embed** → **Index (HNSW)** → **Nearest Neighbors** → **Results**. Connections draw on after each node enters. The "Index" node pulses to draw focus.
- **Diagram:** flow
- **Transition out:** fade

## scene4 — TAKEAWAY — Meaning is searchable (nominal 32s → 40s)
- **Beat:** This is the primitive that powers semantic search, RAG pipelines, and recommendations — not keyword matching, but meaning matching.
- **On-screen text:** "Meaning is now searchable."
- **Animation:** `fade-up`, `word-highlight`
- **Visuals:** Three use-case labels stagger up: "Semantic Search", "RAG Pipelines", "Recommendations". The word "Meaning" in the on-screen text gets a bright highlight sweep. Clean, minimal layout.
- **Diagram:** none
- **Transition out:** none (final scene)
