# 🚀 QUICK START GUIDE
## Get Your ITC Classifier Running in 30 Minutes

---

## ⏱️ Timeline (2 Hours Total)

| Task | Time | Priority |
|------|------|----------|
| **Setup & Installation** | 15 min | ⚠️ MUST DO |
| **Populate Knowledge Base** | 60 min | ⚠️ MUST DO |
| **Extract Training Data** | 30 min | ⚠️ MUST DO |
| **Test & Validate** | 15 min | ⚠️ MUST DO |

---

## 📋 Prerequisites

- Python 3.9 or higher
- Your 75 GST documents (PDFs or accessible files)
- 4 GB RAM minimum
- Internet connection (for downloading ML models first time)

---

## STEP 1: Installation (15 minutes)

```bash
# 1. Navigate to project directory
cd itc_classifier/

# 2. Create virtual environment (recommended)
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# This will take 10-12 minutes on first install
# Downloads: transformers, torch, fastapi, streamlit, etc.

# 4. Verify installation
python -c "import transformers; print('✓ Installation successful')"
```

**Troubleshooting:**
- If `torch` install fails: Use `pip install torch --index-url https://download.pytorch.org/whl/cpu`
- If `pytesseract` issues: Skip it for now (OCR feature not critical)

---

## STEP 2: Populate Knowledge Base (60 minutes)

**THIS IS THE MOST IMPORTANT STEP!**

Your 75 documents need to be structured into the knowledge base.

### A. Open the Template

```bash
# Open this file in your text editor:
data/knowledge_base.json
```

### B. Fill in Your Cases (30 minutes)

For each of your 75 documents, extract:

1. **Case Name** - e.g., "Abhimaani Structures (P) Ltd vs. State of Karnataka"
2. **Citation** - e.g., "2025 (1) TMI 1266"
3. **Court** - e.g., "Karnataka High Court"
4. **Year** - e.g., 2025
5. **Outcome** - "Taxpayer Favorable" or "Unfavorable"
6. **Ratio Decidendi** - The core legal reasoning (1-2 sentences)

**Example:**

```json
{
  "case": "Abhimaani Structures (P) Ltd vs. State of Karnataka (Karnataka HC, 2025)",
  "citation": "2025 (1) TMI 1266",
  "court": "Karnataka High Court",
  "year": 2025,
  "outcome": "Taxpayer Favorable",
  "ratio": "Procedural lapse by supplier cannot deny ITC to recipient who has complied with all Section 16(2) requirements. Follows Circular 183 interpretation.",
  "doc_path": "case_law/abhimaani_structures_2025.pdf"
}
```

**Time-Saving Tips:**
- Start with your most important cases (Karnataka judicial chain)
- You have 12 categories - aim for 3-4 strong cases per category minimum
- Can add more cases later - start with 40-50 cases for MVP

### C. Fill in Defence Points (20 minutes)

For each category, add 3-5 defence arguments from your practice:

```json
"defence_points": [
  "Recipient has fulfilled all Section 16(2) conditions",
  "Supplier's non-filing is procedural lapse beyond recipient's control",
  "Cite LGW Industries and Karnataka HC precedent chain",
  "Burden on department to prove transaction was not genuine"
]
```

### D. Fill in Evidence Checklists (10 minutes)

List documents needed for each category:

```json
"evidence_checklist": [
  "Tax invoice with all mandatory details",
  "Payment proof (bank statement, TDS certificate)",
  "Goods receipt/service completion proof",
  "E-way bill copy (for goods above ₹50,000)"
]
```

---

## STEP 3: Extract Training Data (30 minutes)

Create test cases from your documents for validation.

### A. Open Training Data CSV

```bash
# Open this file:
data/training_data.csv
```

### B. Add 30-50 Examples

Go through your 75 documents and extract denial reason sentences:

| denial_text | category | section | relevant_cases |
|------------|----------|---------|----------------|
| ITC denied as supplier not filed GSTR-1 | Supplier Non-Filing | 16(2)(c) | LGW Industries |
| Claim after time limit of Section 16(4) | Time-Barred Claims | 16(4) | Abhimaani |

