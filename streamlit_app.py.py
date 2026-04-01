"""
ITC Denial Classifier - FIXED PDF Upload Version
Working extraction with proper error handling and fallback methods

FIXES:
- Button state management
- Better error messages
- Fallback text extraction
- Progress tracking
- Session state handling
"""

import streamlit as st
import requests
import pandas as pd
import json
from datetime import datetime, timedelta
import time
import re
import io

# PDF processing with fallback
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    st.warning("⚠️ PyPDF2 not available. Using fallback extraction.")

# Page config
st.set_page_config(
    page_title="ITC Denial Classifier",
    page_icon="⚖️",
    layout="wide"
)

# CSS (keeping original beautiful design)
st.markdown("""
<style>
    .main {background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);}
    #MainMenu, footer, header {visibility: hidden;}
    .hero-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 3rem 2rem; border-radius: 15px; margin-bottom: 2rem;
        text-align: center; color: white; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .hero-title {font-size: 3rem; font-weight: 800; margin: 0;}
    .success-banner {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: white; padding: 1.5rem; border-radius: 10px;
        text-align: center; font-weight: 600; margin: 1rem 0;
    }
    .extracted-case {
        background: #f8f9fa; padding: 1.5rem; border-radius: 8px;
        margin: 1rem 0; border-left: 4px solid #28a745;
    }
</style>
""", unsafe_allow_html=True)

# Configuration
CATEGORIES = [
    "Supplier Non-Filing", "Time-Barred Claims", "Fake or Bogus Invoices",
    "Invoice Defects", "Mismatch in GSTR-2A/2B", "Blocked Credits",
    "Ineligible Inputs", "Reverse Charge Issues", "Payment Not Made to Supplier",
    "Document Unavailability", "Assessment or Audit Adjustments", "Other Complex Issues"
]

# Initialize session state
if 'knowledge_base' not in st.session_state:
    st.session_state.knowledge_base = {}
if 'extracted_cases' not in st.session_state:
    st.session_state.extracted_cases = []
if 'extraction_done' not in st.session_state:
    st.session_state.extraction_done = False

# ============================================================================
# EXTRACTION FUNCTIONS - SIMPLIFIED AND WORKING
# ============================================================================

def extract_text_simple(uploaded_file):
    """Simple text extraction with multiple fallbacks"""
    try:
        # Try PyPDF2 first
        if PDF_AVAILABLE:
            pdf_reader = PyPDF2.PdfReader(uploaded_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        else:
            # Fallback: read as bytes and try to decode
            bytes_data = uploaded_file.read()
            try:
                return bytes_data.decode('utf-8', errors='ignore')
            except:
                return bytes_data.decode('latin-1', errors='ignore')
    except Exception as e:
        st.error(f"Extraction failed for {uploaded_file.name}: {str(e)}")
        return ""

def smart_extract_case_data(text, filename):
    """Smart extraction with pattern matching"""
    
    case_data = {
        "filename": filename,
        "case": filename.replace('.pdf', '').replace('.PDF', '').replace('_', ' '),
        "citation": "",
        "court": "",
        "year": 2024,
        "outcome": "Unknown",
        "ratio": "",
        "category": "Other Complex Issues"
    }
    
    if not text or len(text) < 50:
        return case_data
    
    # Extract case name (look for vs/v.)
    lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 10]
    for line in lines[:15]:
        if ' vs ' in line.lower() or ' v. ' in line.lower() or ' v ' in line.lower():
            case_data['case'] = line[:200]  # Limit length
            break
    
    # Extract TMI citation
    tmi_match = re.search(r'\d{4}\s*\(\d+\)\s*TMI\s*\d+', text)
    if tmi_match:
        case_data['citation'] = tmi_match.group(0)
    
    # Extract year
    years = re.findall(r'20\d{2}', text)
    if years:
        case_data['year'] = int(years[0])
    
    # Extract court
    text_lower = text.lower()
    if 'supreme court' in text_lower:
        case_data['court'] = "Supreme Court of India"
    elif 'high court' in text_lower:
        # Find which high court
        hc_patterns = ['karnataka', 'delhi', 'bombay', 'madras', 'calcutta', 'allahabad']
        for hc in hc_patterns:
            if hc in text_lower:
                case_data['court'] = f"{hc.title()} High Court"
                break
        if not case_data['court']:
            case_data['court'] = "High Court"
    
    # Detect outcome
    if 'taxpayer' in text_lower and ('favor' in text_lower or 'allowed' in text_lower):
        case_data['outcome'] = "Taxpayer Favorable"
    elif 'dismiss' in text_lower:
        case_data['outcome'] = "Dismissed"
    
    # Extract ratio (first substantial paragraph)
    paragraphs = [p.strip() for p in text.split('\n\n') if len(p.strip()) > 100]
    if paragraphs:
        case_data['ratio'] = paragraphs[0][:400]
    
    # Auto-categorize
    if 'supplier' in text_lower and 'not fil' in text_lower:
        case_data['category'] = "Supplier Non-Filing"
    elif 'time' in text_lower and 'bar' in text_lower:
        case_data['category'] = "Time-Barred Claims"
    elif 'fake' in text_lower or 'bogus' in text_lower:
        case_data['category'] = "Fake or Bogus Invoices"
    elif 'gstr' in text_lower and ('2a' in text_lower or 'mismatch' in text_lower):
        case_data['category'] = "Mismatch in GSTR-2A/2B"
    
    return case_data

