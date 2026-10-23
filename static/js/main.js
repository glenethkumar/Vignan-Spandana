/**
 * Vignan Spandana - Main JS
 * Features:
 * - Interactive Simulated Call Demo Modal with Status Timeline & Script Streaming
 * - Quick login filler for role switching
 * - Client-side table search & filter
 */

// Global simulation state
const simState = {
    inProgress: false,
    studentId: null,
    phone: null,
    studentName: null,
    roll: null,
    dept: null,
    attendance: null,
    callCompleted: false,
    timerInterval: null,
    timeoutHandles: []
};

// Helper to get CSRF token
function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) {
        return meta.content;
    }
    const input = document.querySelector('input[name="csrf_token"]');
    return input ? input.value : '';
}

/**
 * Triggers the Simulated Call Demo Popup Modal
 * Supports either:
 * - triggerCallParent(studentId, name, roll, dept, phone, attendance, lang)
 * - or fallback: triggerCallParent(name, phone, lang)
 */
function triggerCallParent(studentIdOrName, nameOrPhone, rollOrLang, dept, phone, attendance, lang) {
    if (simState.inProgress) {
        return; // Guard against double-clicking call buttons
    }

    let studentId, studentName, roll, department, parentPhone, attendancePct, preferredLang;

    if (typeof studentIdOrName === 'number' || (typeof studentIdOrName === 'string' && /^\d+$/.test(studentIdOrName))) {
        studentId = studentIdOrName;
        studentName = nameOrPhone || 'Student';
        roll = rollOrLang || '';
        department = dept || '';
        parentPhone = (phone && phone !== 'None' && phone !== 'null' && phone !== 'N/A') ? phone : '';
        attendancePct = (attendance !== undefined && attendance !== null && attendance !== 'None' && attendance !== '' && attendance !== 'null') ? attendance : null;
        preferredLang = lang || 'English';
    } else {
        studentId = 1;
        studentName = studentIdOrName || 'Student';
        parentPhone = nameOrPhone || '';
        preferredLang = rollOrLang || 'English';
        roll = 'Demo';
        department = 'CSE';
        attendancePct = null;
    }

    simState.studentId = studentId;
    simState.studentName = studentName;
    simState.roll = roll;
    simState.dept = department;
    simState.phone = parentPhone;
    simState.attendance = attendancePct;
    simState.callCompleted = false;

    // Reset UI elements
    const modal = document.getElementById('simCallModalOverlay');
    if (!modal) return;

    document.getElementById('simModalStudentName').textContent = studentName;
    document.getElementById('simModalRoll').textContent = roll || 'N/A';
    document.getElementById('simModalDept').textContent = department || 'General';
    document.getElementById('simModalAttendance').textContent = attendancePct !== null ? `${attendancePct}%` : 'Unavailable (Pending)';
    document.getElementById('simModalPhone').textContent = parentPhone || 'Not Registered';

    // Set Language dropdown (English or Telugu)
    const langSelect = document.getElementById('simModalLang');
    if (langSelect) {
        langSelect.disabled = false;
        const normalized = (preferredLang || '').toLowerCase();
        if (normalized.includes('telugu')) {
            langSelect.value = 'Telugu';
        } else {
            langSelect.value = 'English';
        }
    }

    // Reset Stepper
    resetTimelineStepper();

    // Reset Status Banner
    const statusBar = document.getElementById('simCallStatusBar');
    if (statusBar) {
        statusBar.className = 'call-status-banner status-idle';
        document.getElementById('simStatusIcon').textContent = '⚪';
        document.getElementById('simStatusText').textContent = 'Ready to simulate parent call. Select language and click Start Call.';
        document.getElementById('simCallTimer').textContent = '00:00';
    }

    // Reset Transcript Box
    const stream = document.getElementById('simTranscriptStream');
    if (stream) stream.innerHTML = '';
    const placeholder = document.getElementById('simTranscriptPlaceholder');
    if (placeholder) placeholder.style.display = 'block';

    // Hide summary card
    const summaryCard = document.getElementById('simCallSummaryCard');
    if (summaryCard) summaryCard.style.display = 'none';

    // Reset Button
    const btnStart = document.getElementById('btnStartCall');
    if (btnStart) {
        btnStart.disabled = false;
        btnStart.innerHTML = '▶️ Start Call';
    }

    const btnDone = document.getElementById('btnModalDone');
    if (btnDone) btnDone.disabled = false;
    const btnClose = document.getElementById('btnModalClose');
    if (btnClose) btnClose.disabled = false;

    modal.style.display = 'flex';
}

function resetTimelineStepper() {
    ['stepDialing', 'stepConnected', 'stepTranscript', 'stepEnded'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active', 'completed');
        }
    });
}

