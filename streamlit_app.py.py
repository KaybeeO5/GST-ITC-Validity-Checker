"""
ITC Denial Classifier - Cloud Version with PDF Upload
Upload PDFs, AI extracts case details, build knowledge base automatically

Features:
- PDF/DOCX upload interface
- AI-powered text extraction
- Smart field detection (case name, citation, court, ratio)
- Review & edit before adding
- Auto-categorization
- Export to JSON

Deployment: streamlit run streamlit_app_with_upload.py
"""

import streamlit as st
import requests
import pandas as pd
import json
from datetime import datetime, timedelta
import time
import re
import io
from pathlib import Path

# PDF/DOCX processing
try:
    import PyPDF2
    PDF_SUPPORT = True
except:
    PDF_SUPPORT = False

try:
    import docx
    DOCX_SUPPORT = True
except:
    DOCX_SUPPORT = False

# ============================================================================
# PAGE CONFIG
# ============================================================================

st.set_page_config(
    page_title="ITC Denial Classifier - PDF Upload",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ============================================================================
# CUSTOM CSS
# ============================================================================

st.markdown("""
<style>
    .main {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }
    
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    .hero-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 3rem 2rem;
        border-radius: 15px;
        margin-bottom: 2rem;
        text-align: center;
        color: white;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    
    .hero-title {
        font-size: 3rem;
        font-weight: 800;
        margin: 0;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    .upload-zone {
        border: 3px dashed #667eea;
        border-radius: 15px;
        padding: 3rem;
        text-align: center;
        background: white;
        margin: 2rem 0;
    }
    
    .result-card {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        margin: 1rem 0;
        border-left: 5px solid #667eea;
    }
    
    .metric-box {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1.5rem;
        border-radius: 10px;
        text-align: center;
        margin: 0.5rem 0;
    }
    
    .success-banner {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: white;
        padding: 1.5rem;
        border-radius: 10px;
        text-align: center;
        font-size: 1.1rem;
        font-weight: 600;
        margin: 1rem 0;
    }
    
    .extracted-case {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        margin: 0.5rem 0;
        border-left: 4px solid #28a745;
    }
    
    .stButton>button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 25px;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)

# ============================================================================
# CONFIGURATION
# ============================================================================

HF_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli"

CATEGORIES = [
    "Supplier Non-Filing",
    "Time-Barred Claims",
    "Fake or Bogus Invoices",
    "Invoice Defects",
    "Mismatch in GSTR-2A/2B",
    "Blocked Credits",
    "Ineligible Inputs",
    "Reverse Charge Issues",
    "Payment Not Made to Supplier",
    "Document Unavailability",
    "Assessment or Audit Adjustments",
    "Other Complex Issues"
]

# Initialize session state
if 'knowledge_base' not in st.session_state:
    st.session_state.knowledge_base = {}

if 'extracted_cases' not in st.session_state:
    st.session_state.extracted_cases = []

if 'processed_files' not in st.session_state:
    st.session_state.processed_files = []

# ============================================================================
# PDF/DOCX EXTRACTION FUNCTIONS
# ============================================================================

def extract_text_from_pdf(pdf_file):
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        st.error(f"PDF extraction failed: {e}")
        return ""

def extract_text_from_docx(docx_file):
    """Extract text from DOCX file"""
    try:
        doc = docx.Document(docx_file)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    except Exception as e:
        st.error(f"DOCX extraction failed: {e}")
        return ""

def extract_text_from_file(uploaded_file):
    """Extract text based on file type"""
    file_extension = Path(uploaded_file.name).suffix.lower()
    
    if file_extension == '.pdf' and PDF_SUPPORT:
        return extract_text_from_pdf(uploaded_file)
    elif file_extension in ['.docx', '.doc'] and DOCX_SUPPORT:
        return extract_text_from_docx(uploaded_file)
    else:
        return ""

# ============================================================================
# AI EXTRACTION FUNCTIONS
# ============================================================================

def extract_case_details_basic(text, filename):
    """
    Basic extraction using regex patterns
    Fallback when AI API not available
    """
    case_data = {
        "filename": filename,
        "case": "",
        "citation": "",
        "court": "",
        "year": None,
        "outcome": "Unknown",
        "ratio": "",
        "category": "Other Complex Issues",
        "confidence": 0.5
    }
    
    # Extract case name (first line usually, or "vs" pattern)
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Try to find case name with "vs" or "v."
    for line in lines[:10]:  # Check first 10 lines
        if ' vs ' in line.lower() or ' v. ' in line.lower():
            case_data['case'] = line
            break
    
    if not case_data['case'] and lines:
        case_data['case'] = lines[0]  # Use first line as fallback
    
    # Extract TMI citation
    tmi_pattern = r'\d{4}\s*\(\d+\)\s*TMI\s*\d+'
    tmi_match = re.search(tmi_pattern, text)
    if tmi_match:
        case_data['citation'] = tmi_match.group(0)
    
    # Extract year
    year_pattern = r'20\d{2}'
    years = re.findall(year_pattern, text)
    if years:
        case_data['year'] = int(years[0])
    
    # Extract court name
    court_patterns = [
        r'(Supreme Court)',
        r'(High Court of [A-Z][a-z]+)',
        r'([A-Z][a-z]+ High Court)',
        r'(Tribunal)',
        r'(CESTAT)'
    ]
    
    for pattern in court_patterns:
        court_match = re.search(pattern, text, re.IGNORECASE)
        if court_match:
            case_data['court'] = court_match.group(1)
            break
    
    # Detect outcome
    if 'taxpayer' in text.lower() and ('favor' in text.lower() or 'allowed' in text.lower()):
        case_data['outcome'] = "Taxpayer Favorable"
    elif 'revenue' in text.lower() and ('favor' in text.lower() or 'allowed' in text.lower()):
        case_data['outcome'] = "Revenue Favorable"
    elif 'dismiss' in text.lower():
        case_data['outcome'] = "Dismissed"
    
    # Extract ratio (try to find conclusion/held/ratio paragraphs)
    ratio_keywords = ['held that', 'ratio', 'conclusion', 'decision', 'finding']
    for keyword in ratio_keywords:
        if keyword in text.lower():
            start_idx = text.lower().index(keyword)
            # Get next 200 characters as ratio
            case_data['ratio'] = text[start_idx:start_idx+300].strip()
            break
    
    # If no ratio found, use first substantial paragraph
    if not case_data['ratio']:
        paragraphs = [p for p in text.split('\n\n') if len(p) > 100]
        if paragraphs:
            case_data['ratio'] = paragraphs[0][:300] + "..."
    
    # Auto-categorize based on keywords
    text_lower = text.lower()
    if 'supplier' in text_lower and ('not filed' in text_lower or 'non-filing' in text_lower):
        case_data['category'] = "Supplier Non-Filing"
        case_data['confidence'] = 0.8
    elif 'time' in text_lower and ('bar' in text_lower or '16(4)' in text):
        case_data['category'] = "Time-Barred Claims"
        case_data['confidence'] = 0.8
    elif 'fake' in text_lower or 'bogus' in text_lower:
        case_data['category'] = "Fake or Bogus Invoices"
        case_data['confidence'] = 0.8
    elif 'gstr-2a' in text_lower or 'gstr 2a' in text_lower or 'mismatch' in text_lower:
        case_data['category'] = "Mismatch in GSTR-2A/2B"
        case_data['confidence'] = 0.8
    
    return case_data

def extract_case_details_ai(text, filename):
    """
    AI-powered extraction using Claude API
    More accurate but requires API key
    """
    # For now, use basic extraction
    # In production, you can add Claude API call here
    return extract_case_details_basic(text, filename)

# ============================================================================
# CLASSIFICATION FUNCTIONS
# ============================================================================

def classify_denial_hf(denial_text, categories):
    """Classify using Hugging Face API"""
    try:
        payload = {
            "inputs": denial_text,
            "parameters": {
                "candidate_labels": categories,
                "multi_label": True
            }
        }
        
        response = requests.post(HF_API_URL, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            labels = result.get('labels', [])
            scores = result.get('scores', [])
            
            classifications = [
                (label, score) for label, score in zip(labels[:2], scores[:2])
                if score > 0.3
            ]
            
            if not classifications:
                classifications = [(labels[0], scores[0])]
            
            return classifications
        else:
            return [("Other Complex Issues", 0.5)]
            
    except Exception as e:
        return [("Other Complex Issues", 0.5)]

# ============================================================================
# KNOWLEDGE BASE FUNCTIONS
# ============================================================================

def get_defence_strategy(category):
    """Get defence strategy from knowledge base"""
    if category in st.session_state.knowledge_base:
        return st.session_state.knowledge_base[category]
    else:
        return {
            "sections": [],
            "circulars": [],
            "case_law": [],
            "defence_points": ["Review case details", "Gather documentation"],
            "evidence_checklist": ["Original invoice", "Payment proof"],
            "success_rate": "Unknown"
        }

def add_case_to_knowledge_base(case_data):
    """Add approved case to knowledge base"""
    category = case_data['category']
    
    if category not in st.session_state.knowledge_base:
        st.session_state.knowledge_base[category] = {
            "sections": [],
            "circulars": [],
            "case_law": [],
            "defence_points": [],
            "evidence_checklist": [],
            "success_rate": "Unknown"
        }
    
    # Add case to case_law array
    case_entry = {
        "case": case_data['case'],
        "citation": case_data.get('citation', 'N/A'),
        "court": case_data.get('court', 'N/A'),
        "year": case_data.get('year', 2024),
        "outcome": case_data.get('outcome', 'Unknown'),
        "ratio": case_data.get('ratio', '')
    }
    
    st.session_state.knowledge_base[category]['case_law'].append(case_entry)
    
    return True

def export_knowledge_base():
    """Export knowledge base to JSON"""
    return json.dumps(st.session_state.knowledge_base, indent=2)

# ============================================================================
# MAIN APP
# ============================================================================

def main():
    # Hero section
    st.markdown("""
    <div class="hero-section">
        <h1 class="hero-title">⚖️ ITC Denial Classifier</h1>
        <p class="hero-subtitle">Upload PDFs • AI Extracts • Build Knowledge Base Automatically</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Tabs
    tab1, tab2, tab3 = st.tabs(["📝 Classify Denial", "📤 Upload Cases", "📊 Knowledge Base"])
    
    # ========================================================================
    # TAB 1: CLASSIFY DENIAL
    # ========================================================================
    
    with tab1:
        st.markdown("### 📝 Enter Denial Details")
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            case_id = st.text_input(
                "Case ID",
                value=f"CASE-{datetime.now().strftime('%Y%m%d')}-001"
            )
            
            denial_text = st.text_area(
                "Denial Reason",
                height=150,
                placeholder="Enter or paste denial reason from GST notice..."
            )
        
        with col2:
            notice_date = st.date_input("Notice Date", value=datetime.now())
            amount = st.number_input("ITC Amount (₹)", min_value=0, value=150000, step=10000)
            
            st.markdown("---")
            st.markdown("**Quick Examples:**")
            
            if st.button("📌 Supplier Non-Filing", use_container_width=True):
                st.session_state.example = "ITC denied as supplier has not filed GSTR-1"
                st.rerun()
            
            if st.button("📌 Time-Barred", use_container_width=True):
                st.session_state.example = "Credit claimed beyond Section 16(4) time limit"
                st.rerun()
        
        if 'example' in st.session_state:
            denial_text = st.session_state.example
            del st.session_state.example
        
        st.markdown("---")
        
        col_center = st.columns([1, 2, 1])[1]
        with col_center:
            classify_button = st.button("🔍 Classify & Get Defence Strategy", use_container_width=True, type="primary")
        
        if classify_button and denial_text:
            with st.spinner("Analyzing..."):
                start_time = time.time()
                
                classifications = classify_denial_hf(denial_text, CATEGORIES)
                primary_category = classifications[0][0]
                confidence = classifications[0][1]
                
                strategy = get_defence_strategy(primary_category)
                processing_time = (time.time() - start_time) * 1000
            
            st.markdown(f"""
            <div class="success-banner">
                ✅ Analysis Complete for {case_id} in {processing_time:.0f}ms
            </div>
            """, unsafe_allow_html=True)
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.markdown(f"""
                <div class="metric-box">
                    <div>Primary Category</div>
                    <div style="font-size: 1.3rem; margin-top: 0.5rem;">{primary_category}</div>
                </div>
                """, unsafe_allow_html=True)
            
            with col2:
                st.markdown(f"""
                <div class="metric-box">
                    <div>Confidence</div>
                    <div style="font-size: 2rem; margin-top: 0.5rem;">{confidence*100:.1f}%</div>
                </div>
                """, unsafe_allow_html=True)
            
            with col3:
                st.markdown(f"""
                <div class="metric-box">
                    <div>Case Law Found</div>
                    <div style="font-size: 2rem; margin-top: 0.5rem;">{len(strategy.get('case_law', []))}</div>
                </div>
                """, unsafe_allow_html=True)
            
            with col4:
                st.markdown(f"""
                <div class="metric-box">
                    <div>Success Rate</div>
                    <div style="font-size: 1.5rem; margin-top: 0.5rem;">{strategy.get('success_rate', 'Unknown')}</div>
                </div>
                """, unsafe_allow_html=True)
            
            # Display case law and other details
            if strategy.get('case_law'):
                st.markdown("### ⚖️ Relevant Case Law")
                for case in strategy['case_law']:
                    with st.expander(f"📖 {case.get('case', 'Unknown')}"):
                        st.write(f"**Citation:** {case.get('citation', 'N/A')}")
                        st.write(f"**Court:** {case.get('court', 'N/A')} ({case.get('year', 'N/A')})")
                        st.write(f"**Outcome:** {case.get('outcome', 'N/A')}")
                        st.write(f"**Ratio:** {case.get('ratio', 'N/A')}")
    
    # ========================================================================
    # TAB 2: UPLOAD CASES
    # ========================================================================
    
    with tab2:
        st.markdown("### 📤 Upload Your Case PDFs")
        
        st.info("Upload your PDF/DOCX case files. AI will automatically extract case details for you to review and approve.")
        
        uploaded_files = st.file_uploader(
            "Choose PDF or DOCX files",
            type=['pdf', 'docx', 'doc'],
            accept_multiple_files=True,
            help="Upload up to 75 case files at once"
        )
        
        if uploaded_files:
            st.success(f"✅ {len(uploaded_files)} file(s) uploaded")
            
            if st.button("🤖 Extract Case Details", type="primary"):
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                for idx, uploaded_file in enumerate(uploaded_files):
                    status_text.text(f"Processing {idx+1}/{len(uploaded_files)}: {uploaded_file.name}")
                    
                    # Extract text
                    text = extract_text_from_file(uploaded_file)
                    
                    if text:
                        # Extract case details
                        case_data = extract_case_details_basic(text, uploaded_file.name)
                        st.session_state.extracted_cases.append(case_data)
                        st.session_state.processed_files.append(uploaded_file.name)
                    
                    progress_bar.progress((idx + 1) / len(uploaded_files))
                
                status_text.text("✅ Extraction complete!")
                st.rerun()
        
        # Display extracted cases
        if st.session_state.extracted_cases:
            st.markdown("---")
            st.markdown(f"### ✏️ Review Extracted Cases ({len(st.session_state.extracted_cases)})")
            
            for idx, case in enumerate(st.session_state.extracted_cases):
                with st.expander(f"📄 {case['case'][:80]}..." if len(case['case']) > 80 else f"📄 {case['case']}", expanded=False):
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        case['case'] = st.text_input("Case Name", value=case['case'], key=f"case_{idx}")
                        case['citation'] = st.text_input("Citation", value=case['citation'], key=f"cite_{idx}")
                        case['court'] = st.text_input("Court", value=case['court'], key=f"court_{idx}")
                    
                    with col2:
                        case['year'] = st.number_input("Year", value=case['year'] or 2024, key=f"year_{idx}")
                        case['outcome'] = st.selectbox("Outcome", 
                            ["Taxpayer Favorable", "Revenue Favorable", "Dismissed", "Partial", "Unknown"],
                            index=0 if case['outcome'] == "Taxpayer Favorable" else 4,
                            key=f"outcome_{idx}")
                        case['category'] = st.selectbox("Category", CATEGORIES, 
                            index=CATEGORIES.index(case['category']),
                            key=f"cat_{idx}")
                    
                    case['ratio'] = st.text_area("Ratio Decidendi", value=case['ratio'], height=100, key=f"ratio_{idx}")
                    
                    col_btn1, col_btn2, col_btn3 = st.columns(3)
                    
                    with col_btn1:
                        if st.button("✅ Approve & Add", key=f"approve_{idx}", use_container_width=True):
                            add_case_to_knowledge_base(case)
                            st.success(f"Added to {case['category']}")
                    
                    with col_btn2:
                        if st.button("🗑️ Delete", key=f"delete_{idx}", use_container_width=True):
                            st.session_state.extracted_cases.pop(idx)
                            st.rerun()
            
            st.markdown("---")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                if st.button("✅ Approve All Cases", use_container_width=True):
                    for case in st.session_state.extracted_cases:
                        add_case_to_knowledge_base(case)
                    st.success(f"Added {len(st.session_state.extracted_cases)} cases!")
                    st.session_state.extracted_cases = []
                    st.rerun()
            
            with col2:
                if st.button("🗑️ Clear All", use_container_width=True):
                    st.session_state.extracted_cases = []
                    st.rerun()
    
    # ========================================================================
    # TAB 3: KNOWLEDGE BASE
    # ========================================================================
    
    with tab3:
        st.markdown("### 📊 Your Knowledge Base")
        
        if st.session_state.knowledge_base:
            # Statistics
            total_cases = sum(len(cat_data.get('case_law', [])) for cat_data in st.session_state.knowledge_base.values())
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Categories", len(st.session_state.knowledge_base))
            with col2:
                st.metric("Total Cases", total_cases)
            with col3:
                st.metric("Files Processed", len(st.session_state.processed_files))
            
            st.markdown("---")
            
            # Display by category
            for category, data in st.session_state.knowledge_base.items():
                with st.expander(f"📁 {category} ({len(data.get('case_law', []))} cases)"):
                    for case in data.get('case_law', []):
                        st.markdown(f"""
                        **{case['case']}**  
                        Citation: {case.get('citation', 'N/A')} | Court: {case.get('court', 'N/A')} | Year: {case.get('year', 'N/A')}  
                        Outcome: {case.get('outcome', 'N/A')}  
                        Ratio: {case.get('ratio', 'N/A')[:200]}...
                        """)
                        st.markdown("---")
            
            # Export
            st.markdown("### 📥 Export Knowledge Base")
            
            export_data = export_knowledge_base()
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.download_button(
                    "📄 Download as JSON",
                    data=export_data,
                    file_name=f"knowledge_base_{datetime.now().strftime('%Y%m%d')}.json",
                    mime="application/json",
                    use_container_width=True
                )
            
            with col2:
                st.code(f"Total: {total_cases} cases across {len(st.session_state.knowledge_base)} categories")
        
        else:
            st.info("No cases added yet. Upload PDFs in the 'Upload Cases' tab to get started!")


# ============================================================================
# SIDEBAR
# ============================================================================

with st.sidebar:
    st.markdown("### 📊 Quick Stats")
    
    total_cases = sum(len(cat_data.get('case_law', [])) for cat_data in st.session_state.knowledge_base.values())
    
    st.metric("Cases in KB", total_cases)
    st.metric("Pending Review", len(st.session_state.extracted_cases))
    st.metric("Files Processed", len(st.session_state.processed_files))
    
    st.markdown("---")
    
    st.markdown("### ℹ️ How to Use")
    st.info("""
    1. **Upload Tab:** Upload your PDF case files
    2. **AI extracts** case details automatically
    3. **Review & edit** extracted information
    4. **Approve** to add to knowledge base
    5. **Classify Tab:** Use your knowledge base for classifications!
    """)
    
    st.markdown("---")
    
    if st.button("🔄 Reset Knowledge Base"):
        st.session_state.knowledge_base = {}
        st.session_state.extracted_cases = []
        st.session_state.processed_files = []
        st.rerun()


# ============================================================================
# RUN APP
# ============================================================================

if __name__ == "__main__":
    # Check dependencies
    if not PDF_SUPPORT:
        st.warning("⚠️ PyPDF2 not installed. PDF support limited. Run: pip install PyPDF2")
    
    if not DOCX_SUPPORT:
        st.warning("⚠️ python-docx not installed. DOCX support disabled. Run: pip install python-docx")
    
    main()
