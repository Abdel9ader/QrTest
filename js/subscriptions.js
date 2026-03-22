/**
 * subscriptions.js — Subscription Plans CRUD
 * Supports predefined pack types with sessions.
 */

// ── Pack type definitions ─────────────────────────────────────────
const PACK_TYPES = {
    'monthly': { months: 1, label: 'شهري', icon: 'bx-calendar', color: 'gold' },
    'monthly-sessions': { months: 1, label: 'شهري بجلسات', icon: 'bx-run', color: 'blue' },
    '2months': { months: 2, label: 'شهرين', icon: 'bx-calendar-check', color: 'gold' },
    '3months': { months: 3, label: '3 شهور', icon: 'bx-calendar-week', color: 'gold' },
    '6months': { months: 6, label: '6 شهور', icon: 'bx-calendar-alt', color: 'gold' },
    'yearly': { months: 12, label: 'سنوي', icon: 'bx-crown', color: 'gold' },
};

document.addEventListener('DOMContentLoaded', () => {
    renderPlans();
    const form = document.getElementById('add-plan-form');
    if (form) form.addEventListener('submit', handleAddPlan);
});

// ── Render Plans Grid ─────────────────────────────────────────────
function renderPlans() {
    const container = document.getElementById('plans-container');
    if (!container) return;
    const plans = DB.getPlans();
    if (!plans.length) {
        container.innerHTML = `<p style="color:#94a3b8;text-align:center;padding:40px;grid-column:1/-1;">لا توجد خطط اشتراك. أضف خطة جديدة.</p>`;
        return;
    }
    container.innerHTML = plans.map(p => {
        const type = p.type || 'monthly';
        const packInfo = PACK_TYPES[type] || PACK_TYPES['monthly'];
        const isSession = type === 'monthly-sessions';
        const badgeStyle = isSession
            ? 'background:rgba(59,130,246,0.15);color:#3B82F6;'
            : 'background:rgba(212,175,55,0.12);color:#D4AF37;';

        const sessionLine = isSession
            ? `<div class="sessions-pill"><i class='bx bx-run'></i> ${(p.sessions || 0) > 0 ? `${p.sessions} جلسة / شهر` : 'جلسات غير محدودة'}</div>`
            : `<div class="duration-pill"><i class='bx bx-time'></i> ${p.months} ${p.months === 1 ? 'شهر' : p.months === 2 ? 'شهران' : 'شهور'}</div>`;

        return `
        <div class="glass-card plan-card" style="padding:28px 24px;position:relative;overflow:hidden;text-align:center;">
            <span class="plan-type-badge" style="${badgeStyle}">
                <i class='bx ${packInfo.icon}'></i> ${packInfo.label}
            </span>
            <h3 class="text-gold" style="font-size:20px;margin-bottom:6px;">${p.name}</h3>
            <h2 style="font-size:42px;font-weight:800;margin-bottom:8px;">${p.price.toLocaleString()} <small style="font-size:15px;color:#94a3b8;">ج.م</small></h2>
            ${sessionLine}
            <p class="text-secondary" style="font-size:12px;margin-bottom:20px;">${p.maxEntries > 0 ? `حد أقصى ${p.maxEntries} دخول` : 'دخول غير محدود'}</p>
            <div style="display:flex;gap:10px;justify-content:center;">
                <button class="btn btn-primary" onclick="editPlan('${p.id}')"><i class='bx bx-edit'></i> تعديل</button>
                <button class="btn" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.2);" onclick="removePlan('${p.id}')"><i class='bx bx-trash'></i> حذف</button>
            </div>
        </div>`;
    }).join('');
}

