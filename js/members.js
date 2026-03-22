/**
 * members.js — Full Members CRUD
 */

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('members-tbody')) renderMembersTable();
    if (document.getElementById('add-member-form')) initAddMemberForm();
    if (document.getElementById('member-profile-section')) initMemberProfile();
});

// ── Members List ─────────────────────────────────────────────────
function renderMembersTable(filter = '', statusFilter = '') {
    const tbody = document.getElementById('members-tbody');
    if (!tbody) return;
    let members = DB.getMembers();
    // Filter by search
    if (filter) {
        const q = filter.toLowerCase();
        members = members.filter(m => m.name.toLowerCase().includes(q) || m.id.includes(q) || m.phone.includes(q));
    }
    // Filter by status
    if (statusFilter) members = members.filter(m => m.status === statusFilter);

    if (!members.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">لا يوجد أعضاء مطابقون للبحث</td></tr>`;
        return;
    }

    tbody.innerHTML = members.map(m => `
        <tr>
            <td data-label="رقم العضوية"><strong>#${m.id}</strong></td>
            <td data-label="الاسم">${m.name}</td>
            <td data-label="الموبايل" dir="ltr">${m.phone}</td>
            <td data-label="نوع الاشتراك">${m.planName || '-'}</td>
            <td data-label="البداية">${m.startDate}</td>
            <td data-label="الانتهاء">${m.endDate}</td>
            <td data-label="الحالة">${statusBadge(m.status)}</td>
            <td data-label="إجراءات">
                <div class="action-btns">
                    <button class="btn-icon" title="عرض" onclick="viewMember('${m.id}')"><i class='bx bx-show'></i></button>
                    <button class="btn-icon text-blue" title="تعديل" onclick="editMember('${m.id}')"><i class='bx bx-edit-alt'></i></button>
                    <button class="btn-icon text-warning" title="${m.status === 'frozen' ? 'تفعيل' : 'تجميد'}" onclick="toggleFreeze('${m.id}')">
                        <i class='bx ${m.status === 'frozen' ? 'bx-play-circle' : 'bx-pause-circle'}'></i>
                    </button>
                    <button class="btn-icon text-red" title="حذف" onclick="deleteMember('${m.id}')"><i class='bx bx-trash'></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function viewMember(id) {
    sessionStorage.setItem('viewMemberId', id);
    window.location.href = 'member-profile.html';
}

function editMember(id) {
    sessionStorage.setItem('editMemberId', id);
    window.location.href = 'add-member.html';
}

function toggleFreeze(id) {
    const m = DB.getMember(id);
    if (!m) return;
    const newStatus = m.status === 'frozen' ? 'active' : 'frozen';
    DB.updateMember(id, { status: newStatus });
    renderMembersTable();
    showToast(newStatus === 'frozen' ? 'تم تجميد العضوية' : 'تم تفعيل العضوية');
}

function deleteMember(id) {
    const m = DB.getMember(id);
    if (!m) return;
    confirmDelete(`هل تريد حذف العضو "${m.name}"؟`, () => {
        DB.deleteMember(id);
        renderMembersTable();
        showToast('تم حذف العضو بنجاح', 'error');
    });
}

// Search & filter
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-input');
    const filterSelect = document.querySelector('.filter-select');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderMembersTable(searchInput.value, filterSelect?.value || ''));
    }
    if (filterSelect) {
        filterSelect.addEventListener('change', () => renderMembersTable(searchInput?.value || '', filterSelect.value));
    }
});

// ── Add / Edit Member Form ───────────────────────────────────────
function initAddMemberForm() {
    // Populate plans dropdown
    const planSelect = document.getElementById('planSelect');
    if (planSelect) {
        planSelect.innerHTML = '<option value="">-- اختر الخطة --</option>' + DB.getPlans().map(p => {
            const sessionsNote = (p.type === 'monthly-sessions' && p.sessions > 0) ? ` | ${p.sessions} جلسة` : '';
            const monthsNote = p.months === 1 ? `شهر` : p.months === 2 ? `شهران` : `${p.months} شهور`;
            return `<option value="${p.id}" data-months="${p.months}">${p.name} — ${monthsNote}${sessionsNote} (${p.price.toLocaleString()} ج.م)</option>`;
        }).join('');
        planSelect.addEventListener('change', updateDuration);
        updateDuration();
    }


    // Set start date to today
    const startInput = document.getElementById('startDate');
    if (startInput && !startInput.value) startInput.value = new Date().toISOString().split('T')[0];
    if (startInput) startInput.addEventListener('change', updateDuration);

    // Check if editing
    const editId = sessionStorage.getItem('editMemberId');
    if (editId) {
        const m = DB.getMember(editId);
        if (m) prefillForm(m);
        const btn = document.getElementById('submit-btn');
        if (btn) btn.textContent = 'حفظ التعديلات';
        const title = document.querySelector('.page-header h2');
        if (title) title.textContent = 'تعديل بيانات العضو';
    }

    // Photo preview
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                document.getElementById('photo-preview').src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
    // NOTE: No addEventListener here — form uses onsubmit attribute in HTML to avoid double-firing
}

function updateDuration() {
    const planSelect = document.getElementById('planSelect');
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (!planSelect || !startInput || !endInput) return;
    const selected = planSelect.options[planSelect.selectedIndex];
    const months = parseInt(selected?.dataset?.months || 1);
    const start = new Date(startInput.value || new Date());
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    endInput.value = end.toISOString().split('T')[0];
}

function prefillForm(m) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set('memberName', m.name);
    set('memberPhone', m.phone);
    set('planSelect', m.planId);
    set('startDate', m.startDate);
    set('endDate', m.endDate);
    set('memberNotes', m.notes || '');
}

function handleMemberSubmit(e) {
    e.preventDefault();

    // Guard against accidental double-call
    if (window._memberSubmitting) return;
    window._memberSubmitting = true;

    const name = document.getElementById('memberName').value.trim();
    const phone = document.getElementById('memberPhone').value.trim();
    const planId = document.getElementById('planSelect').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const notes = document.getElementById('memberNotes')?.value || '';

    // Only save photo if user actually uploaded one (data: URI)
    const photoPreview = document.getElementById('photo-preview');
    const photoSrc = photoPreview ? photoPreview.src : '';
    const photo = photoSrc.startsWith('data:') ? photoSrc : '';

    if (!name || !phone || !planId || !startDate || !endDate) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        window._memberSubmitting = false;
        return;
    }

    const plan = DB.getPlan(planId);
    const data = { name, phone, planId, planName: plan?.name || '', startDate, endDate, notes, photo };

    const editId = sessionStorage.getItem('editMemberId');
    if (editId) {
        DB.updateMember(editId, data);
        sessionStorage.removeItem('editMemberId');
        showToast('تم تحديث بيانات العضو بنجاح ✅');
        setTimeout(() => { window._memberSubmitting = false; window.location.href = 'members.html'; }, 1500);
    } else {
        const newMember = DB.addMember(data);
        window._memberSubmitting = false;
        showMemberSuccessCard(newMember);
    }
}

// ── Success card with QR + WhatsApp button ────────────────────────
function showMemberSuccessCard(member) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${member.id}&bgcolor=ffffff`;
    const gymName = (DB.getSettings().gymName) || 'Royal Gym';

    // WhatsApp message
    const waMsg = encodeURIComponent(
        `مرحباً ${member.name}! 👋\n` +
        `تم تسجيلك بنجاح في ${gymName} 🏋️\n` +
        `رقم عضويتك: #${member.id}\n` +
        `نوع الاشتراك: ${member.planName}\n` +
        `ينتهي في: ${member.endDate}\n\n` +
        `رابط QR Code الخاص بك:\n${qrUrl}\n\n` +
        `يمكنك مسح الكود عند الدخول للصالة. نتمنى لك تجربة رياضية ممتازة! 💪`
    );
    const phoneClean = member.phone.replace(/[^0-9]/g, '');
    // Convert Egyptian local numbers (01...) to international (+20...)
    const phoneIntl = phoneClean.startsWith('0') ? '2' + phoneClean : phoneClean;
    const waLink = `https://wa.me/${phoneIntl}?text=${waMsg}`;

    // Build overlay
    const overlay = document.createElement('div');
    overlay.id = 'success-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);padding:20px;';
    overlay.innerHTML = `
        <div style="background:#1e293b;border-radius:20px;padding:35px;max-width:420px;width:100%;text-align:center;border:1px solid rgba(212,175,55,0.3);box-shadow:0 0 40px rgba(212,175,55,0.2);">
            <div style="width:64px;height:64px;background:rgba(16,185,129,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 15px;">
                <i class="bx bx-check-circle" style="font-size:36px;color:#10B981;"></i>
            </div>
            <h2 style="color:#F8FAFC;margin-bottom:5px;font-family:Cairo,sans-serif;">تم التسجيل بنجاح! 🎉</h2>
            <p style="color:#94a3b8;font-size:14px;margin-bottom:20px;font-family:Cairo,sans-serif;">
                ${member.name} — <strong style="color:#D4AF37;">#${member.id}</strong>
            </p>
            <img src="${qrUrl}" alt="QR Code" style="width:180px;height:180px;border-radius:12px;border:4px solid #D4AF37;padding:6px;background:#fff;margin-bottom:15px;">
            <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;font-family:Cairo,sans-serif;">QR Code للدخول إلى الصالة</p>
            <div style="display:flex;flex-direction:column;gap:12px;">
                <a href="${waLink}" target="_blank"
                    style="display:flex;align-items:center;justify-content:center;gap:10px;background:#25D366;color:#fff;padding:14px 20px;border-radius:12px;text-decoration:none;font-family:Cairo,sans-serif;font-size:15px;font-weight:700;transition:opacity 0.2s;">
                    <i class="bx bxl-whatsapp" style="font-size:22px;"></i>
                    إرسال QR عبر واتساب
                </a>
                <button onclick="window.location.href='members.html'" style="background:rgba(255,255,255,0.08);color:#F8FAFC;border:none;padding:12px 20px;border-radius:12px;font-family:Cairo,sans-serif;font-size:14px;cursor:pointer;">
                    <i class="bx bx-list-ul"></i> العودة لقائمة الأعضاء
                </button>
                <button onclick="document.getElementById('success-overlay').remove();location.reload();" style="background:transparent;color:#94a3b8;border:none;padding:8px;font-family:Cairo,sans-serif;font-size:13px;cursor:pointer;">إضافة عضو آخر</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

// ── Member Profile ───────────────────────────────────────────────
function initMemberProfile() {
    const id = sessionStorage.getItem('viewMemberId');
    if (!id) { window.location.href = 'members.html'; return; }
    const m = DB.getMember(id);
    if (!m) { window.location.href = 'members.html'; return; }

    // Info
    document.getElementById('prof-name').textContent = m.name;
    document.getElementById('prof-id').textContent = 'ID: #' + m.id;
    document.getElementById('prof-phone').textContent = m.phone;
    document.getElementById('prof-plan').textContent = m.planName;
    document.getElementById('prof-start').textContent = m.startDate;
    document.getElementById('prof-end').textContent = m.endDate;
    document.getElementById('prof-status').innerHTML = statusBadge(m.status);
    document.getElementById('prof-notes').textContent = m.notes || 'لا توجد ملاحظات';

    // Avatar
    const avatar = document.getElementById('prof-avatar');
    if (avatar) avatar.src = m.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=1e293b&color=D4AF37&size=120`;

    // QR Code (using free API)
    const qrImg = document.getElementById('prof-qr');
    if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${m.id}&bgcolor=ffffff`;

    // Attendance
    const logs = DB.getMemberAttendance(id);
    const attended = logs.length;
    document.getElementById('prof-attend-count').textContent = attended;
    document.getElementById('prof-log-tbody').innerHTML = logs.length ? logs.slice(0, 10).map(a => `
        <tr>
            <td data-label="التاريخ">${a.date}</td>
            <td data-label="وقت الدخول">${a.time}</td>
            <td data-label="الطريقة"><span class="badge ${a.method === 'qr' ? 'bg-green-light text-green' : 'bg-blue-light text-blue'}">${a.method === 'qr' ? 'QR Code' : 'يدوي'}</span></td>
        </tr>`).join('') : `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">لا يوجد سجل حضور</td></tr>`;

    // ── Subscription Progress Bar ────────────────────────────────
    renderSubscriptionProgress(m, attended);

    // Renew button
    const renewBtn = document.getElementById('btn-renew');
    if (renewBtn) {
        renewBtn.onclick = () => {
            const plan = DB.getPlan(m.planId);
            const months = plan?.months || 1;
            const newStart = new Date().toISOString().split('T')[0];
            const end = new Date(); end.setMonth(end.getMonth() + months);
            const newEnd = end.toISOString().split('T')[0];
            DB.updateMember(id, { startDate: newStart, endDate: newEnd, status: 'active' });
            showToast('تم تجديد الاشتراك بنجاح ✅');
            setTimeout(() => location.reload(), 1200);
        };
    }

    // Edit button
    const editBtn = document.getElementById('btn-edit-prof');
    if (editBtn) editBtn.onclick = () => { sessionStorage.setItem('editMemberId', id); window.location.href = 'add-member.html'; };

    // Print card
    const printBtn = document.getElementById('btn-print');
    if (printBtn) printBtn.onclick = () => window.print();

    // WhatsApp QR send
    const waBtn = document.getElementById('btn-whatsapp');
    if (waBtn) {
        waBtn.onclick = () => {
            const gymName = DB.getSettings().gymName || 'Royal Gym';
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${m.id}&bgcolor=ffffff`;
            const waMsg = encodeURIComponent(
                `مرحباً ${m.name}! 👋\n` +
                `هذا هو QR Code الخاص بك في ${gymName} 🏋️\n` +
                `رقم عضويتك: #${m.id}\n` +
                `نوع الاشتراك: ${m.planName}\n` +
                `ينتهي في: ${m.endDate}\n\n` +
                `رابط QR Code:\n${qrUrl}\n\n` +
                `امسح الكود عند الدخول للصالة. 💪`
            );
            const phoneClean = m.phone.replace(/[^0-9]/g, '');
            const phoneIntl = phoneClean.startsWith('0') ? '2' + phoneClean : phoneClean;
            window.open(`https://wa.me/${phoneIntl}?text=${waMsg}`, '_blank');
        };
    }
}

