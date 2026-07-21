/* ===== Turnstile Script Loader (formerly inline <script> in <head>) ===== */
window.turnstileScriptLoaded = false;
window.turnstileLoadError = false;

const turnstileScript = document.createElement('script');
// Turnstile is served from a non-versioned, frequently-rotated Cloudflare
// endpoint that does not support SRI - intentionally no integrity attribute.
turnstileScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
turnstileScript.async = true;
turnstileScript.defer = true;

turnstileScript.onload = function () {
    console.log('✅ Turnstile script loaded successfully');
    window.turnstileScriptLoaded = true;
};

turnstileScript.onerror = function () {
    console.error('❌ Failed to load Turnstile script from challenges.cloudflare.com');
    window.turnstileLoadError = true;
    showTurnstileError();
};

document.head.appendChild(turnstileScript);

// Timeout fallback: if Turnstile hasn't loaded in 5s, show error
setTimeout(function () {
    if (!window.turnstileScriptLoaded && !window.turnstileLoadError) {
        console.warn('⚠️ Turnstile script loading timeout (5s)');
        window.turnstileLoadError = true;
        showTurnstileError();
    }
}, 5000);

/* ===== Global Variables ===== */
let currentPDF = null;
let extractedData = [];
let fileName = '';
let turnstileVerified = false;
let pendingFile = null;

/* ===== DOM Element References ===== */
const uploadSection = document.getElementById('uploadSection');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statusMessage = document.getElementById('statusMessage');
const optionsSection = document.getElementById('optionsSection');
const previewSection = document.getElementById('previewSection');
const downloadExcel = document.getElementById('downloadExcel');
const downloadCSV = document.getElementById('downloadCSV');
const turnstileContainer = document.getElementById('turnstileContainer');

/* ===== PDF.js Worker ===== */
// The pdf.js version here MUST match the pdf.min.js version in index.html and
// the cached URLs in sw.js. Renovate keeps all three in lockstep (see
// .github/renovate.json custom cdnjs manager). The Worker API has no SRI, so
// integrity is enforced only via CSP worker-src in public/_headers.
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ===== Event Listeners ===== */

// File input and upload area
fileInput.addEventListener('change', handleFileSelect);
uploadSection.addEventListener('click', function () { fileInput.click(); });
uploadSection.addEventListener('dragover', handleDragOver);
uploadSection.addEventListener('dragleave', handleDragLeave);
uploadSection.addEventListener('drop', handleDrop);

// Page range selector
document.getElementById('pageRange').addEventListener('change', function () {
    const customRange = document.getElementById('customRange');
    customRange.style.display = this.value === 'custom' ? 'block' : 'none';
});

// Header buttons (formerly onclick attributes)
document.getElementById('langToggle').addEventListener('click', toggleLanguage);
document.getElementById('helpBtn').addEventListener('click', openHelpGuide);

// Upload button - also opens file input (section click also does this; double-call is harmless)
document.getElementById('uploadBtn').addEventListener('click', function () { fileInput.click(); });

// Turnstile fallback reload button
document.getElementById('turnstileReloadBtn').addEventListener('click', function () { location.reload(); });

// Download buttons
document.getElementById('downloadExcel').addEventListener('click', function () { downloadFile('excel'); });
document.getElementById('downloadCSV').addEventListener('click', function () { downloadFile('csv'); });

// Help popup
document.getElementById('helpPopup').addEventListener('click', closeHelpGuide);
document.querySelector('.popup-content').addEventListener('click', function (e) { e.stopPropagation(); });
document.getElementById('popupClose').addEventListener('click', function () { closeHelpGuide(); });

// Guide language tabs
document.getElementById('enTab').addEventListener('click', function () { switchGuideLanguage('en'); });
document.getElementById('heTab').addEventListener('click', function () { switchGuideLanguage('he'); });

// Share section buttons (6 buttons, matched by position)
const shareBtns = document.querySelectorAll('.share-btn');
if (shareBtns[0]) shareBtns[0].addEventListener('click', shareOnFacebook);
if (shareBtns[1]) shareBtns[1].addEventListener('click', shareOnTwitter);
if (shareBtns[2]) shareBtns[2].addEventListener('click', shareOnLinkedIn);
if (shareBtns[3]) shareBtns[3].addEventListener('click', shareOnWhatsApp);
if (shareBtns[4]) shareBtns[4].addEventListener('click', shareOnTelegram);
if (shareBtns[5]) shareBtns[5].addEventListener('click', shareOnInstagram);

