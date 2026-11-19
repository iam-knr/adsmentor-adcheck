# UI audit: landing page and side panel (2026-11-19)

Method: rendered both at desktop (1280px) and phone (390-500px) widths in headless Chrome, checked structure with scripts (heading order, image alt text, link targets) and read every screen.

## Findings and what changed

| # | Area | Finding | Fix |
|---|---|---|---|
| 1 | Panel | Body text was 16px, too large for a ~400px panel; felt heavy and unpolished | Base 14px, tighter spacing scale, consistent 12px radius |
| 2 | Panel | Primary button was bright white in dark mode and ignored the brand | Brand yellow primary with dark text, soft glow; secondary buttons outlined |
| 3 | Panel | Header scrolled away, no persistent identity | Sticky blurred header with logo and "by Ads Mentor" |
| 4 | Panel | Verdict card was plain text on a tint | Status dot with halo, stronger title, clearer sub-line |
| 5 | Panel | Finding cards repeated the same explanation in three places | Hover card carries the full reason; cards stay compact, with a distinct "Safer direction" block |
| 6 | Panel | Model dropdown label was truncated and read as a price tier ("Free"/"Paid") | Short labels ("Gemma 4 31B · OpenRouter"), no price wording; model IDs shown as friendly names |
| 7 | Panel | Settings had no path to getting a key | Setup guide and "Get an OpenRouter key" links, plus a privacy note |
| 8 | Panel | Checkbox used the browser default blue | Brand accent colour |
| 9 | Site | Hero screenshot was very tall and cut off mid-sentence | Cropped with a soft fade, glow behind it |
| 10 | Site | Fact row wrapped unevenly on mobile | Pill chips that wrap cleanly |
| 11 | Site | Nav had no primary call to action | Yellow "Install" button, plus a Setup guide link |
| 12 | Site | Three screenshots of very different heights looked uneven | Capped height with fade; short ones shown in full |
| 13 | Site | Inline CSS duplicated across pages | One shared stylesheet (`docs/assets/site.css`) used by the landing page and the guide |
| 14 | Site | No setup help for Deep check | New OpenRouter setup guide page |
| 15 | Both | Wording described some models as "free", which undersells the product | Removed from the panel, site and guide; the rate-limit and logging caveats were kept |

## Checked and fine
Heading order (one h1 per page), alt text on every image, visible keyboard focus, skip link, colour contrast of body and muted text on the dark background, reduced-motion respected, mobile layout without horizontal scroll.

## Known gaps
- Light-theme version of the website does not exist; the site is dark only.
- The panel was reviewed with demo data in a test page and in the user's own Chrome during development, not on a wide range of real ads.
- No automated accessibility tool (axe or Lighthouse) has been run yet.