// ── Subscription Progress Bar ─────────────────────────────────────────────────
function renderSubscriptionProgress(member, attendedCount) {
    const wrap = document.getElementById('sub-progress-wrap');
    const bar = document.getElementById('sub-progress-bar');
    const label = document.getElementById('sub-progress-label');
    const pct = document.getElementById('sub-progress-pct');
    const used = document.getElementById('sub-progress-used');
    const remain = document.getElementById('sub-progress-remain');
    if (!wrap || !bar) return;

    const plan = DB.getPlan(member.planId);

    // ── SESSION-BASED plan (maxEntries > 0) ──────────────────────
    if (plan && plan.maxEntries > 0) {
        const total = plan.maxEntries;
        const usedN = attendedCount;
        const leftN = Math.max(0, total - usedN);
        const percent = Math.min(100, Math.round((usedN / total) * 100));
        const remainPct = 100 - percent;

        label.textContent = `حصص الاشتراك — ${plan.name}`;
        pct.textContent = `${remainPct}% متبقي`;
        used.textContent = `✅ مُستخدم: ${usedN} حصة`;
        remain.textContent = `⏳ متبقي: ${leftN} حصة`;

        // Color: red if ≤20% remain, yellow if ≤40%, gold otherwise
        bar.className = 'sub-progress-fill';
        if (remainPct <= 20) bar.classList.add('danger');
        else if (remainPct <= 40) bar.classList.add('warning');
        else bar.classList.add('success');

        // The fill width represents USED portion (left-to-right)
        bar.style.width = '0%';
        requestAnimationFrame(() => { bar.style.width = percent + '%'; });

        wrap.style.display = 'block';

        // ── DURATION-BASED plan (by days) ────────────────────────────
    } else if (member.startDate && member.endDate) {
        const start = new Date(member.startDate);
        const end = new Date(member.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalDays = Math.max(1, Math.round((end - start) / 86400000));
        const elapsedDays = Math.max(0, Math.round((today - start) / 86400000));
        const leftDays = Math.max(0, Math.round((end - today) / 86400000));
        const percent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
        const remainPct = 100 - percent;

        // Arabic day pluralization
        const dayAr = n => n === 1 ? 'يوم' : n === 2 ? 'يومان' : n <= 10 ? `${n} أيام` : `${n} يوم`;

        label.textContent = `مدة الاشتراك — ${plan ? plan.name : member.planName}`;
        pct.textContent = `${remainPct}% متبقي`;
        used.textContent = `📅 منقضي: ${dayAr(elapsedDays)}`;
        remain.textContent = leftDays > 0
            ? `⏳ متبقي: ${dayAr(leftDays)}`
            : `⚠️ انتهى الاشتراك`;

        bar.className = 'sub-progress-fill';
        if (remainPct <= 10) bar.classList.add('danger');
        else if (remainPct <= 30) bar.classList.add('warning');
        // else stays gold (default)

        bar.style.width = '0%';
        requestAnimationFrame(() => { bar.style.width = percent + '%'; });

        wrap.style.display = 'block';
    }
}
