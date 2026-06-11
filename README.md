# Kshitiz Budhathoki — Engineering Dashboard

A premium, recruiter-focused **professional command center** for Kshitiz Budhathoki —
Software Engineer | Full Stack Developer | AI & Data Enthusiast.

Apple/Stripe-inspired SaaS dashboard aesthetic: **Deep Navy + Electric Blue + White**,
glassmorphism, dark/light mode, interactive charts, GitHub analytics, and an AI assistant.

**Zero build step.** Pure HTML/CSS/JS + Chart.js (CDN). Open and ship.

---

## Run it

```bash
# from this folder
python -m http.server 4173
# then open http://localhost:4173
```

Or just double-click `index.html`.

---

## File structure

```
engineer-dashboard/
├── index.html                      # All markup (12 sections + AI panel)
├── package.json                    # Declares the `motion` dependency
├── css/styles.css                  # Design system, glass, responsive, themes
├── js/app.js                       # Theme, charts, Motion, live GitHub data, AI, form
└── assets/
    ├── avatar.svg                  # Profile photo (replace with your real photo)
    ├── favicon.svg
    ├── og-preview.svg              # Social share card
    └── Kshitiz-Budhathoki-Resume.pdf   # Placeholder — replace with your real PDF
```

## Live GitHub data (real, from @kshitiz235)

The GitHub Analytics Center fetches **live data** on page load — no build step, no token:

- **Profile & repos** via the official GitHub REST API → public repos (also shown in the
  hero stat tile), followers, total stars, language count, and the **Most Used Languages**
  doughnut (computed from your real repositories).
- **Contribution calendar** via a public community API
  (`github-contributions-api.jogruber.de`) → the real **contribution heatmap**, total
  contributions, and the **weekly commit-activity** line chart (aggregated from daily counts).

If GitHub is rate-limited (60 req/hr unauthenticated) or offline, the dashboard gracefully
falls back to sample visuals so it never looks broken. Change the username in one place:
`const GH_USER = "kshitiz235"` in `js/app.js`.

## Motion (npm: `motion`)

Animations use the **Motion** library. The app imports Motion's ESM bundle and uses it for:
a top **scroll-progress bar**, a **staggered hero entrance**, **scroll-reveal section
headers**, and a subtle **aurora parallax** — all gated behind `prefers-reduced-motion`,
with CSS fallbacks if the library can't load.

```bash
npm install        # installs motion (declared in package.json)
```

---

## Sections (matches your brief)

| # | Section | Widgets |
|---|---------|---------|
| 1 | **Hero Dashboard** | Photo, animated intro, resume download, contact, availability pill, current focus pill, education/location meta, 4 animated stat tiles (GPA 7.95, 6-mo LG intern, 3+ projects, 15+ tech) |
| 2 | **Executive Summary** | About Me, Professional Journey, Career Objectives, Education snapshot (GPA ring + M.Tech/B.Tech) |
| 3 | **Skills Center** | Technology radar chart, animated proficiency bars, web/DB/tools/interest chips |
| 4 | **Experience Timeline** | Master's (research), Independent Projects & Open Source, B.Tech — responsibilities + stack |
| 5 | **Featured Projects** | Deals Management System, Health Bot Chat, Instagram Reels Limiter — metrics, stack, demo/GitHub links |
| 6 | **GitHub Analytics** | **Live** contribution heatmap, language doughnut, commit-activity line, repo stats — all fetched from @kshitiz235 |
| 7 | **Research & Publications** | Research interests, health-bot research project, future research plans |
| 8 | **Learning Dashboard** | Advanced DSA, Dynamic Programming, AI, Cybersecurity, Technical Analysis + roadmap ring |
| 9 | **Achievements Center** | Academic, internship, projects/open-source, research |
| 10 | **Professional Blog** | AI/ML, software engineering, career & productivity posts |
| 11 | **Contact Command Center** | Validated form + Email / LinkedIn / GitHub / Location (Nepal) |
| 12 | **Future Roadmap** | Short-term goals, long-term vision, career milestones |
| + | **AI Assistant** | Slide-in chat (Ctrl/⌘+K), suggestion chips, career Q&A tuned to Kshitiz |

---

## Design system

**Style:** "Trust & Authority" — Deep Navy canvas + a single Electric Blue accent.

### Color palette
| Role | Dark | Light |
|------|------|-------|
| Accent / Electric Blue | `#2E7DFF` | `#2E7DFF` |
| Accent 2 (cyan glow) | `#38BDF8` | `#38BDF8` |
| Background (Deep Navy / White) | `#070B16` | `#F5F8FF` |
| Surface 2 | `#0C1326` | `#FFFFFF` |
| Text | `#EAF1FF` | `#0A1733` |
| Muted text | `#97A6C4` | `#46537A` |

All colors are CSS variables in `:root` / `[data-theme="light"]` — re-theme in one place.

### Typography ("Tech Startup" pairing)
- **Headings:** Space Grotesk — distinctive, modern, futuristic
- **Body:** DM Sans — clean, highly legible
- **Data / labels / eyebrows:** JetBrains Mono — developer-console vibe, tabular figures

### Effects
Glassmorphism (`backdrop-filter: blur`), animated navy/blue aurora, gradient accents,
soft elevation shadows, 150–300ms eased transitions, scroll reveals, animated counters & rings.

---

## Recruiter / ATS-friendly choices

- Real semantic HTML headings (h1→h3), descriptive alt text, SEO + Open Graph meta.
- One primary CTA (resume), "Available for hire" status, frictionless contact.
- **AI Assistant** lets recruiters *ask* "Is Kshitiz a fit for an AI/full-stack role?"
- Accessibility: skip link, focus rings, aria-labels, 4.5:1 contrast, `prefers-reduced-motion`.
- Performance: no framework, deferred JS, lazy reveal, no layout shift, SVG icons.

---

## Make it yours

1. **Content:** edit text directly in `index.html`. Skill bars use a `data-skills` JSON
   attribute; rings use `data-pct`; stat tiles use `data-count` (+ optional `data-decimals`).
2. **AI answers:** edit the `KB` array in `js/app.js`.
3. **Charts:** edit datasets in `buildCharts()` in `js/app.js`.
4. **GitHub data:** the heatmap/stats are sample data — wire to the
   [GitHub API](https://docs.github.com/en/graphql) to go live.
5. **Contact form:** connect the submit handler to [Formspree](https://formspree.io)
   or [EmailJS](https://www.emailjs.com).
6. **Resume & photo:** replace `assets/Kshitiz-Budhathoki-Resume.pdf` and `assets/avatar.svg`.
   Update the email/LinkedIn/GitHub URLs in `index.html` (currently placeholders).

## Deploy

Drag the folder to **Netlify Drop**, or push to GitHub and enable **GitHub Pages** /
**Vercel** / **Cloudflare Pages**. Fully static — no server required.