// Conversion option change listeners
document.getElementById('includeHeaders').addEventListener('change', updatePreview);
document.getElementById('skipEmptyRows').addEventListener('change', function () {
    if (extractedData.length > 0) {
        extractedData = cleanAndStructureData(extractedData);
        updatePreview();
    }
});
document.getElementById('autoDetectColumns').addEventListener('change', function () {
    if (extractedData.length > 0) {
        extractedData = cleanAndStructureData(extractedData);
        updatePreview();
    }
});
document.getElementById('rtlSupport').addEventListener('change', updatePreview);
document.getElementById('mergeFragments').addEventListener('change', function () {
    if (extractedData.length > 0) {
        extractedData = cleanAndStructureData(extractedData);
        updatePreview();
    }
});
document.getElementById('extractionMethod').addEventListener('change', function () {
    if (currentPDF) {
        extractDataFromPDF();
    }
});

// Close help popup with Escape key
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeHelpGuide();
    }
});

/* ===== File Handling ===== */
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    uploadSection.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadSection.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadSection.classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        processFile(files[0]);
    } else {
        showStatus('Please drop a valid PDF file.', 'error');
    }
}

async function processFile(file) {
    if (file.type !== 'application/pdf') {
        showStatus('Please select a valid PDF file.', 'error');
        return;
    }

    fileName = file.name.replace('.pdf', '');
    showFileInfo(file);

    // Show Turnstile verification before processing
    pendingFile = file;
    turnstileContainer.style.display = 'block';
    showStatus('Please complete the security verification below to proceed.', 'info');

    renderTurnstileWidget();
}

async function processPDFAfterVerification(file) {
    showProgress(10);
    showStatus('Loading PDF file...', 'info');

    try {
        const arrayBuffer = await file.arrayBuffer();
        showProgress(30);

        currentPDF = await pdfjsLib.getDocument(arrayBuffer).promise;
        document.getElementById('pageCount').textContent = `Pages: ${currentPDF.numPages}`;

        showProgress(50);
        optionsSection.style.display = 'block';

        await extractDataFromPDF();

    } catch (error) {
        console.error('Error processing PDF:', error);
        showStatus('Error processing PDF file. Please try again.', 'error');
        hideProgress();
    }
}

/* ===== PDF Data Extraction ===== */
async function extractDataFromPDF() {
    if (!currentPDF) return;

    showProgress(60);
    showStatus('Extracting data from PDF...', 'info');

    try {
        const method = document.getElementById('extractionMethod').value;
        const pageRangeType = document.getElementById('pageRange').value;
        const customRange = document.getElementById('customRange').value;

        let pagesToProcess = [];

        if (pageRangeType === 'all') {
            pagesToProcess = Array.from({length: currentPDF.numPages}, function (_, i) { return i + 1; });
        } else if (pageRangeType === 'first') {
            pagesToProcess = [1];
        } else if (pageRangeType === 'custom' && customRange) {
            pagesToProcess = parsePageRange(customRange, currentPDF.numPages);
        }

        if (pagesToProcess.length === 0) {
            showStatus('No valid pages to process.', 'error');
            return;
        }

        extractedData = [];

        for (let i = 0; i < pagesToProcess.length; i++) {
            const pageNum = pagesToProcess[i];
            showProgress(60 + (i / pagesToProcess.length) * 30);

            const page = await currentPDF.getPage(pageNum);
            const pageData = await extractDataFromPage(page, method);

            if (pageData.length > 0) {
                extractedData.push(...pageData);
            }
        }

        if (extractedData.length === 0) {
            showStatus('No data found in the PDF. Try different extraction method.', 'error');
            hideProgress();
            return;
        }

        extractedData = cleanAndStructureData(extractedData);
        showProgress(100);

        updatePreview();
        enableDownloads();

        showStatus(`Successfully extracted ${extractedData.length} rows of data!`, 'success');
        hideProgress();

    } catch (error) {
        console.error('Error extracting data:', error);
        showStatus('Error extracting data from PDF.', 'error');
        hideProgress();
    }
}

async function extractDataFromPage(page, method) {
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    if (method === 'table' || method === 'advanced') {
        return extractTableData(textContent, viewport, method === 'advanced');
    } else if (method === 'structured') {
        return extractStructuredData(textContent, viewport);
    } else {
        return extractTextData(textContent);
    }
}

