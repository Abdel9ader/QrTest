/**
 * db.js — Royal Gym Central Data Store (localStorage)
 * All modules import helpers from this file.
 */

const DB = {

    // ─── Keys ────────────────────────────────────────────
    KEYS: {
        members: 'rg_members',
        attendance: 'rg_attendance',
        subscriptions: 'rg_subscriptions',
        settings: 'rg_settings',
        nextId: 'rg_next_id',
    },

    // ─── Seed Data ───────────────────────────────────────
    seed() {
        if (!localStorage.getItem(this.KEYS.nextId)) {
            localStorage.setItem(this.KEYS.nextId, '1043');
        }

        // ── Migration: if plans exist but don't have 'type' field, reset them ──
        const existingPlans = (() => {
            try { return JSON.parse(localStorage.getItem(this.KEYS.subscriptions)) || []; } catch { return []; }
        })();
        if (existingPlans.length && !existingPlans[0].type) {
            localStorage.removeItem(this.KEYS.subscriptions);
        }

        if (!localStorage.getItem(this.KEYS.subscriptions)) {
            const plans = [
                { id: 'plan1', name: 'شهري', type: 'monthly', months: 1, price: 450, maxEntries: 0, sessions: 0 },
                { id: 'plan2', name: 'شهري بجلسات', type: 'monthly-sessions', months: 1, price: 350, maxEntries: 0, sessions: 12 },
                { id: 'plan3', name: 'شهرين', type: '2months', months: 2, price: 800, maxEntries: 0, sessions: 0 },
                { id: 'plan4', name: '3 شهور', type: '3months', months: 3, price: 1200, maxEntries: 0, sessions: 0 },
                { id: 'plan5', name: '6 شهور', type: '6months', months: 6, price: 2000, maxEntries: 0, sessions: 0 },
                { id: 'plan6', name: 'سنوي', type: 'yearly', months: 12, price: 3500, maxEntries: 0, sessions: 0 },
            ];
            localStorage.setItem(this.KEYS.subscriptions, JSON.stringify(plans));
        }

        if (!localStorage.getItem(this.KEYS.settings)) {
            const defaults = {
                gymName: 'Royal Gym',
                workHours: 'من 8 صباحاً حتى 12 منتصف الليل',
                whatsappProvider: 'twilio',
                whatsappToken: '',
            };
            localStorage.setItem(this.KEYS.settings, JSON.stringify(defaults));
        }

        if (!localStorage.getItem(this.KEYS.members)) {
            const today = new Date();
            const fmt = d => d.toISOString().split('T')[0];
            const addDays = (d, n) => { let x = new Date(d); x.setDate(x.getDate() + n); return x; };
            const members = [
                {
                    id: '1042', name: 'أحمد محمد', phone: '01012345678',
                    planId: 'plan4', planName: '3 شهور',
                    startDate: fmt(addDays(today, -30)),
                    endDate: fmt(addDays(today, 60)),
                    status: 'active', notes: '', photo: ''
                },
                {
                    id: '1040', name: 'محمود سيد', phone: '01098765432',
                    planId: 'plan1', planName: 'شهري',
                    startDate: fmt(addDays(today, -45)),
                    endDate: fmt(addDays(today, -15)),
                    status: 'expired', notes: '', photo: ''
                },
                {
                    id: '1041', name: 'سارة علي', phone: '01155667788',
                    planId: 'plan5', planName: '6 شهور',
                    startDate: fmt(addDays(today, -10)),
                    endDate: fmt(addDays(today, 170)),
                    status: 'active', notes: 'عضوة منذ 2023', photo: ''
                },
            ];
            localStorage.setItem(this.KEYS.members, JSON.stringify(members));
        }

        if (!localStorage.getItem(this.KEYS.attendance)) {
            const today = new Date();
            const fmt = d => d.toISOString().split('T')[0];
            const addDays = (d, n) => { let x = new Date(d); x.setDate(x.getDate() + n); return x; };
            const logs = [
                { id: 'att1', memberId: '1042', memberName: 'أحمد محمد', date: fmt(today), time: '06:30 PM', method: 'qr', staff: '' },
                { id: 'att2', memberId: '1042', memberName: 'أحمد محمد', date: fmt(addDays(today, -2)), time: '07:00 PM', method: 'manual', staff: 'مدير النظام' },
                { id: 'att3', memberId: '1041', memberName: 'سارة علي', date: fmt(today), time: '08:00 AM', method: 'qr', staff: '' },
            ];
            localStorage.setItem(this.KEYS.attendance, JSON.stringify(logs));
        }
    },

    // ─── Generic Helpers ─────────────────────────────────
    getAll(key) {
        try { return JSON.parse(localStorage.getItem(this.KEYS[key])) || []; }
        catch { return []; }
    },
    save(key, data) {
        localStorage.setItem(this.KEYS[key], JSON.stringify(data));
    },
    nextId() {
        const id = parseInt(localStorage.getItem(this.KEYS.nextId) || '1043');
        localStorage.setItem(this.KEYS.nextId, String(id + 1));
        return String(id);
    },

    // ─── Members ─────────────────────────────────────────
    getMembers() { return this.getAll('members'); },
    getMember(id) { return this.getMembers().find(m => m.id === id) || null; },
    addMember(data) {
        const members = this.getMembers();
        const member = { id: this.nextId(), ...data };
        // Auto-compute status
        member.status = this._computeStatus(member);
        members.push(member);
        this.save('members', members);
        return member;
    },
    updateMember(id, data) {
        const members = this.getMembers().map(m => {
            if (m.id === id) {
                const updated = { ...m, ...data };
                updated.status = this._computeStatus(updated);
                return updated;
            }
            return m;
        });
        this.save('members', members);
    },
    deleteMember(id) {
        this.save('members', this.getMembers().filter(m => m.id !== id));
    },
    _computeStatus(m) {
        if (m.status === 'frozen') return 'frozen';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const end = new Date(m.endDate);
        return end >= today ? 'active' : 'expired';
    },
    refreshStatuses() {
        const members = this.getMembers().map(m => ({ ...m, status: this._computeStatus(m) }));
        this.save('members', members);
    },

    // ─── Attendance ──────────────────────────────────────
    getAttendance() { return this.getAll('attendance'); },
    logAttendance(memberId, memberName, method = 'manual', staff = '') {
        const logs = this.getAttendance();
        const now = new Date();
        const log = {
            id: 'att' + Date.now(),
            memberId, memberName,
            date: now.toISOString().split('T')[0],
            time: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            method, staff
        };
        logs.unshift(log);
        this.save('attendance', logs);
        return log;
    },
    getMemberAttendance(memberId) {
        return this.getAttendance().filter(a => a.memberId === memberId);
    },
    todayAttendance() {
        const today = new Date().toISOString().split('T')[0];
        return this.getAttendance().filter(a => a.date === today);
    },

    // ─── Subscriptions ───────────────────────────────────
    getPlans() { return this.getAll('subscriptions'); },
    getPlan(id) { return this.getPlans().find(p => p.id === id) || null; },
    addPlan(data) {
        const plans = this.getPlans();
        const plan = { id: 'plan' + Date.now(), ...data };
        plans.push(plan);
        this.save('subscriptions', plans);
        return plan;
    },
    updatePlan(id, data) {
        this.save('subscriptions', this.getPlans().map(p => p.id === id ? { ...p, ...data } : p));
    },
    deletePlan(id) {
        this.save('subscriptions', this.getPlans().filter(p => p.id !== id));
    },

    // ─── Settings ────────────────────────────────────────
    getSettings() {
        try { return JSON.parse(localStorage.getItem(this.KEYS.settings)) || {}; }
        catch { return {}; }
    },
    saveSettings(data) {
        const existing = this.getSettings();
        localStorage.setItem(this.KEYS.settings, JSON.stringify({ ...existing, ...data }));
    },

    // ─── Stats ───────────────────────────────────────────
    getStats() {
        this.refreshStatuses();
        const members = this.getMembers();
        const today = this.todayAttendance();
        const active = members.filter(m => m.status === 'active').length;
        const expired = members.filter(m => m.status === 'expired').length;
        const frozen = members.filter(m => m.status === 'frozen').length;
        // Expiring within 7 days
        const soon = new Date(); soon.setDate(soon.getDate() + 7);
        const expiringSoon = members.filter(m => {
            const end = new Date(m.endDate);
            return m.status === 'active' && end <= soon;
        });
        return { total: members.length, active, expired, frozen, todayCount: today.length, expiringSoon };
    }
};

// Always seed on load
DB.seed();
