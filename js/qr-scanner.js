/**
 * qr-scanner.js - Simple QR Scanner for Royal Gym
 */

let scanner = null;
let isScanning = false;

function startScanner() {
    const resultDiv = document.getElementById('result');
    const resultText = document.getElementById('result-text');
    
    if (scanner) {
        if (!isScanning) {
            scanner.render(onScanSuccess, onScanError);
            isScanning = true;
        }
        return;
    }

    scanner = new Html5QrcodeScanner(
        "reader",
        { 
            fps: 10, 
            qrbox: 250,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true
        },
        false
    );

    scanner.render(onScanSuccess, onScanError);
    isScanning = true;
    
    resultDiv.className = 'result';
    resultText.textContent = 'Scanner started - point camera at QR code';
}

function onScanSuccess(decodedText) {
    if (scanner && isScanning) {
        scanner.pause();
        isScanning = false;
    }
    
    playSound('success');
    processMemberId(decodedText);
    
    setTimeout(() => {
        if (scanner && !isScanning) {
            scanner.resume();
            isScanning = true;
        }
    }, 3000);
}

function onScanError(error) {
    console.debug('Scan error:', error);
}

function processMemberId(memberId) {
    const cleanId = memberId.replace(/[^0-9]/g, '');
    
    if (!cleanId) {
        showResult('error', '❌ Invalid QR Code');
        return;
    }

    const member = DB.getMember(cleanId);
    
    if (!member) {
        showResult('error', `❌ Member not found: ${cleanId}`);
        playSound('error');
        return;
    }

    if (member.status === 'expired') {
        showResult('error', `❌ Membership expired for ${member.name} on ${member.endDate}`);
        playSound('error');
        showMemberInfo(member, 'expired');
        return;
    }

    if (member.status === 'frozen') {
        showResult('error', `❌ Membership frozen for ${member.name}`);
        playSound('error');
        showMemberInfo(member, 'frozen');
        return;
    }

    if (DB.hasCheckedInToday(member.id)) {
        showResult('warning', `⚠️ ${member.name} already checked in today`);
        playSound('success');
        showMemberInfo(member, 'duplicate');
        return;
    }

    DB.logAttendance(member.id, member.name, 'qr', 'Reception');
    
    showResult('success', `✅ Welcome ${member.name}! Attendance recorded`);
    playSound('success');
    showMemberInfo(member, 'success');
}

function manualCheckin() {
    const input = document.getElementById('manualInput');
    const memberId = input.value.trim();
    
    if (!memberId) {
        showResult('error', '❌ Please enter member ID');
        return;
    }

    input.value = '';
    processMemberId(memberId);
}

function showResult(type, message) {
    const resultDiv = document.getElementById('result');
    const resultText = document.getElementById('result-text');
    
    resultDiv.className = 'result ' + type;
    resultText.textContent = message;
}

function showMemberInfo(member, status) {
    const infoDiv = document.getElementById('memberInfo');
    const nameEl = document.getElementById('memberName');
    const detailsEl = document.getElementById('memberDetails');
    
    if (!member) {
        infoDiv.style.display = 'none';
        return;
    }

    nameEl.textContent = member.name;
    
    let statusText = '';
    switch(status) {
        case 'success':
            statusText = '✅ Checked in successfully';
            break;
        case 'duplicate':
            statusText = '⚠️ Already checked in today';
            break;
        case 'expired':
            statusText = `❌ Expired on ${member.endDate}`;
            break;
        case 'frozen':
            statusText = '❌ Membership frozen';
            break;
        default:
            statusText = `Status: ${member.status}`;
    }

    detailsEl.innerHTML = `
        <strong>ID:</strong> #${member.id}<br>
        <strong>Phone:</strong> ${member.phone}<br>
        <strong>Plan:</strong> ${member.planName}<br>
        <strong>Valid until:</strong> ${member.endDate}<br>
        <strong>Status:</strong> ${statusText}
    `;

    infoDiv.style.display = 'block';
}

function playSound(type) {
    const audio = document.getElementById(type === 'success' ? 'success-sound' : 'error-sound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

window.addEventListener('beforeunload', () => {
    if (scanner && isScanning) {
        scanner.pause();
    }
});