import re
import os

BASE_DIR = 'd:/Royal Gym (1)'
with open(os.path.join(BASE_DIR, 'index.html'), 'r', encoding='utf-8') as f:
    html_content = f.read()

# Extract sections
# For finding sections, since they are structured rigidly:
def extract_section(section_id):
    pattern = r'<section id="' + section_id + r'"[^>]*>(.*?)</section>\s*(?=<!--|<section|</div)'
    match = re.search(pattern, html_content, re.DOTALL)
    if match:
        return f'<section id="{section_id}" class="page active">\n' + match.group(1) + '</section>'
    return ''

# Custom string extraction for better safety
def extract_between(text, start, end):
    try:
        content = text.split(start)[1].split(end)[0]
        return start + content + end
    except IndexError:
        return ''

dashboard_content = extract_between(html_content, '<section id="dashboard"', '</section>')
members_content = extract_between(html_content, '<section id="members"', '</section>')
member_add_content = extract_between(html_content, '<section id="member-add"', '</section>')
member_profile_content = extract_between(html_content, '<section id="member-profile"', '</section>')
attendance_content = extract_between(html_content, '<section id="attendance"', '</section>')
subscriptions_content = extract_between(html_content, '<section id="subscriptions"', '</section>')
reports_content = extract_between(html_content, '<section id="reports"', '</section>')
settings_content = extract_between(html_content, '<section id="settings"', '</section>')
reception_content = extract_between(html_content, '<section id="reception" class="page fullscreen-page"', '</section>')
if not reception_content:
    reception_content = extract_between(html_content, '<section id="reception"', '</section>')

# Replace app.navigate occurrences with href links
replacements = {
    "onclick=\"app.navigate('member-add')\"": "onclick=\"window.location.href='add-member.html'\"",
    "onclick=\"app.navigate('members')\"": "onclick=\"window.location.href='members.html'\"",
    "onclick=\"app.navigate('member-profile')\"": "onclick=\"window.location.href='member-profile.html'\"",
    "onclick=\"app.navigate('reception')\"": "onclick=\"window.location.href='reception.html'\"",
    "onclick=\"app.navigate('dashboard')\"": "onclick=\"window.location.href='dashboard.html'\""
}

def clean_content(content):
    res = content
    for k, v in replacements.items():
        res = res.replace(k, v)
    # Remove hidden page classes
    res = res.replace('class="page"', 'class="page active"')
    return res