function extractTableData(textContent, viewport, advanced) {
    if (advanced === undefined) advanced = false;
    const items = textContent.items;
    const rows = [];
    const tolerance = advanced ? 3 : 5;

    const rowGroups = {};
    items.forEach(function (item) {
        const y = Math.round(item.transform[5] / tolerance) * tolerance;
        if (!rowGroups[y]) {
            rowGroups[y] = [];
        }
        rowGroups[y].push({
            text: item.str.trim(),
            x: item.transform[4],
            y: item.transform[5]
        });
    });

    const sortedYs = Object.keys(rowGroups).map(Number).sort(function (a, b) { return b - a; });

    sortedYs.forEach(function (y) {
        const rowItems = rowGroups[y].sort(function (a, b) { return a.x - b.x; });
        const rowData = [];

        if (advanced) {
            const columns = detectColumns(rowItems);
            columns.forEach(function (col) {
                rowData.push(col.text);
            });
        } else {
            rowItems.forEach(function (item) {
                if (item.text) {
                    rowData.push(item.text);
                }
            });
        }

        if (rowData.length > 0) {
            rows.push(rowData);
        }
    });

    return rows;
}

function detectColumns(items) {
    if (items.length === 0) return [];

    items.sort(function (a, b) { return a.x - b.x; });

    const columns = [];
    let currentColumn = { text: items[0].text, x: items[0].x };

    for (let i = 1; i < items.length; i++) {
        const item = items[i];
        const gap = item.x - (currentColumn.x + currentColumn.text.length * 6);

        if (gap > 20) {
            columns.push(currentColumn);
            currentColumn = { text: item.text, x: item.x };
        } else {
            currentColumn.text += ' ' + item.text;
        }
    }

    columns.push(currentColumn);
    return columns;
}

function extractStructuredData(textContent, viewport) {
    const items = textContent.items;
    const lines = [];

    const lineGroups = {};
    items.forEach(function (item) {
        const y = Math.round(item.transform[5]);
        if (!lineGroups[y]) {
            lineGroups[y] = [];
        }
        lineGroups[y].push(item);
    });

    Object.keys(lineGroups).sort(function (a, b) { return b - a; }).forEach(function (y) {
        const lineItems = lineGroups[y].sort(function (a, b) { return a.transform[4] - b.transform[4]; });
        const lineText = lineItems.map(function (item) { return item.str.trim(); }).filter(function (text) { return text; }).join(' ');

        if (lineText) {
            const structuredData = parseStructuredLine(lineText);
            if (structuredData.length > 1) {
                lines.push(structuredData);
            } else {
                lines.push([lineText]);
            }
        }
    });

    return lines;
}

function parseStructuredLine(text) {
    const patterns = [
        /([^:,]+):\s*([^:,]+)/g,
        /([^|]+)\|([^|]+)/g,
        /([^\t]+)\t([^\t]+)/g,
    ];

    for (const pattern of patterns) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length > 0) {
            return matches.map(function (match) { return match[2].trim(); });
        }
    }

    const delimiters = ['\t', '|', ',', ';'];
    for (const delimiter of delimiters) {
        if (text.includes(delimiter)) {
            return text.split(delimiter).map(function (part) { return part.trim(); }).filter(function (part) { return part; });
        }
    }

    return [text];
}

function extractTextData(textContent) {
    const items = textContent.items;
    const lines = [];

    const lineGroups = {};
    items.forEach(function (item) {
        const y = Math.round(item.transform[5]);
        if (!lineGroups[y]) {
            lineGroups[y] = [];
        }
        lineGroups[y].push(item.str.trim());
    });

    Object.keys(lineGroups).sort(function (a, b) { return b - a; }).forEach(function (y) {
        const lineText = lineGroups[y].filter(function (text) { return text; }).join(' ');
        if (lineText) {
            lines.push([lineText]);
        }
    });

    return lines;
}

function cleanAndStructureData(data) {
    if (!data || data.length === 0) return [];

    let cleaned = [...data];

    if (document.getElementById('skipEmptyRows').checked) {
        cleaned = cleaned.filter(function (row) {
            return row.some(function (cell) { return cell && cell.toString().trim() !== ''; });
        });
    }

    if (document.getElementById('mergeFragments').checked) {
        cleaned = mergeTextFragments(cleaned);
    }

    if (document.getElementById('autoDetectColumns').checked) {
        cleaned = normalizeColumns(cleaned);
    }

    return cleaned;
}

function mergeTextFragments(data) {
    return data.map(function (row) {
        return row.map(function (cell) {
            if (typeof cell === 'string') {
                return cell
                    .replace(/\s+/g, ' ')
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .trim();
            }
            return cell;
        });
    });
}

function normalizeColumns(data) {
    if (data.length === 0) return data;

    const maxColumns = Math.max(...data.map(function (row) { return row.length; }));

    return data.map(function (row) {
        const normalizedRow = [...row];
        while (normalizedRow.length < maxColumns) {
            normalizedRow.push('');
        }
        return normalizedRow;
    });
}

