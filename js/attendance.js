/**
 * attendance.js — Attendance Logs + Reception Check-in
 */

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('attendance-tbody')) initAttendanceLogs();
    if (document.getElementById('qr-mode-view')) initReception();
    if (document.getElementById('att-qr-reader')) initAttQrArea();
});

// ── Attendance Page Camera QR Scanner ────────────────────────────
let _attQrCode = null;
let _attScannerRunning = false;
let _attScanCooldown = false; // prevent rapid double-scans

function initAttQrArea() {
    setAttScannerStatus('idle');
}

function startAttQrScanner() {
    if (_attScannerRunning) return;

    // Create fresh instance each time
    _attQrCode = new Html5Qrcode('att-qr-reader');

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    _attQrCode.start(
        { facingMode: 'environment' }, // prefer rear camera; browser may fallback to front
        config,
        (decodedText) => {
            if (_attScanCooldown) return;
            _attScanCooldown = true;
            setTimeout(() => { _attScanCooldown = false; }, 2000);

            setAttScannerStatus('scanning');
            doCheckinForAttendance(decodedText);
        },
        () => { /* ignore per-frame scan errors */ }
    ).then(() => {
        _attScannerRunning = true;
        setAttScannerStatus('ready');
        document.getElementById('att-start-scanner-btn').style.display = 'none';
        document.getElementById('att-stop-scanner-btn').style.display = 'inline-flex';
    }).catch((err) => {
        console.error('Camera error:', err);
        setAttScannerStatus('error');
        showAttScannerResult(false, null, 'لم يتم فتح الكاميرا — تأكد من منح الإذن');
        _attQrCode = null;
    });
}

function stopAttQrScanner() {
    if (_attQrCode && _attScannerRunning) {
        _attQrCode.stop().then(() => {
            _attQrCode.clear();
            _attQrCode = null;
        }).catch(() => { _attQrCode = null; });
    } else {
        _attQrCode = null;
    }
    _attScannerRunning = false;
    _attScanCooldown = false;
    setAttScannerStatus('idle');
    document.getElementById('att-start-scanner-btn').style.display = 'inline-flex';
    document.getElementById('att-stop-scanner-btn').style.display = 'none';
    const reader = document.getElementById('att-qr-reader');
    if (reader) reader.innerHTML = '';
}

function setAttScannerStatus(state) {
    const dot = document.getElementById('scanner-status-dot');
    const text = document.getElementById('scanner-status-text');
    if (!dot || !text) return;
    const states = {
        idle:     { color: '#94a3b8',          label: 'في انتظار المسح' },
        ready:    { color: 'var(--gold-primary)', label: 'الكاميرا جاهزة...' },
        scanning: { color: 'var(--info)',        label: 'جارٍ المعالجة...' },
        success:  { color: 'var(--success)',      label: 'تم التسجيل ✅' },
        error:    { color: 'var(--danger)',        label: 'فشل التسجيل ❌' },
        warn:     { color: 'var(--warning)',       label: 'تحذير ⚠️' },
    };
    const s = states[state] || states.idle;
    dot.style.background = s.color;
    dot.style.boxShadow = state !== 'idle' ? `0 0 8px ${s.color}` : 'none';
    text.style.color = s.color;
    text.textContent = s.label;
}

function doCheckinForAttendance(memberId) {
    const member = DB.getMember(memberId.replace('#', ''));
    if (!member) {
        playSound('error');
        showAttScannerResult(false, null, `⚠️ لم يتم العثور على عضو برقم: ${memberId}`);
        setAttScannerStatus('error');
        return;
    }
    if (member.status === 'expired') {
        playSound('error');
        showAttScannerResult(false, member, `اشتراك "${member.name}" منتهٍ منذ ${member.endDate}`);
        setAttScannerStatus('error');
        return;
    }
    if (member.status === 'frozen') {
        playSound('error');
        showAttScannerResult(false, member, `عضوية "${member.name}" مجمدة`);
        setAttScannerStatus('error');
        return;
    }
    const todayLogs = DB.todayAttendance();
    if (todayLogs.some(a => a.memberId === member.id)) {
        playSound('error');
        showAttScannerResult('warn', member, `"${member.name}" سبق تسجيل حضوره اليوم`);
        setAttScannerStatus('warn');
        return;
    }
    DB.logAttendance(member.id, member.name, 'qr', '');
    playSound('success');
    showAttScannerResult(true, member, `مرحباً ${member.name}! تم تسجيل حضورك ✅`);
    setAttScannerStatus('success');
    renderAttendanceLogs();

    // Reset status back to ready after 4 seconds
    clearTimeout(window._attScannerStatusTimer);
    window._attScannerStatusTimer = setTimeout(() => {
        setAttScannerStatus('ready');
    }, 4000);
}