**How to Extract:**
1. Open each case PDF
2. Find the "Facts" or "Allegations" section
3. Copy the denial ground/reason
4. Categorize it (use your judgment - you're the expert!)
5. Add to CSV

**Target Distribution:**
- Supplier Non-Filing: 8-10 examples
- Time-Barred: 5-7 examples
- Fake Invoice: 5-7 examples
- Mismatch GSTR-2A/2B: 5-7 examples
- Others: 2-3 each

---

## STEP 4: Test & Validate (15 minutes)

### A. Start the API

```bash
# Terminal 1:
python api/main.py

# You should see:
# INFO: Application startup complete
# INFO: Uvicorn running on http://0.0.0.0:8000
```

**Check API is working:**
- Open browser: http://localhost:8000/docs
- You should see interactive API documentation

### B. Start the Demo UI

```bash
# Terminal 2 (new terminal):
streamlit run demo/app.py

# You should see:
# You can now view your Streamlit app in your browser
# Local URL: http://localhost:8501
```

### C. Test Classification

1. Go to http://localhost:8501
2. Enter a test denial text:
   ```
   ITC claim denied as supplier has not filed GSTR-1 for the relevant tax period
   ```
3. Click "Classify & Get Defence Strategy"
4. Check results:
   - ✅ Should classify as "Supplier Non-Filing"
   - ✅ Should show your case law
   - ✅ Should display defence arguments

### D. Validate Accuracy

Run through your CSV test cases:

1. For each row in `training_data.csv`:
   - Copy the `denial_text`
   - Paste into demo interface
   - Check if `primary_category` matches expected category

2. Calculate accuracy:
   ```
   Accuracy = Correct Classifications / Total Test Cases
   
   Target: 85%+ accuracy
   ```

3. If accuracy < 80%:
   - Check if denial texts are clear and specific
   - Ensure knowledge base is properly populated
   - May need to adjust category descriptions

---

## ✅ SUCCESS CHECKLIST

Before moving to demo/submission:

- [ ] API starts without errors
- [ ] Demo UI loads at localhost:8501
- [ ] Classification returns results in < 5 seconds
- [ ] Your case law appears in results
- [ ] Accuracy on test cases > 85%
- [ ] Knowledge base has 40+ cases documented
- [ ] All 12 categories have at least 1 case

---

## 🚨 Common Issues & Fixes

### Issue: "Classifier not loaded" error

**Fix:**
```bash
# Check if transformers installed correctly:
pip install --upgrade transformers torch

# If still fails, use CPU-only torch:
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### Issue: "Defence database not found"

**Fix:**
```bash
# Make sure knowledge_base.json exists:
ls data/knowledge_base.json

# If not, copy template:
cp data/knowledge_base_template.json data/knowledge_base.json
```

### Issue: API returns empty case law

**Cause:** Knowledge base not populated

**Fix:** Complete STEP 2 - must populate your 75 documents data!

### Issue: Slow classification (> 10 seconds)

**Cause:** Running on CPU

**Fix:** This is normal for first run (model download). Subsequent runs will be faster (2-3 seconds).

---

## 📊 Quick Performance Test

Run this in Python to test:

```python
import sys
sys.path.append('.')

from models.classifier import ITCDenialClassifier

# Load classifier
classifier = ITCDenialClassifier()

# Test classification
test_cases = [
    "ITC denied as supplier not filed GSTR-1",
    "Claim made after time limit under Section 16(4)",
    "Invoice appears to be fake based on investigation"
]

for text in test_cases:
    result = classifier.classify(text, top_k=1)
    print(f"Text: {text}")
    print(f"Category: {result[0][0]}")
    print(f"Confidence: {result[0][1]:.2%}\n")
```

Expected output:
```
Text: ITC denied as supplier not filed GSTR-1
Category: Supplier Non-Filing
Confidence: 89%

Text: Claim made after time limit under Section 16(4)
Category: Time-Barred Claims
Confidence: 92%

Text: Invoice appears to be fake based on investigation
Category: Fake or Bogus Invoices
Confidence: 86%
```

---

## 🎯 Next Steps

Once basic system is working:

1. **Enhance Knowledge Base**
   - Add remaining cases from your 75 documents
   - Add more circulars and notifications
   - Refine defence arguments

2. **Improve Accuracy**
   - Test with real notices
   - Adjust category descriptions if needed
   - Add more training examples

3. **Prepare Demo**
   - Create compelling test cases
   - Prepare screenshots
   - Document interesting findings

4. **Documentation**
   - Write project report
   - Create presentation slides
   - Prepare for evaluation

---

## 💡 Pro Tips

1. **Don't Aim for Perfection**: Start with 40-50 cases. Can expand to all 75 later.

2. **Focus on High-Impact Categories**: Supplier Non-Filing, Time-Barred, Fake Invoice, GSTR-2A Mismatch - these cover 70% of cases.

3. **Use Your Expertise**: You know these cases better than anyone. Your categorization is the ground truth!

4. **Test as You Go**: After adding 10 cases, test classification. Iterate quickly.

5. **Documentation > Code**: Your evaluators care more about the knowledge base and results than perfect code.

---

## 🆘 Need Help?

If stuck:
1. Check `docs/TROUBLESHOOTING.md`
2. Review API logs for errors
3. Verify all dependencies installed
4. Ensure Python version 3.9+

---

**Time Investment:**
- ⏰ First 2 hours: Get basic system running
- ⏰ Next 8-10 hours: Populate all 75 documents
- ⏰ Final 2-4 hours: Testing, refinement, documentation

**Total: 12-16 hours across 2 weeks**

---

**Ready to Start? Go to STEP 1! 🚀**