function parsePageRange(rangeStr, maxPage) {
    const pages = new Set();
    const parts = rangeStr.split(',');

    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(function (n) { return parseInt(n.trim()); });
            if (start && end) {
                for (let i = Math.max(1, start); i <= Math.min(maxPage, end); i++) {
                    pages.add(i);
                }
            }
        } else {
            const pageNum = parseInt(trimmed);
            if (pageNum && pageNum >= 1 && pageNum <= maxPage) {
                pages.add(pageNum);
            }
        }
    }

    return Array.from(pages).sort(function (a, b) { return a - b; });
}

/* ===== Preview & Download ===== */
function updatePreview() {
    if (extractedData.length === 0) return;

    const includeHeaders = document.getElementById('includeHeaders').checked;
    const rtlSupport = document.getElementById('rtlSupport').checked;
    const previewData = extractedData.slice(0, 10);

    const header = document.getElementById('previewHeader');
    const body = document.getElementById('previewBody');

    header.innerHTML = '';
    body.innerHTML = '';

    if (previewData.length === 0) return;

    const headerRow = document.createElement('tr');
    const maxColumns = Math.max(...previewData.map(function (row) { return row.length; }));

    for (let i = 0; i < maxColumns; i++) {
        const th = document.createElement('th');
        th.textContent = includeHeaders && previewData[0] ?
            (previewData[0][i] || `Column ${i + 1}`) :
            `Column ${i + 1}`;
        headerRow.appendChild(th);
    }
    header.appendChild(headerRow);

    const startIndex = includeHeaders ? 1 : 0;
    for (let i = startIndex; i < previewData.length; i++) {
        const row = previewData[i];
        const tr = document.createElement('tr');

        for (let j = 0; j < maxColumns; j++) {
            const td = document.createElement('td');
            const cellContent = row[j] || '';
            td.textContent = cellContent;

            if (rtlSupport && cellContent && /[\u0590-\u05FF\u0600-\u06FF]/.test(cellContent)) {
                td.classList.add('rtl');
            }

            tr.appendChild(td);
        }
        body.appendChild(tr);
    }

    previewSection.style.display = 'block';
}

function downloadFile(format) {
    if (extractedData.length === 0) return;

    const includeHeaders = document.getElementById('includeHeaders').checked;
    const data = [...extractedData];

    if (format === 'excel') {
        downloadExcelFile(data, includeHeaders);
    } else if (format === 'csv') {
        downloadCSVFile(data, includeHeaders);
    }
}

// Guard against spreadsheet formula injection (CWE-1236 / CSV injection).
// Text extracted from an untrusted PDF is written into cells; if a cell begins
// with a formula trigger a spreadsheet app may auto-evaluate it on open. Prefix
// such values with a single quote so they are treated as literal text. Plain
// numbers (including negatives) are left untouched.
function sanitizeCell(value) {
    const str = (value === null || value === undefined) ? '' : value.toString();
    if (/^[=+\-@\t\r]/.test(str) && !/^-?\d+(?:\.\d+)?$/.test(str)) {
        return "'" + str;
    }
    return str;
}

function sanitizeData(data) {
    return data.map(function (row) {
        return row.map(sanitizeCell);
    });
}

function downloadExcelFile(data, includeHeaders) {
    try {
        const ws = XLSX.utils.aoa_to_sheet(sanitizeData(data));
        const wb = XLSX.utils.book_new();

        const colWidths = [];
        if (data.length > 0) {
            for (let i = 0; i < data[0].length; i++) {
                const maxLength = Math.max(
                    ...data.map(function (row) { return (row[i] || '').toString().length; })
                );
                colWidths.push({ width: Math.min(Math.max(maxLength, 10), 50) });
            }
            ws['!cols'] = colWidths;
        }

        XLSX.utils.book_append_sheet(wb, ws, 'Converted Data');

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        downloadBlob(blob, `${fileName}_converted.xlsx`);
        showStatus('📊 Excel file downloaded successfully!', 'success');

    } catch (error) {
        console.error('Error creating Excel file:', error);
        showStatus('Error creating Excel file.', 'error');
    }
}

