/**
 * reports.js — Reports & export
 */

document.addEventListener('DOMContentLoaded', () => {
    loadReportSummary();
    initRevenueChart();
    const form = document.getElementById('report-form');
    if (form) form.addEventListener('submit', generateReport);
});

function loadReportSummary() {
    const stats = DB.getStats();
    const members = DB.getMembers();

    setText('rep-total', stats.total);
    setText('rep-active', stats.active);
    setText('rep-expired', stats.expired);
    setText('rep-today', stats.todayCount);

    // Revenue from member plans
    const plans = DB.getPlans();
    let revenue = 0;
    members.filter(m => m.status === 'active').forEach(m => {
        const plan = plans.find(p => p.id === m.planId);
        if (plan) revenue += plan.price;
    });
    setText('rep-revenue', revenue.toLocaleString() + ' ج.م');
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function initRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    const plans = DB.getPlans();
    const members = DB.getMembers();
    const planCounts = {};
    plans.forEach(p => planCounts[p.name] = 0);
    members.forEach(m => { if (planCounts[m.planName] !== undefined) planCounts[m.planName]++; });
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(planCounts),
            datasets: [{
                data: Object.values(planCounts),
                backgroundColor: ['#D4AF37', '#10B981', '#3B82F6', '#8B5CF6'],
                borderColor: '#1e293b',
                borderWidth: 3,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94A3B8', font: { family: 'Cairo' } } }
            }
        }
    });
}

function generateReport(e) {
    e.preventDefault();
    const type = document.getElementById('rep-type').value;
    const period = document.getElementById('rep-period').value;
    const container = document.getElementById('report-output');

    let members = DB.getMembers();
    let logs = DB.getAttendance();

    // Filter by period
    const now = new Date();
    const from = new Date();
    if (period === 'week') from.setDate(from.getDate() - 7);
    else if (period === 'month') from.setMonth(from.getMonth() - 1);
    else if (period === 'year') from.setFullYear(from.getFullYear() - 1);
    const fromStr = from.toISOString().split('T')[0];

    if (type === 'attendance_daily') {
        const filtered = logs.filter(a => a.date >= fromStr);
        container.innerHTML = buildTable(
            ['العضو', 'رقم العضوية', 'التاريخ', 'الوقت', 'الطريقة'],
            filtered.map(a => [a.memberName, '#' + a.memberId, a.date, a.time, a.method === 'qr' ? 'QR Code' : 'يدوي'])
        );
    } else if (type === 'commitment') {
        const countMap = {};
        logs.filter(a => a.date >= fromStr).forEach(a => {
            countMap[a.memberId] = (countMap[a.memberId] || 0) + 1;
        });
        const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
        container.innerHTML = buildTable(
            ['المرتبة', 'اسم العضو', 'عدد الحضور'],
            sorted.map(([id, cnt], i) => {
                const m = DB.getMember(id);
                return [i + 1, m ? m.name : '#' + id, cnt + ' يوم'];
            })
        );
    } else if (type === 'absent') {
        const attended = new Set(logs.filter(a => a.date >= fromStr).map(a => a.memberId));
        const absent = members.filter(m => m.status === 'active' && !attended.has(m.id));
        container.innerHTML = buildTable(
            ['اسم العضو', 'رقم الموبايل', 'نوع الاشتراك', 'تاريخ الانتهاء'],
            absent.map(m => [m.name, m.phone, m.planName, m.endDate])
        );
    } else if (type === 'revenue') {
        const plans = DB.getPlans();
        let revenue = 0;
        members.filter(m => m.status === 'active').forEach(m => {
            const plan = plans.find(p => p.id === m.planId);
            if (plan) revenue += plan.price;
        });
        container.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <i class='bx bx-money' style="font-size:60px;color:var(--gold-primary);"></i>
                <h2 style="font-size:48px;font-weight:800;margin:20px 0;">${revenue.toLocaleString()} ج.م</h2>
                <p style="color:#94a3b8;">إجمالي إيرادات الاشتراكات النشطة</p>
            </div>`;
    } else if (type === 'expiring') {
        const stats = DB.getStats();
        container.innerHTML = buildTable(
            ['اسم العضو', 'رقم الموبايل', 'نوع الاشتراك', 'ينتهي في'],
            stats.expiringSoon.map(m => [m.name, m.phone, m.planName, m.endDate])
        );
    }
}

function buildTable(headers, rows) {
    const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
    const tbody = rows.length
        ? `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`
        : `<tbody><tr><td colspan="${headers.length}" style="text-align:center;color:#94a3b8;padding:30px;">لا توجد بيانات</td></tr></tbody>`;
    return `<table class="data-table">${thead}${tbody}</table>`;
}

function exportPDF() {
    showToast('جاري تصدير PDF... (يتطلب مكتبة طباعة)', 'warn');
    window.print();
}

function exportExcel() {
    // Build CSV and download
    const output = document.getElementById('report-output');
    if (!output || !output.querySelector('table')) { showToast('يرجى توليد التقرير أولاً', 'error'); return; }
    const rows = [...output.querySelectorAll('tr')].map(tr =>
        [...tr.querySelectorAll('th,td')].map(td => '"' + td.textContent.trim() + '"').join(',')
    );
    const csv = '\uFEFF' + rows.join('\n');  // BOM for Arabic support
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'royal_gym_report.csv';
    a.click();
    showToast('تم تصدير الملف بنجاح ✅');
}