def get_layout(page_content, title, current_page_id, js_files=[]):
    js_tags = chr(10).join([f'    <script src="js/{f}"></script>' for f in js_files])
    
    # Simple navigation template replacement for active class
    def get_nav_link(href, icon, label, id_str):
        active = " active" if id_str == current_page_id else ""
        return f'<a href="{href}" class="nav-link{active}" id="nav-{id_str}"><i class="{icon}"></i><span class="links_name">{label}</span></a>'
        
    layout = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Royal Gym</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <aside class="sidebar" id="sidebar">
        <div class="logo-details">
            <i class='bx bx-crown icon'></i>
            <div class="logo_name">Royal Gym</div>
            <i class='bx bx-menu' id="btn"></i>
        </div>
        <ul class="nav-list">
            <li>{get_nav_link('dashboard.html', 'bx bx-grid-alt', 'الرئيسية', 'dashboard')}<span class="tooltip">الرئيسية</span></li>
            <li>{get_nav_link('members.html', 'bx bx-user', 'إدارة الأعضاء', 'members')}<span class="tooltip">الأعضاء</span></li>
            <li>{get_nav_link('attendance.html', 'bx bx-check-square', 'إدارة الحضور', 'attendance')}<span class="tooltip">الحضور</span></li>
            <li>{get_nav_link('subscriptions.html', 'bx bx-card', 'الاشتراكات', 'subscriptions')}<span class="tooltip">الاشتراكات</span></li>
            <li>{get_nav_link('reports.html', 'bx bx-pie-chart-alt-2', 'التقارير', 'reports')}<span class="tooltip">التقارير</span></li>
            <li>{get_nav_link('settings.html', 'bx bx-cog', 'الإعدادات', 'settings')}<span class="tooltip">الإعدادات</span></li>
            <li class="reception-link">{get_nav_link('reception.html', 'bx bx-qr-scan', 'شاشة الاستقبال', 'reception')}<span class="tooltip">الاستقبال</span></li>
            <li class="logout-link" style="margin-top: 40px;"><a href="index.html" class="nav-link"><i class='bx bx-log-out text-red'></i><span class="links_name text-red">تسجيل الخروج</span></a><span class="tooltip">خروج</span></li>
        </ul>
    </aside>

    <main class="main-content" id="main-content">
        <header class="top-header">
            <div class="header-left">
                <div class="search-box">
                    <i class='bx bx-search'></i>
                    <input type="text" placeholder="بحث سريع عن عضو...">
                </div>
            </div>
            <div class="header-right">
                <div class="datetime" id="current-datetime"></div>
                <div class="notifications">
                    <i class='bx bx-bell'></i>
                    <span class="badge">3</span>
                </div>
                <div class="profile-dropdown">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=fbbf24&color=000" alt="Admin">
                    <span>مدير النظام</span>
                    <i class='bx bx-chevron-down'></i>
                </div>
            </div>
        </header>

        <div class="pages-container">
            {clean_content(page_content)}
        </div>
    </main>

    <script src="js/app.js"></script>
{js_tags}
</body>
</html>
"""
    return layout

pages = {
    'dashboard.html': (dashboard_content, 'الرئيسية', 'dashboard', []),
    'members.html': (members_content, 'إدارة الأعضاء', 'members', ['members.js']),
    'add-member.html': (member_add_content, 'إضافة عضو', 'members', ['members.js']),
    'member-profile.html': (member_profile_content, 'الملف الشخصي', 'members', ['members.js']),
    'attendance.html': (attendance_content, 'إدارة الحضور', 'attendance', ['attendance.js']),
    'subscriptions.html': (subscriptions_content, 'الاشتراكات', 'subscriptions', ['subscriptions.js']),
    'reports.html': (reports_content, 'التقارير', 'reports', ['reports.js']),
    'settings.html': (settings_content, 'الإعدادات', 'settings', ['settings.js'])
}

# Reception has special full-screen wrapper
reception_layout = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>شاشة الاستقبال - Royal Gym</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
    <link rel="stylesheet" href="css/style.css">
    <style>
        @keyframes scan {{
            0% {{ top: 0%; opacity: 0; }}
            10% {{ opacity: 1; }}
            90% {{ opacity: 1; }}
            100% {{ top: 100%; opacity: 0; }}
        }}
    </style>
</head>
<body>
{clean_content(reception_content)}
<script src="js/attendance.js"></script>
</body>
</html>"""

for filename, data in pages.items():
    if data[0]:
        with open(os.path.join(BASE_DIR, filename), 'w', encoding='utf-8') as f:
            f.write(get_layout(data[0], data[1], data[2], data[3]))

# Save reception separately
if reception_content:
    with open(os.path.join(BASE_DIR, 'reception.html'), 'w', encoding='utf-8') as f:
        f.write(reception_layout)

# Save Login
login_page = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تسجيل الدخول - Royal Gym</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
    <link rel="stylesheet" href="css/style.css">
</head>
<body class="login-body">
    <div class="login-container glass-card">
        <div class="logo text-center mb-4" style="text-align: center;">
            <i class='bx bx-crown' style="font-size: 60px; color: var(--gold-primary); text-shadow: 0 0 15px rgba(212,175,55,0.5);"></i>
            <h2 class="text-gold mt-2">Royal Gym</h2>
            <p class="text-secondary">لوحة تحكم الإدارة</p>
        </div>
        <form id="login-form" action="dashboard.html">
            <div class="form-group mb-3">
                <label>اسم المستخدم</label>
                <input type="text" id="username" class="form-control" required placeholder="admin">
            </div>
            <div class="form-group mb-4">
                <label>كلمة المرور</label>
                <input type="password" id="password" class="form-control" required placeholder="••••••">
            </div>
            <button type="submit" class="btn btn-primary w-100" style="padding: 12px; width: 100%; justify-content: center;">تسجيل الدخول <i class='bx bx-log-in-circle'></i></button>
        </form>
    </div>
    <script src="js/auth.js"></script>
</body>
</html>
"""
with open(os.path.join(BASE_DIR, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(login_page)

print('Success')