function downloadCSVFile(data, includeHeaders) {
    try {
        const csvContent = data.map(function (row) {
            return row.map(function (cell) {
                const cellStr = sanitizeCell(cell);
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',');
        }).join('\n');

        const blob = new Blob(['\ufeff' + csvContent], {
            type: 'text/csv;charset=utf-8;'
        });

        downloadBlob(blob, `${fileName}_converted.csv`);
        showStatus('📋 CSV file downloaded successfully!', 'success');

    } catch (error) {
        console.error('Error creating CSV file:', error);
        showStatus('Error creating CSV file.', 'error');
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ===== Utility Functions ===== */
function showFileInfo(file) {
    document.getElementById('fileName').textContent = `📄 File: ${file.name}`;
    document.getElementById('fileSize').textContent = `💾 Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    fileInfo.style.display = 'block';
}

function showProgress(percentage) {
    progressContainer.style.display = 'block';
    progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
}

function hideProgress() {
    setTimeout(function () {
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
    }, 1000);
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';

    if (type === 'success') {
        setTimeout(function () {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

function enableDownloads() {
    downloadExcel.disabled = false;
    downloadCSV.disabled = false;
}

/* ===== Social Sharing ===== */
function shareOnFacebook() {
    const url = encodeURIComponent('https://convert.nx1xlab.dev');
    const title = currentLanguage === 'he' ?
        encodeURIComponent('EasyConvert - המרת טבלאות PDF לאקסל/CSV בחינם') :
        encodeURIComponent('EasyConvert - Free PDF Table to Excel/CSV Converter');
    const description = currentLanguage === 'he' ?
        encodeURIComponent('כלי חינמי לחלוטין להמרת טבלאות מקבצי PDF לאקסל ו-CSV. ללא הרשמה, ללא איסוף נתונים, עיבוד מקומי בטוח. מתמחה בטבלאות בלבד. נבנה כדי לעזור, לא כדי להרוויח.') :
        encodeURIComponent('A genuinely free PDF table converter that respects your privacy. Converts tables only. No signup required, no data collection, completely client-side processing. Built to help, not to profit.');

    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${title} - ${description}`, '_blank', 'noopener,noreferrer,width=600,height=400');
    trackSocialShare('facebook');
}

function shareOnTwitter() {
    const url = encodeURIComponent('https://convert.nx1xlab.dev');
    const text = currentLanguage === 'he' ?
        encodeURIComponent('גיליתי את EasyConvert - כלי חינמי להמרת טבלאות PDF לאקסל/CSV שמכבד פרטיות. ללא הרשמה, ללא איסוף נתונים, עובד במלואו בדפדפן. מתמחה בטבלאות בלבד. נבנה כדי לעזור לקהילה. #PDFConverter #Privacy #Hebrew #עברית') :
        encodeURIComponent('Discovered EasyConvert - a genuinely free PDF table converter that respects user privacy. No signup, no data collection, works entirely in your browser. Converts tables only. Built to help the community. #PDFConverter #Privacy #FreeTools');

    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer,width=600,height=400');
    trackSocialShare('twitter');
}

function shareOnLinkedIn() {
    const url = encodeURIComponent('https://convert.nx1xlab.dev');
    const title = encodeURIComponent('EasyConvert - המרת טבלאות PDF בחינם עם הגנת פרטיות');
    const summary = encodeURIComponent('כלי מתוחכם וחינמי לחלוטין להמרת טבלאות מקבצי PDF לאקסל/CSV המעדיף פרטיות ואבטחת נתונים. כולל זיהוי טבלאות מתקדם, תמיכה בעברית וערבית, ועיבוד מקומי 100%. ללא הרשמה, ללא איסוף נתונים. A thoughtfully designed, completely free PDF table converter. Converts tables only - טבלאות בלבד. Built to serve the professional community without compromise.');

    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`, '_blank', 'noopener,noreferrer,width=600,height=400');
    trackSocialShare('linkedin');
}

function shareOnWhatsApp() {
    const url = 'https://convert.nx1xlab.dev';
    const text = encodeURIComponent(`מצאתי כלי מועיל להמרת טבלאות PDF לאקסל/CSV שמכבד פרטיות:\n\n✅ חינמי לחלוטין\n✅ ללא הרשמה\n✅ ללא איסוף נתונים\n✅ עובד במלואו בדפדפן\n✅ ללא הגבלת גודל קבצים\n✅ מתמחה בטבלאות בלבד - Tables only\n\nנבנה כדי לעזור, לא כדי להרוויח מהנתונים שלכם.\n\nFound a helpful PDF table converter that respects privacy - converts tables only!\n\n${url}`);

    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        window.open(`whatsapp://send?text=${text}`, '_blank', 'noopener,noreferrer');
    } else {
        window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer,width=600,height=400');
    }
    trackSocialShare('whatsapp');
}

function shareOnTelegram() {
    const url = encodeURIComponent('https://convert.nx1xlab.dev');
    const text = encodeURIComponent('EasyConvert: כלי חינמי להמרת טבלאות PDF לאקסל/CSV שמכבד פרטיות. ללא הרשמה, ללא איסוף נתונים, עובד במלואו בדפדפן. מתמחה בטבלאות בלבד - Tables only. A genuinely free PDF table converter built to help the community.');

    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer,width=600,height=400');
    trackSocialShare('telegram');
}

function shareOnInstagram() {
    const text = `EasyConvert - המרת טבלאות PDF בחינם\n\n✅ חינמי לחלוטין\n✅ ללא הרשמה\n✅ ללא איסוף נתונים\n✅ עובד במלואו בדפדפן\n✅ מכבד פרטיות\n✅ מתמחה בטבלאות בלבד - Tables only\n\nנבנה כדי לעזור, לא כדי להרוויח מהנתונים.\n\nA privacy-focused PDF table converter\n\nLink: https://convert.nx1xlab.dev\n\n#PDFConverter #Privacy #Hebrew #עברית #טבלאות #FreeTools`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
            alert('📋 התוכן הועתק ללוח! Content copied to clipboard!\n\nYou can now paste this in your Instagram story or post. Instagram doesn\'t support direct link sharing, so we\'ve copied the text for you to share manually.');
        });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('📋 התוכן הועתק ללוח! Content copied to clipboard!\n\nYou can now paste this in your Instagram story or post.');
    }
    trackSocialShare('instagram');
}