function clearSimTimers() {
    if (simState.timerInterval) {
        clearInterval(simState.timerInterval);
        simState.timerInterval = null;
    }
    simState.timeoutHandles.forEach(h => clearTimeout(h));
    simState.timeoutHandles = [];
}

/**
 * Starts the Simulated Call Process
 * Timeline: Dialing (2s) -> Connected -> Transcript (1.5s/line) -> Call ended
 */
async function startSimulatedCall() {
    if (simState.inProgress || !simState.studentId) return;

    clearSimTimers();
    simState.inProgress = true;

    const btnStart = document.getElementById('btnStartCall');
    const btnDone = document.getElementById('btnModalDone');
    const btnClose = document.getElementById('btnModalClose');
    const langSelect = document.getElementById('simModalLang');

    // 1. Disable button while call is in progress
    if (btnStart) {
        btnStart.disabled = true;
        btnStart.innerHTML = '⏳ Call in Progress...';
    }
    if (langSelect) langSelect.disabled = true;
    if (btnDone) btnDone.disabled = true;
    if (btnClose) btnClose.disabled = true;

    // Disable all page call buttons
    document.querySelectorAll('.btn-call').forEach(b => {
        b.classList.add('disabled-call');
        b.style.pointerEvents = 'none';
        b.style.opacity = '0.6';
    });

    // Reset Stepper & Status
    resetTimelineStepper();
    const stepDialing = document.getElementById('stepDialing');
    if (stepDialing) stepDialing.classList.add('active');

    const statusBar = document.getElementById('simCallStatusBar');
    if (statusBar) {
        statusBar.className = 'call-status-banner status-dialing';
        document.getElementById('simStatusIcon').textContent = '📞';
        document.getElementById('simStatusText').textContent = `Dialing +91 ${simState.phone}... (ringing)`;
        document.getElementById('simCallTimer').textContent = '00:00';
    }

    const placeholder = document.getElementById('simTranscriptPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
    const stream = document.getElementById('simTranscriptStream');
    if (stream) stream.innerHTML = '';

    const summaryCard = document.getElementById('simCallSummaryCard');
    if (summaryCard) summaryCard.style.display = 'none';

    // Dispatch backend API request to fetch script and save CallRecord + FollowUp
    const selectedLang = langSelect ? langSelect.value : 'English';
    let callData = null;

    try {
        const resp = await fetch(`/student/${simState.studentId}/call/demo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({
                language: selectedLang,
                csrf_token: getCsrfToken()
            })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: 'Failed to initiate simulated call.' }));
            throw new Error(err.error || 'Server error initiating simulated call.');
        }

        callData = await resp.json();
    } catch (err) {
        console.error('Call Simulation Error:', err);
        alert('Simulation Error: ' + err.message);
        finishCallState(false);
        return;
    }

    // Step 1: Dialing for exactly 2 seconds
    const handleConnected = setTimeout(() => {
        // Step 2: Connected
        if (stepDialing) {
            stepDialing.classList.remove('active');
            stepDialing.classList.add('completed');
        }
        const stepConnected = document.getElementById('stepConnected');
        if (stepConnected) stepConnected.classList.add('active');

        if (statusBar) {
            statusBar.className = 'call-status-banner status-connected';
            document.getElementById('simStatusIcon').textContent = '🟢';
            document.getElementById('simStatusText').textContent = 'Connected • AI Voice Dialog Active';
        }

        // Start call timer (seconds ticker)
        let elapsed = 1;
        document.getElementById('simCallTimer').textContent = '00:01';
        simState.timerInterval = setInterval(() => {
            elapsed++;
            const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const secs = String(elapsed % 60).padStart(2, '0');
            const timerEl = document.getElementById('simCallTimer');
            if (timerEl) timerEl.textContent = `${mins}:${secs}`;
        }, 1000);

        // Step 3: Stream transcript line by line (~1.5s per line)
        const stepTranscript = document.getElementById('stepTranscript');
        if (stepConnected) {
            stepConnected.classList.remove('active');
            stepConnected.classList.add('completed');
        }
        if (stepTranscript) stepTranscript.classList.add('active');

        const lines = callData.lines || [];
        lines.forEach((line, index) => {
            const lineTimeout = setTimeout(() => {
                appendTranscriptMessage(line.speaker, line.text);
            }, (index + 1) * 1500);
            simState.timeoutHandles.push(lineTimeout);
        });

        // Step 4: Call Ended after all lines display (+1.5s)
        const totalDurationMs = (lines.length + 1) * 1500 + 1500;
        const handleEnded = setTimeout(() => {
            if (stepTranscript) {
                stepTranscript.classList.remove('active');
                stepTranscript.classList.add('completed');
            }
            const stepEnded = document.getElementById('stepEnded');
            if (stepEnded) stepEnded.classList.add('completed');

            if (statusBar) {
                statusBar.className = 'call-status-banner status-ended';
                document.getElementById('simStatusIcon').textContent = '🏁';
                const duration = callData.duration_seconds || 45;
                document.getElementById('simStatusText').textContent = `Call ended (Duration: 0:${duration}s)`;
            }

            // Display Summary and Follow-Up notification
            if (summaryCard) {
                document.getElementById('simSavedRecordId').textContent = callData.call_record_id || '';
                document.getElementById('simSummaryText').textContent = callData.summary || '';
                summaryCard.style.display = 'block';
            }

            // Scroll container to bottom
            const container = document.getElementById('simTranscriptContainer');
            if (container) container.scrollTop = container.scrollHeight;

            finishCallState(true);
        }, totalDurationMs);

        simState.timeoutHandles.push(handleEnded);

    }, 2000);

    simState.timeoutHandles.push(handleConnected);
}

function appendTranscriptMessage(speaker, text) {
    const stream = document.getElementById('simTranscriptStream');
    if (!stream) return;

    const isAI = speaker === 'AI Assistant';
    const msg = document.createElement('div');
    msg.className = `msg-bubble ${isAI ? 'msg-ai' : 'msg-parent'}`;

    const speakerHeader = document.createElement('div');
    speakerHeader.className = 'msg-speaker';
    speakerHeader.innerHTML = isAI ? '🤖 AI Assistant' : '👤 Parent';

    const textBody = document.createElement('div');
    textBody.textContent = text;

    msg.appendChild(speakerHeader);
    msg.appendChild(textBody);
    stream.appendChild(msg);

    const container = document.getElementById('simTranscriptContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function finishCallState(success) {
    if (simState.timerInterval) {
        clearInterval(simState.timerInterval);
        simState.timerInterval = null;
    }

    simState.inProgress = false;
    simState.callCompleted = success;

    const btnStart = document.getElementById('btnStartCall');
    const btnDone = document.getElementById('btnModalDone');
    const btnClose = document.getElementById('btnModalClose');
    const langSelect = document.getElementById('simModalLang');

    if (btnStart) {
        btnStart.disabled = false;
        btnStart.innerHTML = '🔄 Re-run Call Simulation';
    }
    if (langSelect) langSelect.disabled = false;
    if (btnDone) btnDone.disabled = false;
    if (btnClose) btnClose.disabled = false;

    // Restore page call buttons
    document.querySelectorAll('.btn-call').forEach(b => {
        b.classList.remove('disabled-call');
        b.style.pointerEvents = '';
        b.style.opacity = '';
    });
}

function closeCallModal() {
    if (simState.inProgress) {
        return;
    }

    clearSimTimers();
    const modal = document.getElementById('simCallModalOverlay');
    if (modal) modal.style.display = 'none';

    // If call completed and currently on student detail page, reload to show new CallRecord & FollowUp
    if (simState.callCompleted && window.location.pathname.includes('/student/')) {
        window.location.reload();
    }
}

function handleModalOverlayClick(event) {
    if (event.target && event.target.id === 'simCallModalOverlay') {
        closeCallModal();
    }
}

// Quick credentials filler for demo / faculty review
function fillLogin(username, password) {
    const userField = document.getElementById('username');
    const passField = document.getElementById('password');
    if (userField && passField) {
        userField.value = username;
        passField.value = password;
        userField.style.backgroundColor = '#f0fdf4';
        passField.style.backgroundColor = '#f0fdf4';
        setTimeout(() => {
            userField.style.backgroundColor = '';
            passField.style.backgroundColor = '';
        }, 400);
    }
}

// Client-side quick filter for dashboard table
function filterStudents() {
    const searchInput = document.getElementById('studentSearch');
    const deptFilter = document.getElementById('deptFilter');
    const langFilter = document.getElementById('langFilter');
    const table = document.getElementById('studentsTable');
    
    if (!table) return;
    
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedDept = deptFilter ? deptFilter.value.toLowerCase() : '';
    const selectedLang = langFilter ? langFilter.value.toLowerCase() : '';
    
    const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
    let visibleCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.classList.contains('no-records-row')) continue;
        
        const roll = row.getAttribute('data-roll') || '';
        const name = row.getAttribute('data-name') || '';
        const dept = row.getAttribute('data-dept') || '';
        const lang = row.getAttribute('data-lang') || '';
        
        const matchesQuery = !query || roll.includes(query) || name.includes(query);
        const matchesDept = !selectedDept || dept === selectedDept;
        const matchesLang = !selectedLang || lang === selectedLang;
        
        if (matchesQuery && matchesDept && matchesLang) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    }
    
    const countDisplay = document.getElementById('visibleCount');
    if (countDisplay) {
        countDisplay.textContent = visibleCount;
    }
}