# ============================================================================
# MAIN APP
# ============================================================================

# Hero
st.markdown("""
<div class="hero-section">
    <h1 class="hero-title">⚖️ ITC Denial Classifier</h1>
    <p style="font-size: 1.2rem; margin-top: 0.5rem;">Upload PDFs • AI Extracts • Build Knowledge Base</p>
</div>
""", unsafe_allow_html=True)

# Tabs
tab1, tab2, tab3 = st.tabs(["📝 Classify", "📤 Upload Cases", "📊 Knowledge Base"])

# ============================================================================
# TAB 2: UPLOAD (Main focus for now)
# ============================================================================

with tab2:
    st.markdown("### 📤 Upload Your Case PDFs")
    
    st.info("✨ Upload your PDF files below. Click Extract to process them automatically!")
    
    # File uploader
    uploaded_files = st.file_uploader(
        "Choose PDF files",
        type=['pdf', 'PDF'],
        accept_multiple_files=True,
        key="pdf_uploader",
        help="Select one or more PDF files to upload"
    )
    
    if uploaded_files:
        st.success(f"✅ **{len(uploaded_files)} file(s) uploaded successfully!**")
        
        # Show file list
        with st.expander(f"📄 View {len(uploaded_files)} uploaded files"):
            for f in uploaded_files[:10]:  # Show first 10
                st.text(f"• {f.name} ({f.size / 1024:.1f} KB)")
            if len(uploaded_files) > 10:
                st.text(f"... and {len(uploaded_files) - 10} more files")
        
        st.markdown("---")
        
        # Extract button with better handling
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            extract_clicked = st.button(
                "🤖 Extract Case Details from All Files",
                type="primary",
                use_container_width=True,
                key="extract_button"
            )
        
        # Process extraction
        if extract_clicked:
            st.session_state.extraction_done = False
            st.session_state.extracted_cases = []
            
            # Progress tracking
            progress_bar = st.progress(0)
            status_text = st.empty()
            
            success_count = 0
            error_count = 0
            
            for idx, uploaded_file in enumerate(uploaded_files):
                try:
                    # Update status
                    status_text.info(f"⚙️ Processing {idx+1}/{len(uploaded_files)}: **{uploaded_file.name}**")
                    
                    # Reset file pointer
                    uploaded_file.seek(0)
                    
                    # Extract text
                    text = extract_text_simple(uploaded_file)
                    
                    # Extract case data
                    if text:
                        case_data = smart_extract_case_data(text, uploaded_file.name)
                        st.session_state.extracted_cases.append(case_data)
                        success_count += 1
                    else:
                        error_count += 1
                        st.warning(f"⚠️ Could not extract text from {uploaded_file.name}")
                    
                    # Update progress
                    progress_bar.progress((idx + 1) / len(uploaded_files))
                    
                except Exception as e:
                    error_count += 1
                    st.error(f"❌ Error processing {uploaded_file.name}: {str(e)}")
            
            # Complete
            progress_bar.progress(1.0)
            status_text.success(f"✅ **Extraction Complete!** Success: {success_count} | Errors: {error_count}")
            
            st.session_state.extraction_done = True
            
            st.balloons()
            time.sleep(1)
            st.rerun()
    
    # Display extracted cases
    if st.session_state.extracted_cases:
        st.markdown("---")
        st.markdown(f"### ✏️ Review Extracted Cases ({len(st.session_state.extracted_cases)})")
        
        st.info("👉 Review the extracted information below. Edit if needed, then approve to add to your knowledge base.")
        
        # Bulk actions
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("✅ Approve All Cases", use_container_width=True):
                for case in st.session_state.extracted_cases:
                    category = case['category']
                    if category not in st.session_state.knowledge_base:
                        st.session_state.knowledge_base[category] = {
                            "case_law": [], "sections": [], "circulars": [],
                            "defence_points": [], "evidence_checklist": [], "success_rate": "Medium"
                        }
                    st.session_state.knowledge_base[category]['case_law'].append({
                        "case": case['case'],
                        "citation": case['citation'],
                        "court": case['court'],
                        "year": case['year'],
                        "outcome": case['outcome'],
                        "ratio": case['ratio']
                    })
                
                st.success(f"🎉 Added {len(st.session_state.extracted_cases)} cases to knowledge base!")
                st.session_state.extracted_cases = []
                time.sleep(2)
                st.rerun()
        
        with col2:
            if st.button("🗑️ Clear All", use_container_width=True):
                st.session_state.extracted_cases = []
                st.rerun()
        
        # Show individual cases
        for idx, case in enumerate(st.session_state.extracted_cases[:20]):  # Show first 20
            with st.expander(f"📄 {case['case'][:80]}...", expanded=(idx < 3)):
                col1, col2 = st.columns(2)
                
                with col1:
                    st.text_input("Case Name", value=case['case'], key=f"cn_{idx}", disabled=True)
                    st.text_input("Citation", value=case['citation'], key=f"ct_{idx}", disabled=True)
                    st.text_input("Court", value=case['court'], key=f"co_{idx}", disabled=True)
                
                with col2:
                    st.number_input("Year", value=case['year'], key=f"yr_{idx}", disabled=True)
                    st.selectbox("Outcome", ["Taxpayer Favorable", "Revenue Favorable", "Dismissed", "Unknown"],
                                index=["Taxpayer Favorable", "Revenue Favorable", "Dismissed", "Unknown"].index(case['outcome']),
                                key=f"oc_{idx}", disabled=True)
                    st.selectbox("Category", CATEGORIES, index=CATEGORIES.index(case['category']),
                                key=f"cat_{idx}", disabled=True)
                
                st.text_area("Ratio", value=case['ratio'], height=100, key=f"rt_{idx}", disabled=True)
        
        if len(st.session_state.extracted_cases) > 20:
            st.info(f"📋 Showing first 20 of {len(st.session_state.extracted_cases)} cases. Approve All to add them all!")