function trackSocialShare(platform) {
    console.log('Social share:', platform);
}

/* ===== Cloudflare Turnstile ===== */
let turnstileWidgetId = null;

// Called when Turnstile script loads via ?onload=onloadTurnstileCallback
window.onloadTurnstileCallback = function () {
    console.log('✅ Turnstile callback executed - script ready');
    window.turnstileScriptLoaded = true;
};

function showTurnstileError() {
    const fallback = document.getElementById('turnstileFallback');
    if (fallback) fallback.style.display = 'block';
}

function renderTurnstileWidget() {
    const widget = document.getElementById('turnstileWidget');

    // Script failed to load - show error, no bypass
    if (window.turnstileLoadError) {
        console.warn('Turnstile script failed to load');
        showTurnstileError();
        return;
    }

    // Script still loading - retry once after 2s, then show error
    if (!window.turnstileScriptLoaded) {
        setTimeout(function () {
            if (window.turnstileScriptLoaded) {
                renderTurnstileWidget();
            } else {
                console.warn('Turnstile script load timeout');
                showTurnstileError();
            }
        }, 2000);
        return;
    }

    if (typeof turnstile !== 'undefined' && widget) {
        try {
            widget.innerHTML = '';
            turnstileWidgetId = turnstile.render('#turnstileWidget', {
                sitekey: '0x4AAAAAABgnH-kcJlEFNqBe',
                callback: onTurnstileSuccess,
                'error-callback': onTurnstileError,
                theme: 'light',
                size: 'normal'
            });
            if (!turnstileWidgetId) {
                console.warn('Turnstile render returned no ID');
                showTurnstileError();
            }
        } catch (error) {
            console.error('Turnstile render threw:', error);
            showTurnstileError();
        }
    } else {
        console.warn('Turnstile object not available');
        showTurnstileError();
    }
}

function onTurnstileSuccess(token) {
    turnstileVerified = true;
    turnstileContainer.style.display = 'none';
    if (pendingFile) {
        processPDFAfterVerification(pendingFile);
        pendingFile = null;
    }
}

function onTurnstileError(error) {
    console.error('Turnstile verification error:', error);
    showTurnstileError();
}

/* ===== Service Worker (PWA) ===== */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js')
            .then(function () { console.log('SW registered'); })
            .catch(function () { console.log('SW registration failed'); });
    });
}

/* ===== Language / i18n ===== */
let currentLanguage = 'en';
const currentYear = new Date().getFullYear();