function showAttScannerResult(type, member, message) {
    const card = document.getElementById('att-scanner-result');
    const icon = document.getElementById('att-result-icon');
    const name = document.getElementById('att-result-name');
    const msg = document.getElementById('att-result-msg');
    if (!card) return;

    card.style.display = 'block';
    card.style.animation = 'none';
    setTimeout(() => card.style.animation = 'fadeIn 0.3s ease', 10);
    card.className = 'scanner-result-card';

    if (type === true) {
        card.classList.add('');  // green (default)
        icon.className = 'bx bx-check-circle';
        icon.style.color = 'var(--success)';
    } else if (type === 'warn') {
        card.classList.add('warn');
        icon.className = 'bx bx-error';
        icon.style.color = 'var(--warning)';
    } else {
        card.classList.add('error');
        icon.className = 'bx bx-x-circle';
        icon.style.color = 'var(--danger)';
    }

    name.textContent = member ? member.name : '';
    msg.textContent = message;

    clearTimeout(window._attResultTimer);
    window._attResultTimer = setTimeout(() => {
        card.style.display = 'none';
    }, 5000);
}

// ── Attendance Log Page ──────────────────────────────────────────
function initAttendanceLogs() {
    renderAttendanceLogs();

    const dateFilter = document.getElementById('att-date-filter');
    const methodFilter = document.getElementById('att-method-filter');
    if (dateFilter) dateFilter.addEventListener('change', renderAttendanceLogs);
    if (methodFilter) methodFilter.addEventListener('change', renderAttendanceLogs);
}

function renderAttendanceLogs() {
    const tbody = document.getElementById('attendance-tbody');
    if (!tbody) return;

    const dateFilter = document.getElementById('att-date-filter')?.value || '';
    const methodFilter = document.getElementById('att-method-filter')?.value || '';

    let logs = DB.getAttendance();
    if (dateFilter) logs = logs.filter(a => a.date === dateFilter);
    if (methodFilter) logs = logs.filter(a => a.method === methodFilter);

    if (!logs.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">لا يوجد سجلات حضور</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(a => `
        <tr>
            <td data-label="اسم العضو">${a.memberName}</td>
            <td data-label="رقم العضوية"><strong>#${a.memberId}</strong></td>
            <td data-label="وقت الدخول">${a.date} - ${a.time}</td>
            <td data-label="طريقة التسجيل">
                <span class="badge ${a.method === 'qr' ? 'bg-green-light text-green' : 'bg-blue-light text-blue'}">
                    <i class="bx ${a.method === 'qr' ? 'bx-qr-scan' : 'bx-edit'}"></i>
                    ${a.method === 'qr' ? 'QR Code' : 'يدوي'}
                </span>
            </td>
            <td data-label="الموظف المسئول">${a.staff || '-'}</td>
        </tr>`).join('');
}

// ── Manual Check-in (on attendance page) ────────────────────────
function manualCheckin() {
    const input = document.getElementById('manual-checkin-id');
    if (!input) return;
    const id = input.value.trim();
    if (!id) { showToast('يرجى إدخال رقم العضوية', 'error'); return; }
    doCheckin(id, 'manual', 'مدير النظام', 'attendance');
    input.value = '';
}

// ── Reception Screen ─────────────────────────────────────────────
function initReception() {
    const qrInput = document.getElementById('qr-input');
    if (qrInput) {
        qrInput.focus();
        // QR scanners act like keyboards that type and press Enter
        qrInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const val = qrInput.value.trim();
                qrInput.value = '';
                if (val) doCheckin(val, 'qr', '', 'reception');
            }
        });
    }
}

function switchReceptionMode(mode) {
    const qrBtn = document.getElementById('btn-qr-mode');
    const manualBtn = document.getElementById('btn-manual-mode');
    const qrView = document.getElementById('qr-mode-view');
    const manualView = document.getElementById('manual-mode-view');
    const resultDiv = document.getElementById('checkin-result');
    if (resultDiv) resultDiv.style.display = 'none';

    if (mode === 'qr') {
        if (qrBtn) { qrBtn.style.background = 'var(--gold-primary)'; qrBtn.style.color = '#000'; }
        if (manualBtn) { manualBtn.style.background = 'transparent'; manualBtn.style.color = 'var(--text-primary)'; }
        if (qrView) qrView.style.display = 'block';
        if (manualView) manualView.style.display = 'none';
        document.getElementById('qr-input')?.focus();
    } else {
        if (manualBtn) { manualBtn.style.background = 'var(--gold-primary)'; manualBtn.style.color = '#000'; }
        if (qrBtn) { qrBtn.style.background = 'transparent'; qrBtn.style.color = 'var(--text-primary)'; }
        if (manualView) manualView.style.display = 'block';
        if (qrView) qrView.style.display = 'none';
    }
}

function receptionManualCheckin() {
    const input = document.getElementById('manual-input');
    if (!input) return;
    const val = input.value.trim();
    input.value = '';
    if (!val) { showCheckinResult(false, null, 'يرجى إدخال رقم العضوية'); return; }
    doCheckin(val, 'manual', 'موظف الاستقبال', 'reception');
}

function simulateScan(code) {
    doCheckin(code, 'qr', '', 'reception');
}

// ── Core Check-in Logic ──────────────────────────────────────────
function doCheckin(memberId, method, staff = '', context = 'reception') {
    const member = DB.getMember(memberId.replace('#', ''));
    if (!member) {
        playSound('error');
        if (context === 'reception') showCheckinResult(false, null, `⚠️ لم يتم العثور على عضو برقم ${memberId}`);
        else showToast(`لم يتم العثور على عضو #${memberId}`, 'error');
        return;
    }

    // Check subscription validity
    if (member.status === 'expired') {
        playSound('error');
        const msg = `اشتراك "${member.name}" منتهٍ منذ ${member.endDate}`;
        if (context === 'reception') showCheckinResult(false, member, msg);
        else showToast(msg, 'error');
        return;
    }
    if (member.status === 'frozen') {
        playSound('error');
        const msg = `عضوية "${member.name}" مجمدة`;
        if (context === 'reception') showCheckinResult(false, member, msg);
        else showToast(msg, 'error');
        return;
    }

    // Block double check-in on same day
    const todayLogs = DB.todayAttendance();
    if (todayLogs.some(a => a.memberId === member.id)) {
        if (context === 'reception') showCheckinResult('warn', member, `"${member.name}" سبق تسجيل حضوره اليوم`);
        else showToast(`"${member.name}" سبق تسجيل حضوره اليوم`, 'warn');
        return;
    }

    // Log attendance
    DB.logAttendance(member.id, member.name, method, staff);
    playSound('success');

    if (context === 'reception') {
        showCheckinResult(true, member, `مرحباً ${member.name}! تم تسجيل حضورك ✅`);
    } else {
        showToast(`تم تسجيل حضور ${member.name} ✅`);
        renderAttendanceLogs();
    }
}

