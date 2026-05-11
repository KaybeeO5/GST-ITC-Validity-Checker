# DefendITC

> **AI-Powered GST Input Tax Credit Defence Platform**
>
> Analyse ITC denial notices, predict win probability based on 75 verified court judgments, and draft citation-backed legal replies — all in your browser, with zero data leaving your device.

[![Made with Vanilla JS](https://img.shields.io/badge/made%20with-vanilla%20JS-F7DF1E?logo=javascript&logoColor=000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![No Backend](https://img.shields.io/badge/backend-none-success)](https://github.com/)
[![Privacy First](https://img.shields.io/badge/data-100%25%20client--side-green)](https://github.com/)
[![Knowledge Base](https://img.shields.io/badge/judgments-75-blue)](https://github.com/)
[![Circulars](https://img.shields.io/badge/CBIC%20circulars-12-blue)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

---

## 🎯 What is DefendITC?

DefendITC is a self-contained web application built to help **chartered accountants, tax consultants, legal professionals, and businesses** respond to GST Input Tax Credit (ITC) denial notices issued under the Central Goods and Services Tax Act, 2017.

The platform combines a curated knowledge base of **75 verified Indian court judgments** and **12 CBIC circulars** with a rule-based classification engine to:

- **Classify** any ITC denial notice into one of six categories (Supplier Non-Filing, GSTR-2A/2B Mismatch, Time-Bar, Non-Payment, Fake Invoices, Invoice Defects)
- **Predict** the win probability based on historical taxpayer outcomes for that category
- **Draft** a structured legal reply citing relevant precedents and CBIC circulars
- **Calculate** statutory reply deadlines under Sections 73 and 74 of the CGST Act
- **Track** ongoing cases through a kanban-style board

Everything runs in your browser. No data is sent to any server. No login. No subscription.

---

## ✨ Features

### 📋 Core Workflow

| Feature | Description |
|---|---|
| **🔍 Notice Classifier** | Paste or upload a notice (PDF/DOCX) → instant ground identification, applicable provisions, win probability, and recommended action |
| **✨ Reply Drafter** | AI-generated reply template with citations, suggested attachments, and a downloadable PDF export |
| **📋 Case Tracker** | Kanban board with 6 status columns (Opened → Prep → In Progress → Filed → Appeal → Won) and drag-and-drop |
| **📚 Case Library** | Browse 75 verified judgments with filters (court tier, court, outcome, provision) and one-click citation builder |
| **📊 Analytics Dashboard** | Win probability predictor, denial category breakdown, court-level statistics, and outcome distribution |
| **⚖️ Research** | Acts, Rules, CBIC circulars — all linked to PDF sources |

### 🏛️ Legal Tools

| Tool | Purpose |
|---|---|
| **⏰ Deadline Calculator** | Computes reply deadline under Sections 73/74 with color-coded urgency status |
| **📋 Citation Builder** | Generates citations in 4 formats: SCC India, Bluebook, OSCOLA, Plain text |
| **⚖️ Case Comparison** | Select up to 3 cases for side-by-side comparison with auto-analysis of similarities |
| **🧮 Win Probability Predictor** | Empirical scoring based on 75 historical outcomes |

### 🎨 Experience

- **🌗 Dark / Light mode** with system-preference detection and live system-change tracking
- **⌨️ Command palette** (Cmd/Ctrl+K) — fuzzy search across all features
- **♿ Accessible** — 50+ ARIA attributes, keyboard navigation, screen reader support, focus indicators, reduced-motion support
- **📱 Mobile-first responsive** — kanban stacks vertically, navigation scrolls horizontally with touch, 44px touch targets, no iOS input-zoom
- **💾 Persistent storage** — all your tracker cases, drafts, and history survive browser refreshes
- **📥 Export anywhere** — CSV for cases/tracker/audit log, PDF for analytics dashboard and reply drafts
- **📜 Activity log** — full audit trail of every action (useful for billing, compliance, due diligence)

### 🔒 Privacy & Security

- **100% client-side** — no backend, no API calls, no analytics, no cookies
- **No data leaves your device** — uploaded notices and your case data live entirely in `localStorage`
- **XSS-protected** — all user input sanitised through dedicated escape helpers
- **Reset button** — wipe all stored data with one click and a confirmation
- **CSP-friendly** — works behind strict Content Security Policy headers

---

## 🚀 Quick Start

### Option A: Use the Live Demo
Visit the deployed version: **[your-username.github.io/defenditc](https://your-username.github.io/defenditc)** *(replace with your actual URL)*

### Option B: Run Locally
This is a pure static site — no build step required.

```bash
# Clone the repo
git clone https://github.com/your-username/defenditc.git
cd defenditc

# Option 1: Open directly in browser
open index.html       # macOS
xdg-open index.html   # Linux
start index.html      # Windows

# Option 2: Serve with any static server
python3 -m http.server 8080
# Then visit http://localhost:8080

# Option 3: With Node.js
npx serve .
```

### Option C: Deploy to GitHub Pages
1. Fork or clone this repo
2. Push to your `main` branch
3. Settings → Pages → Source: `main` branch, root folder
4. Wait ~1 minute → your site is live at `https://<username>.github.io/<repo>`

---

## 📂 Project Structure

```
defenditc/
├── index.html          # Markup, semantic structure, navigation (~39 KB)
├── styles.css          # All styling, responsive breakpoints, dark mode (~27 KB)
├── data.js             # Knowledge base: 75 judgments + 12 circulars (~59 KB)
├── app.js              # Application logic, all 19 modules (~181 KB)
├── README.md           # You are here
└── LICENSE             # MIT
```

### Total Size

- **HTML**: 594 lines
- **CSS**: 933 lines
- **Data**: 1,217 lines
- **JS**: 3,517 lines
- **All files combined**: ~306 KB uncompressed (smaller than a single React bundle)

---

## 🧩 Architecture

DefendITC is built as 15 self-contained modules in `app.js`. Each module is namespaced and independently testable:

```
┌─────────────────────────────────────────────────────────┐
│                     app.js modules                       │
├─────────────────────────────────────────────────────────┤
│  Storage         — localStorage wrapper with versioning  │
│  Persist         — Domain-specific persistence APIs      │
│  ErrorLog        — In-memory error log + global handlers │
│  Sanitization    — escapeHtml, escapeAttr, sanitizeUrl   │
│  FileParser      — PDF.js + mammoth.js wrappers          │
│  UI Components   — Confidence bars, skeletons            │
│  Export          — CSV builder + Print-to-PDF helpers    │
│  Debounce        — Reusable debounce utility             │
│  Citations       — SCC / Bluebook / OSCOLA formats       │
│  UpdateBanner    — Stale-data warnings                   │
│  AuditLog        — User action tracking                  │
│  Theme           — Dark/light/auto with system tracking  │
│  Commands        — Cmd+K palette with fuzzy search       │
│  VirtualList     — Viewport-based rendering              │
│  Compare         — Side-by-side case comparison          │
└─────────────────────────────────────────────────────────┘
```

No frameworks. No build tools. No transpilation. Just modern vanilla JavaScript that works in every browser from the last 5 years.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Open command palette |
| `Esc` | Close any open modal or palette |
| `Tab` | Navigate through interactive elements |
| `↑ ↓` | Navigate command palette items |
| `Enter` | Select command palette item |

---

## 🛠️ Tech Stack

- **HTML5** with semantic landmarks and ARIA
- **CSS3** with custom properties, grid, flexbox, container queries
- **Vanilla JavaScript (ES6+)** — no frameworks
- **PDF.js** (v4.0.379, CDN) — client-side PDF text extraction
- **mammoth.js** (v1.6.0, CDN) — client-side DOCX parsing
- **localStorage** for persistence
- **Inter** + **Syne** typefaces (Google Fonts)

---

## 📊 Knowledge Base

The application ships with a curated, manually-verified dataset:

### Court Judgments (75 cases)

| Court Tier | Count |
|---|---|
| Supreme Court of India | 4 |
| Madras High Court | 11 |
| Kerala High Court | 11 |
| Delhi High Court | 8 |
| Gauhati High Court | 5 |
| Karnataka High Court | 4 |
| Calcutta High Court | 4 |
| Other High Courts | 18 |
| GST Appellate Tribunals | 8 |
| AAR / AAAR | 2 |

### Outcome Distribution

| Outcome | Count | % |
|---|---|---|
| Taxpayer Won | 46 | 61% |
| Department Won | 16 | 21% |
| Mixed / Remanded | 13 | 17% |

### Win Rates by Denial Ground

| Denial Category | Win Rate |
|---|---|
| Supplier Non-Filing | 87% |
| GSTR-2A / 2B Mismatch | 75% |
| Time-Bar (Section 16(4)) | 65% |
| Non-Payment to Supplier | 55% |
| Invoice Defects | 50% |
| Fake Invoices | 30% |

### CBIC Circulars (12)

Including Circular 183/15/2022-GST, 237/31/2024-GST, 238/32/2024-GST, 170/02/2022-GST, and 9 more relevant clarifications.

---

## ⚠️ Disclaimer

**DefendITC is a legal research and drafting assistance tool. It is not a substitute for professional legal advice.**

- The application does **not** constitute legal practice or representation
- All output must be reviewed by a qualified advocate, chartered accountant, or GST practitioner before filing
- Win probabilities are statistical averages based on historical data — they are not predictions for any individual case
- The knowledge base has a cutoff date (see the version banner in-app); recent decisions or circular amendments may not be reflected
- The authors accept no liability for any action taken on the basis of this tool's output

---

## 🗺️ Roadmap

### ✅ Completed (v3.0)

- [x] **Tier 1 — Foundation** — Persistence, error handling, XSS protection, accessibility, real PDF/DOCX parsing
- [x] **Tier 2 — UX & Polish** — Mobile responsiveness, deadline calculator, confidence bars, loading skeletons, CSV/PDF export, debounced search, citation builder
- [x] **Tier 3 — Power Features** — Update banner, audit log, dark mode, command palette, virtual scrolling, case comparison, modular file structure

### 🚧 Planned (v4.0)

- [ ] **Claude API integration** — replace keyword-based classification with semantic understanding via the Claude Haiku 4.5 API
- [ ] **Multi-language support** — Tamil and Hindi translations for UI strings (i18n framework)
- [ ] **Collaborative case sharing** — generate read-only shareable links for cases (requires backend)
- [ ] **Notice deadline reminders** — browser notifications when reply windows are approaching
- [ ] **Quarterly knowledge base updates** — automated workflow to add newly published judgments
- [ ] **Mobile PWA** — installable on Android/iOS home screens with offline support
- [ ] **Advanced analytics** — court-by-court win-rate trends, year-over-year comparisons

### 💡 Under Consideration

- [ ] OCR for scanned PDFs (Tesseract.js)
- [ ] Voice-to-text notice entry
- [ ] Integration with GSTN portal
- [ ] White-label mode for legal firms

---

## 🤝 Contributing

Contributions are welcome. Areas where help is especially valuable:

- **Adding judgments** — submit verified court cases via PR (see `data.js` schema)
- **Updating circulars** — track new CBIC clarifications
- **Translations** — Tamil and Hindi UI strings
- **Bug reports** — open an issue with steps to reproduce
- **Accessibility audits** — report screen-reader or keyboard-navigation issues
- **Test coverage** — there are currently no automated tests; help wanted!

### Development Workflow

```bash
# Fork → clone → make a feature branch
git checkout -b feature/your-feature-name

# Make your changes — no build step needed, just refresh your browser

# Validate JS syntax before committing
node --check app.js
node --check data.js

# Commit with a clear message
git commit -m "Add: brief description of the change"

# Push and open a PR
git push origin feature/your-feature-name
```

### Adding a New Court Judgment

Edit `data.js` and append to `window._ALL_CASES`:

```javascript
{
    number: "76",                          // Sequential ID
    title: "Case Title v. Department",     // Full case name
    court: "Madras HC",                    // Court abbreviation
    courtTier: "High Courts",              // Tier classification
    date: "15032025",                      // DDMMYYYY
    outcome: "Taxpayer Won",               // or "Department Won" / "Mixed / Remanded"
    provision: "Section 16(2)(c)",         // Primary provision invoked
    denialCategory: "Supplier Non-Filing", // Maps to win probability calculator
    citation: "2025 SCC OnLine Mad 123",   // Standard citation
    pdfUrl: "https://..."                  // Direct PDF link
}
```

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

The court judgments and CBIC circulars referenced are public legal documents in the public domain. The curation, categorisation, and analysis are the original work of the contributors.

---

## 👥 Authors

Built as a final-year project for **LAW140 — AI for Legal Professionals** at the **School of Law, SASTRA Deemed University**.

| Role | Contributor |
|---|---|
| Team Lead | Kaustubh Balaji (126117014) |
| Engineering | Sivasankar S. (126117029) |
| Data Curation | Ganesh Ram (126117038) |
| Supervising Faculty | Dr. Sathiya CA |

---

## 🙏 Acknowledgements

- **Indian Kanoon** and **SCC Online** for legal database access
- **CBIC** for publicly available circulars and notifications
- **PDF.js team** for the excellent client-side PDF parser
- **mammoth.js** for the elegant DOCX text extractor
- The open-source community for the tools that made this possible

---

## 📬 Contact

- **Issues**: [GitHub Issues](https://github.com/your-username/defenditc/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/defenditc/discussions)
- **Email**: *your.email@example.com*

---

<p align="center">
  <strong>Built with ⚖️ for the Indian taxpayer community</strong><br>
  <sub>If DefendITC saved you a billable hour, consider giving it a ⭐ on GitHub</sub>
</p>