const translations = {
    en: {
        mainTitle: "EasyConvert",
        uploadText: "Drag and drop your PDF file here or click to browse",
        chooseFileBtn: "Choose PDF File",
        securityTitle: "🔒 Security Verification:",
        securityDesc: "Please complete this quick verification to ensure secure processing",
        langFlag: "🇮🇱",
        langText: "עברית",
        featureTag1: "Free",
        featureTag2: "Private",
        featureTag3: "No signup",
        featureTag4: "RTL support",
        fileInfoTitle: "File Information",
        optionsTitle: "Conversion Options",
        extractionLabel: "Data Extraction Method:",
        optionTable: "🔍 Smart Table Detection (Recommended)",
        optionText: "📝 Text Extraction",
        optionStructured: "🏗️ Structured Data",
        optionAdvanced: "🚀 Advanced Table Detection",
        pageRangeLabel: "Page Range:",
        optionAllPages: "📄 All Pages",
        optionFirstPage: "1️⃣ First Page Only",
        optionCustomRange: "✏️ Custom Range",
        customRangePlaceholder: "e.g., 1-5, 8, 10-12",
        labelIncludeHeaders: "Include Headers",
        labelSkipEmptyRows: "Skip Empty Rows",
        labelAutoDetectColumns: "Auto-detect Columns",
        labelRtlSupport: "Hebrew/Arabic RTL Support",
        labelMergeFragments: "Merge Text Fragments",
        previewTitle: "Data Preview",
        downloadExcelText: "📊 Download Excel",
        downloadCSVText: "📋 Download CSV",
        shareTitle: "Found EasyConvert helpful?",
        shareDesc: "Share this free, privacy-focused tool with others who might benefit",
        footerBranding: "A project by <strong>NX1X</strong>",
        footerLink1: "More NX Tools",
        footerLink2: "NX1X Lab",
        footerLink3: "GitHub",
        footerPrivacy: "<strong>Privacy:</strong> Your PDFs are processed entirely in your browser. No files are uploaded to any server. Anonymous usage analytics via Cloudflare Analytics.",
        footerCopyright: `© ${currentYear} NX1X.`
    },
    he: {
        mainTitle: "EasyConvert",
        uploadText: "גררו ושחררו את קובץ ה-PDF כאן או לחצו לבחירה",
        chooseFileBtn: "בחרו קובץ PDF",
        securityTitle: "🔒 אימות אבטחה:",
        securityDesc: "אנא השלימו את האימות המהיר הזה כדי להבטיח עיבוד בטוח",
        langFlag: "🇺🇸",
        langText: "English",
        featureTag1: "חינמי",
        featureTag2: "פרטיות מלאה",
        featureTag3: "ללא הרשמה",
        featureTag4: "תמיכה בעברית",
        fileInfoTitle: "מידע על הקובץ",
        optionsTitle: "אפשרויות המרה",
        extractionLabel: "שיטת חילוץ נתונים:",
        optionTable: "🔍 זיהוי טבלאות חכם (מומלץ)",
        optionText: "📝 חילוץ טקסט",
        optionStructured: "🏗️ נתונים מובנים",
        optionAdvanced: "🚀 זיהוי טבלאות מתקדם",
        pageRangeLabel: "טווח עמודים:",
        optionAllPages: "📄 כל העמודים",
        optionFirstPage: "1️⃣ עמוד ראשון בלבד",
        optionCustomRange: "✏️ טווח מותאם אישית",
        customRangePlaceholder: "לדוגמה: 1-5, 8, 10-12",
        labelIncludeHeaders: "כלול כותרות",
        labelSkipEmptyRows: "דלג על שורות רקות",
        labelAutoDetectColumns: "זיהוי אוטומטי של עמודות",
        labelRtlSupport: "תמיכה בעברית/ערבית",
        labelMergeFragments: "מיזוג קטעי טקסט",
        previewTitle: "תצוגה מקדימה",
        downloadExcelText: "📊 הורד אקסל",
        downloadCSVText: "📋 הורד CSV",
        shareTitle: "EasyConvert עזר לכם?",
        shareDesc: "שתפו את הכלי החינמי הזה עם אחרים שיכולים להפיק ממנו תועלת",
        footerBranding: "פרויקט של <strong>NX1X</strong>",
        footerLink1: "עוד כלים מבית NX",
        footerLink2: "NX1X Lab",
        footerLink3: "GitHub",
        footerPrivacy: "<strong>פרטיות:</strong> קבצי ה-PDF שלכם מעובדים לחלוטין בדפדפן שלכם. לא מועלים קבצים לשום שרת. אנליטיקה אנונימית בסיסית דרך Cloudflare Analytics.",
        footerCopyright: `© ${currentYear} NX1X.`
    }
};

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'he' : 'en';
    updateLanguage();
}

