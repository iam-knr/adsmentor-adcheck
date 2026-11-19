// Ad policy pre-checker: rules engine (heuristic, not a guarantee of approval)
(function (root) {
  const YOU = String.raw`(?:you|your|you're|youre|yours|u|ur|aap|aapko|aapka|aapki|aapke|tum|tumhe|tumhara|tera|tujhe|आप|आपको|आपका|आपकी|तुम)`;

  const ATTR = {
    health: {
      label: "health condition",
      words: String.raw`diabet\w*|sugar\s*(?:level|problem)|cancer|hiv|asthma|arthritis|thyroid|pcos|pcod|migraine|back\s*pain|neck\s*pain|knee\s*pain|joint\s*pain|infertil\w*|erectile|acne|pimples?|dandruff|hair\s*(?:loss|fall)|bald\w*|obes\w*|blood\s*pressure|bp\b|cholesterol|disease|disorder|illness|suffer\w*|pain|(?:neck|back|knee|shoulder|joint)s?\s*(?:hurt|ache|feel)\w*`,
    },
    mental: {
      label: "mental health",
      words: String.raw`depress\w*|anxi\w*|stress\w*|bipolar|ptsd|adhd|suicid\w*|lonely|panic|insomnia`,
    },
    money: {
      label: "financial status",
      words: String.raw`debt\w*|bankrupt\w*|broke|poor|blacklist\w*|defaulter|cibil|credit\s*score|loan\s*rejected|emi\s*burden|drowning\s*in|in\s*financial\s*trouble`,
    },
    body: {
      label: "body / appearance",
      words: String.raw`fat|overweight|belly|tummy|love\s*handles|thick\s*thighs|flabby|ugly|hormonal\s*weight|belly\s*fat|extra\s*weight|weight|dark\s*skin|acne\s*scars?|pigmentation|dull\s*skin|oily\s*skin|skin|dark\s*circles|wrinkl\w*|pot\s*belly|weight\s*problem`,
    },
    identity: {
      label: "identity (religion, orientation, etc.)",
      words: String.raw`gay|lesbian|bisexual|transgender|christian|muslim|hindu|sikh|buddhist|jewish|atheist|single\b|divorced|unemployed|convicted|felon`,
    },
    age: {
      label: "age",
      words: String.raw`\d{2}\s*(?:years?\s*old|yrs?)|in\s*(?:your|ur)\s*\d0s|\b\d0s\b|senior\s*citizens?|look(?:ing)?\s+younger|too\s*old|middle[-\s]*aged`,
    },
  };

  const rules = [];

  // R1: personal attributes (you + trait)
  for (const [key, a] of Object.entries(ATTR)) {
    rules.push({
      id: "PA-" + key,
      severity: "high",
      policy: "Privacy Violations and Personal Attributes",
      source: "META",
      title: `Implies a viewer's ${a.label}`,
      // you ... attribute  OR  attribute ... you, within 60 chars
      re: new RegExp(
        String.raw`\b${YOU}\b[^.!?\n]{0,60}?\b(?:${a.words})|\b(?:${a.words})\b[^.!?\n]{0,60}?\b${YOU}\b`,
        "gi"
      ),
      why: `Meta bans ads that assert or imply a trait about the person seeing them. Speaking to "you" about a ${a.label} says "we know this about you".`,
      fix: "Make the product or service the subject, not the viewer. Describe what you offer, or tell it in the first person or as a customer story.",
      example: {
        health: ['"Do you have diabetes?"', '"Diabetes care clinic offering glucose check appointments"'],
        mental: ['"Are you suffering from depression?"', '"Online counselling sessions with licensed psychologists"'],
        money: ['"Drowning in debt?"', '"Structured debt-repayment planning for household budgets"'],
        body: ['"You need to lose weight"', '"Weight management program built around daily meal plans"'],
        identity: ['"Meet other seniors"', '"Meet seniors"'],
        age: ['"People in their 40s like you should start caring for their skin"', '"Skincare formulated for mature skin"'],
      }[key],
    });
  }

  rules.push(

    {
      id: "PA-implied",
      severity: "medium",
      policy: "Privacy Violations and Personal Attributes (implied)",
      source: "BLOG",
      title: "Question that presumes a negative condition",
      test(text) {
        const hits = [];
        const re = /(?:^|[.!?\n]\s*)((?:[^.!?\n]{0,40}?\b(?:drowning\s+in|struggling\s+with|tired\s+of|sick\s+of|suffering\s+from|blacklisted|bankrupt|in\s+debt|stuck\s+with|worried\s+about)\b[^.!?\n]{0,50})\?)/gi;
        let m;
        while ((m = re.exec(text))) hits.push({ index: m.index + m[0].indexOf(m[1]), text: m[1] });
        return hits;
      },
      why: "Even without the word 'you', a question like this implies the viewer is in that situation. Several guides report these get flagged under personal attributes.",
      fix: "Turn the question into a statement about the service.",
      example: ['"Drowning in debt?"', '"Structured debt-repayment planning for household budgets"'],
    },
    {
      id: "RES-timeframe",
      severity: "medium",
      policy: "Health and Wellness / unqualified timeframe results",
      source: "BLOG",
      title: "Result promised within a timeframe",
      re: /\b(?:get|have|achieve|see|reach)\b[^.!?\n]{0,25}?\b(?:clear|glowing|fair|flawless|thin|slim|fit|flat|six[-\s]*pack|healthy)\b[^.!?\n]{0,20}?\bin\s+(?:just\s+)?\d+\s*(?:days?|weeks?)\b/gi,
      why: "Promised results within a fixed time, without qualifiers, are treated as exaggerated health or beauty claims.",
      fix: 'Reframe as a challenge or program ("30-day clear skin challenge") or state a typical timeline with "results vary".',
      example: ['"How to get clear skin in 30 days"', '"Join our 5-day (or 30-day) clear skin challenge"'],
    },
    {
      id: "WL-timeframe",
      severity: "high",
      policy: "Health and Wellness",
      source: "META",
      title: "Weight or result promise with a timeframe",
      re: /\b(?:lose|loose|drop|burn|slim|shed|reduce|gain|fair|whiten\w*|glow\w*)\b[^.!?\n]{0,30}?\b\d+\s*(?:kg|kgs|lbs?|pounds?|inches|cm)\b|\b(?:in|within)\s+(?:just\s+)?\d+\s*(?:days?|weeks?|hrs?|hours?)\b[^.!?\n]{0,25}?\b(?:slim|lose|results?|fair|clear|cure|thin|flat)\w*|\bslim\s+in\s+\d+\s*days?\b/gi,
      why: "Promised results inside a set time, without qualifiers, are treated as exaggerated health claims.",
      fix: 'Describe the program, not a guaranteed result. If you show a timeline, state it as typical and add "results vary".',
      example: ['"Slim in 7 days"', '"Weight management program with a stated typical timeline; results vary"'],
    },
    {
      id: "HW-cure",
      severity: "high",
      policy: "Health and Wellness",
      source: "META",
      title: "Cure or permanence claim",
      re: /\b(?:cure[sd]?|cured\s+for\s+good|reverse[sd]?|eliminate[sd]?|100%\s*cure|permanent(?:ly)?|forever|miracle)\b[^.!?\n]{0,35}?\b(?:diabet\w*|cancer|hiv|aids|arthritis|thyroid|pcos|sugar|bp|blood\s*pressure|skin|fair\w*|whit\w*|hair\s*fall|baldness)\b|\bpermanent(?:ly)?\s+(?:whit\w+|fair\w*|bright\w*)\b|\bcure[sd]?\s+for\s+good\b/gi,
      why: "Claims to cure or permanently fix incurable conditions, or permanently change skin colour, are prohibited.",
      fix: "Use symptom-management wording, and point to a doctor. Don't claim cures or permanence.",
      example: ['"cured for good"', '"Helps manage symptoms; discuss treatment with a doctor"'],
    },
    {
      id: "BODY-shame",
      severity: "high",
      policy: "Health and Wellness",
      source: "META",
      title: "Body-shaming or negative self-perception",
      re: /\b(?:so\s+fat|too\s+fat|nobody\s+(?:looks|will\s+look)|ugly|disgusting|embarrass\w*\s+(?:belly|body|fat)|hate\s+your\s+body|unattractive|loser)\b|\bfat[-\s]*shame\w*\b/gi,
      why: "Meta prohibits ads that attack appearance or create negative self-perception when selling diet, weight-loss or cosmetic products.",
      fix: "Lead with a positive, neutral benefit (energy, routine, meal plans). Never imply the viewer's body is a problem.",
      example: ['"So fat nobody looks at you"', '"Weight management program built around daily meal plans"'],
    },
    {
      id: "BA-photos",
      severity: "medium",
      policy: "Health and Wellness",
      source: "META",
      title: "Before/after transformation wording",
      re: /\b(?:before\s*(?:\/|&|and|-|\+)\s*after|transformation\s+(?:photos?|pics?|images?)|my\s+transformation|body\s+transformation)\b/gi,
      why: "Side-by-side weight-loss transformation images are prohibited. Check your image as well as the copy.",
      fix: "Show the product in use or a neutral lifestyle image. Avoid body comparison shots.",
      example: null,
    },
    {
      id: "INC-amount",
      severity: "high",
      policy: "Misleading claims / income and earnings claims",
      source: "BLOG",
      title: "Specific earnings claim",
      re: /(?:[$₹]|rs\.?|inr)\s?\d[\d,.]*\s?(?:k|l|lakh|lakhs|lpa|cr|crore|m|million)?\s*(?:\/|per|a|each|every)?\s*(?:month|mo|day|week|year|hour)?|\b\d[\d,.]*\s?(?:k|l|lakh|lakhs|crore|cr)\s*(?:\/|per|a|each)\s*(?:month|day|week)\b|\b(?:six|seven|8|eight)[-\s]?figure\b|\blakhs?\s*(?:per|a|every)\s*month\b/gi,
      requireNear: /\b(?:earn\w*|make|making|income|revenue|salary|profit\w*|generate\w*|get\s+paid|figure|per\s+month\s+income|kama\w*|kamai|dollars?\s+mein)\b/i,
      skipAfter: /^\s*(?:[-–—]|to)?\s*\d*[\d,.]*\s*(?:lpa|lakhs?\s+per\s+annum|upfront|off\b|emi|fee|only)/i,
      why: "Specific, unproven earnings numbers pointed at the viewer are treated as misleading income claims.",
      fix: "Describe what the product does. If you show results, frame them as a named customer's case, not a promise to the viewer.",
      example: ['"how you can generate 7K a month"', '"took their business from barely anything to 7K a month in recurring revenue" (client case study)'],
    },
    {
      id: "INC-phrases",
      severity: "high",
      policy: "Misleading claims / income and earnings claims",
      source: "BLOG",
      title: "Get-rich-quick or passive-income language",
      re: /\b(?:passive\s+income|financial\s+freedom|get\s+rich|quit\s+your\s+(?:9\s*[-to]*\s*5|job)|be\s+your\s+own\s+boss|work\s+from\s+home\s+and\s+earn|earn\s+(?:while|money\s+from)\s+(?:you\s+)?sleep\w*|no\s+experience\s+(?:required|needed)|easy\s+money|quick\s+money|double\s+your\s+money|ghar\s+baithe\s+kamao|kamao\s+lakhs)\b/gi,
      why: "Opportunity-plus-earnings framing is the classic pattern for rejection under misleading and income claims.",
      fix: "Describe the skill, tool or curriculum instead of the lifestyle or earnings outcome.",
      example: ['"No experience required, passive income"', '"You still approve. The agent drafts."'],
    },
    {
      id: "GUAR",
      severity: "high",
      policy: "Misleading claims / guaranteed outcomes",
      source: "META",
      title: "Guaranteed result",
      re: /\b(?:guarantee[sd]?|assured|100%\s*(?:guarantee|sure|safe|result\w*|success)|risk[-\s]*free|no\s+risk|sure[-\s]*shot|surefire)\b[^.!?\n]{0,30}?\b(?:returns?|profit\w*|income|clients?|leads?|sales?|results?|job|placement|salary|admission|rank|success|growth|roi|money)\b|\b(?:guaranteed|assured)\s+(?:returns?|profit\w*|income|job|placement|results?)\b/gi,
      why: "Guarantees of income, returns or results can't be substantiated. Meta names guaranteed investment returns as a prohibited practice.",
      fix: "Remove the guarantee. Say what you provide (training, tools, support) and, where relevant, add a clear disclaimer.",
      example: ['"Guaranteed clients in 7 days"', '"See how agencies use agents on client accounts. Start a 3-day trial"'],
    },
    {
      id: "FIN-prohibited",
      severity: "high",
      policy: "Financial and Insurance Products and Services",
      source: "META",
      title: "Prohibited financial product",
      re: /\b(?:payday\s+loans?|paycheck\s+advance|bail\s+bonds?|binary\s+options?|\bcfds?\b|initial\s+coin\s+offering|\bico\b|penny\s+auction|instant\s+loan[^.!?\n]{0,25}(?:no\s+(?:documents?|docs|kyc|cibil)))\b|\bno\s+(?:credit\s+check|cibil\s+check|documents?\s+(?:needed|required))\b/gi,
      why: "These products are banned, or are restricted and can't be advertised with 'no checks' framing.",
      fix: "Longer-term loans (over 90 days) may be allowed with 18+ targeting, required disclosures and licensing. Remove 'no check' wording.",
      example: null,
    },
    {
      id: "FIN-returns",
      severity: "high",
      policy: "Financial products / guaranteed investment returns",
      source: "META",
      title: "Investment returns promise",
      re: /\b(?:\d{2,3}\s*%\s*(?:returns?|profit|monthly|per\s*month|guaranteed)|double\s+your\s+(?:money|investment)|fixed\s+returns?\s+(?:of|guaranteed)|multibagger|risk[-\s]*free\s+(?:returns?|investment)|sure\s+profit)\b/gi,
      why: "Guaranteed or unrealistically high investment returns are named as prohibited.",
      fix: "Teach or describe the product. Don't quote returns, and add the regulator-required risk disclaimers.",
      example: ['"how to build your first six-figure stock portfolio"', '"five steps to place your first stock order"'],
    },
    {
      id: "FIN-crypto",
      severity: "medium",
      policy: "Cryptocurrency Products and Services",
      source: "META",
      title: "Crypto promotion needs prior permission",
      re: /\b(?:crypto(?:currency)?|bitcoin|btc|ethereum|nft|token\s+sale|altcoins?|forex)\b/gi,
      why: "Crypto products need written permission from Meta and a recognised licence. Meta's page lists none for India.",
      fix: "Check eligibility before spending. Educational content may still be reviewed as promotion.",
      example: null,
    },
    {
      id: "EDU-placement",
      severity: "high",
      policy: "ASCI / CCPA: education and coaching claims",
      source: "ASCI",
      title: "Job or placement guarantee (India regulator risk)",
      re: /\b(?:100\s*%\s*(?:placement|job|assured|guarantee\w*|success|selection|result\w*)|(?:guaranteed|assured|promised)\s+(?:job|placement|salary|package|internship|selection|admission|rank)|job\s+guarantee|placement\s+guarantee|(?:\d+\s*(?:lpa|lakh)\s*(?:package|salary|job))|salary\s+(?:hike|jump)\s+(?:of\s+)?\d+\s*%?|get\s+(?:a\s+)?(?:job|placed)\s+in\s+\d+\s*(?:days?|weeks?|months?))\b/gi,
      why: "ASCI bars implying enrolment guarantees a job, rank, admission or salary rise unless substantiated. '100%' on non-quantifiable claims is restricted. CCPA 2024 coaching rules add more. This is regulator risk on top of Meta review.",
      fix: "State actual, verifiable numbers (batch size, how many placed, period) and add a 'past record is no guarantee of future outcomes' disclaimer, or drop the claim.",
      example: ['"100% placement"', '"Our 2025 batch: 42 of 60 students placed in related roles. Past record is no guarantee of future outcomes."'],
    },
    {
      id: "EDU-salary",
      severity: "medium",
      policy: "ASCI / CCPA: placement and salary claims",
      source: "ASCI",
      title: "Placement or salary figures need proof",
      re: /\b(?:placements?|placed|hired|salar(?:y|ies)|packages?|ctc)\b[^.!?\n]{0,40}?\d[\d,.]*\s*(?:[-–—]\s*\d[\d,.]*\s*)?(?:lpa|lakhs?\b|k\b|per\s+(?:month|annum))|\b(?:salary|salaries|package|ctc)\b\s*[:\-]?\s*\n\s*[₹$]?\s?\d[\d,.]*|\b\d[\d,.]*\s*(?:[-–—]\s*\d[\d,.]*\s*)?lpa\b/gi,
      why: "Salary or package figures used to sell a course are treated as outcome claims. ASCI expects substantiation (how many students, which batch, what period) and a disclaimer that past placements don't guarantee future results.",
      fix: "State the batch size and how many were placed, give the date range, and add 'Past record is no guarantee of future outcomes'. Avoid ranges that show only the best results.",
      example: ['"Recent placements at ₹5 - 15 LPA"', '"2025 batch: 42 of 60 students placed, salaries ₹3.2–9 LPA (median ₹4.8 LPA). Past record is no guarantee of future outcomes."'],
    },
    {
      id: "EDU-payafter",
      severity: "medium",
      policy: "ASCI / CCPA: guaranteed-outcome implications",
      source: "ASCI",
      title: "Fee tied to getting a job",
      re: /\bpay\s*(?:only\s*)?after\s*(?:placement|job|getting\s+(?:a\s+)?job|you\s+(?:get|are)\s+(?:placed|hired))\b|\bpay\s*later\s*(?:after|once)\s*placed\b/gi,
      why: "Fee models tied to placement imply a job outcome. Regulators read this as an implied guarantee unless the terms and conditions are clearly disclosed.",
      fix: "Spell out the conditions in the ad or point clearly to them (eligibility, what counts as placement, what happens if not placed) and avoid wording that sounds like a promise.",
      example: null,
    },
    {
      id: "GOV-cert",
      severity: "medium",
      policy: "Prohibited commercial practices / unauthorised endorsement",
      source: "META",
      title: "Government approval or certification claim",
      re: /\b(?:govt\.?|government)(?:\s+of\s+india)?[-\s]*(?:certified|approved|recognis?ed|authori[sz]ed|backed)\b|\b(?:approved|certified|recognis?ed|authori[sz]ed)\s+by\s+(?:the\s+)?(?:govt\.?|government|ministry|meity|aicte|ugc|nsdc)\b/gi,
      why: "Claims of government approval or certification can be treated as unauthorised endorsement or misleading unless you can show the certificate.",
      fix: "Name the exact body and certificate (for example the scheme, number and date), or remove the claim. A registration such as Udyam/MSME is not an endorsement of your course.",
      example: null,
    },
    {
      id: "SUPER",
      severity: "low",
      policy: "ASCI: unsubstantiated superlatives",
      source: "ASCI",
      title: "Unsubstantiated superlative",
      re: /\b(?:no\.?\s*1|#\s*1|number\s*(?:one|1)|india'?s\s+(?:best|no\.?\s*1|largest|top)|best\s+in\s+(?:india|the\s+world)|world'?s\s+best)\b/gi,
      why: "Rankings and 'best' claims need proof (survey, date, source) under ASCI rules.",
      fix: "Add the source and date, or use a specific, provable claim.",
      example: null,
    },
    {
      id: "CLICKBAIT",
      severity: "medium",
      policy: "Misleading / clickbait content",
      source: "BLOG",
      title: "Clickbait or sensational wording",
      re: /\b(?:doctors?\s+hate|one\s+weird\s+trick|you\s+won'?t\s+believe|shocking\s+(?:truth|secret)|they\s+don'?t\s+want\s+you\s+to\s+know|secret\s+(?:formula|method|trick)|banned\s+by)\b/gi,
      why: "Sensational, misleading hooks are scored down in review, especially in health and money categories.",
      fix: "State the real benefit plainly.",
      example: null,
    },
    {
      id: "SPAM-format",
      severity: "low",
      policy: "Spammy formatting",
      source: "BLOG",
      title: "Excessive punctuation or capitals",
      test(text) {
        const hits = [];
        const punct = /[!?]{3,}/g;
        let m;
        while ((m = punct.exec(text))) hits.push({ index: m.index, text: m[0] });
        const caps = /\b[A-Z]{4,}(?:\s+[A-Z]{3,}){2,}\b/g;
        while ((m = caps.exec(text))) hits.push({ index: m.index, text: m[0] });
        return hits;
      },
      why: "Shouting and repeated punctuation look like spam to reviewers and can lower approval odds.",
      fix: "Use normal sentence case and at most one exclamation mark.",
      example: null,
    }
  );

  const WEIGHT = { high: 3, medium: 2, low: 1 };

  function run(text) {
    const findings = [];
    for (const r of rules) {
      let matches = [];
      if (r.test) {
        matches = r.test(text);
      } else {
        const re = new RegExp(r.re.source, r.re.flags);
        let m;
        while ((m = re.exec(text))) {
          if (m[0].length === 0) { re.lastIndex++; continue; }
          if (r.skipAfter && r.skipAfter.test(text.slice(m.index + m[0].length, m.index + m[0].length + 30))) continue;
          if (r.requireNear) {
            const around = text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40);
            if (!r.requireNear.test(around)) continue;
          }
          matches.push({ index: m.index, text: m[0].trim() });
        }
      }
      if (matches.length) {
        findings.push({
          id: r.id, severity: r.severity, policy: r.policy, source: r.source,
          title: r.title, why: r.why, fix: r.fix, example: r.example, matches,
        });
      }
    }
    // Income figures framed as someone else's result are lower risk (still must be true)
    const inc = findings.find((f) => f.id === "INC-amount");
    if (inc) {
      const soft = [], hard = [];
      for (const m of inc.matches) {
        const ctx = text.slice(Math.max(0, m.index - 80), m.index + m.text.length + 40);
        const isCase = /\b(?:their|his|her|client|clients|student|students|customer|customers|case\s+study|took)\b/i.test(ctx) &&
          !new RegExp("\\b" + YOU + "\\b", "i").test(ctx);
        (isCase ? soft : hard).push(m);
      }
      if (soft.length) {
        findings.push({
          ...inc, id: "INC-case", severity: "medium", matches: soft,
          title: "Income figure framed as a customer result",
          why: "Framed as someone else's real result, this is the safer way to show numbers. It is still reviewed as an earnings claim, so it must be true and provable.",
          fix: "Keep it tied to a named, real customer, add a disclaimer such as 'results vary', and keep proof on file.",
        });
      }
      if (hard.length) inc.matches = hard; else findings.splice(findings.indexOf(inc), 1);
    }
    // De-duplicate overlapping personal-attribute hits: keep one rule per span
    const seen = [];
    const out = [];
    for (const f of findings.sort((a, b) => WEIGHT[b.severity] - WEIGHT[a.severity])) {
      const keep = f.matches.filter(
        (m) => !seen.some((s) => m.index < s.end && m.index + m.text.length > s.start && f.id.startsWith("PA-") && s.pa)
      );
      if (!keep.length) continue;
      keep.forEach((m) => seen.push({ start: m.index, end: m.index + m.text.length, pa: f.id.startsWith("PA-") }));
      out.push({ ...f, matches: keep });
    }
    const score = out.reduce((s, f) => s + WEIGHT[f.severity], 0);
    const hasHigh = out.some((f) => f.severity === "high");
    const verdict = hasHigh ? "high" : out.some((f) => f.severity === "medium") ? "review" : out.length ? "low" : "clean";
    return { verdict, score, findings: out };
  }

  const api = { run, rules };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AdChecker = api;
})(typeof window !== "undefined" ? window : globalThis);
