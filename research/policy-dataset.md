# Ad Policy Pre-Checker: Research Dataset (v0)

Compiled 2026-11-19. Confidence labels: **[META]** = read on Meta's own policy page; **[ASCI/CCPA]** = Indian regulator material via secondary summary; **[BLOG]** = third-party blog, treat as illustrative until tested against real rejections.

## A. Rules (what the checker should detect)

### R1. Personal attributes: "you" + a trait [META]
Source: transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/
- Ads may not assert or imply a viewer's (or family's) personal attributes: race/ethnicity, religion, age, sexual orientation, gender identity, physical or mental health, disability, vulnerable financial status, voting status, union membership, criminal record, name.
- "You/your" is fine when it does not reference an attribute. Passing references to age groups ("a service for teens") and broad attributes (place of residence) are fine.
- Pattern: second person + attribute word, or a question that presumes the trait.
- Fix: make the product the subject, not the viewer.

| Flag | OK |
|---|---|
| "Are you 18 years old?" | "A service for teens" |
| "Ready to upgrade your skin to look younger?" | "Our new creams fight wrinkles" |
| "Do you have diabetes?" | "New diabetes treatment available" |
| "Depression getting you down? Get help now." | "Depression counseling" |
| "Are you bankrupt? Check out our services." | (reword around the service, not the viewer's status) |
| "Meet other seniors" | "Meet seniors" |
| "Are you Christian?" | "Date Christian singles!" |
| "Billy Taylor, get this t-shirt with your name!" | "We print customizable t-shirts with your name" |

Note: Meta's page contradicts itself on the cancer-treatment example (listed as both allowed and not). Don't encode it.

### R2. Health and wellness [META]
Source: transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness/
- Weight-loss, dietary and cosmetic-procedure ads must target 18+.
- No body-shaming, no negative self-perception, no implying a "perfect body".
- No timeframe promises without qualifiers ("lose X in 7 days").
- No claims to cure incurable or terminal conditions (diabetes, cancer, HIV). Symptom-management wording is allowed.
- No weight-loss side-by-side before/after. No fat-pinching close-ups.
- No skin whitening/bleaching that permanently changes colour.

### R3. Financial products [META]
Source: transparency.meta.com/policies/ad-standards/restricted-goods-services/financial-services/
- Prohibited: payday loans, paycheck advances, bail bonds, loans of 90 days or less, binary options, CFDs, ICOs, penny auctions.
- Credit, loans and insurance: 18+ targeting, required disclosures, no requests for personal or financial data inside the ad, licensing where required.
- Crypto needs prior written permission. Meta's page lists no India licence.
- Prohibited Commercial Practices overview names: deceptive pricing, unauthorised endorsements, guaranteed investment returns. [META, overview only; the page body was truncated in my fetch]

### R4. Income and business-opportunity claims [BLOG, needs real-case validation]
Sources: enrichlabs.ai/blog/meta-ads-policy-guide-2026, stackmatix.com/blog/meta-ads-income-claims-policy
- Flag: specific earnings ("$10k/month"), guarantees ("guaranteed clients in 7 days"), "passive income", "financial freedom", "quit your job", income or payout screenshots, luxury-car or cash lifestyle imagery.
- Fix pattern: describe what the product does, or frame results as a named client case study rather than a promise to the viewer.

### R5. Landing page must match [BLOG]
- Meta reviews the whole path. Pop-ups, missing privacy policy, and non-compliant claims on the landing page can cause rejection.
- v2 feature: fetch and check the landing page.

### R6. India education and coaching claims [ASCI/CCPA, relevant to Ads Mentor-style advertisers]
Sources: ASCI education guidelines (ascionline.in), governancenow.com, khaitanco.com summaries
- Ads must not imply enrolment guarantees a job, rank, admission, promotion or salary increase unless substantiated.
- "100% placement / 100% job assistance" style claims are specifically restricted.
- Past-placement claims need the batch size and a "past record is no guarantee" disclaimer.
- CCPA 2024 coaching guidelines add rules on success rates, guaranteed outcomes and disclaimer size/placement.
- This is outside Meta's rules but affects the same ads. Treat as a separate "regulator risk" layer, not "will Meta reject".

## B. Rewrite pairs (few-shot examples for the LLM layer)

| # | Category | Risky | Safer | Source |
|---|---|---|---|---|
| 1 | Health | "Are you suffering from an autoimmune disease?" | "I remember when I was first diagnosed with an autoimmune disease." | Copyhackers [BLOG] |
| 2 | Health | "Do you have diabetes?" | "Diabetes care clinic offering glucose check appointments" | Relevant Audience [BLOG] |
| 3 | Mental health | "Are you suffering from depression?" | "Online counselling sessions with licensed psychologists" | Relevant Audience [BLOG] |
| 4 | Weight | "How do you drop that hormonal weight" | "How to drop that hormonal weight" | Copyhackers [BLOG] |
| 5 | Weight | "Slim in 7 days" | "Weight management program with a stated typical timeline; results vary" | Relevant Audience [BLOG] |
| 6 | Weight | "So fat nobody looks at you" | "Weight management program built around daily meal plans" | Relevant Audience [BLOG] |
| 7 | Skin | "How to get clear skin in 30 days" | "Join our 5-day (or 30-day) clear skin challenge" | Copyhackers [BLOG] |
| 8 | Finance | "Drowning in debt?" | "Structured debt-repayment planning for household budgets" | Relevant Audience [BLOG] |
| 9 | Finance | "Blacklisted by the credit bureau?" | "Debt advisory services with flexible repayment options" | Relevant Audience [BLOG] |
| 10 | Age | "People in their 40s like you should start caring for their skin" | "Skincare formulated for mature skin" | Relevant Audience [BLOG] |
| 11 | Income | "how you can generate 7K a month in recurring revenue" | "took their business from barely anything to 7K a month in recurring revenue" (client case study) | Copyhackers [BLOG] |
| 12 | Income | "building a seven-figure law practice" | "how Amy quadrupled her revenue the first year" | Copyhackers [BLOG] |
| 13 | Income | "Make $10k/month with our AI" | "AI teammates draft ads, SEO and reports so a lean team ships daily" | Enrich Labs [BLOG] |
| 14 | Income | "Guaranteed clients in 7 days" | "See how agencies use agents on client accounts. Start a 3-day trial" | Enrich Labs [BLOG] |
| 15 | Income | "No experience required, passive income" | "You still approve. The agent drafts." | Enrich Labs [BLOG] |
| 16 | Finance | "how to build your first six-figure stock portfolio" | "five steps to place your first stock order" | Copyhackers [BLOG] |
| 17 | Pain | "Does your neck feel like this" | (soften; remove direct "you" + condition) | Copyhackers [BLOG] |

## C. Gaps (be honest about what I could not get)
1. **No real rejection screenshots.** Every pair above is a blog's illustration, not a logged Meta decision. The classifier's accuracy is unproven until tested on real rejections.
2. **Prohibited Commercial Practices page** came back truncated. Fetch it again in a browser to capture the full list (fake testimonials, misleading pricing, etc.).
3. **Meta's Fraud, Scams and Deceptive Practices** and **Employment/Education special-ad-category** pages were not read.
4. **Blog claims about enforcement** (e.g. "you" in any question always rejected) conflict with Meta's own wording, which allows "you" when no attribute is referenced. Rules above follow Meta's text where the two differ.
5. **Indian-language and Hinglish copy** is untested. Real Indian rejections will matter most.
6. ASCI/CCPA points come from secondary summaries; verify against the primary PDFs before shipping any compliance claim.

## D. Next data to collect (best source: your students)
- 20-50 real rejected ads with Meta's stated reason, plus approved ads from the same accounts.
- Hinglish/Hindi examples.
- Account-restriction stories and which copy triggered them.