function updateLanguage() {
    const lang = translations[currentLanguage];
    const html = document.documentElement;

    html.setAttribute('lang', currentLanguage);
    html.setAttribute('dir', currentLanguage === 'he' ? 'rtl' : 'ltr');

    function updateElement(id, content, useInnerHTML) {
        const element = document.getElementById(id);
        if (element) {
            if (useInnerHTML) {
                element.innerHTML = content;
            } else {
                element.textContent = content;
            }
        }
    }

    updateElement('mainTitle', lang.mainTitle);
    updateElement('uploadText', lang.uploadText);
    updateElement('chooseFileBtn', lang.chooseFileBtn);
    updateElement('securityTitle', lang.securityTitle);
    updateElement('securityDesc', lang.securityDesc);
    updateElement('langFlag', lang.langFlag);
    updateElement('langText', lang.langText);
    updateElement('featureTag1', lang.featureTag1);
    updateElement('featureTag2', lang.featureTag2);
    updateElement('featureTag3', lang.featureTag3);
    updateElement('featureTag4', lang.featureTag4);
    updateElement('fileInfoTitle', lang.fileInfoTitle);
    updateElement('optionsTitle', lang.optionsTitle);
    updateElement('extractionLabel', lang.extractionLabel);
    updateElement('optionTable', lang.optionTable);
    updateElement('optionText', lang.optionText);
    updateElement('optionStructured', lang.optionStructured);
    updateElement('optionAdvanced', lang.optionAdvanced);
    updateElement('pageRangeLabel', lang.pageRangeLabel);
    updateElement('optionAllPages', lang.optionAllPages);
    updateElement('optionFirstPage', lang.optionFirstPage);
    updateElement('optionCustomRange', lang.optionCustomRange);
    updateElement('labelIncludeHeaders', lang.labelIncludeHeaders);
    updateElement('labelSkipEmptyRows', lang.labelSkipEmptyRows);
    updateElement('labelAutoDetectColumns', lang.labelAutoDetectColumns);
    updateElement('labelRtlSupport', lang.labelRtlSupport);
    updateElement('labelMergeFragments', lang.labelMergeFragments);
    updateElement('previewTitle', lang.previewTitle);
    updateElement('downloadExcelText', lang.downloadExcelText);
    updateElement('downloadCSVText', lang.downloadCSVText);
    updateElement('shareTitle', lang.shareTitle);
    updateElement('shareDesc', lang.shareDesc);
    updateElement('footerBranding', lang.footerBranding, true);
    updateElement('footerLink1', lang.footerLink1);
    updateElement('footerLink2', lang.footerLink2);
    updateElement('footerLink3', lang.footerLink3);
    updateElement('footerPrivacy', lang.footerPrivacy, true);
    updateElement('footerCopyright', lang.footerCopyright);

    const customRangeInput = document.getElementById('customRange');
    if (customRangeInput) {
        customRangeInput.placeholder = lang.customRangePlaceholder;
    }

    document.title = currentLanguage === 'he' ?
        "EasyConvert - המרת טבלאות PDF לאקסל/CSV בחינם" :
        "EasyConvert - Free PDF Table to Excel/CSV Converter";

    localStorage.setItem('easyconvert-language', currentLanguage);
}

function initializeLanguage() {
    const savedLanguage = localStorage.getItem('easyconvert-language');
    if (savedLanguage && savedLanguage !== currentLanguage) {
        currentLanguage = savedLanguage;
        updateLanguage();
    }
}

document.addEventListener('DOMContentLoaded', initializeLanguage);

/* ===== Help Popup ===== */
function openHelpGuide() {
    const popup = document.getElementById('helpPopup');
    if (popup) {
        popup.style.display = 'block';
        document.body.style.overflow = 'hidden';
        switchGuideLanguage(currentLanguage);
    }
}

function closeHelpGuide(event) {
    if (event && event.target !== event.currentTarget) {
        return;
    }
    const popup = document.getElementById('helpPopup');
    if (popup) {
        popup.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function switchGuideLanguage(lang) {
    const enTab = document.getElementById('enTab');
    const heTab = document.getElementById('heTab');
    const enContent = document.getElementById('guideEn');
    const heContent = document.getElementById('guideHe');
    const enContact = document.getElementById('contactInfoEn');
    const heContact = document.getElementById('contactInfoHe');

    if (lang === 'en') {
        enTab.classList.add('active');
        heTab.classList.remove('active');
        enContent.classList.add('active');
        heContent.classList.remove('active');
        if (enContact) enContact.style.display = 'block';
        if (heContact) heContact.style.display = 'none';
    } else {
        heTab.classList.add('active');
        enTab.classList.remove('active');
        heContent.classList.add('active');
        enContent.classList.remove('active');
        if (enContact) enContact.style.display = 'none';
        if (heContact) heContact.style.display = 'block';
    }
}

/* ===== Help Button Text ===== */
function updateHelpButtonText() {
    const helpButtonText = document.getElementById('helpButtonText');
    if (helpButtonText) {
        helpButtonText.textContent = currentLanguage === 'he' ? 'עזרה ומדריך' : 'Help & Guide';
    }
}

// Wrap updateLanguage to also update the help button text
const originalUpdateLanguage = updateLanguage;
updateLanguage = function () {
    originalUpdateLanguage();
    updateHelpButtonText();
};
