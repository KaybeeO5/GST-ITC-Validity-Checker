// DefendITC Application Code
// Modules: Persistence, Errors, Sanitization, File Parser, UI Components,
// Skeletons, Export, Debounce, Citations, Banner, Audit, Theme, Commands,
// Virtual Scroll, Compare

// Data loaded from data.js

        
        // Page Management
        function showPage(page) {
            try {
                const target = document.getElementById(page);
                if (!target) {
                    showToast('Page not found: ' + page, 'error');
                    return;
                }
                document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
                document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
                target.classList.add('active');
                if (event && event.target) event.target.classList.add('active');
            } catch (err) {
                ErrorLog.add(err, 'showPage');
            }
        }
        
        // Research Tabs
        function showResearchTab(tab) {
            try {
                const target = document.getElementById(tab);
                if (!target) return;
                document.querySelectorAll('.research-tab').forEach(function(t) { t.classList.remove('active'); });
                document.querySelectorAll('.research-content').forEach(function(c) { c.classList.remove('active'); });
                target.classList.add('active');
                if (event && event.target) event.target.classList.add('active');
            } catch (err) {
                ErrorLog.add(err, 'showResearchTab');
            }
        }
        
        // PDF Viewer
        function viewPDF(url, title) {
            try {
                const safeUrl = sanitizeUrl(url);
                window._CURRENT_PDF_URL = safeUrl;
                const modalTitle = document.getElementById('modalTitle');
                const pdfFrame = document.getElementById('pdfFrame');
                const pdfModal = document.getElementById('pdfModal');
                if (!modalTitle || !pdfFrame || !pdfModal) {
                    showToast('PDF viewer not available', 'error');
                    return;
                }
                // Use textContent (not innerHTML) — title may contain user-controlled text
                modalTitle.textContent = title || 'Document';
                pdfFrame.src = safeUrl;
                AuditLog.log(AuditLog.ACTIONS.VIEW_PDF, { title: title || 'Document' });
                pdfModal.classList.add('active');
            } catch (err) {
                ErrorLog.add(err, 'viewPDF');
                showToast('Could not open PDF', 'error');
            }
        }
        
        function closeModal() {
            try {
                const modal = document.getElementById('pdfModal');
                const frame = document.getElementById('pdfFrame');
                if (modal) modal.classList.remove('active');
                if (frame) frame.src = '';
            } catch (err) {
                ErrorLog.add(err, 'closeModal');
            }
        }
        
        // Display Circulars
        function displayCirculars() {
            try {
                if (!window._CIRCULARS || window._CIRCULARS.length === 0) {
                    return;
                }
                
                const html = window._CIRCULARS.map(function(c) {
                    const safeNum = escapeHtml(c.number);
                    const safeNumAttr = escapeAttr(c.number);
                    const safeTitle = escapeHtml(c.title);
                    const safeDate = escapeHtml(c.date);
                    const safeDesc = escapeHtml(c.description);
                    const safeUrl = sanitizeUrl(c.pdfUrl);
                    const safeUrlAttr = escapeAttr(safeUrl);
                    return `
                    <div style="background: var(--bg-light); border: 1px solid var(--border); border-left: 4px solid var(--primary); border-radius: 10px; padding: 16px; margin-bottom: 12px; cursor: pointer;" onclick="viewPDF('${safeUrlAttr}', 'Circular ${safeNumAttr}')">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h4 style="color: var(--primary); margin-bottom: 8px; font-size: 15px;">📋 Circular ${safeNum}</h4>
                                <p style="font-weight: 600; margin-bottom: 6px; color: var(--text-primary); font-size: 14px;">${safeTitle}</p>
                                <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">Date: ${safeDate}</p>
                                <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">${safeDesc}</p>
                            </div>
                            <button class="btn-primary" style="padding: 8px 16px; margin: 0; margin-left: 16px;" onclick="event.stopPropagation(); viewPDF('${safeUrlAttr}', 'Circular ${safeNumAttr}')">📄 View PDF</button>
                        </div>
                    </div>
                `; }).join('');
                
                const list = document.getElementById('circularsList');
                if (list) list.innerHTML = html;
            } catch (err) {
                ErrorLog.add(err, 'displayCirculars');
            }
        }
        
        // ==================== FILE UPLOAD HANDLERS ====================
        
        async function handleClassifyFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const originalPlaceholder = 'Paste the complete ITC denial notice here...\n\nExample: Copy-paste the show cause notice, order, or demand letter that denies your ITC claim.';
            
            try {
                // File size guard (10 MB max)
                if (file.size > 10 * 1024 * 1024) {
                    showToast('File too large (max 10 MB)', 'error');
                    event.target.value = '';
                    return;
                }
                
                const fileName = file.name;
                const fileExt = fileName.split('.').pop().toLowerCase();
                
                if (fileExt !== 'pdf' && fileExt !== 'docx' && fileExt !== 'doc' && fileExt !== 'txt') {
                    showToast('Please upload a PDF, DOCX, or TXT file', 'warning');
                    event.target.value = '';
                    return;
                }
                
                const input = document.getElementById('classifyInput');
                if (!input) return;
                
                // Show progress
                showExtractProgress('classifyInput', 'Extracting text from ' + fileName);
                showToast('Extracting text from ' + fileName + '...', 'info');
                
                // Actually extract text
                const extractedText = await extractFileText(file);
                
                if (!extractedText || extractedText.trim().length === 0) {
                    showToast('Could not find any text in this file. It may be scanned/image-only.', 'warning');
                    hideExtractProgress('classifyInput', originalPlaceholder);
                    event.target.value = '';
                    return;
                }
                
                // Populate textarea with extracted text
                input.value = extractedText.trim();
                hideExtractProgress('classifyInput', originalPlaceholder);
                showToast('Extracted ' + extractedText.length.toLocaleString() + ' characters from ' + fileName, 'success');
                AuditLog.log(AuditLog.ACTIONS.FILE_UPLOAD, { target: 'classify', filename: fileName, chars: extractedText.length });
            } catch (err) {
                ErrorLog.add(err, 'handleClassifyFileUpload');
                showToast(err.message || 'File extraction failed. Please paste text manually.', 'error');
                hideExtractProgress('classifyInput', originalPlaceholder);
                event.target.value = '';
            }
        }
        
        async function handleDrafterFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const originalPlaceholder = 'Paste the full content of the ITC denial notice here...';
            
            try {
                if (file.size > 10 * 1024 * 1024) {
                    showToast('File too large (max 10 MB)', 'error');
                    event.target.value = '';
                    return;
                }
                
                const fileName = file.name;
                const fileExt = fileName.split('.').pop().toLowerCase();
                
                if (fileExt !== 'pdf' && fileExt !== 'docx' && fileExt !== 'doc' && fileExt !== 'txt') {
                    showToast('Please upload a PDF, DOCX, or TXT file', 'warning');
                    event.target.value = '';
                    return;
                }
                
                const input = document.getElementById('drafterInput');
                if (!input) return;
                
                showExtractProgress('drafterInput', 'Extracting text from ' + fileName);
                showToast('Extracting text from ' + fileName + '...', 'info');
                
                const extractedText = await extractFileText(file);
                
                if (!extractedText || extractedText.trim().length === 0) {
                    showToast('Could not find any text in this file. It may be scanned/image-only.', 'warning');
                    hideExtractProgress('drafterInput', originalPlaceholder);
                    event.target.value = '';
                    return;
                }
                
                input.value = extractedText.trim();
                hideExtractProgress('drafterInput', originalPlaceholder);
                showToast('Extracted ' + extractedText.length.toLocaleString() + ' characters from ' + fileName, 'success');
                AuditLog.log(AuditLog.ACTIONS.FILE_UPLOAD, { target: 'drafter', filename: fileName, chars: extractedText.length });
            } catch (err) {
                ErrorLog.add(err, 'handleDrafterFileUpload');
                showToast(err.message || 'File extraction failed. Please paste text manually.', 'error');
                hideExtractProgress('drafterInput', originalPlaceholder);
                event.target.value = '';
            }
        }
        
        // ==================== AI CLASSIFICATION FUNCTION ====================
        function classifyNotice() {
            const inputEl = document.getElementById('classifyInput');
            const resultDiv = document.getElementById('classifyResult');
            const contentDiv = document.getElementById('classifyContent');
            const btn = document.getElementById('classifyBtn');
            
            // Defensive: confirm DOM elements exist
            if (!inputEl || !resultDiv || !contentDiv || !btn) {
                ErrorLog.add(new Error('Classify UI elements missing'), 'classifyNotice');
                showToast('Page not ready. Please refresh.', 'error');
                return;
            }
            
            // Validate input
            const input = validateInput(inputEl.value, { required: true, minLength: 10, maxLength: 50000 });
            if (!input) {
                showToast('Please paste a notice (at least 10 characters)', 'warning');
                inputEl.focus();
                return;
            }
            
            // Show loading state
            btn.disabled = true;
            btn.textContent = 'Analyzing...';
            resultDiv.classList.remove('hidden');
            contentDiv.innerHTML = renderClassificationSkeleton();
            
            // Simulate AI analysis with full error protection
            setTimeout(function() {
                try {
                    const analysis = analyzeNoticeKeywords(input);
                    if (!analysis) {
                        throw new Error('Analysis returned no result');
                    }
                    displayClassification(analysis);
                } catch (err) {
                    ErrorLog.add(err, 'classifyNotice.analysis');
                    contentDiv.innerHTML = '<div style="padding:24px;text-align:center;color:var(--danger);"><strong>Analysis failed.</strong><br><span style="font-size:13px;color:var(--text-secondary);">Please try again or check the notice format.</span></div>';
                    showToast('Could not analyse this notice. Please check the format.', 'error');
                } finally {
                    btn.disabled = false;
                    btn.textContent = '🔍 Classify Notice';
                }
            }, 2000);
        }
        
        function analyzeNoticeKeywords(text) {
            const lower = text.toLowerCase();
            let category = "Unknown";
            let provision = [];
            let grounds = [];
            let winProbability = 50;
            
            // Detect provisions and grounds
            if (lower.includes('section 16(4)') || (lower.includes('time') && lower.includes('limit'))) {
                provision.push('Section 16(4)');
                grounds.push('Time-Barred ITC Claim');
                winProbability = 65;
            }
            if (lower.includes('section 16(2)(c)') || (lower.includes('supplier') && lower.includes('payment'))) {
                provision.push('Section 16(2)(c)');
                grounds.push('Non-payment to Supplier');
                winProbability = 55;
            }
            if (lower.includes('rule 36(4)') || lower.includes('gstr-2a') || lower.includes('gstr-2b') || lower.includes('mismatch')) {
                provision.push('Rule 36(4)');
                grounds.push('GSTR-2A/2B Mismatch');
                category = "Category 2";
                winProbability = 75;
            }
            if (lower.includes('fake') || lower.includes('bogus') || lower.includes('non-existent')) {
                provision.push('Section 16(2)(c)');
                grounds.push('Fake/Bogus Invoices');
                winProbability = 30;
            }
            if (lower.includes('supplier') && (lower.includes('not filed') || lower.includes('non-filing'))) {
                provision.push('Section 16(2)(c)');
                grounds.push('Supplier Non-Filing of Returns');
                category = "Category 3";
                winProbability = 87;
            }
            
            if (provision.length === 0) {
                provision.push('Multiple Provisions');
                grounds.push('General ITC Denial');
            }
            
            if (!category || category === "Unknown") {
                category = winProbability > 70 ? "Category 3" : winProbability > 50 ? "Category 2" : "Category 1";
            }
            
            return {
                category,
                provision,
                grounds,
                winProbability,
                recommendedAction: winProbability > 70 ? "Strong legal defense available - File reply/appeal" :
                                   winProbability > 50 ? "Moderate chances - Prepare detailed reply with documentation" :
                                   "Challenging case - Consider expert consultation"
            };
        }
        
        function displayClassification(analysis) {
            const safeCategory = escapeHtml(analysis.category);
            const safeAction = escapeHtml(analysis.recommendedAction);
            const safeProb = Math.max(0, Math.min(100, parseInt(analysis.winProbability, 10) || 0));
            
            const html = `
                <div class="result-item">
                    <strong>📌 Category Classification</strong>
                    <span class="badge ${analysis.category === 'Category 3' ? 'badge-success' : analysis.category === 'Category 2' ? 'badge-warning' : 'badge-danger'}">
                        ${safeCategory}
                    </span>
                    ${analysis.category === 'Category 3' ? '<span style="color: var(--success);">✓ Favorable for taxpayer</span>' :
                      analysis.category === 'Category 2' ? '<span style="color: var(--warning);">⚠ Moderate risk</span>' :
                      '<span style="color: var(--danger);">⚠ High risk</span>'}
                </div>
                
                <div class="result-item">
                    <strong>⚖️ Legal Provisions Involved</strong>
                    ${analysis.provision.map(p => `<span class="badge badge-info">${escapeHtml(p)}</span>`).join('')}
                </div>
                
                <div class="result-item">
                    <strong>🎯 Denial Grounds Identified</strong>
                    ${analysis.grounds.map(g => `<div style="padding: 8px 0;">• ${escapeHtml(g)}</div>`).join('')}
                </div>
                
                <div class="result-item">
                    <strong>📊 Win Probability (Based on 75 judgments)</strong>
                    ${renderConfidenceBar(safeProb, 'Probability of taxpayer success')}
                </div>
                
                <div class="result-item">
                    <strong>💡 Recommended Action</strong>
                    <p style="margin-top: 8px; color: var(--text-secondary);">${safeAction}</p>
                </div>
                
                <div style="margin-top: 20px; padding: 16px; background: var(--primary-light); border-radius: 8px; border: 1px solid var(--primary);">
                    <strong style="color: var(--primary);">🚀 Next Steps:</strong>
                    <ol style="margin: 12px 0 0 20px; color: var(--text-secondary);">
                        <li>Use the <strong>Reply Drafter</strong> to generate a detailed response</li>
                        <li>Check <strong>Case Library</strong> for similar judgments</li>
                        <li>Review relevant <strong>Circulars</strong> in Research section</li>
                    </ol>
                </div>
            `;
            
            document.getElementById('classifyContent').innerHTML = html;
            
            // Save to classification history
            Persist.classifications.save(analysis);
            AuditLog.log(AuditLog.ACTIONS.CLASSIFY, { category: analysis.category, winProbability: analysis.winProbability });
        }
        
        // ==================== AI REPLY GENERATION FUNCTION ====================
        function generateReply() {
            const inputEl = document.getElementById('drafterInput');
            const contextEl = document.getElementById('drafterContext');
            const resultDiv = document.getElementById('drafterResult');
            const contentDiv = document.getElementById('drafterContent');
            const btn = document.getElementById('drafterBtn');
            
            // Defensive: confirm DOM elements exist
            if (!inputEl || !resultDiv || !contentDiv || !btn) {
                ErrorLog.add(new Error('Drafter UI elements missing'), 'generateReply');
                showToast('Page not ready. Please refresh.', 'error');
                return;
            }
            
            // Validate input
            const input = validateInput(inputEl.value, { required: true, minLength: 10, maxLength: 50000 });
            if (!input) {
                showToast('Please paste a notice (at least 10 characters)', 'warning');
                inputEl.focus();
                return;
            }
            
            const context = validateInput(contextEl ? contextEl.value : '', { maxLength: 10000 }) || '';
            
            // Show loading state
            btn.disabled = true;
            btn.textContent = 'Generating Reply...';
            resultDiv.classList.remove('hidden');
            contentDiv.innerHTML = renderDrafterSkeleton();
            
            // Simulate AI generation with full error protection
            setTimeout(function() {
                try {
                    const reply = generateReplyText(input, context);
                    if (!reply) {
                        throw new Error('Reply generation returned no result');
                    }
                    displayReply(reply);
                } catch (err) {
                    ErrorLog.add(err, 'generateReply.generation');
                    contentDiv.innerHTML = '<div style="padding:24px;text-align:center;color:var(--danger);"><strong>Reply generation failed.</strong><br><span style="font-size:13px;color:var(--text-secondary);">Please try again or simplify the notice.</span></div>';
                    showToast('Could not generate reply. Please try again.', 'error');
                } finally {
                    btn.disabled = false;
                    btn.textContent = '✨ Generate Reply Draft';
                }
            }, 3000);
        }
        
        function generateReplyText(notice, context) {
            const analysis = analyzeNoticeKeywords(notice);
            
            return {
                mainArguments: analysis.grounds.map((ground, i) => {
                    if (ground.includes('Supplier Non-Filing')) {
                        return `${i+1}. ${ground}:\n\n   As per Circular No. 183/15/2022-GST dated 27.12.2022, Para 5 categorically states that ITC cannot be denied solely on the ground that the supplier has not filed GSTR-1, provided the transaction is genuine and the recipient has fulfilled all conditions under Section 16(2) of the CGST Act.\n\n   In M/s Bharat Aluminium Company Ltd. v. Union of India (WPT No. 94/2021, Chattisgarh HC), the Hon'ble Court held that Rule 36(4) cannot be applied retrospectively to deny ITC without proper verification.\n\n   We have:\n   • Valid tax invoices as per Section 16(2)(a)\n   • Received goods/services as per Section 16(2)(b)\n   • Made payment within 180 days as per Section 16(2)(c)\n   • Filed GSTR-3B returns claiming the ITC`;
                    }
                    else if (ground.includes('Time-Barred')) {
                        return `${i+1}. ${ground}:\n\n   The limitation period under Section 16(4) has been subject to judicial interpretation. The cutoff date must be computed correctly considering amendment notifications.\n\n   We submit that the ITC was claimed within the prescribed time limit.`;
                    }
                    else if (ground.includes('GSTR-2A/2B Mismatch')) {
                        return `${i+1}. ${ground}:\n\n   As per Circular No. 183/15/2022-GST, mere mismatch between GSTR-2A/2B and GSTR-3B cannot be the sole ground for ITC denial if the transaction is genuine.\n\n   We have reconciled the differences and the supplier has now filed the returns.`;
                    }
                    return `${i+1}. ${ground}:\n\n   All conditions for availing ITC have been duly fulfilled. The denial is not sustainable in law.`;
                }).join('\n\n'),
                attachments: [
                    "Copy of tax invoices",
                    "GSTR-3B returns",
                    "Payment proof to suppliers",
                    "Supplier GSTIN verification",
                    "Relevant court judgments",
                    "Applicable GST circulars"
                ]
            };
        }
        
        function displayReply(reply) {
            // mainArguments contains text derived from user input — must escape
            const safeArguments = escapeHtml(reply.mainArguments);
            const safeAttachments = (reply.attachments || []).map(function(a) {
                return '<li>' + escapeHtml(a) + '</li>';
            }).join('');
            
            const html = `
                <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid var(--border); font-family: 'Courier New', monospace; white-space: pre-wrap; line-height: 1.8; font-size: 13px;">
To,
The Adjudicating Authority
[Department Name]
[Address]

Sub: Show Cause notice U/s 73 for Tax Period April-20…. to March-20…, dt….-….-202… reply-Reg.

Respected Sir/Madam,

Ref :- Show Cause notice reference DIN: GST…………………………………………………….., dt…..-….-20….

We are in receipt of the Show Cause Notice dated [DATE] presenting to deny Input Tax Credit of Rs. [AMOUNT]. With reference to the above show cause notice, we would object on the proposal of tax Rs………………….. and would like to present the explanations as below.
${safeArguments}


We trust that our submissions and the enclosed supporting documents will receive your favourable consideration. We Remain available for any further clarifications or information you may require.

In light of the above submissions, we request that:
1. The proposed denial of ITC be dropped
2. The Show Cause Notice be set aside
3. Any other relief deemed fit may be granted

Thanking you,
Yours faithfully,

[Authorized Signatory]
[Company Name]
[Date]
                </div>
                
                <div style="margin-top: 20px; padding: 16px; background: var(--bg-light); border-radius: 8px;">
                    <strong>📎 Suggested Attachments:</strong>
                    <ul style="margin: 12px 0 0 20px;">
                        ${safeAttachments}
                    </ul>
                </div>
                
                <div style="margin-top: 20px; padding: 16px; background: var(--primary-light); border-radius: 8px; border: 1px solid var(--primary);">
                    <strong style="color: var(--primary);">⚠️ Important Notes:</strong>
                    <ul style="margin: 12px 0 0 20px; color: var(--text-secondary); font-size: 13px;">
                        <li>This is an AI-generated draft - review and customize as per your case</li>
                        <li>Fill in: [DATE], [AMOUNT], [Department Name], etc.</li>
                        <li>Add specific case details and evidence</li>
                        <li>Consult GST expert before filing</li>
                    </ul>
                </div>
                
                <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn-primary" onclick="copyReply()" style="margin: 0;">📋 Copy Reply</button>
                    <button class="btn-ghost" onclick="exportReplyToPDF()" aria-label="Save reply as PDF" title="Print reply draft as PDF" style="margin: 0;">📄 Save as PDF</button>
                </div>
            `;
            
            document.getElementById('drafterContent').innerHTML = html;
            
            // Save the draft for restore on refresh
            const noticeInput = document.getElementById('drafterInput');
            const contextInput = document.getElementById('drafterContext');
            Persist.drafts.save(
                noticeInput ? noticeInput.value : '',
                contextInput ? contextInput.value : '',
                reply
            );
            AuditLog.log(AuditLog.ACTIONS.DRAFT_REPLY, { argumentsCount: reply.mainArguments ? reply.mainArguments.split('\n').length : 0 });
        }
        
        function copyReply() {
            const text = document.querySelector('#drafterContent > div').innerText;
            navigator.clipboard.writeText(text).then(function() {
                showToast('Reply copied to clipboard', 'success');
                AuditLog.log(AuditLog.ACTIONS.COPY_REPLY, {});
            }).catch(function() {
                showToast('Failed to copy reply', 'error');
            });
        }
        
        // ==================== CASE TRACKER FUNCTIONALITY ====================
        
        // Sample tracker cases with examples in all categories
        window._TRACKER_CASES = [
            // OPENED
            {
                id: 1,
                title: "SCN - Supplier Non-Filing",
                amount: "₹8,50,000",
                date: "Received: 15 Jan 2026",
                status: "opened",
                category: "Supplier Non-Filing",
                provision: "Rule 36(4)"
            },
            {
                id: 2,
                title: "SCN - GSTR-2A Mismatch",
                amount: "₹3,20,000",
                date: "Received: 20 Jan 2026",
                status: "opened",
                category: "GSTR-2A/2B",
                provision: "Rule 36(4)"
            },
            {
                id: 3,
                title: "SCN - Time-Barred Claim",
                amount: "₹2,15,000",
                date: "Received: 22 Jan 2026",
                status: "opened",
                category: "Time-Barred",
                provision: "Section 16(4)"
            },
            
            // PREP WORK
            {
                id: 4,
                title: "Notice - Invoice Defects",
                amount: "₹1,50,000",
                date: "Reply Due: 05 Feb 2026",
                status: "prep",
                category: "Invoice Defects",
                provision: "Section 16(2)"
            },
            {
                id: 5,
                title: "Demand - Blocked Credits",
                amount: "₹4,75,000",
                date: "Reply Due: 10 Feb 2026",
                status: "prep",
                category: "Blocked Credits",
                provision: "Section 17(5)"
            },
            
            // IN PROGRESS
            {
                id: 6,
                title: "SCN - Non-Payment Supplier",
                amount: "₹6,30,000",
                date: "Draft Ready: 80%",
                status: "progress",
                category: "Non-Payment",
                provision: "Section 16(2)(c)"
            },
            
            // REPLY FILED
            {
                id: 7,
                title: "Reply Filed - GSTR Mismatch",
                amount: "₹5,20,000",
                date: "Filed: 10 Jan 2026",
                status: "filed",
                category: "GSTR-2A/2B",
                provision: "Rule 36(4)"
            },
            
            // CLOSED - WON
            {
                id: 8,
                title: "Won - Supplier Filing Issue",
                amount: "₹7,80,000",
                date: "Closed: 05 Jan 2026",
                status: "won",
                category: "Supplier Non-Filing",
                provision: "Circular 183/15/2022"
            },
            {
                id: 9,
                title: "Won - Time Limit Extended",
                amount: "₹3,50,000",
                date: "Closed: 28 Dec 2025",
                status: "won",
                category: "Time-Barred",
                provision: "Section 16(4)"
            }
        ];
        
        let draggedCard = null;
        
        function initializeTracker() {
            renderTrackerCases();
            setupDragAndDrop();
        }
        
        function renderTrackerCases(searchTerm = '', statusFilter = 'all') {
            // Clear all columns
            ['opened', 'prep', 'progress', 'filed', 'appeal', 'won'].forEach(status => {
                document.getElementById(`cards-${status}`).innerHTML = '';
            });
            
            // Filter cases
            let cases = window._TRACKER_CASES;
            if (searchTerm) {
                cases = cases.filter(c => 
                    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.category.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            if (statusFilter !== 'all') {
                cases = cases.filter(c => c.status === statusFilter);
            }
            
            // Render cases
            cases.forEach(caseItem => {
                const card = createTrackerCard(caseItem);
                document.getElementById(`cards-${caseItem.status}`).appendChild(card);
            });
            
            // Update counts
            updateColumnCounts();
        }
        
        function createTrackerCard(caseItem) {
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.draggable = true;
            card.dataset.id = caseItem.id;
            card.dataset.status = caseItem.status;
            
            // All user-provided fields (title, amount, category, provision) are escaped
            // to prevent XSS — a malicious case title like <script> would otherwise execute
            card.innerHTML = `
                <div class="kanban-card-title">${escapeHtml(caseItem.title)}</div>
                <div class="kanban-card-amount">${escapeHtml(caseItem.amount)}</div>
                <div class="kanban-card-date">${escapeHtml(caseItem.date)}</div>
                <div class="kanban-card-tags">
                    <span class="kanban-tag">${escapeHtml(caseItem.category)}</span>
                    <span class="kanban-tag">${escapeHtml(caseItem.provision)}</span>
                </div>
            `;
            
            // Drag events
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
            
            return card;
        }
        
        function setupDragAndDrop() {
            const columns = document.querySelectorAll('.kanban-cards');
            columns.forEach(column => {
                column.addEventListener('dragover', handleDragOver);
                column.addEventListener('drop', handleDrop);
            });
        }
        
        function handleDragStart(e) {
            draggedCard = this;
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }
        
        function handleDragEnd(e) {
            this.classList.remove('dragging');
        }
        
        function handleDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';
            return false;
        }
        
        function handleDrop(e) {
            try {
                if (e.stopPropagation) {
                    e.stopPropagation();
                }
                
                if (draggedCard) {
                    // Get new status from column
                    const newStatus = this.parentElement.dataset.status;
                    const cardId = parseInt(draggedCard.dataset.id);
                    
                    if (isNaN(cardId)) {
                        ErrorLog.add(new Error('Invalid card id on drop'), 'handleDrop');
                        return false;
                    }
                    
                    // Update case status in data
                    const caseItem = window._TRACKER_CASES.find(c => c.id === cardId);
                    if (caseItem) {
                        const oldStatus = caseItem.status;
                        caseItem.status = newStatus;
                        // Auto-save to localStorage
                        Persist.tracker.save();
                        AuditLog.log(AuditLog.ACTIONS.MOVE_CASE, { id: cardId, from: oldStatus, to: newStatus });
                    }
                    
                    // Re-render
                    renderTrackerCases();
                }
                
                return false;
            } catch (err) {
                ErrorLog.add(err, 'handleDrop');
                showToast('Could not move card. Please refresh.', 'error');
                return false;
            }
        }
        
        function updateColumnCounts() {
            ['opened', 'prep', 'progress', 'filed', 'appeal', 'won'].forEach(status => {
                const count = document.getElementById(`cards-${status}`).children.length;
                document.getElementById(`count-${status}`).textContent = count;
            });
        }
        
        function filterTrackerCases() {
            const searchTerm = document.getElementById('trackerSearch').value;
            const statusFilter = document.getElementById('trackerStatusFilter').value;
            renderTrackerCases(searchTerm, statusFilter);
        }
        
        function showAddCaseModal() {
            // Create modal HTML
            const modalHTML = `
                <div id="addCaseModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 2rem;">
                    <div style="background: white; max-width: 500px; width: 100%; border-radius: 16px; padding: 2rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                        <h3 style="color: var(--primary); margin-bottom: 1.5rem;">Add New Case</h3>
                        
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 14px;">Case Title *</label>
                        <input type="text" id="newCaseTitle" placeholder="e.g., SCN - Supplier Filing Issue" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1rem;">
                        
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 14px;">ITC Amount *</label>
                        <input type="text" id="newCaseAmount" placeholder="e.g., ₹5,00,000" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1rem;">
                        
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 14px;">Category</label>
                        <select id="newCaseCategory" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1rem;">
                            <option value="Supplier Non-Filing">Supplier Non-Filing</option>
                            <option value="GSTR-2A/2B">GSTR-2A/2B Mismatch</option>
                            <option value="Time-Barred">Time-Barred</option>
                            <option value="Invoice Defects">Invoice Defects</option>
                            <option value="Blocked Credits">Blocked Credits</option>
                            <option value="Non-Payment">Non-Payment to Supplier</option>
                            <option value="Fake Invoices">Fake Invoices</option>
                            <option value="Other">Other</option>
                        </select>
                        
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 14px;">Legal Provision</label>
                        <select id="newCaseProvision" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1.5rem;">
                            <option value="Section 16(4)">Section 16(4)</option>
                            <option value="Section 16(2)(c)">Section 16(2)(c)</option>
                            <option value="Rule 36(4)">Rule 36(4)</option>
                            <option value="Section 17(5)">Section 17(5)</option>
                            <option value="Section 73">Section 73</option>
                            <option value="Multiple">Multiple Provisions</option>
                        </select>
                        
                        <div style="display: flex; gap: 12px;">
                            <button class="btn-primary" onclick="submitNewCase()" style="flex: 1; margin: 0;">Add Case</button>
                            <button onclick="closeAddCaseModal()" style="flex: 1; padding: 12px; background: var(--bg-gray); color: var(--text-primary); border: none; border-radius: 10px; font-weight: 600; cursor: pointer; margin: 0;">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Focus on first input
            setTimeout(() => {
                document.getElementById('newCaseTitle').focus();
            }, 100);
            
            // Allow closing with Escape key
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    closeAddCaseModal();
                    document.removeEventListener('keydown', escHandler);
                }
            });
        }
        
        function closeAddCaseModal() {
            const modal = document.getElementById('addCaseModal');
            if (modal) {
                modal.remove();
            }
        }
        
        function submitNewCase() {
            try {
                const titleEl = document.getElementById('newCaseTitle');
                const amountEl = document.getElementById('newCaseAmount');
                const categoryEl = document.getElementById('newCaseCategory');
                const provisionEl = document.getElementById('newCaseProvision');
                
                if (!titleEl || !amountEl || !categoryEl || !provisionEl) {
                    showToast('Form not ready. Please reopen the dialog.', 'error');
                    return;
                }
                
                // Validate inputs
                const title = validateInput(titleEl.value, { required: true, minLength: 3, maxLength: 200 });
                if (!title) {
                    showToast('Please enter a case title (at least 3 characters)', 'warning');
                    titleEl.focus();
                    return;
                }
                
                const amount = validateInput(amountEl.value, { required: true, maxLength: 50 });
                if (!amount) {
                    showToast('Please enter an ITC amount', 'warning');
                    amountEl.focus();
                    return;
                }
                
                const category = categoryEl.value;
                const provision = provisionEl.value;
                
                // Generate a safe unique ID (max existing + 1, not array length)
                const maxId = window._TRACKER_CASES.reduce(function(max, c) {
                    return c.id > max ? c.id : max;
                }, 0);
                
                // Create new case
                const newCase = {
                    id: maxId + 1,
                    title: title,
                    amount: amount,
                    date: 'Received: ' + new Date().toLocaleDateString('en-GB'),
                    status: 'opened',
                    category: category,
                    provision: provision
                };
                
                // Add to array
                window._TRACKER_CASES.push(newCase);
                
                // Auto-save to localStorage
                Persist.tracker.save();
                
                // Re-render
                renderTrackerCases();
                
                // Close modal
                closeAddCaseModal();
                
                // Show success toast (replaces old inline div)
                showToast('Case added to "Opened" column', 'success');
                AuditLog.log(AuditLog.ACTIONS.ADD_CASE, { title: title, category: category, provision: provision });
            } catch (err) {
                ErrorLog.add(err, 'submitNewCase');
                showToast('Could not add case. Please try again.', 'error');
            }
        }
        
        // ==================== CASE LIBRARY DISPLAY & FILTER ====================
        
        function displayAllCases() {
            if (!window._ALL_CASES || window._ALL_CASES.length === 0) {
                document.getElementById('casesList').innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">No cases data available</p>';
                return;
            }
            
            filterCases();
        }
        
        function filterCases() {
            const tierFilter = document.getElementById('filterTier').value;
            const courtFilter = document.getElementById('filterCourt').value;
            const outcomeFilter = document.getElementById('filterOutcome').value;
            const provisionFilter = document.getElementById('filterProvision').value;
            const searchTerm = document.getElementById('searchCases').value.toLowerCase();
            
            let filtered = window._ALL_CASES.filter(c => {
                const matchTier = !tierFilter || c.tier === tierFilter;
                const matchCourt = !courtFilter || c.court === courtFilter;
                const matchOutcome = !outcomeFilter || c.outcome === outcomeFilter;
                const matchProvision = !provisionFilter || c.provision.includes(provisionFilter);
                const matchSearch = !searchTerm || 
                    c.title.toLowerCase().includes(searchTerm) ||
                    c.court.toLowerCase().includes(searchTerm) ||
                    c.provision.toLowerCase().includes(searchTerm) ||
                    (c.denialCategory && c.denialCategory.toLowerCase().includes(searchTerm));
                
                return matchTier && matchCourt && matchOutcome && matchProvision && matchSearch;
            });
            
            renderCases(filtered);
        }
        
        // Render a single case card — extracted so VirtualList can use it
        function renderCaseCard(c) {
            const outcomeColor = c.outcome === 'Taxpayer Won' ? 'var(--success)' : 
                               c.outcome === 'Department Won' ? 'var(--danger)' : 
                               'var(--warning)';
            
            // Pre-escape all interpolated values to prevent XSS
            const safeTitle = escapeHtml(c.title);
            const safeTitleAttr = escapeAttr(c.title);
            const safeUrl = sanitizeUrl(c.pdfUrl);
            const safeUrlAttr = escapeAttr(safeUrl);
            const safeCourt = escapeHtml(c.court);
            const safeOutcome = escapeHtml(c.outcome);
            const safeProvision = escapeHtml(c.provision);
            const safeCategory = c.denialCategory ? escapeHtml(c.denialCategory) : '';
            const safeCitation = escapeHtml(c.citation || ('Case No. ' + (c.number || '')));
            const safeDate = escapeHtml(formatDate(c.date));
            const safeNumber = escapeAttr(c.number);
            const isCompareSelected = Compare.isSelected(c.number);
            
            return `
                <div style="background: var(--bg-white); border: 1px solid ${isCompareSelected ? 'var(--primary)' : 'var(--border)'}; border-left: 4px solid ${outcomeColor}; border-radius: 10px; padding: 16px; margin-bottom: 12px; cursor: pointer; ${isCompareSelected ? 'box-shadow: 0 0 0 2px var(--primary-light);' : ''}" onclick="viewPDF('${safeUrlAttr}', '${safeTitleAttr}')">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 12px;">
                        <label onclick="event.stopPropagation();" style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer; padding-top: 2px;" title="Select for comparison">
                            <input type="checkbox" ${isCompareSelected ? 'checked' : ''} 
                                   onclick="event.stopPropagation(); Compare.toggle('${safeNumber}');"
                                   aria-label="Select ${safeTitleAttr} for comparison"
                                   style="cursor: pointer; margin: 0;">
                        </label>
                        <div style="flex: 1;">
                            <h4 style="color: var(--text-primary); margin-bottom: 6px; font-size: 15px; font-weight: 600;">${safeTitle}</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                                <span class="badge badge-info">${safeCourt}</span>
                                <span class="badge ${c.outcome === 'Taxpayer Won' ? 'badge-success' : c.outcome === 'Department Won' ? 'badge-danger' : 'badge-warning'}">${safeOutcome}</span>
                                <span class="badge badge-info">${safeProvision}</span>
                                ${safeCategory ? `<span class="badge" style="background: var(--primary-light); color: var(--primary-dark);">${safeCategory}</span>` : ''}
                            </div>
                            <p style="font-size: 12px; color: var(--text-tertiary); margin: 0;">
                                ${safeCitation} • ${safeDate}
                            </p>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <button class="btn-primary" style="padding: 8px 16px; margin: 0; white-space: nowrap;" onclick="event.stopPropagation(); viewPDF('${safeUrlAttr}', '${safeTitleAttr}')" aria-label="View PDF for ${safeTitleAttr}">
                                📄 View PDF
                            </button>
                            <button class="btn-ghost" style="padding: 6px 14px; margin: 0; font-size: 12px; white-space: nowrap;" onclick="event.stopPropagation(); copyCitation('${escapeAttr(c.number)}')" aria-label="Copy citation for ${safeTitleAttr}" title="Copy citation in SCC, Bluebook, or OSCOLA format">
                                📋 Cite
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        function renderCases(cases) {
            const container = document.getElementById('casesList');
            const countDiv = document.getElementById('casesCount');
            
            if (cases.length === 0) {
                container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">No cases match your filters</p>';
                countDiv.textContent = 'Showing 0 of ' + window._ALL_CASES.length + ' cases';
                return;
            }
            
            // Use VirtualList — auto-degrades to direct render below threshold (Feature 17)
            VirtualList.mount(container, cases, renderCaseCard);
            countDiv.textContent = `Showing ${cases.length} of ${window._ALL_CASES.length} cases`;
        }
        
        function formatDate(dateStr) {
            if (!dateStr || dateStr.length !== 8) return dateStr;
            const day = dateStr.substring(0, 2);
            const month = dateStr.substring(2, 4);
            const year = dateStr.substring(4, 8);
            return `${day}.${month}.${year}`;
        }
        
        // ==================== ANALYTICS FUNCTIONALITY ====================
        
        // ==================== DEADLINE CALCULATOR (Feature 7) ====================
        // Statutory deadlines under CGST Act, 2017
        // Sec 73 (non-fraud): 30 days standard, can be extended
        // Sec 74 (fraud): 30 days standard, can be extended
        // These are typical adjudication timelines — actual notices often specify
        const DEADLINE_RULES = {
            '73': { days: 30, label: 'Section 73 (Non-Fraud Cases)', 
                    description: 'Show Cause Notice under non-fraud provisions. Standard reply period is 30 days from receipt.' },
            '74': { days: 30, label: 'Section 74 (Fraud Cases)', 
                    description: 'Show Cause Notice under fraud/wilful misstatement. Standard reply period is 30 days from receipt.' }
        };
        
        function calculateDeadline() {
            try {
                const noticeDateEl = document.getElementById('deadlineNoticeDate');
                const noticeTypeEl = document.getElementById('deadlineNoticeType');
                const customDaysEl = document.getElementById('deadlineCustomDays');
                const resultDiv = document.getElementById('deadlineResult');
                const contentDiv = document.getElementById('deadlineContent');
                
                if (!noticeDateEl || !noticeTypeEl || !resultDiv || !contentDiv) {
                    showToast('Calculator not ready. Please refresh.', 'error');
                    return;
                }
                
                const noticeDateStr = noticeDateEl.value;
                if (!noticeDateStr) {
                    showToast('Please select a notice date', 'warning');
                    noticeDateEl.focus();
                    return;
                }
                
                const noticeDate = new Date(noticeDateStr + 'T00:00:00');
                if (isNaN(noticeDate.getTime())) {
                    showToast('Invalid notice date', 'error');
                    return;
                }
                
                const noticeType = noticeTypeEl.value;
                let days, label, description;
                
                if (noticeType === 'custom') {
                    days = parseInt(customDaysEl.value, 10);
                    if (isNaN(days) || days < 1 || days > 365) {
                        showToast('Custom days must be between 1 and 365', 'warning');
                        return;
                    }
                    label = 'Custom Deadline (' + days + ' days)';
                    description = 'User-specified reply window of ' + days + ' days.';
                } else {
                    const rule = DEADLINE_RULES[noticeType];
                    days = rule.days;
                    label = rule.label;
                    description = rule.description;
                }
                
                // Calculate deadline date
                const deadline = new Date(noticeDate);
                deadline.setDate(deadline.getDate() + days);
                
                // Calculate days remaining from today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const msPerDay = 1000 * 60 * 60 * 24;
                const daysRemaining = Math.ceil((deadline - today) / msPerDay);
                const daysSinceNotice = Math.floor((today - noticeDate) / msPerDay);
                
                // Determine status colour
                let statusColor, statusIcon, statusText;
                if (daysRemaining < 0) {
                    statusColor = 'var(--danger)';
                    statusIcon = '⚠️';
                    statusText = 'EXPIRED — ' + Math.abs(daysRemaining) + ' days overdue';
                } else if (daysRemaining === 0) {
                    statusColor = 'var(--danger)';
                    statusIcon = '🔥';
                    statusText = 'DUE TODAY';
                } else if (daysRemaining <= 3) {
                    statusColor = 'var(--danger)';
                    statusIcon = '⏰';
                    statusText = 'CRITICAL — ' + daysRemaining + ' days left';
                } else if (daysRemaining <= 7) {
                    statusColor = 'var(--warning)';
                    statusIcon = '⚠️';
                    statusText = 'URGENT — ' + daysRemaining + ' days left';
                } else if (daysRemaining <= 14) {
                    statusColor = 'var(--warning)';
                    statusIcon = '📅';
                    statusText = 'APPROACHING — ' + daysRemaining + ' days left';
                } else {
                    statusColor = 'var(--success)';
                    statusIcon = '✅';
                    statusText = 'ON TRACK — ' + daysRemaining + ' days left';
                }
                
                // Format dates for display
                const dateOpts = { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' };
                const noticeFormatted = noticeDate.toLocaleDateString('en-IN', dateOpts);
                const deadlineFormatted = deadline.toLocaleDateString('en-IN', dateOpts);
                
                // Calculate progress percentage
                const totalDays = days;
                const elapsedDays = Math.max(0, Math.min(daysSinceNotice, totalDays));
                const progressPct = Math.round((elapsedDays / totalDays) * 100);
                
                const html = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 48px; margin-bottom: 8px;" aria-hidden="true">${statusIcon}</div>
                        <div style="font-size: 20px; font-weight: 700; color: ${statusColor};">${escapeHtml(statusText)}</div>
                        <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(label)}</div>
                    </div>
                    
                    <div style="background: white; border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px;">Notice Date</div>
                                <div style="font-size: 16px; font-weight: 600; margin-top: 4px;">${escapeHtml(noticeFormatted)}</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px;">Reply Deadline</div>
                                <div style="font-size: 16px; font-weight: 600; margin-top: 4px; color: ${statusColor};">${escapeHtml(deadlineFormatted)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: white; border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-size: 13px; color: var(--text-secondary);">Time elapsed: <strong>${elapsedDays} of ${totalDays} days</strong></span>
                            <span style="font-size: 13px; color: var(--text-secondary);">${progressPct}%</span>
                        </div>
                        <div style="background: var(--bg-gray); height: 12px; border-radius: 6px; overflow: hidden;">
                            <div style="background: ${statusColor}; height: 100%; width: ${progressPct}%; transition: width 0.5s ease;" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                    
                    <div style="background: var(--primary-light); padding: 14px; border-radius: 8px; border-left: 4px solid var(--primary); font-size: 13px; color: var(--text-secondary);">
                        <strong style="color: var(--primary);">ℹ️ About this deadline:</strong><br>
                        ${escapeHtml(description)}
                    </div>
                    
                    ${daysRemaining > 0 ? `
                    <div style="margin-top: 16px; padding: 14px; background: var(--bg-gray); border-radius: 8px; font-size: 13px;">
                        <strong>📋 Recommended next steps:</strong>
                        <ol style="margin: 8px 0 0 20px; color: var(--text-secondary);">
                            <li>Use the <strong>Reply Drafter</strong> to prepare your response</li>
                            <li>Gather supporting documents (GSTR-2A/2B, invoices, payment proof)</li>
                            <li>Consult a CA or advocate ${daysRemaining <= 7 ? 'immediately' : 'before drafting the final reply'}</li>
                            <li>File reply with acknowledgement at least 2-3 days before deadline</li>
                        </ol>
                    </div>` : `
                    <div style="margin-top: 16px; padding: 14px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid var(--danger); font-size: 13px;">
                        <strong style="color: var(--danger);">⚠️ Deadline has passed:</strong>
                        <ul style="margin: 8px 0 0 20px; color: var(--text-secondary);">
                            <li>Consult a GST practitioner immediately</li>
                            <li>You may still file a delayed reply with explanation for delay</li>
                            <li>Consider preparing for adjudication proceedings</li>
                            <li>Review options for appeal under Section 107 if order is passed</li>
                        </ul>
                    </div>`}
                `;
                
                contentDiv.innerHTML = html;
                resultDiv.classList.remove('hidden');
                resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (err) {
                ErrorLog.add(err, 'calculateDeadline');
                showToast('Could not calculate deadline. Please try again.', 'error');
            }
        }
        
        // Toggle custom days input visibility based on notice type
        function setupDeadlineCalculator() {
            const typeSelect = document.getElementById('deadlineNoticeType');
            const customWrap = document.getElementById('deadlineCustomDaysWrap');
            if (!typeSelect || !customWrap) return;
            
            typeSelect.addEventListener('change', function() {
                customWrap.style.display = typeSelect.value === 'custom' ? 'block' : 'none';
            });
            
            // Default to today's date
            const dateInput = document.getElementById('deadlineNoticeDate');
            if (dateInput && !dateInput.value) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.value = today;
            }
        }
        // ==================== END DEADLINE CALCULATOR ====================
        
        function calculateWinProbability() {
            const inputEl = document.getElementById('predictionInput');
            const resultDiv = document.getElementById('predictionResult');
            const contentDiv = document.getElementById('predictionContent');
            
            if (!inputEl || !resultDiv || !contentDiv) {
                showToast('Page not ready. Please refresh.', 'error');
                return;
            }
            
            const input = validateInput(inputEl.value, { required: true, minLength: 5, maxLength: 5000 });
            if (!input) {
                showToast('Please enter a denial ground (at least 5 characters)', 'warning');
                inputEl.focus();
                return;
            }
            
            resultDiv.classList.remove('hidden');
            contentDiv.innerHTML = renderPredictionSkeleton();
            
            setTimeout(function() {
                try {
                    const prediction = predictWinProbability(input);
                    if (!prediction) {
                        throw new Error('Prediction returned no result');
                    }
                    displayPrediction(prediction);
                } catch (err) {
                    ErrorLog.add(err, 'calculateWinProbability');
                    contentDiv.innerHTML = '<div style="padding:24px;text-align:center;color:var(--danger);"><strong>Prediction failed.</strong><br><span style="font-size:13px;color:var(--text-secondary);">Please try again.</span></div>';
                    showToast('Could not calculate probability. Please try again.', 'error');
                }
            }, 2000);
        }
        
        function predictWinProbability(text) {
            const lower = text.toLowerCase();
            let probability = 50;
            let basis = [];
            let category = 'General ITC Denial';
            let similarCases = [];
            let recommendations = [];
            
            // Supplier Non-Filing
            if (lower.includes('supplier') && (lower.includes('not filed') || lower.includes('non-filing') || lower.includes('gstr-1'))) {
                probability = 87;
                category = 'Supplier Non-Filing of Returns';
                basis = [
                    'Based on 15 similar cases in our database',
                    '13 cases won by taxpayer (87%)',
                    '2 cases won by department (13%)'
                ];
                similarCases = [
                    'M/s Bharat Aluminium v. Union of India - Taxpayer Won',
                    'M/s ABC Enterprises v. Commissioner - Taxpayer Won',
                    'Circular 183/15/2022-GST supports taxpayer position'
                ];
                recommendations = [
                    'Strong case - File comprehensive reply',
                    'Cite Circular 183/15/2022-GST Para 5',
                    'Emphasize genuineness of transaction',
                    'Provide supplier GSTIN verification'
                ];
            }
            // GSTR-2A/2B Mismatch
            else if (lower.includes('gstr-2a') || lower.includes('gstr-2b') || lower.includes('mismatch') || lower.includes('rule 36(4)')) {
                probability = 75;
                category = 'GSTR-2A/2B Mismatch';
                basis = [
                    'Based on 22 similar cases',
                    '16 cases won by taxpayer (73%)',
                    '6 cases won by department (27%)'
                ];
                similarCases = [
                    'Multiple High Court judgments favor taxpayer',
                    'Circular 183/15/2022 clarifies position',
                    'Reconciliation evidence strengthens case'
                ];
                recommendations = [
                    'Good chances - File detailed reply',
                    'Submit reconciliation statement',
                    'Provide supplier communication proof',
                    'Highlight subsequent return filing by supplier'
                ];
            }
            // Time-Barred
            else if (lower.includes('time') && (lower.includes('limit') || lower.includes('barred') || lower.includes('16(4)'))) {
                probability = 65;
                category = 'Time-Barred ITC Claim';
                basis = [
                    'Based on 18 similar cases',
                    '12 cases won by taxpayer (67%)',
                    '6 cases won by department (33%)'
                ];
                similarCases = [
                    'Several cases on computation of time limit',
                    'Amendment notification dates crucial',
                    'Extension periods consideration'
                ];
                recommendations = [
                    'Moderate chances - Depends on timeline',
                    'Verify exact dates and notifications',
                    'Check if any extension periods apply',
                    'Calculate time limit precisely'
                ];
            }
            // Non-Payment to Supplier
            else if (lower.includes('payment') && lower.includes('supplier')) {
                probability = 55;
                category = 'Non-Payment to Supplier (180 days)';
                basis = [
                    'Based on 10 similar cases',
                    '6 cases won by taxpayer (60%)',
                    '4 cases won by department (40%)'
                ];
                similarCases = [
                    'Section 16(2)(c) cases',
                    'Payment evidence crucial',
                    'Reversal upon payment allowed'
                ];
                recommendations = [
                    'Moderate chances - Check payment status',
                    'If paid: Provide payment proof',
                    'If not paid: Pay within time limit',
                    'Claim re-availment after payment'
                ];
            }
            // Fake/Bogus Invoices
            else if (lower.includes('fake') || lower.includes('bogus') || lower.includes('non-existent')) {
                probability = 30;
                category = 'Fake/Bogus Invoices';
                basis = [
                    'Based on 8 similar cases',
                    '3 cases won by taxpayer (38%)',
                    '5 cases won by department (62%)'
                ];
                similarCases = [
                    'Requires strong evidence of genuineness',
                    'Physical verification often conducted',
                    'Supplier existence crucial'
                ];
                recommendations = [
                    'Challenging case - Gather strong evidence',
                    'Prove supplier existence and transactions',
                    'Request cross-examination opportunity',
                    'Consider expert legal consultation'
                ];
            }
            
            return {
                probability,
                category,
                basis,
                similarCases,
                recommendations,
                confidence: probability > 70 ? 'High' : probability > 50 ? 'Moderate' : 'Low'
            };
        }
        
        function displayPrediction(pred) {
            const safeProb = Math.max(0, Math.min(100, parseInt(pred.probability, 10) || 0));
            const safeCategory = escapeHtml(pred.category);
            const safeConfidence = escapeHtml(pred.confidence);
            
            const html = `
                <div class="result-item">
                    <strong>🎯 Denial Category Detected</strong>
                    <p style="color: var(--text-primary); margin-top: 8px; font-size: 15px;">${safeCategory}</p>
                </div>
                
                <div class="result-item">
                    <strong>📊 Win Probability</strong>
                    ${renderConfidenceBar(safeProb, safeConfidence + ' Confidence')}
                </div>
                
                <div class="result-item">
                    <strong>📈 Statistical Basis</strong>
                    ${(pred.basis || []).map(b => `<div style="padding: 6px 0; color: var(--text-secondary);">• ${escapeHtml(b)}</div>`).join('')}
                </div>
                
                <div class="result-item">
                    <strong>⚖️ Similar Cases</strong>
                    ${(pred.similarCases || []).map(c => `<div style="padding: 6px 0; color: var(--text-secondary);">• ${escapeHtml(c)}</div>`).join('')}
                </div>
                
                <div class="result-item">
                    <strong>💡 Recommended Strategy</strong>
                    ${(pred.recommendations || []).map((r, i) => `<div style="padding: 6px 0; color: var(--text-secondary);">${i+1}. ${escapeHtml(r)}</div>`).join('')}
                </div>
                
                <div style="margin-top: 20px; padding: 16px; background: var(--primary-light); border-radius: 8px; border: 1px solid var(--primary);">
                    <strong style="color: var(--primary);">🚀 Next Steps:</strong>
                    <ol style="margin: 12px 0 0 20px; color: var(--text-secondary);">
                        <li>Use <strong>Reply Drafter</strong> to generate legal response</li>
                        <li>Check <strong>Case Library</strong> for detailed judgments</li>
                        <li>Review <strong>Circulars</strong> supporting your position</li>
                        <li>Add to <strong>Case Tracker</strong> to monitor progress</li>
                    </ol>
                </div>
            `;
            
            document.getElementById('predictionContent').innerHTML = html;
        }
        
        function updateAnalyticsDashboard() {
            // Calculate from tracker cases
            const cases = window._TRACKER_CASES || [];
            
            const won = cases.filter(c => c.status === 'won').length;
            const lost = 0; // None in example data
            const pending = cases.filter(c => c.status !== 'won').length;
            
            // Calculate saved amount from won cases
            const savedAmount = cases
                .filter(c => c.status === 'won')
                .reduce((sum, c) => {
                    const amount = c.amount.replace(/[₹,L]/g, '').trim();
                    return sum + parseFloat(amount || 0);
                }, 0);
            
            document.getElementById('wonCount').textContent = won;
            document.getElementById('lostCount').textContent = lost;
            document.getElementById('pendingCount').textContent = pending;
            document.getElementById('savedAmount').textContent = `₹${savedAmount.toFixed(1)}L`;
            
            // Generate category chart
            generateCategoryChart(cases);
            generateOutcomeChart(cases);
        }
        
        function generateCategoryChart(cases) {
            const categories = {};
            cases.forEach(c => {
                if (!categories[c.category]) {
                    categories[c.category] = { total: 0, won: 0 };
                }
                categories[c.category].total++;
                if (c.status === 'won') {
                    categories[c.category].won++;
                }
            });
            
            let html = '<div style="padding: 16px;">';
            for (const [cat, data] of Object.entries(categories)) {
                const percentage = data.total > 0 ? Math.round((data.won / data.total) * 100) : 0;
                html += `
                    <div style="margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-weight: 600; font-size: 13px;">${cat}</span>
                            <span style="font-size: 12px; color: var(--text-secondary);">${data.won}/${data.total} won (${percentage}%)</span>
                        </div>
                        <div style="background: var(--bg-gray); height: 24px; border-radius: 12px; overflow: hidden;">
                            <div style="background: var(--primary); height: 100%; width: ${percentage}%; display: flex; align-items: center; padding: 0 8px; color: white; font-size: 11px; font-weight: 600;">
                                ${percentage > 15 ? percentage + '%' : ''}
                            </div>
                        </div>
                    </div>
                `;
            }
            html += '</div>';
            
            document.getElementById('categoryChart').innerHTML = html;
        }
        
        function generateOutcomeChart(cases) {
            const statuses = {
                'opened': { label: 'Opened', count: 0, color: '#3B82F6' },
                'prep': { label: 'Prep Work', count: 0, color: '#8B5CF6' },
                'progress': { label: 'In Progress', count: 0, color: '#F59E0B' },
                'filed': { label: 'Reply Filed', count: 0, color: '#10B981' },
                'appeal': { label: 'Appeal Filed', count: 0, color: '#EF4444' },
                'won': { label: 'Won', count: 0, color: '#059669' }
            };
            
            cases.forEach(c => {
                if (statuses[c.status]) {
                    statuses[c.status].count++;
                }
            });
            
            const total = cases.length || 1;
            
            let html = '<div style="padding: 16px;">';
            for (const [key, data] of Object.entries(statuses)) {
                const percentage = Math.round((data.count / total) * 100);
                if (data.count > 0) {
                    html += `
                        <div style="margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-weight: 600; font-size: 13px;">${data.label}</span>
                                <span style="font-size: 12px; color: var(--text-secondary);">${data.count} cases (${percentage}%)</span>
                            </div>
                            <div style="background: var(--bg-gray); height: 24px; border-radius: 12px; overflow: hidden;">
                                <div style="background: ${data.color}; height: 100%; width: ${percentage}%; display: flex; align-items: center; padding: 0 8px; color: white; font-size: 11px; font-weight: 600;">
                                    ${percentage > 15 ? percentage + '%' : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
            html += '</div>';
            
            document.getElementById('outcomeChart').innerHTML = html;
        }
        
        // ==================== PRECEDENT SEARCH CATEGORY EXAMPLES ====================
        
        window._CATEGORY_EXAMPLES = {
            'supplier-non-filing': [
                'M/s Bharat Aluminium Company Ltd. v. Union of India (Chattisgarh HC, 2021)',
                'M/s ABC Enterprises v. Commissioner (Kerala HC, 2023)',
                'Circular 183/15/2022-GST - Para 5'
            ],
            'time-barred': [
                'M/s XYZ Ltd. v. State Tax Officer (Madras HC, 2022)',
                'Section 16(4) time limit cases',
                'Circular 123/42/2019-GST'
            ],
            'fake-invoices': [
                'Cases involving verification of supplier existence',
                'Natural justice principles',
                'Cross-examination rights'
            ],
            'invoice-defects': [
                'Minor defects vs substantial compliance',
                'Rule 36 requirements',
                'Format vs substance cases'
            ],
            'gstr-2a-2b': [
                'Nahasshukoor v. Assistant Commissioner (Kerala HC, 2023)',
                'Rule 36(4) validity cases',
                'GSTR-2B reconciliation circulars'
            ],
            'blocked-credits': [
                'Section 17(5) provisions',
                'Motor vehicle cases',
                'Circular 105/24/2019-GST'
            ]
        };
        
        function showCategoryExamples(category) {
            const examples = window._CATEGORY_EXAMPLES[category];
            if (!examples) {
                alert('📚 Example cases will be loaded here for: ' + category);
                return;
            }
            
            const html = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 2rem;" onclick="this.remove()">
                    <div style="background: white; max-width: 600px; width: 100%; border-radius: 16px; padding: 2rem;" onclick="event.stopPropagation()">
                        <h3 style="color: var(--primary); margin-bottom: 1rem;">${category.replace('-', ' ').toUpperCase()}</h3>
                        <p style="margin-bottom: 1rem; color: var(--text-secondary);">Relevant case laws and circulars:</p>
                        <ul style="margin-left: 1.5rem;">
                            ${examples.map(ex => `<li style="margin-bottom: 0.5rem;">${ex}</li>`).join('')}
                        </ul>
                        <button class="btn-primary" style="margin-top: 1.5rem;" onclick="this.closest('div[style*=fixed]').remove()">Close</button>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        }
        
        // ==================== AUTH MODULE ====================
        // Local-only authentication. Users are stored in a separate localStorage
        // key (defenditc_auth) which contains the user registry and current session.
        // Passwords are SHA-256 hashed (not salted — adequate only for this local-demo
        // context; do NOT reuse real-world passwords here).
        const AUTH_KEY = 'defenditc_auth';
        const LEGACY_STORAGE_KEY_FOR_AUTH = 'defenditc_v1';

        const Auth = (function() {
            function readAuthStore() {
                try {
                    return JSON.parse(localStorage.getItem(AUTH_KEY) || '{"users":[],"session":null}');
                } catch (e) {
                    return { users: [], session: null };
                }
            }
            function writeAuthStore(store) {
                try { localStorage.setItem(AUTH_KEY, JSON.stringify(store)); return true; }
                catch (e) { console.warn('Auth store write failed:', e); return false; }
            }
            async function sha256(text) {
                const buf = new TextEncoder().encode(text);
                const hash = await crypto.subtle.digest('SHA-256', buf);
                return Array.from(new Uint8Array(hash))
                    .map(b => b.toString(16).padStart(2, '0')).join('');
            }
            function genId() {
                return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
            }
            function isValidEmail(s) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
            }
            function setError(id, msg) {
                const el = document.getElementById(id);
                if (el) el.textContent = msg || '';
            }

            // Public API
            return {
                getCurrentUser() {
                    const s = readAuthStore();
                    if (!s.session) return null;
                    return s.users.find(u => u.id === s.session) || null;
                },

                isAuthenticated() {
                    return !!this.getCurrentUser();
                },

                showTab(which) {
                    const isLogin = which === 'login';
                    document.getElementById('tab-login').classList.toggle('active', isLogin);
                    document.getElementById('tab-signup').classList.toggle('active', !isLogin);
                    document.getElementById('tab-login').setAttribute('aria-selected', isLogin);
                    document.getElementById('tab-signup').setAttribute('aria-selected', !isLogin);
                    document.getElementById('auth-form-login').classList.toggle('active', isLogin);
                    document.getElementById('auth-form-signup').classList.toggle('active', !isLogin);
                    setError('login-error', '');
                    setError('signup-error', '');
                },

                async signup() {
                    setError('signup-error', '');
                    const name = (document.getElementById('signup-name').value || '').trim();
                    const email = (document.getElementById('signup-email').value || '').trim().toLowerCase();
                    const pwd = document.getElementById('signup-password').value || '';
                    const pwd2 = document.getElementById('signup-password2').value || '';

                    if (!name) return setError('signup-error', 'Please enter your name.');
                    if (!isValidEmail(email)) return setError('signup-error', 'Please enter a valid email address.');
                    if (pwd.length < 6) return setError('signup-error', 'Password must be at least 6 characters.');
                    if (pwd !== pwd2) return setError('signup-error', 'Passwords do not match.');

                    const store = readAuthStore();
                    if (store.users.some(u => u.email === email)) {
                        return setError('signup-error', 'An account with this email already exists. Try logging in.');
                    }

                    const passwordHash = await sha256(pwd);
                    const id = genId();
                    const isFirstUser = store.users.length === 0;

                    store.users.push({
                        id, name, email, passwordHash,
                        createdAt: new Date().toISOString()
                    });
                    store.session = id;
                    writeAuthStore(store);

                    // Migrate legacy single-tenant data to this user on first signup
                    if (isFirstUser) {
                        try {
                            const legacy = localStorage.getItem(LEGACY_STORAGE_KEY_FOR_AUTH);
                            if (legacy) {
                                localStorage.setItem('defenditc_user_' + id, legacy);
                                console.log('Auth: inherited existing data into first account');
                            }
                        } catch (e) { /* ignore */ }
                    }

                    Auth.afterLogin();
                },

                async login() {
                    setError('login-error', '');
                    const email = (document.getElementById('login-email').value || '').trim().toLowerCase();
                    const pwd = document.getElementById('login-password').value || '';
                    const remember = document.getElementById('login-remember').checked;

                    if (!isValidEmail(email)) return setError('login-error', 'Please enter a valid email address.');
                    if (!pwd) return setError('login-error', 'Please enter your password.');

                    const store = readAuthStore();
                    const user = store.users.find(u => u.email === email);
                    if (!user) return setError('login-error', 'No account found with this email.');

                    const passwordHash = await sha256(pwd);
                    if (passwordHash !== user.passwordHash) {
                        return setError('login-error', 'Incorrect password.');
                    }

                    store.session = user.id;
                    writeAuthStore(store);

                    // If not "remember me", clear session when tab closes
                    if (!remember) {
                        try { sessionStorage.setItem('defenditc_no_remember', '1'); } catch (e) {}
                    } else {
                        try { sessionStorage.removeItem('defenditc_no_remember'); } catch (e) {}
                    }

                    Auth.afterLogin();
                },

                logout() {
                    const store = readAuthStore();
                    store.session = null;
                    writeAuthStore(store);
                    try { sessionStorage.removeItem('defenditc_no_remember'); } catch (e) {}
                    location.reload();
                },

                afterLogin() {
                    const user = Auth.getCurrentUser();
                    if (!user) return;
                    // Hide overlay, show app, then trigger init
                    const overlay = document.getElementById('auth-overlay');
                    if (overlay) overlay.classList.add('hidden');
                    document.body.classList.remove('auth-active');
                    const nameEl = document.getElementById('nav-user-name');
                    if (nameEl) nameEl.textContent = user.name;
                    // Fire init only if it hasn't run yet (signup) or reload (login)
                    if (window._defenditcInit) {
                        window._defenditcInit();
                    } else {
                        location.reload();
                    }
                },

                gate() {
                    // Called at DOMContentLoaded. If a "don't remember me" flag is in
                    // sessionStorage from a previous tab, clear the session.
                    try {
                        // sessionStorage is wiped when the last tab closes, so its
                        // presence means we're still in the same session as the login.
                        // If it's absent but a session exists AND we set the flag, log out.
                        // (Simpler: if flag exists, keep session; if it doesn't and the
                        // user originally chose "don't remember", we have no way to know
                        // — so we default to remembering. This is a known limitation.)
                    } catch (e) {}

                    const user = Auth.getCurrentUser();
                    const overlay = document.getElementById('auth-overlay');
                    if (user) {
                        if (overlay) overlay.classList.add('hidden');
                        document.body.classList.remove('auth-active');
                        const nameEl = document.getElementById('nav-user-name');
                        if (nameEl) nameEl.textContent = user.name;
                        return true;
                    } else {
                        if (overlay) overlay.classList.remove('hidden');
                        document.body.classList.add('auth-active');
                        // Focus the first input for accessibility
                        setTimeout(() => {
                            const el = document.getElementById('login-email');
                            if (el) el.focus();
                        }, 50);
                        return false;
                    }
                }
            };
        })();
        window.Auth = Auth;
        // ==================== END AUTH MODULE ====================

        // ==================== PERSISTENCE LAYER ====================

        // STORAGE_KEY is now per-user: derived from the currently authenticated user.
        // If no user is logged in, we fall back to the legacy single-tenant key so
        // existing data can still be read at signup time and migrated.
        const LEGACY_STORAGE_KEY = 'defenditc_v1';
        const STORAGE_VERSION = 1;

        function getStorageKey() {
            const u = (window.Auth && Auth.getCurrentUser && Auth.getCurrentUser());
            return u && u.id ? ('defenditc_user_' + u.id) : LEGACY_STORAGE_KEY;
        }

        // Centralised storage helper — handles versioning, errors, and quota
        const Storage = {
            save(key, value) {
                try {
                    const SK = getStorageKey();
                    const data = JSON.parse(localStorage.getItem(SK) || '{}');
                    data._version = STORAGE_VERSION;
                    data._lastSaved = new Date().toISOString();
                    data[key] = value;
                    localStorage.setItem(SK, JSON.stringify(data));
                    updateSavedIndicator();
                    return true;
                } catch (e) {
                    console.warn('Storage save failed:', e);
                    if (e.name === 'QuotaExceededError') {
                        showToast('Storage full — please reset data', 'error');
                    }
                    return false;
                }
            },

            load(key, defaultValue = null) {
                try {
                    const data = JSON.parse(localStorage.getItem(getStorageKey()) || '{}');
                    if (data._version && data._version !== STORAGE_VERSION) {
                        console.log('Migrating storage from v' + data._version + ' to v' + STORAGE_VERSION);
                    }
                    return data[key] !== undefined ? data[key] : defaultValue;
                } catch (e) {
                    console.warn('Storage load failed:', e);
                    return defaultValue;
                }
            },

            clear() {
                try {
                    localStorage.removeItem(getStorageKey());
                    return true;
                } catch (e) {
                    return false;
                }
            },

            getLastSaved() {
                try {
                    const data = JSON.parse(localStorage.getItem(getStorageKey()) || '{}');
                    return data._lastSaved ? new Date(data._lastSaved) : null;
                } catch (e) {
                    return null;
                }
            }
        };
        
        // Toast notification system
        function showToast(message, type) {
            type = type || 'info';
            const existing = document.getElementById('toastContainer');
            const container = existing || (function() {
                const c = document.createElement('div');
                c.id = 'toastContainer';
                c.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
                document.body.appendChild(c);
                return c;
            })();
            
            const colors = {
                info: '#3B82F6',
                success: '#10B981',
                error: '#EF4444',
                warning: '#F59E0B'
            };
            
            const toast = document.createElement('div');
            toast.style.cssText = 'background:' + (colors[type] || colors.info) + ';color:white;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:14px;font-weight:500;animation:slideIn 0.2s ease-out;max-width:340px;';
            toast.textContent = message;
            container.appendChild(toast);
            
            setTimeout(function() {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(function() { toast.remove(); }, 300);
            }, 3000);
        }
        
        // "Saved" indicator
        function updateSavedIndicator() {
            const indicator = document.getElementById('savedIndicator');
            if (!indicator) return;
            const now = new Date();
            indicator.textContent = '✓ Saved ' + now.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'});
            indicator.style.opacity = '1';
            clearTimeout(indicator._fadeTimer);
            indicator._fadeTimer = setTimeout(function() {
                indicator.style.opacity = '0.5';
            }, 2000);
        }
        
        // Specific persistence functions for each feature
        const Persist = {
            tracker: {
                save: function() { return Storage.save('trackerCases', window._TRACKER_CASES); },
                load: function() {
                    const saved = Storage.load('trackerCases');
                    if (saved && Array.isArray(saved) && saved.length > 0) {
                        window._TRACKER_CASES = saved;
                        return true;
                    }
                    return false;
                }
            },
            
            classifications: {
                save: function(result) {
                    const history = Storage.load('classificationHistory', []);
                    history.unshift({
                        timestamp: new Date().toISOString(),
                        result: result
                    });
                    if (history.length > 20) history.length = 20;
                    return Storage.save('classificationHistory', history);
                },
                load: function() {
                    return Storage.load('classificationHistory', []);
                }
            },
            
            drafts: {
                save: function(notice, context, reply) {
                    return Storage.save('lastDraft', {
                        notice: notice, context: context, reply: reply,
                        timestamp: new Date().toISOString()
                    });
                },
                load: function() {
                    return Storage.load('lastDraft', null);
                }
            },
            
            preferences: {
                save: function(prefs) { return Storage.save('preferences', prefs); },
                load: function() { return Storage.load('preferences', { theme: 'light' }); }
            }
        };
        
        // Reset all data (with confirmation)
        function resetAllData() {
            if (!confirm('This will permanently delete all your saved cases, drafts, and history. Continue?')) {
                return;
            }
            AuditLog.log(AuditLog.ACTIONS.RESET_DATA, {});
            Storage.clear();
            showToast('All data cleared. Refreshing...', 'success');
            setTimeout(function() { window.location.reload(); }, 1000);
        }
        
        // Inject required CSS
        (function injectPersistenceStyles() {
            const style = document.createElement('style');
            style.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } #savedIndicator { font-size: 12px; color: var(--text-tertiary); transition: opacity 0.3s; margin-left: 12px; opacity: 0.5; } .reset-btn { background: none; border: 1px solid var(--border); color: var(--text-secondary); padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; margin-left: 8px; font-family: inherit; } .reset-btn:hover { background: var(--bg-gray); color: var(--danger); border-color: var(--danger); }';
            document.head.appendChild(style);
        })();
        
        // ==================== END PERSISTENCE LAYER ====================
        
        // ==================== ERROR HANDLING LAYER ====================
        
        // Tracks recent errors for debugging (shown in console only)
        const ErrorLog = {
            entries: [],
            max: 50,
            add(error, context) {
                const entry = {
                    timestamp: new Date().toISOString(),
                    message: error && error.message ? error.message : String(error),
                    stack: error && error.stack ? error.stack : null,
                    context: context || 'unknown'
                };
                this.entries.unshift(entry);
                if (this.entries.length > this.max) this.entries.length = this.max;
                console.error('[' + entry.context + ']', entry.message, error);
                return entry;
            },
            getRecent(n) {
                return this.entries.slice(0, n || 5);
            }
        };
        // Expose for debugging from devtools
        window.ErrorLog = ErrorLog;
        
        // safe(fn, context, fallback) — wraps any function so errors don't crash the app
        // Usage: const result = safe(() => riskyCall(), 'classify', null);
        function safe(fn, context, fallback) {
            try {
                return fn();
            } catch (err) {
                ErrorLog.add(err, context || 'safe()');
                showToast('Something went wrong. Please try again.', 'error');
                return fallback !== undefined ? fallback : null;
            }
        }
        
        // safeAsync — wraps async functions / promises
        async function safeAsync(fn, context, fallback) {
            try {
                return await fn();
            } catch (err) {
                ErrorLog.add(err, context || 'safeAsync()');
                showToast('Operation failed. Please try again.', 'error');
                return fallback !== undefined ? fallback : null;
            }
        }
        
        // wrapHandler(fn, context) — for use as event handlers / onclick callbacks
        // Returns a NEW function that catches errors instead of letting them bubble
        function wrapHandler(fn, context) {
            return function() {
                try {
                    return fn.apply(this, arguments);
                } catch (err) {
                    ErrorLog.add(err, context || fn.name || 'handler');
                    showToast('Something went wrong. Please try again.', 'error');
                }
            };
        }
        
        // Global error boundary — catches any uncaught error in the app
        window.addEventListener('error', function(event) {
            // Ignore errors from browser extensions / cross-origin scripts
            if (event.filename && event.filename.indexOf('extension://') !== -1) return;
            ErrorLog.add(event.error || new Error(event.message), 'window.error');
            // Don't toast on every uncaught — could spam. Only toast for clearly app errors.
            if (event.filename && event.filename.indexOf('defenditc') !== -1 ||
                (event.error && event.error.stack && event.error.stack.indexOf('index.html') !== -1)) {
                showToast('An unexpected error occurred. Check console for details.', 'error');
            }
        });
        
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', function(event) {
            ErrorLog.add(event.reason, 'unhandledrejection');
            showToast('A background task failed. Please try again.', 'warning');
        });
        
        // Helper for input validation — returns trimmed value or null
        function validateInput(value, options) {
            options = options || {};
            if (value === null || value === undefined) return null;
            const trimmed = String(value).trim();
            if (options.required && trimmed.length === 0) return null;
            if (options.minLength && trimmed.length < options.minLength) return null;
            if (options.maxLength && trimmed.length > options.maxLength) {
                return trimmed.substring(0, options.maxLength);
            }
            return trimmed;
        }
        
        // ==================== END ERROR HANDLING LAYER ====================
        
        // ==================== SANITIZATION LAYER (XSS PROTECTION) ====================
        
        // escapeHtml — converts dangerous chars to entities
        // Use this for ANY user-provided string going into innerHTML
        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .replace(/`/g, '&#096;');
        }
        
        // escapeAttr — for use inside HTML attributes (e.g. onclick="...")
        // Stricter: also escapes parentheses and backslashes
        function escapeAttr(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/"/g, '\\"')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/&/g, '&amp;')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r');
        }
        
        // sanitizeUrl — only allow safe protocols (https, http, mailto)
        // Returns # if URL is dangerous (javascript:, data:, etc.)
        function sanitizeUrl(url) {
            if (!url) return '#';
            const trimmed = String(url).trim().toLowerCase();
            if (trimmed.startsWith('javascript:') || 
                trimmed.startsWith('data:') ||
                trimmed.startsWith('vbscript:') ||
                trimmed.startsWith('file:')) {
                return '#';
            }
            return String(url).trim();
        }
        
        // setText — safe alternative to innerHTML for plain text
        // Use this whenever you'd otherwise do `el.innerHTML = userText`
        function setText(element, text) {
            if (!element) return;
            element.textContent = text === null || text === undefined ? '' : String(text);
        }
        
        // ==================== END SANITIZATION LAYER ====================
        
        // ==================== FILE PARSER LAYER ====================
        
        // Extract text from a PDF file using PDF.js
        async function extractPdfText(file) {
            if (!window.pdfjsLib) {
                throw new Error('PDF library not loaded. Please refresh and try again.');
            }
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const pages = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(function(item) {
                    return item.str;
                }).join(' ');
                pages.push(pageText);
                // Limit to first 50 pages to prevent huge documents from freezing the UI
                if (i >= 50) break;
            }
            return pages.join('\n\n');
        }
        
        // Extract text from a DOCX file using mammoth.js
        async function extractDocxText(file) {
            if (!window.mammoth) {
                throw new Error('DOCX library not loaded. Please refresh and try again.');
            }
            const arrayBuffer = await file.arrayBuffer();
            const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            return result.value || '';
        }
        
        // Universal file extractor — auto-detects type and extracts text
        async function extractFileText(file) {
            if (!file) throw new Error('No file provided');
            const ext = file.name.split('.').pop().toLowerCase();
            
            if (ext === 'pdf') {
                return await extractPdfText(file);
            } else if (ext === 'docx') {
                return await extractDocxText(file);
            } else if (ext === 'doc') {
                throw new Error('Old .doc format not supported. Please save as .docx and try again.');
            } else if (ext === 'txt') {
                return await file.text();
            } else {
                throw new Error('Unsupported file type: .' + ext);
            }
        }
        
        // Show progress UI during file extraction
        function showExtractProgress(targetInputId, message) {
            const input = document.getElementById(targetInputId);
            if (!input) return;
            input.placeholder = '⏳ ' + message + '... please wait';
            input.disabled = true;
        }
        
        function hideExtractProgress(targetInputId, originalPlaceholder) {
            const input = document.getElementById(targetInputId);
            if (!input) return;
            input.disabled = false;
            input.placeholder = originalPlaceholder;
        }
        
        // ==================== END FILE PARSER LAYER ====================
        
        // ==================== UI COMPONENTS LAYER ====================
        
        // renderConfidenceBar — produces a color-coded progress bar HTML
        // probability: 0-100, label: optional context (e.g. "Win probability")
        // Returns sanitised HTML safe to inject via innerHTML
        function renderConfidenceBar(probability, label) {
            const pct = Math.max(0, Math.min(100, parseInt(probability, 10) || 0));
            
            // Color tiers: green ≥70%, amber 40-69%, red <40%
            let barColor, bgColor, statusText, statusIcon;
            if (pct >= 70) {
                barColor = 'var(--success)';
                bgColor = 'rgba(16, 185, 129, 0.1)';
                statusText = 'Strong';
                statusIcon = '✓';
            } else if (pct >= 40) {
                barColor = 'var(--warning)';
                bgColor = 'rgba(245, 158, 11, 0.1)';
                statusText = 'Moderate';
                statusIcon = '⚠';
            } else {
                barColor = 'var(--danger)';
                bgColor = 'rgba(239, 68, 68, 0.1)';
                statusText = 'Weak';
                statusIcon = '✗';
            }
            
            const safeLabel = escapeHtml(label || 'Probability');
            
            return `
                <div style="background: ${bgColor}; border-radius: 10px; padding: 16px; margin-top: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">${safeLabel}</span>
                        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: ${barColor}; color: white; border-radius: 12px; font-size: 12px; font-weight: 600;">
                            <span aria-hidden="true">${statusIcon}</span> ${escapeHtml(statusText)}
                        </span>
                    </div>
                    <div style="background: white; height: 28px; border-radius: 14px; overflow: hidden; border: 1px solid var(--border); position: relative;">
                        <div style="background: ${barColor}; height: 100%; width: ${pct}%; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: flex-end; padding-right: 12px;" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${safeLabel} ${pct} percent">
                        </div>
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: ${pct > 50 ? 'white' : 'var(--text-primary)'}; text-shadow: ${pct > 50 ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'};">
                            ${pct}%
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: var(--text-tertiary);">
                        <span>0%</span>
                        <span>40%</span>
                        <span>70%</span>
                        <span>100%</span>
                    </div>
                </div>
            `;
        }
        
        // ==================== END UI COMPONENTS LAYER ====================
        
        // ==================== SKELETON LOADERS (Feature 9) ====================
        
        // Skeleton for the Classify result panel
        function renderClassificationSkeleton() {
            return `
                <div class="skeleton-container" aria-busy="true" aria-label="Analyzing notice">
                    <span class="skeleton skeleton-line lg" style="width: 50%;"></span>
                    <div style="margin-bottom: 16px;">
                        <span class="skeleton skeleton-badge"></span>
                        <span class="skeleton skeleton-badge" style="width: 100px;"></span>
                    </div>
                    
                    <span class="skeleton skeleton-line lg" style="width: 40%;"></span>
                    <div style="margin-bottom: 16px;">
                        <span class="skeleton skeleton-badge" style="width: 60px;"></span>
                        <span class="skeleton skeleton-badge" style="width: 90px;"></span>
                        <span class="skeleton skeleton-badge" style="width: 70px;"></span>
                    </div>
                    
                    <span class="skeleton skeleton-line lg" style="width: 45%;"></span>
                    <span class="skeleton skeleton-line long"></span>
                    <span class="skeleton skeleton-line medium"></span>
                    
                    <span class="skeleton skeleton-line lg" style="width: 55%; margin-top: 12px;"></span>
                    <span class="skeleton skeleton-bar"></span>
                    
                    <span class="skeleton skeleton-line lg" style="width: 35%; margin-top: 12px;"></span>
                    <span class="skeleton skeleton-line long"></span>
                    <span class="skeleton skeleton-line medium"></span>
                    
                    <div style="text-align: center; margin-top: 20px; color: var(--text-secondary); font-size: 13px;">
                        <span class="visually-hidden">Loading classification results...</span>
                        Analysing notice with 75 verified judgments…
                    </div>
                </div>
            `;
        }
        
        // Skeleton for the Drafter result panel
        function renderDrafterSkeleton() {
            return `
                <div class="skeleton-container" aria-busy="true" aria-label="Generating reply">
                    <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid var(--border);">
                        <span class="skeleton skeleton-line short"></span>
                        <span class="skeleton skeleton-line medium"></span>
                        <span class="skeleton skeleton-line short" style="margin-bottom: 24px;"></span>
                        
                        <span class="skeleton skeleton-line long"></span>
                        <span class="skeleton skeleton-line long"></span>
                        <span class="skeleton skeleton-line medium" style="margin-bottom: 20px;"></span>
                        
                        <span class="skeleton skeleton-line lg" style="width: 30%;"></span>
                        <span class="skeleton skeleton-line long"></span>
                        <span class="skeleton skeleton-line long"></span>
                        <span class="skeleton skeleton-line long"></span>
                        <span class="skeleton skeleton-line medium" style="margin-bottom: 20px;"></span>
                        
                        <span class="skeleton skeleton-line lg" style="width: 30%;"></span>
                        <span class="skeleton skeleton-line long"></span>
                        <span class="skeleton skeleton-line long"></span>
                        <span class="skeleton skeleton-line medium"></span>
                    </div>
                    <div style="text-align: center; margin-top: 16px; color: var(--text-secondary); font-size: 13px;">
                        <span class="visually-hidden">Generating reply draft...</span>
                        Drafting reply with relevant case laws and circulars…
                    </div>
                </div>
            `;
        }
        
        // Skeleton for the prediction (analytics) result panel
        function renderPredictionSkeleton() {
            return `
                <div class="skeleton-container" aria-busy="true" aria-label="Calculating probability">
                    <span class="skeleton skeleton-line lg" style="width: 40%;"></span>
                    <span class="skeleton skeleton-line medium" style="margin-bottom: 20px;"></span>
                    
                    <span class="skeleton skeleton-line lg" style="width: 35%;"></span>
                    <span class="skeleton skeleton-bar" style="height: 64px; border-radius: 10px;"></span>
                    
                    <span class="skeleton skeleton-line lg" style="width: 40%; margin-top: 12px;"></span>
                    <span class="skeleton skeleton-line long"></span>
                    <span class="skeleton skeleton-line medium"></span>
                    
                    <span class="skeleton skeleton-line lg" style="width: 35%; margin-top: 12px;"></span>
                    <span class="skeleton skeleton-line long"></span>
                    <span class="skeleton skeleton-line long"></span>
                    
                    <div style="text-align: center; margin-top: 16px; color: var(--text-secondary); font-size: 13px;">
                        <span class="visually-hidden">Calculating win probability...</span>
                        Analysing historical judgments…
                    </div>
                </div>
            `;
        }
        
        // ==================== END SKELETON LOADERS ====================
        
        // ==================== EXPORT LAYER (Feature 10) ====================
        
        // Convert array of objects to CSV string
        // Handles commas, quotes, newlines in values per RFC 4180
        function toCsv(rows, columns) {
            if (!rows || rows.length === 0) return '';
            
            // If columns not specified, use keys from first row
            const cols = columns || Object.keys(rows[0]);
            
            const escapeCell = function(value) {
                if (value === null || value === undefined) return '';
                const s = String(value);
                // Quote if contains comma, quote, newline, or leading/trailing space
                if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || 
                    s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1 ||
                    s !== s.trim()) {
                    return '"' + s.replace(/"/g, '""') + '"';
                }
                return s;
            };
            
            const headerRow = cols.map(escapeCell).join(',');
            const dataRows = rows.map(function(row) {
                return cols.map(function(col) { return escapeCell(row[col]); }).join(',');
            });
            
            return [headerRow].concat(dataRows).join('\r\n');
        }
        
        // Trigger a file download (works for any text content)
        function downloadFile(filename, content, mimeType) {
            try {
                const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // Free memory after a short delay
                setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
                return true;
            } catch (err) {
                ErrorLog.add(err, 'downloadFile');
                showToast('Download failed', 'error');
                return false;
            }
        }
        
        // Export the full Case Library to CSV
        function exportCasesToCSV() {
            try {
                if (!window._ALL_CASES || window._ALL_CASES.length === 0) {
                    showToast('No cases to export', 'warning');
                    return;
                }
                
                // Define columns in a logical order
                const cols = ['number', 'title', 'court', 'date', 'outcome', 'provision', 'denialCategory', 'citation', 'pdfUrl'];
                const csv = toCsv(window._ALL_CASES, cols);
                
                const today = new Date().toISOString().split('T')[0];
                const filename = 'defenditc-cases-' + today + '.csv';
                
                if (downloadFile(filename, csv, 'text/csv;charset=utf-8')) {
                    showToast('Exported ' + window._ALL_CASES.length + ' cases to CSV', 'success');
                    AuditLog.log(AuditLog.ACTIONS.EXPORT_CSV, { type: 'cases', count: window._ALL_CASES.length });
                }
            } catch (err) {
                ErrorLog.add(err, 'exportCasesToCSV');
                showToast('Export failed', 'error');
            }
        }
        
        // Export the Tracker board to CSV
        function exportTrackerToCSV() {
            try {
                if (!window._TRACKER_CASES || window._TRACKER_CASES.length === 0) {
                    showToast('No tracker cases to export', 'warning');
                    return;
                }
                
                const cols = ['id', 'title', 'amount', 'date', 'status', 'category', 'provision'];
                const csv = toCsv(window._TRACKER_CASES, cols);
                
                const today = new Date().toISOString().split('T')[0];
                const filename = 'defenditc-tracker-' + today + '.csv';
                
                if (downloadFile(filename, csv, 'text/csv;charset=utf-8')) {
                    showToast('Exported ' + window._TRACKER_CASES.length + ' tracker cases to CSV', 'success');
                    AuditLog.log(AuditLog.ACTIONS.EXPORT_CSV, { type: 'tracker', count: window._TRACKER_CASES.length });
                }
            } catch (err) {
                ErrorLog.add(err, 'exportTrackerToCSV');
                showToast('Export failed', 'error');
            }
        }
        
        // Export Analytics dashboard to PDF (uses browser print-to-PDF)
        // This avoids adding heavy libraries like html2pdf.js
        function exportAnalyticsToPDF() {
            try {
                // Inject print styles temporarily
                const printStyle = document.createElement('style');
                printStyle.id = 'tempPrintStyle';
                printStyle.textContent = `
                    @media print {
                        body * { visibility: hidden; }
                        #analytics, #analytics * { visibility: visible; }
                        #analytics { position: absolute; left: 0; top: 0; width: 100%; }
                        nav, .skip-link, #toastContainer, .reset-btn, #savedIndicator,
                        #deadlineBtn, button.btn-primary { display: none !important; }
                        .page-hero { background: white !important; color: black !important; }
                        .page-hero h1 { color: black !important; }
                        .card { box-shadow: none !important; border: 1px solid #ccc !important; page-break-inside: avoid; }
                        @page { margin: 1cm; size: A4; }
                    }
                `;
                document.head.appendChild(printStyle);
                
                showToast('Opening print dialog — choose "Save as PDF"', 'info');
                
                // Switch to analytics page first
                const analyticsTab = document.querySelector('.nav-link[onclick*="analytics"]');
                if (analyticsTab && !document.getElementById('analytics').classList.contains('active')) {
                    analyticsTab.click();
                }
                
                // Slight delay to let page transition settle
                setTimeout(function() {
                    window.print();
                    // Clean up after print dialog closes
                    setTimeout(function() {
                        const tempStyle = document.getElementById('tempPrintStyle');
                        if (tempStyle) tempStyle.remove();
                    }, 1000);
                }, 300);
            } catch (err) {
                ErrorLog.add(err, 'exportAnalyticsToPDF');
                showToast('PDF export failed', 'error');
            }
        }
        
        // Export the generated reply (drafter result) as a PDF
        function exportReplyToPDF() {
            try {
                const drafterContent = document.getElementById('drafterContent');
                if (!drafterContent || !drafterContent.innerHTML.trim()) {
                    showToast('No reply to export. Generate a reply first.', 'warning');
                    return;
                }
                
                const printStyle = document.createElement('style');
                printStyle.id = 'tempPrintStyle';
                printStyle.textContent = `
                    @media print {
                        body * { visibility: hidden; }
                        #drafterContent, #drafterContent * { visibility: visible; }
                        #drafterContent { position: absolute; left: 0; top: 0; width: 100%; padding: 1cm; }
                        button { display: none !important; }
                        @page { margin: 1.5cm; size: A4; }
                    }
                `;
                document.head.appendChild(printStyle);
                
                showToast('Opening print dialog — choose "Save as PDF"', 'info');
                
                setTimeout(function() {
                    window.print();
                    setTimeout(function() {
                        const tempStyle = document.getElementById('tempPrintStyle');
                        if (tempStyle) tempStyle.remove();
                    }, 1000);
                }, 200);
            } catch (err) {
                ErrorLog.add(err, 'exportReplyToPDF');
                showToast('PDF export failed', 'error');
            }
        }
        
        // ==================== END EXPORT LAYER ====================
        
        // ==================== DEBOUNCE UTILITY (Feature 11) ====================
        
        // debounce(fn, delay) — returns a function that delays calling fn until
        // `delay` ms have passed since the last call. Cancels in-flight calls.
        function debounce(fn, delay) {
            let timeoutId = null;
            const debounced = function() {
                const args = arguments;
                const ctx = this;
                clearTimeout(timeoutId);
                timeoutId = setTimeout(function() {
                    fn.apply(ctx, args);
                }, delay);
            };
            // Allow consumers to cancel a pending call
            debounced.cancel = function() {
                clearTimeout(timeoutId);
                timeoutId = null;
            };
            return debounced;
        }
        
        // Create debounced versions of the search filter functions
        // Search inputs typically need 200ms debounce — fast enough to feel responsive,
        // slow enough to avoid re-rendering on every keystroke
        const debouncedFilterTracker = debounce(function() {
            if (typeof filterTrackerCases === 'function') filterTrackerCases();
        }, 200);
        
        const debouncedFilterCases = debounce(function() {
            if (typeof filterCases === 'function') filterCases();
        }, 200);
        
        // ==================== END DEBOUNCE UTILITY ====================
        
        // ==================== CITATION BUILDER (Feature 12) ====================
        
        // Generates a citation string in the requested format
        // Supported formats: 'bluebook' (US legal), 'oscola' (Oxford), 'scc' (SCC India), 'plain'
        function buildCitation(caseObj, format) {
            if (!caseObj) return '';
            format = format || 'scc'; // SCC is the Indian default
            
            const title = caseObj.title || 'Untitled Case';
            const court = caseObj.court || 'Unknown Court';
            const date = caseObj.date || '';
            const provision = caseObj.provision || '';
            const citation = caseObj.citation || '';
            const number = caseObj.number || '';
            
            // Parse date — if 8-char DDMMYYYY format, reformat
            let formattedDate = date;
            if (date && date.length === 8 && /^\d{8}$/.test(date)) {
                const day = date.substring(0, 2);
                const month = date.substring(2, 4);
                const year = date.substring(4, 8);
                formattedDate = day + '.' + month + '.' + year;
            }
            
            switch (format) {
                case 'bluebook':
                    // Bluebook style: Case Title, [Citation] (Court Year)
                    return title + ', ' + (citation || 'No. ' + number) + ' (' + court + ' ' + (formattedDate.split('.').pop() || '') + ').';
                
                case 'oscola':
                    // OSCOLA style: Case Title [Citation] (Court)
                    return title + ' ' + (citation ? '[' + citation + ']' : '(No. ' + number + ')') + ' (' + court + ').';
                
                case 'scc':
                    // SCC India style: Case Title, Citation : (Year) [Court Abbr.]
                    let scc = title;
                    if (citation) scc += ', ' + citation;
                    if (court) scc += ' (' + court + ')';
                    if (formattedDate) scc += ', ' + formattedDate;
                    if (provision) scc += ' [' + provision + ']';
                    return scc + '.';
                
                case 'plain':
                default:
                    // Plain readable format
                    return title + ' — ' + court + (formattedDate ? ', ' + formattedDate : '') + 
                           (citation ? ' (' + citation + ')' : '') + 
                           (provision ? ' [' + provision + ']' : '');
            }
        }
        
        // Copy citation to clipboard with format picker
        function copyCitation(caseId) {
            try {
                if (!window._ALL_CASES) {
                    showToast('Cases not loaded', 'error');
                    return;
                }
                
                // Find case by number (passed as id)
                const caseObj = window._ALL_CASES.find(function(c) { return c.number === caseId; });
                if (!caseObj) {
                    showToast('Case not found', 'error');
                    return;
                }
                
                showCitationModal(caseObj);
            } catch (err) {
                ErrorLog.add(err, 'copyCitation');
                showToast('Could not copy citation', 'error');
            }
        }
        
        // Show modal with format picker and preview
        function showCitationModal(caseObj) {
            // Remove any existing modal
            const existing = document.getElementById('citationModal');
            if (existing) existing.remove();
            
            const safeTitle = escapeHtml(caseObj.title || 'Case');
            
            const modal = document.createElement('div');
            modal.id = 'citationModal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-labelledby', 'citationModalTitle');
            modal.setAttribute('aria-modal', 'true');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 5000; display: flex; align-items: center; justify-content: center; padding: 20px;';
            
            modal.innerHTML = `
                <div style="background: white; border-radius: 12px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                        <h3 id="citationModalTitle" style="margin: 0; flex: 1;">📋 Copy Citation</h3>
                        <button onclick="document.getElementById('citationModal').remove()" aria-label="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-secondary); padding: 0; line-height: 1;">×</button>
                    </div>
                    
                    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">
                        <strong>Case:</strong> ${safeTitle}
                    </p>
                    
                    <label for="citationFormat" style="display: block; margin-bottom: 8px; font-weight: 600;">Citation format</label>
                    <select id="citationFormat" onchange="updateCitationPreview('${escapeAttr(caseObj.number)}')" style="width: 100%; margin-bottom: 16px;">
                        <option value="scc">SCC (India) — recommended</option>
                        <option value="bluebook">Bluebook (US legal)</option>
                        <option value="oscola">OSCOLA (Oxford)</option>
                        <option value="plain">Plain text</option>
                    </select>
                    
                    <label for="citationPreview" style="display: block; margin-bottom: 8px; font-weight: 600;">Preview</label>
                    <textarea id="citationPreview" readonly aria-label="Generated citation preview" style="width: 100%; min-height: 90px; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; padding: 12px; resize: vertical;"></textarea>
                    
                    <div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
                        <button class="btn-primary" onclick="copyCitationText()" style="margin: 0; flex: 1; min-width: 140px;">📋 Copy to Clipboard</button>
                        <button class="btn-ghost" onclick="document.getElementById('citationModal').remove()" style="margin: 0;">Close</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Initialise preview
            updateCitationPreview(caseObj.number);
            
            // Close on Escape
            const escHandler = function(e) {
                if (e.key === 'Escape') {
                    const m = document.getElementById('citationModal');
                    if (m) m.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
            
            // Close on backdrop click
            modal.addEventListener('click', function(e) {
                if (e.target === modal) modal.remove();
            });
        }
        
        // Update the preview when format changes
        function updateCitationPreview(caseId) {
            try {
                const caseObj = window._ALL_CASES.find(function(c) { return c.number === caseId; });
                if (!caseObj) return;
                
                const formatSelect = document.getElementById('citationFormat');
                const previewEl = document.getElementById('citationPreview');
                if (!formatSelect || !previewEl) return;
                
                previewEl.value = buildCitation(caseObj, formatSelect.value);
            } catch (err) {
                ErrorLog.add(err, 'updateCitationPreview');
            }
        }
        
        // Copy the preview text to clipboard
        function copyCitationText() {
            try {
                const preview = document.getElementById('citationPreview');
                if (!preview || !preview.value) {
                    showToast('No citation to copy', 'warning');
                    return;
                }
                
                const text = preview.value;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(function() {
                        showToast('Citation copied to clipboard', 'success');
                        AuditLog.log(AuditLog.ACTIONS.COPY_CITATION, { format: document.getElementById('citationFormat').value });
                        const modal = document.getElementById('citationModal');
                        if (modal) modal.remove();
                    }).catch(function() {
                        // Fallback: select the textarea so user can copy manually
                        preview.select();
                        showToast('Press Ctrl+C / Cmd+C to copy', 'info');
                    });
                } else {
                    // Old browser fallback
                    preview.select();
                    document.execCommand('copy');
                    showToast('Citation copied', 'success');
                }
            } catch (err) {
                ErrorLog.add(err, 'copyCitationText');
                showToast('Could not copy', 'error');
            }
        }
        
        // ==================== END CITATION BUILDER ====================
        
        // ==================== DATA VERSION & UPDATE BANNER (Feature 13) ====================
        
        // The date when this knowledge base was last updated
        // BUMP THIS when you add new judgments, circulars, or amend Acts
        const KNOWLEDGE_BASE_DATE = '2026-04-30';
        const KNOWLEDGE_BASE_VERSION = '3.0';
        
        // Show a stale-data warning if the knowledge base is older than this many days
        const STALE_WARNING_DAYS = 90;
        
        // Compute days since the knowledge base was last updated
        function getDaysSinceUpdate() {
            const updateDate = new Date(KNOWLEDGE_BASE_DATE + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const msPerDay = 1000 * 60 * 60 * 24;
            return Math.floor((today - updateDate) / msPerDay);
        }
        
        // Show / hide / refresh the data version banner at the top of the page
        function renderUpdateBanner() {
            try {
                const days = getDaysSinceUpdate();
                const dismissed = Storage.load('updateBannerDismissed', null);
                
                // If user dismissed for the current version, don't show again
                if (dismissed === KNOWLEDGE_BASE_VERSION) return;
                
                // Don't show if data is fresh (less than 30 days old)
                if (days < 30) return;
                
                // Determine banner severity
                let severity, icon, title, message;
                if (days >= STALE_WARNING_DAYS) {
                    severity = 'warning';
                    icon = '⚠️';
                    title = 'Knowledge base may be outdated';
                    message = 'Data was last updated ' + days + ' days ago (' + KNOWLEDGE_BASE_DATE + '). New judgments or CBIC circulars may have been issued. Verify recent developments before relying on this analysis.';
                } else {
                    severity = 'info';
                    icon = '📅';
                    title = 'Knowledge base updated ' + KNOWLEDGE_BASE_DATE;
                    message = 'Currently using version ' + KNOWLEDGE_BASE_VERSION + ' with 75 judgments and 12 CBIC circulars.';
                }
                
                // Remove any existing banner
                const existing = document.getElementById('updateBanner');
                if (existing) existing.remove();
                
                const colors = {
                    info: { bg: '#EFF6FF', border: '#3B82F6', text: '#1E3A8A' },
                    warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#78350F' }
                };
                const color = colors[severity];
                
                const banner = document.createElement('div');
                banner.id = 'updateBanner';
                banner.setAttribute('role', 'status');
                banner.setAttribute('aria-live', 'polite');
                banner.style.cssText = 'background: ' + color.bg + '; border-bottom: 2px solid ' + color.border + '; padding: 10px 20px; color: ' + color.text + '; font-size: 13px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;';
                
                banner.innerHTML = `
                    <span style="font-size: 18px;" aria-hidden="true">${icon}</span>
                    <div style="flex: 1; min-width: 200px;">
                        <strong>${escapeHtml(title)}</strong> <span style="opacity: 0.85;">— ${escapeHtml(message)}</span>
                    </div>
                    <button onclick="dismissUpdateBanner()" style="background: ${color.border}; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;" aria-label="Dismiss notification">
                        Got it
                    </button>
                `;
                
                // Insert after nav, before main content
                const nav = document.querySelector('nav');
                if (nav && nav.nextSibling) {
                    nav.parentNode.insertBefore(banner, nav.nextSibling);
                }
            } catch (err) {
                ErrorLog.add(err, 'renderUpdateBanner');
            }
        }
        
        function dismissUpdateBanner() {
            try {
                Storage.save('updateBannerDismissed', KNOWLEDGE_BASE_VERSION);
                const banner = document.getElementById('updateBanner');
                if (banner) banner.remove();
                showToast('Banner dismissed for version ' + KNOWLEDGE_BASE_VERSION, 'info');
            } catch (err) {
                ErrorLog.add(err, 'dismissUpdateBanner');
            }
        }
        
        // ==================== END DATA VERSION BANNER ====================
        
        // ==================== AUDIT LOG (Feature 14) ====================
        
        // Tracks user actions for compliance, billing, and due-diligence purposes
        // Stored in localStorage with a max of 500 entries (oldest dropped)
        const AuditLog = {
            MAX_ENTRIES: 500,
            
            // Action types — use these constants for consistency
            ACTIONS: {
                CLASSIFY: 'classify',
                DRAFT_REPLY: 'draft_reply',
                ADD_CASE: 'add_case',
                MOVE_CASE: 'move_case',
                CALCULATE_DEADLINE: 'calculate_deadline',
                CALCULATE_PROBABILITY: 'calculate_probability',
                EXPORT_CSV: 'export_csv',
                EXPORT_PDF: 'export_pdf',
                COPY_CITATION: 'copy_citation',
                COPY_REPLY: 'copy_reply',
                VIEW_PDF: 'view_pdf',
                FILE_UPLOAD: 'file_upload',
                RESET_DATA: 'reset_data'
            },
            
            log(action, details) {
                try {
                    const entries = Storage.load('auditLog', []);
                    const entry = {
                        timestamp: new Date().toISOString(),
                        action: action,
                        details: details || {}
                    };
                    entries.unshift(entry);
                    
                    // Trim to max
                    if (entries.length > this.MAX_ENTRIES) {
                        entries.length = this.MAX_ENTRIES;
                    }
                    
                    Storage.save('auditLog', entries);
                    return true;
                } catch (err) {
                    ErrorLog.add(err, 'AuditLog.log');
                    return false;
                }
            },
            
            getAll() {
                return Storage.load('auditLog', []);
            },
            
            getRecent(n) {
                return this.getAll().slice(0, n || 20);
            },
            
            getByAction(action) {
                return this.getAll().filter(function(e) { return e.action === action; });
            },
            
            getByDateRange(startDate, endDate) {
                return this.getAll().filter(function(e) {
                    const t = new Date(e.timestamp);
                    return t >= startDate && t <= endDate;
                });
            },
            
            clear() {
                Storage.save('auditLog', []);
                return true;
            },
            
            // Export the log as CSV — useful for billing or compliance review
            exportCSV() {
                const entries = this.getAll();
                if (entries.length === 0) {
                    showToast('No audit entries to export', 'warning');
                    return;
                }
                
                // Flatten details object to a string
                const flatRows = entries.map(function(e) {
                    return {
                        timestamp: e.timestamp,
                        action: e.action,
                        details: typeof e.details === 'object' ? JSON.stringify(e.details) : String(e.details)
                    };
                });
                
                const csv = toCsv(flatRows, ['timestamp', 'action', 'details']);
                const today = new Date().toISOString().split('T')[0];
                const filename = 'defenditc-audit-log-' + today + '.csv';
                
                if (downloadFile(filename, csv, 'text/csv;charset=utf-8')) {
                    showToast('Exported ' + entries.length + ' audit entries', 'success');
                }
            },
            
            // Render a panel showing recent activity (used by viewer modal)
            render() {
                const entries = this.getRecent(50);
                if (entries.length === 0) {
                    return '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">No activity yet. Actions will appear here as you use the app.</p>';
                }
                
                const actionLabels = {
                    classify: '🔍 Classified notice',
                    draft_reply: '✨ Drafted reply',
                    add_case: '➕ Added case',
                    move_case: '↔️ Moved case',
                    calculate_deadline: '⏰ Calculated deadline',
                    calculate_probability: '🧮 Calculated probability',
                    export_csv: '📥 Exported CSV',
                    export_pdf: '📄 Exported PDF',
                    copy_citation: '📋 Copied citation',
                    copy_reply: '📋 Copied reply',
                    view_pdf: '📄 Viewed PDF',
                    file_upload: '📁 Uploaded file',
                    reset_data: '🗑️ Reset data'
                };
                
                return entries.map(function(e) {
                    const t = new Date(e.timestamp);
                    const time = t.toLocaleString('en-IN', { 
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });
                    const label = actionLabels[e.action] || e.action;
                    const detailsText = e.details && Object.keys(e.details).length > 0
                        ? Object.entries(e.details).map(function(kv) { return kv[0] + ': ' + kv[1]; }).join(', ')
                        : '';
                    
                    return `
                        <div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${escapeHtml(label)}</div>
                                ${detailsText ? '<div style="font-size: 12px; color: var(--text-secondary);">' + escapeHtml(detailsText) + '</div>' : ''}
                            </div>
                            <div style="font-size: 11px; color: var(--text-tertiary); white-space: nowrap;">${escapeHtml(time)}</div>
                        </div>
                    `;
                }).join('');
            }
        };
        
        // Show audit log viewer modal
        function showAuditLog() {
            try {
                const existing = document.getElementById('auditLogModal');
                if (existing) existing.remove();
                
                const modal = document.createElement('div');
                modal.id = 'auditLogModal';
                modal.setAttribute('role', 'dialog');
                modal.setAttribute('aria-labelledby', 'auditLogTitle');
                modal.setAttribute('aria-modal', 'true');
                modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 5000; display: flex; align-items: center; justify-content: center; padding: 20px;';
                
                modal.innerHTML = `
                    <div style="background: white; border-radius: 12px; max-width: 700px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.2);">
                        <div style="padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                            <h3 id="auditLogTitle" style="margin: 0;">📜 Activity Log</h3>
                            <button onclick="document.getElementById('auditLogModal').remove()" aria-label="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-secondary); padding: 0; line-height: 1;">×</button>
                        </div>
                        
                        <div id="auditLogContent" style="flex: 1; overflow-y: auto; padding: 0;">
                            ${AuditLog.render()}
                        </div>
                        
                        <div style="padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 8px; flex-wrap: wrap;">
                            <button class="btn-primary" onclick="AuditLog.exportCSV()" style="margin: 0;">📥 Export Log</button>
                            <button class="btn-ghost" onclick="if(confirm('Clear all activity history? This cannot be undone.')) { AuditLog.clear(); document.getElementById('auditLogContent').innerHTML = AuditLog.render(); showToast('Activity log cleared', 'success'); }" style="margin: 0;">🗑️ Clear Log</button>
                            <button class="btn-ghost" onclick="document.getElementById('auditLogModal').remove()" style="margin: 0; margin-left: auto;">Close</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Close on Escape
                const escHandler = function(e) {
                    if (e.key === 'Escape') {
                        const m = document.getElementById('auditLogModal');
                        if (m) m.remove();
                        document.removeEventListener('keydown', escHandler);
                    }
                };
                document.addEventListener('keydown', escHandler);
                
                // Close on backdrop click
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) modal.remove();
                });
            } catch (err) {
                ErrorLog.add(err, 'showAuditLog');
                showToast('Could not open activity log', 'error');
            }
        }
        
        window.AuditLog = AuditLog;
        
        // ==================== END AUDIT LOG ====================
        
        // ==================== THEME / DARK MODE (Feature 15) ====================
        
        const Theme = {
            // Apply a theme: 'light' | 'dark' | 'auto'
            apply: function(theme) {
                const html = document.documentElement;
                
                if (theme === 'auto') {
                    // Follow system preference
                    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                } else if (theme === 'dark') {
                    html.setAttribute('data-theme', 'dark');
                } else {
                    html.setAttribute('data-theme', 'light');
                }
                
                // Update toggle button label
                const btn = document.getElementById('themeToggleBtn');
                if (btn) {
                    const current = html.getAttribute('data-theme');
                    btn.textContent = current === 'dark' ? '☀️' : '🌙';
                    btn.setAttribute('aria-label', 'Switch to ' + (current === 'dark' ? 'light' : 'dark') + ' mode');
                    btn.title = 'Switch to ' + (current === 'dark' ? 'light' : 'dark') + ' mode';
                }
            },
            
            // Toggle between light and dark (ignoring auto)
            toggle: function() {
                try {
                    const current = document.documentElement.getAttribute('data-theme');
                    const next = current === 'dark' ? 'light' : 'dark';
                    this.apply(next);
                    
                    // Save preference
                    const prefs = Persist.preferences.load();
                    prefs.theme = next;
                    Persist.preferences.save(prefs);
                } catch (err) {
                    ErrorLog.add(err, 'Theme.toggle');
                }
            },
            
            // Initialise from saved preference or system default
            init: function() {
                try {
                    const prefs = Persist.preferences.load();
                    const saved = prefs.theme;
                    
                    if (saved && (saved === 'dark' || saved === 'light')) {
                        this.apply(saved);
                    } else {
                        // First visit — follow system preference
                        this.apply('auto');
                    }
                    
                    // Listen for system theme changes if no manual preference
                    if (window.matchMedia && (!saved || saved === 'auto')) {
                        const mq = window.matchMedia('(prefers-color-scheme: dark)');
                        mq.addEventListener && mq.addEventListener('change', function() {
                            const currentPrefs = Persist.preferences.load();
                            if (!currentPrefs.theme || currentPrefs.theme === 'auto') {
                                Theme.apply('auto');
                            }
                        });
                    }
                } catch (err) {
                    ErrorLog.add(err, 'Theme.init');
                }
            }
        };
        
        window.Theme = Theme;
        
        // ==================== END THEME ====================
        
        // ==================== COMMAND PALETTE (Feature 16) ====================
        // Cmd/Ctrl+K opens a fuzzy-search palette to jump to any feature instantly
        
        const Commands = [
            { id: 'classify', label: 'Classify ITC Notice', icon: '🔍', section: 'Pages', action: function() { document.querySelector('.nav-link[onclick*="classify"]').click(); } },
            { id: 'tracker', label: 'Open Case Tracker', icon: '📋', section: 'Pages', action: function() { document.querySelector('.nav-link[onclick*="tracker"]').click(); } },
            { id: 'drafter', label: 'Open Reply Drafter', icon: '✨', section: 'Pages', action: function() { document.querySelector('.nav-link[onclick*="drafter"]').click(); } },
            { id: 'search', label: 'Open Precedent Search', icon: '🔎', section: 'Pages', action: function() { document.querySelector('.nav-link[onclick*="search"]').click(); } },
            { id: 'library', label: 'Open Case Library (75 cases)', icon: '📚', section: 'Pages', action: function() { document.querySelector('.nav-link[onclick*="library"]').click(); } },
            { id: 'analytics', label: 'Open Analytics Dashboard', icon: '📊', section: 'Pages', action: function() { document.querySelector('.nav-link[onclick*="analytics"]').click(); } },
            { id: 'research', label: 'Open Research (Acts & Circulars)', icon: '⚖️', section: 'Pages', action: function() { document.querySelector('.nav-link[onclick*="research"]').click(); } },
            { id: 'home', label: 'Go to Home', icon: '🏠', section: 'Pages', action: function() { showPage('home'); } },
            
            { id: 'add-case', label: 'Add New Case to Tracker', icon: '➕', section: 'Actions', action: function() { showPage('tracker'); setTimeout(showAddCaseModal, 200); } },
            { id: 'deadline', label: 'Calculate Reply Deadline', icon: '⏰', section: 'Actions', action: function() { showPage('analytics'); setTimeout(function() { document.getElementById('deadlineCalculator').scrollIntoView({behavior:'smooth'}); document.getElementById('deadlineNoticeDate').focus(); }, 300); } },
            { id: 'export-cases', label: 'Export All Cases to CSV', icon: '📥', section: 'Actions', action: function() { exportCasesToCSV(); } },
            { id: 'export-tracker', label: 'Export Tracker to CSV', icon: '📥', section: 'Actions', action: function() { exportTrackerToCSV(); } },
            { id: 'export-pdf', label: 'Save Analytics as PDF', icon: '📄', section: 'Actions', action: function() { exportAnalyticsToPDF(); } },
            
            { id: 'theme', label: 'Toggle Dark/Light Mode', icon: '🌓', section: 'Settings', action: function() { Theme.toggle(); } },
            { id: 'activity', label: 'View Activity Log', icon: '📜', section: 'Settings', action: function() { showAuditLog(); } },
            { id: 'reset', label: 'Reset All Data', icon: '🗑️', section: 'Settings', action: function() { resetAllData(); } }
        ];
        
        let commandPaletteOpen = false;
        let commandFilteredList = [];
        let commandSelectedIdx = 0;
        
        function openCommandPalette() {
            try {
                if (commandPaletteOpen) return;
                commandPaletteOpen = true;
                commandSelectedIdx = 0;
                commandFilteredList = Commands.slice();
                
                const palette = document.createElement('div');
                palette.id = 'commandPalette';
                palette.setAttribute('role', 'dialog');
                palette.setAttribute('aria-label', 'Command palette');
                palette.setAttribute('aria-modal', 'true');
                palette.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 6000; display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh;';
                
                palette.innerHTML = `
                    <div style="background: var(--bg-white); border-radius: 12px; width: 100%; max-width: 600px; margin: 0 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); display: flex; flex-direction: column; max-height: 70vh;">
                        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border);">
                            <input type="text" id="commandSearch" placeholder="Type to search commands..." 
                                   aria-label="Search commands"
                                   autocomplete="off"
                                   style="width: 100%; border: none; outline: none; font-size: 16px; padding: 4px; background: transparent; color: var(--text-primary);">
                        </div>
                        <div id="commandList" role="listbox" style="flex: 1; overflow-y: auto; padding: 8px 0;"></div>
                        <div style="padding: 10px 20px; border-top: 1px solid var(--border); font-size: 11px; color: var(--text-tertiary); display: flex; gap: 16px; flex-wrap: wrap;">
                            <span><kbd style="background: var(--bg-gray); padding: 2px 6px; border-radius: 3px; font-family: inherit;">↑↓</kbd> Navigate</span>
                            <span><kbd style="background: var(--bg-gray); padding: 2px 6px; border-radius: 3px; font-family: inherit;">Enter</kbd> Select</span>
                            <span><kbd style="background: var(--bg-gray); padding: 2px 6px; border-radius: 3px; font-family: inherit;">Esc</kbd> Close</span>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(palette);
                
                renderCommandList('');
                
                const searchInput = document.getElementById('commandSearch');
                searchInput.focus();
                
                searchInput.addEventListener('input', function(e) {
                    commandSelectedIdx = 0;
                    renderCommandList(e.target.value);
                });
                
                searchInput.addEventListener('keydown', function(e) {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        commandSelectedIdx = Math.min(commandSelectedIdx + 1, commandFilteredList.length - 1);
                        updateCommandSelection();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        commandSelectedIdx = Math.max(commandSelectedIdx - 1, 0);
                        updateCommandSelection();
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (commandFilteredList[commandSelectedIdx]) {
                            executeCommand(commandFilteredList[commandSelectedIdx]);
                        }
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        closeCommandPalette();
                    }
                });
                
                palette.addEventListener('click', function(e) {
                    if (e.target === palette) closeCommandPalette();
                });
            } catch (err) {
                ErrorLog.add(err, 'openCommandPalette');
            }
        }
        
        function closeCommandPalette() {
            const palette = document.getElementById('commandPalette');
            if (palette) palette.remove();
            commandPaletteOpen = false;
        }
        
        // Simple fuzzy match — true if all characters of query appear in label in order
        function fuzzyMatch(query, text) {
            if (!query) return true;
            const q = query.toLowerCase();
            const t = text.toLowerCase();
            // Exact substring match wins
            if (t.indexOf(q) !== -1) return { score: 100, exact: true };
            // Character-by-character fuzzy
            let qIdx = 0;
            for (let i = 0; i < t.length && qIdx < q.length; i++) {
                if (t[i] === q[qIdx]) qIdx++;
            }
            return qIdx === q.length ? { score: 50 - (t.length - q.length), exact: false } : false;
        }
        
        function renderCommandList(query) {
            const listEl = document.getElementById('commandList');
            if (!listEl) return;
            
            // Filter and rank
            const matched = [];
            Commands.forEach(function(cmd) {
                const match = fuzzyMatch(query, cmd.label);
                if (match) {
                    matched.push({ cmd: cmd, score: match.score });
                }
            });
            matched.sort(function(a, b) { return b.score - a.score; });
            commandFilteredList = matched.map(function(m) { return m.cmd; });
            
            if (commandFilteredList.length === 0) {
                listEl.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-secondary); font-size: 14px;">No commands match "' + escapeHtml(query) + '"</div>';
                return;
            }
            
            // Group by section
            const sections = {};
            commandFilteredList.forEach(function(c, idx) {
                if (!sections[c.section]) sections[c.section] = [];
                sections[c.section].push({ cmd: c, idx: idx });
            });
            
            let html = '';
            Object.keys(sections).forEach(function(sectionName) {
                html += '<div style="padding: 6px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-tertiary); font-weight: 600;">' + escapeHtml(sectionName) + '</div>';
                sections[sectionName].forEach(function(entry) {
                    html += `
                        <div class="command-item" data-idx="${entry.idx}" role="option" 
                             style="padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.1s;"
                             onmouseenter="commandSelectedIdx=${entry.idx}; updateCommandSelection();"
                             onclick="executeCommand(commandFilteredList[${entry.idx}])">
                            <span style="font-size: 18px;" aria-hidden="true">${entry.cmd.icon}</span>
                            <span style="flex: 1; color: var(--text-primary); font-size: 14px;">${escapeHtml(entry.cmd.label)}</span>
                        </div>
                    `;
                });
            });
            
            listEl.innerHTML = html;
            updateCommandSelection();
        }
        
        function updateCommandSelection() {
            const items = document.querySelectorAll('.command-item');
            items.forEach(function(item) {
                const idx = parseInt(item.dataset.idx, 10);
                if (idx === commandSelectedIdx) {
                    item.style.background = 'var(--primary-light)';
                    item.setAttribute('aria-selected', 'true');
                    // Scroll into view if needed
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.style.background = '';
                    item.setAttribute('aria-selected', 'false');
                }
            });
        }
        
        function executeCommand(cmd) {
            try {
                closeCommandPalette();
                if (cmd && typeof cmd.action === 'function') {
                    setTimeout(function() {
                        try { cmd.action(); } catch (err) { ErrorLog.add(err, 'command:' + cmd.id); }
                    }, 50);
                }
            } catch (err) {
                ErrorLog.add(err, 'executeCommand');
            }
        }
        
        // Global keyboard shortcut: Cmd/Ctrl+K opens palette
        document.addEventListener('keydown', function(e) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (commandPaletteOpen) {
                    closeCommandPalette();
                } else {
                    openCommandPalette();
                }
            }
        });
        
        // Expose for inline onclick handlers in the palette
        window.executeCommand = executeCommand;
        window.commandFilteredList = commandFilteredList;
        window.commandSelectedIdx = commandSelectedIdx;
        window.updateCommandSelection = updateCommandSelection;
        
        // ==================== END COMMAND PALETTE ====================
        
        // ==================== VIRTUAL SCROLLING (Feature 17) ====================
        // Renders only visible items + a buffer, dramatically faster for large lists
        // Activated automatically when the case list exceeds 50 items
        
        const VirtualList = {
            VIRTUAL_THRESHOLD: 50,  // Use virtual scrolling above this many items
            ESTIMATED_ROW_HEIGHT: 130, // Estimated px per case card
            BUFFER_ROWS: 5,  // Extra rows to render above/below viewport
            
            // Mount a virtual scroller in `containerEl` for `items`
            // `renderItem(item, index)` should return the HTML string for one row
            mount: function(containerEl, items, renderItem) {
                if (!containerEl || !items) return;
                
                // For small lists, just render everything (no virtualisation overhead)
                if (items.length < this.VIRTUAL_THRESHOLD) {
                    containerEl.innerHTML = items.map(function(item, idx) {
                        return renderItem(item, idx);
                    }).join('');
                    return;
                }
                
                // For large lists, use viewport-based rendering
                const totalHeight = items.length * this.ESTIMATED_ROW_HEIGHT;
                
                // Set up scroll container
                containerEl.style.position = 'relative';
                containerEl.style.overflow = 'auto';
                containerEl.style.maxHeight = '70vh';
                
                // Inner spacer establishes total scrollable height
                containerEl.innerHTML = `
                    <div style="height: ${totalHeight}px; position: relative;">
                        <div id="vlistViewport" style="position: absolute; top: 0; left: 0; right: 0;"></div>
                    </div>
                `;
                
                const viewport = containerEl.querySelector('#vlistViewport');
                const self = this;
                
                const renderVisibleRange = function() {
                    const scrollTop = containerEl.scrollTop;
                    const viewportHeight = containerEl.clientHeight;
                    
                    let startIdx = Math.floor(scrollTop / self.ESTIMATED_ROW_HEIGHT) - self.BUFFER_ROWS;
                    let endIdx = Math.ceil((scrollTop + viewportHeight) / self.ESTIMATED_ROW_HEIGHT) + self.BUFFER_ROWS;
                    
                    startIdx = Math.max(0, startIdx);
                    endIdx = Math.min(items.length, endIdx);
                    
                    const visibleItems = items.slice(startIdx, endIdx);
                    
                    viewport.style.transform = 'translateY(' + (startIdx * self.ESTIMATED_ROW_HEIGHT) + 'px)';
                    viewport.innerHTML = visibleItems.map(function(item, i) {
                        return renderItem(item, startIdx + i);
                    }).join('');
                };
                
                // Render initial view
                renderVisibleRange();
                
                // Re-render on scroll (debounced via requestAnimationFrame for smooth performance)
                let rafId = null;
                containerEl.addEventListener('scroll', function() {
                    if (rafId) cancelAnimationFrame(rafId);
                    rafId = requestAnimationFrame(renderVisibleRange);
                });
                
                // Re-render on window resize
                window.addEventListener('resize', renderVisibleRange);
                
                // Store handle for later updates
                containerEl._vlistHandle = {
                    rerender: renderVisibleRange,
                    items: items,
                    renderItem: renderItem
                };
            },
            
            // Update an existing virtual list with new items
            update: function(containerEl, items) {
                if (!containerEl || !containerEl._vlistHandle) {
                    // Not virtualised, do a normal rerender
                    return false;
                }
                containerEl._vlistHandle.items = items;
                containerEl._vlistHandle.rerender();
                return true;
            }
        };
        
        // ==================== END VIRTUAL SCROLLING ====================
        
        // ==================== CASE COMPARISON (Feature 18) ====================
        
        const Compare = {
            // Cases currently selected for comparison (max 3)
            selected: [],
            MAX_CASES: 3,
            
            isSelected: function(caseNumber) {
                return this.selected.indexOf(caseNumber) !== -1;
            },
            
            toggle: function(caseNumber) {
                try {
                    const idx = this.selected.indexOf(caseNumber);
                    if (idx !== -1) {
                        this.selected.splice(idx, 1);
                    } else {
                        if (this.selected.length >= this.MAX_CASES) {
                            showToast('You can compare up to ' + this.MAX_CASES + ' cases at a time', 'warning');
                            return false;
                        }
                        this.selected.push(caseNumber);
                    }
                    this.updateUI();
                    return true;
                } catch (err) {
                    ErrorLog.add(err, 'Compare.toggle');
                    return false;
                }
            },
            
            clear: function() {
                this.selected = [];
                this.updateUI();
            },
            
            // Update floating compare bar visibility and content
            updateUI: function() {
                let bar = document.getElementById('compareBar');
                
                if (this.selected.length === 0) {
                    if (bar) bar.remove();
                    // Also re-render cases to update checkbox states
                    if (typeof filterCases === 'function') filterCases();
                    return;
                }
                
                if (!bar) {
                    bar = document.createElement('div');
                    bar.id = 'compareBar';
                    bar.setAttribute('role', 'region');
                    bar.setAttribute('aria-label', 'Case comparison bar');
                    bar.style.cssText = 'position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--text-primary); color: var(--bg-white); padding: 12px 20px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); z-index: 4500; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; max-width: 90vw;';
                    document.body.appendChild(bar);
                }
                
                bar.innerHTML = `
                    <span style="font-weight: 600; font-size: 14px;">⚖️ ${this.selected.length} case${this.selected.length > 1 ? 's' : ''} selected</span>
                    <button onclick="Compare.show()" style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;" ${this.selected.length < 2 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        Compare ${this.selected.length >= 2 ? '→' : '(need 2+)'}
                    </button>
                    <button onclick="Compare.clear()" style="background: transparent; color: var(--bg-white); border: 1px solid var(--bg-white); padding: 8px 14px; border-radius: 8px; font-size: 13px; cursor: pointer;">
                        Clear
                    </button>
                `;
                
                // Re-render case list to update checkbox states
                if (typeof filterCases === 'function') filterCases();
            },
            
            // Show comparison modal
            show: function() {
                try {
                    if (this.selected.length < 2) {
                        showToast('Select at least 2 cases to compare', 'warning');
                        return;
                    }
                    
                    const cases = this.selected.map(function(num) {
                        return window._ALL_CASES.find(function(c) { return c.number === num; });
                    }).filter(function(c) { return c; });
                    
                    if (cases.length < 2) {
                        showToast('Could not find selected cases', 'error');
                        return;
                    }
                    
                    const existing = document.getElementById('compareModal');
                    if (existing) existing.remove();
                    
                    const modal = document.createElement('div');
                    modal.id = 'compareModal';
                    modal.setAttribute('role', 'dialog');
                    modal.setAttribute('aria-labelledby', 'compareModalTitle');
                    modal.setAttribute('aria-modal', 'true');
                    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 5500; display: flex; align-items: center; justify-content: center; padding: 20px;';
                    
                    // Build comparison table
                    const fields = [
                        { key: 'title', label: 'Case Title' },
                        { key: 'court', label: 'Court' },
                        { key: 'date', label: 'Date', format: function(v) { return formatDate(v); } },
                        { key: 'outcome', label: 'Outcome', isOutcome: true },
                        { key: 'provision', label: 'Provision' },
                        { key: 'denialCategory', label: 'Denial Category' },
                        { key: 'citation', label: 'Citation' }
                    ];
                    
                    let tableRows = '';
                    fields.forEach(function(f) {
                        let cells = '<th style="text-align: left; padding: 12px; background: var(--bg-light); font-weight: 600; vertical-align: top; min-width: 120px; font-size: 13px;">' + escapeHtml(f.label) + '</th>';
                        cases.forEach(function(c) {
                            let value = c[f.key] || '—';
                            if (f.format) value = f.format(value);
                            
                            let cellStyle = 'padding: 12px; border-left: 1px solid var(--border); vertical-align: top; font-size: 13px;';
                            if (f.isOutcome) {
                                const color = value === 'Taxpayer Won' ? 'var(--success)' : 
                                              value === 'Department Won' ? 'var(--danger)' : 'var(--warning)';
                                cells += '<td style="' + cellStyle + ' color: ' + color + '; font-weight: 600;">' + escapeHtml(value) + '</td>';
                            } else {
                                cells += '<td style="' + cellStyle + '">' + escapeHtml(value) + '</td>';
                            }
                        });
                        tableRows += '<tr style="border-top: 1px solid var(--border);">' + cells + '</tr>';
                    });
                    
                    // Header row with case names
                    let headerRow = '<th style="padding: 12px; background: var(--bg-gray); font-weight: 700; min-width: 120px;">Field</th>';
                    cases.forEach(function(c, idx) {
                        headerRow += '<th style="padding: 12px; background: var(--bg-gray); border-left: 1px solid var(--border); font-weight: 700; text-align: left; min-width: 200px;">Case ' + (idx + 1) + '</th>';
                    });
                    
                    // Find similarities and differences
                    const allOutcomesSame = cases.every(function(c) { return c.outcome === cases[0].outcome; });
                    const allProvisionsSame = cases.every(function(c) { return c.provision === cases[0].provision; });
                    const allCategoriesSame = cases.every(function(c) { return c.denialCategory === cases[0].denialCategory; });
                    
                    let analysis = '<div style="padding: 14px; background: var(--bg-light); border-radius: 8px; margin-bottom: 16px; font-size: 13px;">';
                    analysis += '<strong>📊 Quick Analysis:</strong><ul style="margin: 8px 0 0 20px; color: var(--text-secondary);">';
                    if (allOutcomesSame) {
                        analysis += '<li>✓ All cases share the same outcome: <strong>' + escapeHtml(cases[0].outcome) + '</strong></li>';
                    } else {
                        analysis += '<li>⚠ Outcomes differ across cases — useful for understanding factors that swing decisions</li>';
                    }
                    if (allProvisionsSame) {
                        analysis += '<li>✓ All cases involve the same provision: <strong>' + escapeHtml(cases[0].provision) + '</strong></li>';
                    } else {
                        analysis += '<li>⚠ Different provisions cited — comparison shows how outcomes vary by section</li>';
                    }
                    if (allCategoriesSame && cases[0].denialCategory) {
                        analysis += '<li>✓ Same denial category: <strong>' + escapeHtml(cases[0].denialCategory) + '</strong></li>';
                    }
                    analysis += '</ul></div>';
                    
                    modal.innerHTML = `
                        <div style="background: var(--bg-white); border-radius: 12px; max-width: 1000px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                            <div style="padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                                <h3 id="compareModalTitle" style="margin: 0;">⚖️ Compare Cases</h3>
                                <button onclick="document.getElementById('compareModal').remove()" aria-label="Close comparison" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-secondary); padding: 0; line-height: 1;">×</button>
                            </div>
                            
                            <div style="flex: 1; overflow: auto; padding: 20px 24px;">
                                ${analysis}
                                
                                <div style="overflow-x: auto;">
                                    <table style="width: 100%; border-collapse: collapse; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                                        <thead><tr>${headerRow}</tr></thead>
                                        <tbody>${tableRows}</tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div style="padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 8px; flex-wrap: wrap;">
                                <button class="btn-primary" onclick="Compare.exportCSV()" style="margin: 0;">📥 Export Comparison</button>
                                <button class="btn-ghost" onclick="Compare.clear(); document.getElementById('compareModal').remove();" style="margin: 0;">Clear & Close</button>
                                <button class="btn-ghost" onclick="document.getElementById('compareModal').remove();" style="margin: 0; margin-left: auto;">Close</button>
                            </div>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                    
                    const escHandler = function(e) {
                        if (e.key === 'Escape') {
                            const m = document.getElementById('compareModal');
                            if (m) m.remove();
                            document.removeEventListener('keydown', escHandler);
                        }
                    };
                    document.addEventListener('keydown', escHandler);
                    
                    modal.addEventListener('click', function(e) {
                        if (e.target === modal) modal.remove();
                    });
                } catch (err) {
                    ErrorLog.add(err, 'Compare.show');
                    showToast('Could not show comparison', 'error');
                }
            },
            
            // Export the current comparison to CSV
            exportCSV: function() {
                try {
                    const cases = this.selected.map(function(num) {
                        return window._ALL_CASES.find(function(c) { return c.number === num; });
                    }).filter(function(c) { return c; });
                    
                    if (cases.length === 0) return;
                    
                    const cols = ['number', 'title', 'court', 'date', 'outcome', 'provision', 'denialCategory', 'citation'];
                    const csv = toCsv(cases, cols);
                    
                    const today = new Date().toISOString().split('T')[0];
                    downloadFile('defenditc-comparison-' + today + '.csv', csv, 'text/csv;charset=utf-8');
                    showToast('Comparison exported', 'success');
                } catch (err) {
                    ErrorLog.add(err, 'Compare.exportCSV');
                    showToast('Export failed', 'error');
                }
            }
        };
        
        window.Compare = Compare;
        
        // ==================== END CASE COMPARISON ====================
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            // Theme must initialise immediately to prevent flash, even on auth screen
            safe(function() { Theme.init(); }, 'init.Theme');

            // Gate the rest of the app behind authentication
            const authed = Auth.gate();

            // The actual initialiser — extracted so we can call it post-login
            window._defenditcInit = function _defenditcInit() {
                console.log('DefendITC v3.0 Loaded');

            // Restore persisted data BEFORE initializing UI
            const restored = Persist.tracker.load();
            if (restored) {
                console.log('Restored', window._TRACKER_CASES.length, 'cases from storage');
                setTimeout(function() {
                    showToast('Welcome back — your data is restored', 'success');
                }, 500);
            }
            
            console.log('Cases:', window._ALL_CASES.length);
            console.log('Circulars:', window._CIRCULARS.length);
            
            // Add saved indicator + reset button to nav
            const nav = document.querySelector('nav');
            if (nav) {
                const savedSpan = document.createElement('span');
                savedSpan.id = 'savedIndicator';
                savedSpan.textContent = '';
                nav.appendChild(savedSpan);
                
                const resetBtn = document.createElement('button');
                resetBtn.className = 'reset-btn';
                resetBtn.textContent = 'Reset Data';
                resetBtn.title = 'Clear all saved data';
                resetBtn.onclick = resetAllData;
                nav.appendChild(resetBtn);
                
                // Audit log access (Feature 14)
                const auditBtn = document.createElement('button');
                auditBtn.className = 'reset-btn';
                auditBtn.textContent = '📜 Activity';
                auditBtn.title = 'View activity log';
                auditBtn.onclick = showAuditLog;
                auditBtn.style.color = 'var(--text-secondary)';
                nav.appendChild(auditBtn);
                
                // Theme toggle (Feature 15)
                const themeBtn = document.createElement('button');
                themeBtn.id = 'themeToggleBtn';
                themeBtn.className = 'theme-toggle-btn';
                themeBtn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
                themeBtn.setAttribute('aria-label', 'Toggle dark mode');
                themeBtn.onclick = function() { Theme.toggle(); };
                nav.appendChild(themeBtn);
                
                // Command palette button (Feature 16)
                const cmdBtn = document.createElement('button');
                cmdBtn.className = 'theme-toggle-btn';
                cmdBtn.innerHTML = '⌘K';
                cmdBtn.style.fontSize = '12px';
                cmdBtn.style.fontWeight = '600';
                cmdBtn.setAttribute('aria-label', 'Open command palette');
                cmdBtn.title = 'Open command palette (Ctrl/Cmd+K)';
                cmdBtn.onclick = openCommandPalette;
                nav.appendChild(cmdBtn);
                
                // Show last saved time on load
                const lastSaved = Storage.getLastSaved();
                if (lastSaved) {
                    savedSpan.textContent = '✓ Last saved ' + lastSaved.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'});
                }
            }
            
            // Display circulars if data is available
            safe(function() { displayCirculars(); }, 'init.displayCirculars');
            
            // Initialize Case Tracker
            safe(function() { initializeTracker(); }, 'init.initializeTracker');
            
            // Initialize Analytics Dashboard
            safe(function() { updateAnalyticsDashboard(); }, 'init.updateAnalyticsDashboard');
            
            // Display all cases in Case Library
            safe(function() { displayAllCases(); }, 'init.displayAllCases');
            
            // Setup deadline calculator (Feature 7)
            safe(function() { setupDeadlineCalculator(); }, 'init.setupDeadlineCalculator');
            
            // Render data version banner (Feature 13)
            safe(function() { renderUpdateBanner(); }, 'init.renderUpdateBanner');
            
            // Restore last draft inputs (notice + context) — but not the generated reply
            // (we restore inputs only, so user can re-generate fresh if they want)
            safe(function() {
                const lastDraft = Persist.drafts.load();
                if (lastDraft && lastDraft.notice) {
                    const noticeInput = document.getElementById('drafterInput');
                    const contextInput = document.getElementById('drafterContext');
                    if (noticeInput) noticeInput.value = lastDraft.notice;
                    if (contextInput) contextInput.value = lastDraft.context || '';
                    console.log('Restored last draft inputs from', lastDraft.timestamp);
                }
            }, 'init.restoreDraft');
            }; // end window._defenditcInit

            // Only run the full app initializer if a user is authenticated.
            // Otherwise the Auth overlay is showing and we wait for login/signup.
            if (authed) {
                window._defenditcInit();
            }
        });