// ── Pack Type Selector ────────────────────────────────────────────
function selectPackType(btn) {
    // Remove selected from all
    document.querySelectorAll('.pack-type-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    const type = btn.dataset.type;
    const months = parseInt(btn.dataset.months || 1);

    // Store type in hidden input
    document.getElementById('planType').value = type;

    // Auto-fill months (readonly)
    document.getElementById('planMonths').value = months;

    // Auto-fill plan name if empty
    const nameInput = document.getElementById('planName');
    if (!nameInput.value || PACK_TYPES[nameInput.dataset.lastAuto]) {
        const label = PACK_TYPES[type]?.label || '';
        nameInput.value = label;
        nameInput.dataset.lastAuto = type;
    }

    // Show/hide sessions row
    const sessionsRow = document.getElementById('sessions-input-row');
    const sessionsInput = document.getElementById('planSessions');
    if (type === 'monthly-sessions') {
        sessionsRow.classList.add('visible');
        sessionsInput.required = true;
        if (!sessionsInput.value || sessionsInput.value === '0') sessionsInput.value = '12';
    } else {
        sessionsRow.classList.remove('visible');
        sessionsInput.required = false;
        sessionsInput.value = '0';
    }
}

// ── Show / Hide Form ──────────────────────────────────────────────
function showAddPlanForm() {
    const section = document.getElementById('plan-form-section');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('plan-form-title').textContent = 'إضافة خطة جديدة';
    document.getElementById('add-plan-form').reset();
    document.getElementById('edit-plan-id').value = '';
    document.getElementById('planType').value = '';
    document.getElementById('sessions-input-row').classList.remove('visible');
    document.querySelectorAll('.pack-type-btn').forEach(b => b.classList.remove('selected'));
    // Auto-select first type
    const firstBtn = document.querySelector('.pack-type-btn');
    if (firstBtn) selectPackType(firstBtn);
}

function hideAddPlanForm() {
    document.getElementById('plan-form-section').style.display = 'none';
}

// ── Handle Save Plan ──────────────────────────────────────────────
function handleAddPlan(e) {
    e.preventDefault();
    const name = document.getElementById('planName').value.trim();
    const months = parseInt(document.getElementById('planMonths').value) || 1;
    const price = parseFloat(document.getElementById('planPrice').value);
    const maxEntries = parseInt(document.getElementById('planMaxEntries').value) || 0;
    const sessions = parseInt(document.getElementById('planSessions').value) || 0;
    const type = document.getElementById('planType').value || 'monthly';

    if (!name || !price) { showToast('يرجى ملء الاسم والسعر', 'error'); return; }
    if (!type) { showToast('يرجى اختيار نوع الباقة', 'error'); return; }
    if (type === 'monthly-sessions' && sessions === 0) {
        showToast('يرجى إدخال عدد الجلسات للباقة الشهرية بجلسات', 'error'); return;
    }

    const editId = document.getElementById('edit-plan-id').value;
    const planData = { name, months, price, maxEntries, sessions, type };

    if (editId) {
        DB.updatePlan(editId, planData);
        showToast('تم تحديث الخطة بنجاح ✅');
    } else {
        DB.addPlan(planData);
        showToast('تم إضافة الخطة بنجاح ✅');
    }
    hideAddPlanForm();
    renderPlans();
}

// ── Edit Plan ─────────────────────────────────────────────────────
function editPlan(id) {
    const plan = DB.getPlan(id);
    if (!plan) return;

    showAddPlanForm();
    document.getElementById('plan-form-title').textContent = 'تعديل الخطة';
    document.getElementById('edit-plan-id').value = id;

    // Select the correct type button
    const type = plan.type || 'monthly';
    const typeBtn = document.querySelector(`.pack-type-btn[data-type="${type}"]`);
    if (typeBtn) selectPackType(typeBtn);

    // Override name after auto-fill
    document.getElementById('planName').value = plan.name;
    document.getElementById('planMonths').value = plan.months;
    document.getElementById('planPrice').value = plan.price;
    document.getElementById('planMaxEntries').value = plan.maxEntries;
    document.getElementById('planSessions').value = plan.sessions || 0;
    document.getElementById('planType').value = type;
}

// ── Remove Plan ───────────────────────────────────────────────────
function removePlan(id) {
    const plan = DB.getPlan(id);
    confirmDelete(`هل تريد حذف خطة "${plan?.name}"؟`, () => {
        DB.deletePlan(id);
        renderPlans();
        showToast('تم حذف الخطة', 'error');
    });
}
