/**
 * app.js — Shared layout logic (sidebar, datetime, utils)
 * Loaded on every page. SINGLE SOURCE OF TRUTH — do not add duplicate code.
 */

document.addEventListener("DOMContentLoaded", () => {

    // ── Inject page loader ─────────────────────────────────────────
    if (!document.getElementById('page-loader')) {
        const loader = document.createElement('div');
        loader.id = 'page-loader';
        loader.innerHTML = `<div class="loader-ring"></div><span class="loader-text">جارٍ التحميل...</span>`;
        document.body.appendChild(loader);
    }
    // Hide immediately on load
    const loaderEl = document.getElementById('page-loader');
    if (loaderEl) loaderEl.classList.remove('visible');

    // ── Intercept ALL internal navigation links ────────────────────
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;
        // Skip: anchors, absolute URLs, mailto, tel
        if (href.startsWith('#') || href.startsWith('http') || href.startsWith('//') ||
            href.startsWith('mailto') || href.startsWith('tel')) return;
        // Only intercept .html links
        if (!href.match(/\.html(\?|$|#)/i) && !href.endsWith('.html')) return;
        e.preventDefault();
        showPageLoader(() => { window.location.href = href; });
    });

    // ── Sidebar ────────────────────────────────────────────────────
    const sidebar = document.getElementById("sidebar");
    const sidebarBtn = document.getElementById("btn");

    if (sidebarBtn && sidebar) {
        sidebarBtn.addEventListener("click", () => sidebar.classList.toggle("close"));
    }

    // Mobile overlay
    let mobileOverlay = document.getElementById("sidebar-overlay");
    if (!mobileOverlay && sidebar) {
        mobileOverlay = document.createElement("div");
        mobileOverlay.id = "sidebar-overlay";
        mobileOverlay.className = "sidebar-overlay";
        document.body.appendChild(mobileOverlay);
        mobileOverlay.addEventListener("click", closeMobileSidebar);
    }

    const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener("click", () => {
            sidebar.classList.contains("mobile-open") ? closeMobileSidebar() : openMobileSidebar();
        });
    }

    // ── Clock ──────────────────────────────────────────────────────
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // ── Notification badge ─────────────────────────────────────────
    updateNotifBadge();
});

// ═══════════════════════════════════════════════════════════════════
//  GLOBAL UTILITY FUNCTIONS — all pages can call these
// ═══════════════════════════════════════════════════════════════════

/** Show spinner overlay then navigate */
function showPageLoader(callback) {
    const loader = document.getElementById('page-loader');
    if (loader) {
        loader.classList.add('visible');
        setTimeout(() => callback(), 350);
    } else {
        callback();
    }
}

function openMobileSidebar() {
    const s = document.getElementById("sidebar");
    const o = document.getElementById("sidebar-overlay");
    if (s) s.classList.add("mobile-open");
    if (o) o.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeMobileSidebar() {
    const s = document.getElementById("sidebar");
    const o = document.getElementById("sidebar-overlay");
    if (s) s.classList.remove("mobile-open");
    if (o) o.classList.remove("active");
    document.body.style.overflow = "";
}

function updateDateTime() {
    const el = document.getElementById("current-datetime");
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function updateNotifBadge() {
    const badge = document.querySelector('.notifications .badge');
    if (!badge || typeof DB === 'undefined') return;
    const stats = DB.getStats();
    badge.textContent = stats.expiringSoon.length;
    badge.style.display = stats.expiringSoon.length ? 'inline' : 'none';
}

/** Build a status badge HTML string */
function statusBadge(status) {
    const map = {
        active: ['status-active', 'نشط'],
        expired: ['status-expired', 'منتهي'],
        frozen: ['status-frozen', 'مجمد'],
    };
    const [cls, label] = map[status] || ['', status];
    return `<span class="status-badge ${cls}">${label}</span>`;
}

/** Show a floating toast notification */
function showToast(msg, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:30px;left:30px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
    }
    const colors = {
        success: 'rgba(16,185,129,0.92)',
        error: 'rgba(239,68,68,0.92)',
        warn: 'rgba(212,175,55,0.92)',
    };
    const icons = { success: 'bx-check-circle', error: 'bx-x-circle', warn: 'bx-info-circle' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:${colors[type] || colors.success};color:#fff;padding:14px 20px;border-radius:10px;font-size:14px;font-family:Cairo,sans-serif;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.4);animation:slideIn 0.3s ease;min-width:250px;pointer-events:auto;`;
    toast.innerHTML = `<i class="bx ${icons[type] || icons.success}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.4s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

/** Show a confirmation dialog before destructive actions */
function confirmDelete(msg, onConfirm) {
    // Remove any existing overlay first
    document.getElementById('confirm-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirm-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:99000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:20px;';
    overlay.innerHTML = `
      <div style="background:#1e293b;border-radius:16px;padding:32px 28px;max-width:380px;width:100%;text-align:center;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 40px rgba(0,0,0,0.5);">
        <i class='bx bx-error-circle' style="font-size:52px;color:#ef4444;"></i>
        <h3 style="margin:15px 0 8px;font-family:Cairo,sans-serif;color:#f8fafc;">${msg}</h3>
        <p style="color:#94a3b8;font-size:14px;font-family:Cairo,sans-serif;margin-bottom:25px;">لا يمكن التراجع عن هذا الإجراء</p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button id="conf-yes" style="background:#ef4444;color:#fff;border:none;padding:11px 26px;border-radius:9px;cursor:pointer;font-family:Cairo,sans-serif;font-size:15px;font-weight:700;">نعم، احذف</button>
          <button id="conf-no"  style="background:rgba(255,255,255,0.1);color:#f8fafc;border:1px solid rgba(255,255,255,0.12);padding:11px 26px;border-radius:9px;cursor:pointer;font-family:Cairo,sans-serif;font-size:15px;">إلغاء</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById('conf-yes').onclick = () => { overlay.remove(); onConfirm(); };
    document.getElementById('conf-no').onclick = () => overlay.remove();
    // Close on backdrop click
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
