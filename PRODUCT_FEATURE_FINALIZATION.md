# SSC Smart Tracker — Finalized Community Features Blueprint

## Product Vision
Transform SSC prep into a **Kurukshetra-style strategic journey** where aspirants grow through:
- fast problem-solving weapons (**Divyastra shortcuts**),
- social rescue systems (**Sankat Mochan**),
- status and mastery arcs (**Warrior Ranks**),
- and team competition (**Sena ecosystem**).

All social collaboration features are grouped under a dedicated **Community tab** and intentionally run as an **AI-free zone** (only human-generated discussions, shortcuts, and feedback).

This document finalizes the feature set, points out risks, and gives practical fixes before implementation.

---

## 1) Finalized Feature Set

### Platform rule: Community tab is AI-free
- Add a dedicated top-level **Community tab**.
- This tab contains Sankat feeds, Divyastra discussions, leaderboards, clans (Sena), and community events.
- **No AI answers, AI hints, or AI-generated explanations** appear inside this tab.
- All content is user-driven: posts, comments, shortcuts, votes, and peer moderation.

---

### A. SOS Board → **Sankat Mochan**
A doubt-rescue system for questions users are stuck on.

#### Core flow
1. User answers a question incorrectly.
2. If AI explanation is unclear (or AI tokens are exhausted), user taps **Ask Sankat Mochan**.
3. User chooses destination:
   - **Global Sankat Feed** (all users), or
   - **Sena-only Sankat** (clan/private help).
4. Helpers submit:
   - short text explanation,
   - step-by-step logic,
   - “10-second shortcut” (Divyastra),
   - optional handwritten image upload.
5. Community upvotes/downvotes and marks “worked for me”.
6. Top-rated answer for that exact question becomes part of the **Shortcut Vault (Divyastra Vault)**.

#### Guardrails
- One active Sankat post per user per question every X hours (anti-spam).
- Auto-hide low-quality/abusive responses using moderation rules.
- Minimum account age/attempt threshold to post globally.

---

### B. Shortcut Vault → **Divyastra Vault**
A persistent repository of best community shortcuts per question.

#### What users see on each question
- In Community tab context: **no AI explanation block**.
- **Top Divyastra (community #1)**.
- Other ranked approaches.
- “When to use / when not to use” warning (critical for shortcut misuse).

#### Data logic
- Rank score = weighted signal from upvotes, success confirmations, recency, and solver reputation.
- If top answer quality drops (reports/downvotes), next best is promoted.

---

### C. Prestige System → **Insight Points + Warrior Ranks**
Status incentives to grow contribution quality.

#### Reputation mechanics
- +Insight Points for:
  - upvotes received,
  - accepted/top answer wins,
  - consistent helpfulness (weekly streak).
- Negative adjustments for:
  - reported wrong/misleading tricks,
  - spam/low-value behavior.

#### Titles (finalized progression)
- **Yoddha** → **Scholar** → **Ekalavya** → **Karna** → **Arjuna** → **Dronacharya**

#### Visual hierarchy
- Rank badge on profile + answer cards.
- **Dronacharya** answers show special gold treatment.
- Weekly “Rising Mentor” and all-time “Hall of Mentors”.

#### Leaderboards
- **Weekly Top 10** (fresh motivation).
- **All-Time Top 10** (legacy prestige).

---

### D. Clan System → **Sena Ecosystem**
Small groups for accountability, mentorship, and competition.

#### Clan basics
- Sena size cap: 50 members.
- Roles: Founder, Co-Lead, Mentor, Member.
- Clan-only Sankat channel for private doubt resolution.

#### Clan progression
- Clan XP from participation, solved Sankats, and gauntlet performance.
- Unlockables: themes, banners, profile frames, clan emblems.

---

### E. Daily Gauntlet → **Chakravyuh**
A nightly challenge question for all users and all Senas.

#### Gameplay
- Drops at midnight.
- 2-minute solve window per user.
- Scoring for both accuracy and speed.

#### Clan Wars
- Daily clan score = weighted average of member accuracy + time + participation threshold.
- Weekly clan leaderboard with divisions (to avoid one mega-clan dominating forever).

#### Streak perks
- 7-day qualified participation streak grants temporary boost:
  - XP bonus,
  - extra cosmetic unlock tokens,
  - optional clan-only perks.

---

### F. Profile Upgrades (requested additions)

#### 1) Profile photo upload
- User can upload, crop, and update account photo.
- Moderation checks + file size/type constraints.

#### 2) Achievement showcase
A dedicated section in profile for:
- exams cleared,
- ranks/scores,
- verified milestones,
- notable platform achievements.

Optional: “verified” tag for admin-approved claims to prevent fake flexing.

---

## 2) Key Risks in Current Idea + Practical Fixes

### Risk 1: Wrong shortcuts spreading fast
**Fix:** confidence labels + peer verification + “worked/not worked” signals + mod review queue.

### Risk 2: Upvote farming / friend-circle boosting
**Fix:**
- anti-collusion checks,
- weighted reputation voting,
- diminishing returns from repeated same-cluster voters.

### Risk 3: New users feel overshadowed by elite ranks
**Fix:**
- rookie-only weekly board,
- category-specific recognition (Quant Hero, English Mentor, etc.),
- “best first contribution” highlights.

### Risk 4: Clan imbalance (big/old clans dominate)
**Fix:**
- division tiers,
- season resets,
- participation-normalized scoring instead of pure totals.

### Risk 5: Feature complexity overload
**Fix:** rollout in 3 phases:
1. Sankat + Divyastra + basic Insight Points,
2. Warrior ranks + leaderboards + profile achievements,
3. Sena wars + Chakravyuh clan mode + advanced anti-abuse.

---

## 3) Finalized Naming Layer (Theme-Integrated)

- SOS Board: **Sankat Mochan**
- Shortcut Vault: **Divyastra Vault**
- Daily Gauntlet: **Chakravyuh**
- Clan: **Sena**
- Reputation: **Insight Points**
- Title Ladder: **Warrior Ranks**

This keeps your mythic storyline strong while still being understandable in modern product UX.

---

## 4) Final Build Scope (No-code Product Definition)

### MVP (Phase 1 — must build first)
0. Create a new **Community tab** as a separate AI-free experience.
1. Ask Sankat button on failed/unclear questions.
2. Global + Sena-targeted Sankat posts.
3. Community answers with upvotes.
4. Divyastra Vault with top community trick attached per question.
5. Basic Insight Points and simple contributor leaderboard.

### Phase 2
1. Full Warrior Rank progression and visual badges.
2. Profile photo upload.
3. Achievement showcase section.
4. Weekly + all-time polished leaderboards.

### Phase 3
1. Chakravyuh daily event.
2. Clan wars scoring + global clan leaderboard.
3. Clan streak perks and advanced cosmetics.
4. Robust anti-abuse/reputation integrity system.

---

## 5) Suggested Extra Ideas (High impact, low-to-medium effort)

1. **“Use this Divyastra now” quick-apply mode**
   - Shows the shortcut inline on similar problems.
2. **Mentor Office Hours**
   - Top-ranked users host timed live doubt windows.
3. **Post-solve reflection prompt**
   - “What trick did you learn?” to improve memory retention.
4. **Exam-mode lock**
   - Simulated test mode with shortcuts hidden to avoid dependence.
5. **Trust score per shortcut**
   - “High confidence / Mixed / Experimental”.

---

## Final One-Line Product Statement

**SSC Smart Tracker becomes a gamified, community-powered exam battlefield where users break the Chakravyuh, collect Divyastras, rise through Warrior Ranks, and lead their Senas to victory through real peer learning.**
