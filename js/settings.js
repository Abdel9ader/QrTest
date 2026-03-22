/**
 * settings.js — Gym settings: Save/Load gym info
 */
 
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});

function loadSettings() {
    const s = DB.getSettings();
    const gymNameEl = document.getElementById('gymName');
    const workHoursEl = document.getElementById('workHours');
    if (gymNameEl) gymNameEl.value = s.gymName || '';
    if (workHoursEl) workHoursEl.value = s.workHours || '';
}

function saveSettings(e) {
    e.preventDefault();
    const gymName = document.getElementById('gymName')?.value.trim() || '';
    const workHours = document.getElementById('workHours')?.value.trim() || '';

    if (!gymName) {
        showToast('يرجى إدخال اسم الصالة', 'error');
        return;
    }

    DB.saveSettings({ gymName, workHours });
    showToast('تم حفظ الإعدادات بنجاح ✅');

    // Update page title dynamically if gym name changed
    const titleEls = document.querySelectorAll('.logo_name');
    titleEls.forEach(el => { el.textContent = gymName; });
}

function resetAllData() {
    confirmDelete('هل تريد مسح جميع بيانات النظام؟ (لا يمكن التراجع)', () => {
        Object.values(DB.KEYS).forEach(k => localStorage.removeItem(k));
        showToast('تم مسح جميع البيانات. جارٍ إعادة التهيئة...', 'warn');
        setTimeout(() => location.reload(), 1500);
    });
}
