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
function triggerCallParent(studentIdOrName, nameOrPhone, rollOrLang, dept, phone, attendance, lang, attendanceDate) {
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
    simState.attendanceDate = attendanceDate || '';
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
                attendance_date: simState.attendanceDate || '',
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

/* ==========================================================================
   Automated Parent Calling Queue Engine (Simulation Demonstration)
   ========================================================================== */
const queueState = {
    department: '',
    date: '',
    items: [],
    currentIndex: 0,
    inProgress: false,
    stopped: false,
    activeTimeout: null
};

async function openCallQueueModal(dept, date) {
    if (queueState.inProgress) {
        alert('A calling queue is currently in progress.');
        return;
    }

    queueState.department = dept;
    queueState.date = date;
    queueState.items = [];
    queueState.currentIndex = 0;
    queueState.inProgress = false;
    queueState.stopped = false;

    const modal = document.getElementById('callQueueModalOverlay');
    if (!modal) return;

    document.getElementById('queueDeptLabel').textContent = dept || 'General';
    document.getElementById('queueDateLabel').textContent = date || 'Today';

    const tbody = document.getElementById('queueTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                ⏳ Loading absent students queue for ${date}...
            </td>
        </tr>
    `;

    document.getElementById('queueProgressSection').style.display = 'none';
    document.getElementById('queueActiveCallCard').style.display = 'none';
    document.getElementById('btnStartQueueExec').style.display = 'inline-block';
    document.getElementById('btnStartQueueExec').disabled = true;
    document.getElementById('btnStopQueueExec').style.display = 'none';
    document.getElementById('queueProgressBadge').style.display = 'none';

    modal.style.display = 'flex';

    try {
        const resp = await fetch(`/attendance/queue?dept=${encodeURIComponent(dept)}&date=${encodeURIComponent(date)}`);
        if (!resp.ok) {
            throw new Error('Failed to load attendance call queue.');
        }
        const data = await resp.json();

        const pendingItems = data.queue || [];
        const alreadyCalled = data.already_called || [];
        queueState.items = pendingItems;

        document.getElementById('queueTotalAbsentCount').textContent = data.total_absent || 0;
        document.getElementById('queuePendingCountDisplay').textContent = pendingItems.length;
        document.getElementById('queueProcessedCountDisplay').textContent = alreadyCalled.length;
        document.getElementById('queueCountConfirm').textContent = pendingItems.length;

        renderQueueTable(pendingItems, alreadyCalled);

        const btnStart = document.getElementById('btnStartQueueExec');
        const confirmMsg = document.getElementById('queueConfirmMessage');

        if (pendingItems.length === 0) {
            btnStart.disabled = true;
            btnStart.textContent = '✅ All Absent Students Already Contacted';
            if (confirmMsg) {
                confirmMsg.innerHTML = `<strong>Queue Completed:</strong> All ${alreadyCalled.length} absent student(s) on ${date} have already been contacted. Duplicate processing is prevented.`;
            }
        } else {
            btnStart.disabled = false;
            btnStart.textContent = `▶️ Confirm & Start Calling Queue (${pendingItems.length})`;
            if (confirmMsg) {
                confirmMsg.innerHTML = `<strong>Faculty Confirmation Required:</strong> The sequential call queue contains <strong style="color: var(--primary-color);">${pendingItems.length}</strong> absent student(s). Each student will be called one at a time. Click below to confirm and begin.`;
            }
        }
    } catch (err) {
        console.error('Queue Load Error:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--danger); padding: 1.5rem;">
                    Failed to fetch queue data: ${err.message}
                </td>
            </tr>
        `;
    }
}

function renderQueueTable(pendingItems, alreadyCalled) {
    const tbody = document.getElementById('queueTableBody');
    if (!tbody) return;

    if (pendingItems.length === 0 && alreadyCalled.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                    No absent students recorded for this date.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    let idx = 1;

    pendingItems.forEach(s => {
        const qPos = s.queue_position || idx++;
        const pRel = s.parent_relationship || 'Parent';
        const pName = s.parent_name || 'Parent';
        const phone = s.parent_phone || 'None';
        let statusBadge = '';
        if (s.phone_valid === false) {
            statusBadge = `
                <span id="qstatus-${s.id}" class="badge badge-danger">⚠️ Invalid Phone</span>
                <div style="font-size: 0.72rem; color: #b91c1c; margin-top: 2px;">${s.failure_reason || 'Requires 10 digits'}</div>
            `;
        } else {
            statusBadge = `
                <span id="qstatus-${s.id}" class="badge badge-warning">
                    ⏳ Ready in Queue (#${qPos})
                </span>
            `;
        }

        html += `
            <tr id="qrow-${s.id}">
                <td style="color: var(--text-muted); font-weight: 600;">#${qPos}</td>
                <td style="font-family: monospace; font-weight: 600;">${s.roll_number}</td>
                <td><strong>${s.name}</strong></td>
                <td>
                    ${pName}
                    <span class="badge badge-dept" style="font-size: 0.7rem; padding: 2px 6px;">${pRel}</span>
                </td>
                <td style="font-family: monospace;">${phone}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });

    alreadyCalled.forEach(s => {
        const pRel = s.parent_relationship || 'Parent';
        const pName = s.parent_name || 'Parent';
        const phone = s.parent_phone || 'None';
        html += `
            <tr id="qrow-${s.id}" style="opacity: 0.75; background: #fafafa;">
                <td style="color: var(--text-muted);">-</td>
                <td style="font-family: monospace; font-weight: 600;">${s.roll_number}</td>
                <td><strong>${s.name}</strong></td>
                <td>
                    ${pName}
                    <span class="badge badge-dept" style="font-size: 0.7rem; padding: 2px 6px;">${pRel}</span>
                </td>
                <td style="font-family: monospace;">${phone}</td>
                <td>
                    <span id="qstatus-${s.id}" class="badge badge-success">
                        ✅ Contacted (#${s.call_record_id})
                    </span>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function handleQueueOverlayClick(event) {
    if (!queueState.inProgress) {
        closeCallQueueModal();
    }
}

function closeCallQueueModal() {
    if (queueState.inProgress && !queueState.stopped) {
        if (!confirm('A simulated call queue is currently running. Stop the queue and exit?')) {
            return;
        }
        stopQueueExecution();
    }
    const modal = document.getElementById('callQueueModalOverlay');
    if (modal) modal.style.display = 'none';

    // If calls were completed, refresh page to show updated badges and statistics
    if (queueState.currentIndex > 0) {
        window.location.reload();
    }
}

function stopQueueExecution() {
    queueState.stopped = true;
    const btnStop = document.getElementById('btnStopQueueExec');
    if (btnStop) {
        btnStop.disabled = true;
        btnStop.textContent = '⏹️ Stopping after current call...';
    }
    const badge = document.getElementById('queueProgressBadge');
    if (badge) {
        badge.textContent = '⏹️ Halting Queue...';
        badge.className = 'badge badge-danger';
    }
}

function skipCurrentInQueue() {
    if (!queueState.inProgress || queueState.currentIndex >= queueState.items.length) return;
    queueState.skipCurrent = true;
    const btnSkip = document.getElementById('btnSkipQueueExec');
    if (btnSkip) {
        btnSkip.disabled = true;
        btnSkip.textContent = '⏭️ Skipping student...';
    }
}

async function startQueueExecution() {
    if (queueState.inProgress || queueState.items.length === 0) return;

    queueState.inProgress = true;
    queueState.stopped = false;
    queueState.skipCurrent = false;
    queueState.currentIndex = 0;

    // Update UI controls
    document.getElementById('btnStartQueueExec').style.display = 'none';
    const btnStop = document.getElementById('btnStopQueueExec');
    btnStop.style.display = 'inline-block';
    btnStop.disabled = false;
    btnStop.textContent = '⏹️ Stop Queue';

    const btnSkip = document.getElementById('btnSkipQueueExec');
    if (btnSkip) {
        btnSkip.style.display = 'inline-block';
        btnSkip.disabled = false;
        btnSkip.textContent = '⏭️ Skip Student';
    }

    const btnClose = document.getElementById('btnQueueModalClose');
    const btnDone = document.getElementById('btnQueueDone');
    if (btnClose) btnClose.disabled = true;
    if (btnDone) btnDone.disabled = true;

    const progressSec = document.getElementById('queueProgressSection');
    progressSec.style.display = 'block';

    const badge = document.getElementById('queueProgressBadge');
    badge.style.display = 'inline-block';
    badge.className = 'badge badge-call';
    badge.textContent = '▶️ Queue Running';

    await runNextStudentInQueue();
}

async function runNextStudentInQueue() {
    if (queueState.stopped) {
        finishQueue(false, 'Queue stopped by faculty member.');
        return;
    }

    if (queueState.currentIndex >= queueState.items.length) {
        finishQueue(true, 'All queued calls completed.');
        return;
    }

    const student = queueState.items[queueState.currentIndex];
    const total = queueState.items.length;
    const currentNum = queueState.currentIndex + 1;

    // Update progress bar
    const percent = Math.round(((currentNum - 1) / total) * 100);
    document.getElementById('queueProgressBar').style.width = `${percent}%`;
    document.getElementById('queuePercentText').textContent = `${percent}%`;
    document.getElementById('queueStatusProgressText').textContent = `Processing student ${currentNum} of ${total}: ${student.name}`;

    const statusPill = document.getElementById(`qstatus-${student.id}`);
    const card = document.getElementById('queueActiveCallCard');
    card.style.display = 'block';
    document.getElementById('queueActiveStudentName').textContent = student.name;
    document.getElementById('queueActiveRoll').textContent = student.roll_number;
    document.getElementById('queueActivePhone').textContent = student.parent_phone || 'None';
    document.getElementById('queueActiveLang').textContent = student.preferred_language || 'Telugu';

    const stepBadge = document.getElementById('queueActiveStepBadge');
    const transcriptBox = document.getElementById('queueActiveTranscript');

    const btnSkip = document.getElementById('btnSkipQueueExec');
    if (btnSkip) {
        btnSkip.disabled = false;
        btnSkip.textContent = '⏭️ Skip Student';
    }

    // Check if phone number is invalid / missing (Prompt 3 Requirement 11)
    if (student.phone_valid === false) {
        if (statusPill) {
            statusPill.className = 'badge badge-danger';
            statusPill.textContent = '⚠️ Invalid Contact (Skipped)';
        }
        stepBadge.className = 'badge badge-danger';
        stepBadge.textContent = '⚠️ Skipped: Invalid Number';
        transcriptBox.innerHTML = `
            <div style="font-weight: 600; color: #b91c1c;">
                ⚠️ Skipped: Missing or invalid parent contact (${student.parent_phone || 'empty'}).
            </div>
            <div style="font-size: 0.8rem; color: #475569; margin-top: 2px;">
                Parent outreach requires a valid 10-digit phone number. Follow-up verification ticket created for faculty callback.
            </div>
        `;

        try {
            await fetch('/attendance/queue/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({
                    student_id: student.id,
                    attendance_date: queueState.date,
                    action: 'skip',
                    reason: 'Invalid or missing parent mobile number: ' + (student.parent_phone || 'empty'),
                    csrf_token: getCsrfToken()
                })
            });
        } catch (e) {
            console.error('Skip phone error:', e);
        }

        await new Promise(r => setTimeout(r, 1400));
        queueState.currentIndex++;
        await runNextStudentInQueue();
        return;
    }

    // Mark current student as Calling in roster
    if (statusPill) {
        statusPill.className = 'badge badge-call';
        statusPill.textContent = '📞 Calling... (Active)';
    }

    stepBadge.className = 'badge badge-warning';
    stepBadge.textContent = 'Dialing... (ringing)';
    transcriptBox.innerHTML = `<em>Dialing +91 ${student.parent_phone}... [MockTelephonyAdapter]</em>`;

    try {
        // Step 1: Simulate dialing delay (1 second)
        await new Promise(r => setTimeout(r, 1000));

        if (queueState.stopped) {
            finishQueue(false, 'Queue stopped by faculty member.');
            return;
        }

        // Check if teacher pressed Skip during dialing
        if (queueState.skipCurrent) {
            queueState.skipCurrent = false;
            if (statusPill) {
                statusPill.className = 'badge badge-warning';
                statusPill.textContent = '⏭️ Skipped by Teacher';
            }
            stepBadge.className = 'badge badge-warning';
            stepBadge.textContent = '⏭️ Skipped by Teacher';
            transcriptBox.innerHTML = `<span style="color: #b45309; font-weight: 600;">ℹ️ Student skipped by teacher. Follow-up recorded. Advancing...</span>`;

            await fetch('/attendance/queue/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({
                    student_id: student.id,
                    attendance_date: queueState.date,
                    action: 'skip',
                    reason: 'Skipped by teacher during queue execution',
                    csrf_token: getCsrfToken()
                })
            });

            await new Promise(r => setTimeout(r, 800));
            queueState.currentIndex++;
            await runNextStudentInQueue();
            return;
        }

        stepBadge.className = 'badge badge-call';
        stepBadge.textContent = '🟢 Connected • AI Dialogue Active';
        transcriptBox.innerHTML = `<em>Connected to +91 ${student.parent_phone}. AI generating dialogue in ${student.preferred_language}...</em>`;

        // Step 2: Call backend API to execute simulated call & persist records
        const resp = await fetch('/attendance/queue/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({
                student_id: student.id,
                attendance_date: queueState.date,
                language: student.preferred_language,
                csrf_token: getCsrfToken()
            })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: 'Error processing call.' }));
            if (resp.status === 409) {
                // Duplicate call prevented
                if (statusPill) {
                    statusPill.className = 'badge badge-success';
                    statusPill.textContent = `⏭️ Already Contacted (#${err.call_record_id || 'Done'})`;
                }
                transcriptBox.innerHTML = `<span style="color: var(--warning);">ℹ️ Duplicate prevented: Student was already contacted for attendance on ${queueState.date}.</span>`;
            } else {
                throw new Error(err.error || 'Server error processing queue item.');
            }
        } else {
            const callData = await resp.json();

            // Display completed dialogue summary
            stepBadge.className = 'badge badge-success';
            stepBadge.textContent = `✅ Completed • Record #${callData.call_record_id}`;

            transcriptBox.innerHTML = `
                <div style="font-weight: 600; color: #166534; margin-bottom: 2px;">
                    ✅ Call Completed (Duration: 0:${callData.duration_seconds}s)
                </div>
                <div style="font-size: 0.8rem; color: #334155;">
                    ${callData.summary}
                </div>
                <div style="font-size: 0.76rem; color: #15803d; margin-top: 4px; font-weight: 600;">
                    Follow-Up #${callData.followup_id} created for Faculty review.
                </div>
            `;

            // Update row status
            if (statusPill) {
                statusPill.className = 'badge badge-success';
                statusPill.textContent = `✅ Completed (#${callData.call_record_id})`;
            }

            // Update metrics
            const pendingEl = document.getElementById('queuePendingCountDisplay');
            const processedEl = document.getElementById('queueProcessedCountDisplay');
            if (pendingEl) pendingEl.textContent = Math.max(0, parseInt(pendingEl.textContent || '1') - 1);
            if (processedEl) processedEl.textContent = parseInt(processedEl.textContent || '0') + 1;
        }

        // Delay 1.2s before advancing to next student
        await new Promise(r => setTimeout(r, 1200));

        queueState.currentIndex++;
        await runNextStudentInQueue();
    } catch (err) {
        console.error('Queue Processing Error:', err);
        if (statusPill) {
            statusPill.className = 'badge badge-danger';
            statusPill.textContent = '❌ Error';
        }
        transcriptBox.innerHTML = `<span style="color: var(--danger);">Error: ${err.message}</span>`;
        await new Promise(r => setTimeout(r, 1500));
        queueState.currentIndex++;
        await runNextStudentInQueue();
    }
}

function finishQueue(success, message) {
    queueState.inProgress = false;

    const btnStop = document.getElementById('btnStopQueueExec');
    if (btnStop) btnStop.style.display = 'none';

    const btnSkip = document.getElementById('btnSkipQueueExec');
    if (btnSkip) btnSkip.style.display = 'none';

    const btnClose = document.getElementById('btnQueueModalClose');
    const btnDone = document.getElementById('btnQueueDone');
    if (btnClose) btnClose.disabled = false;
    if (btnDone) btnDone.disabled = false;

    const badge = document.getElementById('queueProgressBadge');
    if (badge) {
        badge.className = success ? 'badge badge-success' : 'badge badge-warning';
        badge.textContent = success ? '✅ Queue Complete' : '⏹️ Stopped';
    }

    const total = queueState.items.length;
    const processed = queueState.currentIndex;
    const percent = total > 0 ? Math.round((processed / total) * 100) : 100;
    document.getElementById('queueProgressBar').style.width = `${percent}%`;
    document.getElementById('queuePercentText').textContent = `${percent}%`;
    document.getElementById('queueStatusProgressText').textContent = message || (success ? 'Queue processing completed.' : 'Queue halted.');
}

