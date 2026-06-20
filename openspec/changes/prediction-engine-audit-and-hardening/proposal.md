# Proposal: Prediction Engine — Audit & Hardening

**What**: Created an SDD proposal for auditing and hardening the prediction engine reasoning and communications.
**Why**: Prior fixes addressed integration gaps; remaining risk is incorrect reasoning (zones, freezing rules, snow metrics, timezones, cache keys, narratives) causing wrong predictions and support churn.
**Where**: Engram topic_key: sdd/prediction-engine-audit-and-hardening/proposal — artifact: proposal.md (saved). Project: elgurudelanieve
**Learned**: Requirements emphasize reasoning quality (not UI), no imputed zeros, and converting probability-like confidence into a consistency index.