function showCheckinResult(success, member, message) {
    const resultDiv = document.getElementById('checkin-result');
    if (!resultDiv) return;
    resultDiv.style.display = 'block';
    resultDiv.style.animation = 'none';
    setTimeout(() => resultDiv.style.animation = 'fadeIn 0.3s ease', 10);

    if (success === true) {
        resultDiv.style.background = 'rgba(16,185,129,0.15)';
        resultDiv.style.border = '1px solid rgba(16,185,129,0.3)';
        document.getElementById('result-icon').className = 'bx bx-check-circle';
        document.getElementById('result-icon').style.color = 'var(--success)';
    } else if (success === 'warn') {
        resultDiv.style.background = 'rgba(245,158,11,0.15)';
        resultDiv.style.border = '1px solid rgba(245,158,11,0.3)';
        document.getElementById('result-icon').className = 'bx bx-error';
        document.getElementById('result-icon').style.color = 'var(--warning)';
    } else {
        resultDiv.style.background = 'rgba(239,68,68,0.15)';
        resultDiv.style.border = '1px solid rgba(239,68,68,0.3)';
        document.getElementById('result-icon').className = 'bx bx-x-circle';
        document.getElementById('result-icon').style.color = 'var(--danger)';
    }

    document.getElementById('result-name').textContent = member ? member.name : '';
    document.getElementById('result-message').textContent = message;

    // Auto-hide after 4s
    clearTimeout(window._checkinTimer);
    window._checkinTimer = setTimeout(() => {
        resultDiv.style.display = 'none';
        if (document.getElementById('qr-input')) document.getElementById('qr-input').focus();
    }, 4000);
}

function playSound(type) {
    const id = type === 'success' ? 'success-sound' : 'error-sound';
    const audio = document.getElementById(id);
    if (audio) { audio.currentTime = 0; audio.play().catch(() => { }); }
}