# ============================================================================
# TAB 3: KNOWLEDGE BASE
# ============================================================================

with tab3:
    st.markdown("### 📊 Your Knowledge Base")
    
    if st.session_state.knowledge_base:
        total_cases = sum(len(cat.get('case_law', [])) for cat in st.session_state.knowledge_base.values())
        
        col1, col2, col3 = st.columns(3)
        col1.metric("Categories", len(st.session_state.knowledge_base))
        col2.metric("Total Cases", total_cases)
        col3.metric("Files Processed", len(st.session_state.extracted_cases))
        
        st.markdown("---")
        
        for category, data in st.session_state.knowledge_base.items():
            with st.expander(f"📁 {category} ({len(data.get('case_law', []))} cases)"):
                for case in data.get('case_law', []):
                    st.markdown(f"**{case['case']}**")
                    st.caption(f"Citation: {case.get('citation', 'N/A')} | Court: {case.get('court', 'N/A')}")
                    st.markdown("---")
        
        # Export
        st.markdown("### 📥 Export")
        export_json = json.dumps(st.session_state.knowledge_base, indent=2)
        st.download_button(
            "📄 Download Knowledge Base (JSON)",
            data=export_json,
            file_name=f"knowledge_base_{datetime.now().strftime('%Y%m%d')}.json",
            mime="application/json"
        )
    else:
        st.info("📤 No cases yet! Upload PDFs in the 'Upload Cases' tab to build your knowledge base.")

# ============================================================================
# TAB 1: CLASSIFY (Simplified for now)
# ============================================================================

with tab1:
    st.markdown("### 📝 Quick Classification Test")
    
    denial_text = st.text_area("Enter denial reason:", height=100,
                                placeholder="Paste denial text here to test classification...")
    
    if st.button("🔍 Classify", key="classify_btn"):
        if denial_text:
            st.info("🤖 Classification feature coming soon! For now, focus on building your knowledge base.")
        else:
            st.warning("Please enter denial text")

# Sidebar
with st.sidebar:
    st.markdown("### 📊 Stats")
    total = sum(len(c.get('case_law', [])) for c in st.session_state.knowledge_base.values())
    st.metric("Cases in KB", total)
    st.metric("Pending", len(st.session_state.extracted_cases))
    
    st.markdown("---")
    st.info("""
    **Quick Guide:**
    1. Upload PDFs in Upload tab
    2. Click Extract button
    3. Review extracted data
    4. Click Approve All
    5. Cases added to KB!
    """)
    
    if st.button("🔄 Reset All Data"):
        st.session_state.knowledge_base = {}
        st.session_state.extracted_cases = []
        st.session_state.extraction_done = False
        st.rerun()
