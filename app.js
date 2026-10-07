// SPA presensi wajah. Semua teks dirender lewat textContent (h()), tidak ada innerHTML dari data server.
const $app = document.getElementById('app');
const $who = document.getElementById('who');
const STATUS_LABEL = { hadir: 'Hadir', terlambat: 'Terlambat', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa' };

function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
        if (k === 'class') el.className = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, '');
        else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return el;
}
const fmt = ms => new Date(ms).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
function toast(msg, bad) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 5000);
}
async function guard(fn) {
    try { return await fn(); }
    catch (e) {
        if (e.message === 'SESSION_EXPIRED') { toast('Sesi berakhir. Silakan masuk kembali.', true); route(); }
        else toast(e.message || 'Terjadi kesalahan.', true);
    }
}
const go = hash => { location.hash = hash; };
const field = (label, input) => h('label', { class: 'f' }, h('span', {}, label), input);
const badge = s => h('span', { class: 'badge ' + (s || 'none') }, STATUS_LABEL[s] || 'Belum');

// ---------- Router ----------
async function route() {
    const user = currentUser();
    $who.replaceChildren();
    if (!getToken() || !user) return renderAuth();
    $who.append(
        h('span', {}, `${user.name} (${user.role}) `),
        user.role === 'admin' ? h('a', { href: '#/admin' }, 'Admin') : null, ' ',
        h('a', { href: '#/' }, 'Beranda'), ' ',
        h('button', { class: 'link', onclick: () => { setSession(null); route(); } }, 'Keluar'));
    const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
    $app.replaceChildren(h('p', { class: 'muted' }, 'Memuat…'));
    await guard(async () => {
        if (page === 'kelas' && user.role !== 'mahasiswa') return renderClass(arg);
        if (page === 'laporan' && user.role !== 'mahasiswa') return renderReport(arg);
        if (page === 'admin' && user.role === 'admin') return renderAdmin();
        return user.role === 'mahasiswa' ? renderStudent() : renderTeacher();
    });
}
window.addEventListener('hashchange', route);
route();

// ---------- Login / registrasi ----------
async function renderAuth(mode = 'login') {
    const cap = await apiPublic('captcha').catch(() => null);
    const inp = (name, type = 'text', extra = {}) => h('input', { name, type, required: true, autocomplete: name === 'password' ? (mode === 'login' ? 'current-password' : 'new-password') : 'off', ...extra });
    const f = {
        username: inp('username'), password: inp('password', 'password', { minlength: 8 }),
        name: inp('name'), email: inp('email', 'email'), idNumber: inp('idNumber', 'text', { required: false }),
        captcha: inp('captcha', 'number'),
    };
    const form = h('form', { class: 'card narrow', onsubmit: async ev => {
        ev.preventDefault();
        await guard(async () => {
            const body = { username: f.username.value, password: f.password.value, captchaToken: cap?.token, captchaAnswer: f.captcha.value };
            if (mode === 'register') Object.assign(body, { name: f.name.value, email: f.email.value, idNumber: f.idNumber.value });
            const r = await apiPublic(mode, { method: 'POST', body });
            setSession(r.token, r.user); go('/'); route();
        });
        if (!getToken()) renderAuth(mode);
    } },
        h('h2', {}, mode === 'login' ? 'Masuk' : 'Daftar akun mahasiswa'),
        field('Username', f.username),
        mode === 'register' ? [field('Nama lengkap', f.name), field('Email', f.email), field('NIM (opsional)', f.idNumber)] : null,
        field('Password', f.password),
        field(cap ? `Captcha: ${cap.challenge}` : 'Captcha tidak dapat dimuat', f.captcha),
        h('button', { class: 'btn', type: 'submit' }, mode === 'login' ? 'Masuk' : 'Daftar'),
        h('button', { class: 'link', type: 'button', onclick: () => renderAuth(mode === 'login' ? 'register' : 'login') },
            mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'));
    $app.replaceChildren(form);
}

// ---------- Modal kamera ----------
function cameraModal(title, ...body) {
    const video = h('video', { class: 'cam', playsinline: true, muted: true });
    const hint = h('div', { class: 'hint' }, '');
    const actions = h('div', { class: 'row' });
    const overlay = h('div', { class: 'overlay' }, h('div', { class: 'modal' },
        h('h3', {}, title), body, h('div', { class: 'camwrap' }, video), hint, actions));
    document.body.append(overlay);
    const close = () => { Face.stop(video); overlay.remove(); };
    return { video, hint: t => { hint.textContent = t; }, actions, close };
}
const modelsAndCamera = async m => {
    m.hint('Memuat model pengenalan wajah… (pertama kali bisa beberapa detik)');
    await Face.load(); m.hint('Mengaktifkan kamera…'); await Face.start(m.video);
};

// Pendaftaran wajah: persetujuan eksplisit + konfirmasi password.
function enrollFlow(onDone) {
    const consent = h('input', { type: 'checkbox' });
    const pw = h('input', { type: 'password', autocomplete: 'current-password' });
    const m = cameraModal('Daftarkan wajah',
        h('p', { class: 'notice' }, 'Aplikasi mengekstrak vektor fitur wajah (128 angka) di perangkat Anda. Gambar/video TIDAK dikirim dan TIDAK disimpan. ',
            'Vektor disimpan terenkripsi di server hanya untuk mencocokkan presensi. Anda dapat menghapusnya kapan saja.'),
        h('label', { class: 'chk' }, consent, ' Saya menyetujui pemrosesan data biometrik wajah saya untuk presensi.'),
        field('Konfirmasi password', pw));
    const start = h('button', { class: 'btn', onclick: () => guard(async () => {
        if (!consent.checked) return toast('Centang persetujuan terlebih dahulu.', true);
        if (!pw.value) return toast('Isi password untuk konfirmasi.', true);
        start.disabled = true;
        try {
            await modelsAndCamera(m);
            const samples = await Face.collect(m.video, CONFIG.ENROLL_SAMPLES, m.hint);
            m.hint('Mengirim template…');
            await apiAuth('face-enroll', {}, { method: 'POST', body: { consent: true, password: pw.value, samples } });
            toast('Wajah berhasil didaftarkan.'); m.close(); onDone();
        } catch (e) { start.disabled = false; Face.stop(m.video); throw e; }
    }) }, 'Mulai pendaftaran');
    m.actions.append(start, h('button', { class: 'btn ghost', onclick: m.close }, 'Batal'));
}

// Presensi: tantangan liveness dari server -> kumpulkan descriptor -> verifikasi 1:1 di server.
function attendFlow(meeting, onDone) {
    const m = cameraModal(`Presensi: ${meeting.title}`, h('p', { class: 'muted' }, 'Hadap kamera di tempat terang. Ikuti instruksi yang muncul.'));
    const start = h('button', { class: 'btn', onclick: () => guard(async () => {
        start.disabled = true;
        try {
            await modelsAndCamera(m);
            const ch = await apiAuth('attend-challenge', {}, { method: 'POST', body: { meetingId: meeting.id } });
            const live = await Face.liveness(m.video, ch.kind, m.hint);
            if (!live) throw new Error('Tantangan liveness tidak terpenuhi. Coba lagi.');
            m.hint('Tahan menghadap lurus…');
            const samples = await Face.collect(m.video, CONFIG.ATTEND_SAMPLES, m.hint);
            m.hint('Memverifikasi…');
            const r = await apiAuth('attend', {}, { method: 'POST', body: { meetingId: meeting.id, challengeId: ch.challengeId, livenessPassed: true, samples } });
            toast(`Presensi tercatat: ${STATUS_LABEL[r.status]}.`); m.close(); onDone();
        } catch (e) { start.disabled = false; Face.stop(m.video); throw e; }
    }) }, 'Mulai');
    m.actions.append(start, h('button', { class: 'btn ghost', onclick: m.close }, 'Tutup'));
}

// ---------- Mahasiswa ----------
async function renderStudent() {
    const [fs, cl, hist] = await Promise.all([apiAuth('face-status'), apiAuth('classes'), apiAuth('my-attendance')]);
    const faceCard = h('section', { class: 'card' }, h('h2', {}, 'Data wajah'),
        fs.enrolled
            ? h('p', {}, `Terdaftar (${fs.template.sampleCount} sampel, diperbarui ${fmt(fs.template.updatedAt)}).`)
            : h('p', { class: 'warn' }, 'Wajah Anda belum didaftarkan — wajib sebelum presensi.'),
        h('div', { class: 'row' },
            h('button', { class: 'btn', onclick: () => enrollFlow(route) }, fs.enrolled ? 'Daftar ulang wajah' : 'Daftarkan wajah'),
            fs.enrolled ? h('button', { class: 'btn ghost', onclick: () => guard(async () => {
                if (!confirm('Hapus data wajah Anda? Presensi wajah tidak bisa dipakai sampai Anda mendaftar ulang.')) return;
                await apiAuth('face-delete', {}, { method: 'DELETE' }); toast('Data wajah dihapus.'); route();
            }) }, 'Hapus data wajah') : null));

    const classCards = await Promise.all(cl.classes.map(async c => {
        const { meetings } = await apiAuth('meetings', { classId: c.id });
        return h('section', { class: 'card' }, h('h3', {}, `${c.name} `, h('small', {}, c.code)),
            meetings.length ? h('ul', { class: 'list' }, meetings.slice(0, 8).map(mt => h('li', {},
                h('span', {}, `${mt.title} · ${fmt(mt.startsAt)} `), badge(mt.myStatus),
                mt.open && !mt.myStatus ? h('button', { class: 'btn small', disabled: !fs.enrolled, title: fs.enrolled ? '' : 'Daftarkan wajah dulu', onclick: () => attendFlow(mt, route) }, 'Presensi wajah') : null)))
                : h('p', { class: 'muted' }, 'Belum ada pertemuan.'));
    }));
    $app.replaceChildren(faceCard,
        h('h2', {}, 'Kelas saya'), ...(classCards.length ? classCards : [h('p', { class: 'muted' }, 'Anda belum terdaftar di kelas mana pun. Minta dosen menambahkan username Anda.')]),
        h('section', { class: 'card' }, h('h2', {}, 'Riwayat presensi'),
            hist.attendance.length ? h('table', {}, h('thead', {}, h('tr', {}, ['Kelas', 'Pertemuan', 'Waktu', 'Status', 'Metode'].map(x => h('th', {}, x)))),
                h('tbody', {}, hist.attendance.map(a => h('tr', {}, h('td', {}, a.className), h('td', {}, a.title), h('td', {}, fmt(a.startsAt)), h('td', {}, badge(a.status)), h('td', {}, a.method === 'face' ? 'Wajah' : 'Manual')))))
                : h('p', { class: 'muted' }, 'Belum ada.')));
}

// ---------- Dosen / admin ----------
async function renderTeacher() {
    const { classes } = await apiAuth('classes');
    const code = h('input', { placeholder: 'kode, mis. pbo-a', pattern: '[a-z0-9][a-z0-9-]{1,39}', required: true });
    const name = h('input', { placeholder: 'Nama kelas', required: true });
    $app.replaceChildren(h('h2', {}, 'Kelas'),
        classes.length ? h('ul', { class: 'list' }, classes.map(c => h('li', {}, h('a', { href: `#/kelas/${c.id}` }, `${c.name} (${c.code})`), h('small', {}, ` — ${c.instructorUsername}`))))
            : h('p', { class: 'muted' }, 'Belum ada kelas.'),
        h('form', { class: 'card', onsubmit: ev => { ev.preventDefault(); guard(async () => {
            const r = await apiAuth('class-create', {}, { method: 'POST', body: { code: code.value, name: name.value } }); go(`/kelas/${r.id}`);
        }); } }, h('h3', {}, 'Buat kelas'), code, name, h('button', { class: 'btn', type: 'submit' }, 'Buat')));
}

async function renderClass(classId) {
    const [{ members }, { meetings }, { classes }] = await Promise.all([
        apiAuth('class-members', { classId }), apiAuth('meetings', { classId }), apiAuth('classes')]);
    const cls = classes.find(c => c.id === classId);
    const users = h('textarea', { rows: 3, placeholder: 'username mahasiswa, pisahkan dengan spasi/koma/baris baru' });
    const title = h('input', { placeholder: 'Judul pertemuan', required: true });
    const dur = h('input', { type: 'number', value: 90, min: 5, max: 600, required: true });
    const late = h('input', { type: 'number', value: 15, min: 0, max: 600, required: true });
    $app.replaceChildren(h('p', {}, h('a', { href: '#/' }, '← Kelas')), h('h2', {}, cls ? `${cls.name} (${cls.code})` : 'Kelas'),
        h('section', { class: 'card' }, h('h3', {}, 'Buka pertemuan'),
            h('form', { onsubmit: ev => { ev.preventDefault(); guard(async () => {
                await apiAuth('meeting-open', {}, { method: 'POST', body: { classId, title: title.value, durationMin: +dur.value, lateAfterMin: +late.value } });
                toast('Pertemuan dibuka.'); route();
            }); } }, field('Judul', title), field('Durasi (menit)', dur), field('Terlambat setelah (menit)', late), h('button', { class: 'btn', type: 'submit' }, 'Buka sekarang'))),
        h('section', { class: 'card' }, h('h3', {}, 'Pertemuan'),
            meetings.length ? h('ul', { class: 'list' }, meetings.map(m => h('li', {}, h('a', { href: `#/laporan/${m.id}` }, m.title), ` · ${fmt(m.startsAt)} `,
                h('span', { class: 'badge ' + (m.open ? 'hadir' : 'none') }, m.open ? 'Dibuka' : 'Ditutup')))) : h('p', { class: 'muted' }, 'Belum ada.')),
        h('section', { class: 'card' }, h('h3', {}, `Anggota (${members.length})`),
            members.length ? h('table', {}, h('thead', {}, h('tr', {}, ['Nama', 'Username', 'NIM', 'Wajah', ''].map(x => h('th', {}, x)))),
                h('tbody', {}, members.map(u => h('tr', {}, h('td', {}, u.name), h('td', {}, u.username), h('td', {}, u.idNumber || '-'),
                    h('td', {}, u.enrolled ? 'Terdaftar' : 'Belum'),
                    h('td', {}, h('button', { class: 'link', onclick: () => guard(async () => { await apiAuth('class-members', { classId, username: u.username }, { method: 'DELETE' }); route(); }) }, 'Keluarkan')))))) : h('p', { class: 'muted' }, 'Belum ada anggota.'),
            users, h('button', { class: 'btn', onclick: () => guard(async () => {
                const usernames = users.value.split(/[\s,;]+/).filter(Boolean);
                const r = await apiAuth('class-members', { classId }, { method: 'POST', body: { usernames } });
                toast(`Ditambahkan: ${r.added.length}` + (r.notFound.length ? ` · tidak ditemukan: ${r.notFound.join(', ')}` : ''), r.notFound.length > 0); route();
            }) }, 'Tambah anggota')));
}

function csvCell(v) {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;          // cegah formula injection di Excel/Sheets
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
async function renderReport(id) {
    const r = await apiAuth('meeting-report', { id });
    const rows = r.rows;
    const exportCsv = () => {
        const head = ['username', 'nama', 'nim', 'status', 'metode', 'jarak', 'catatan', 'waktu'];
        const lines = [head, ...rows.map(x => [x.username, x.name, x.idNumber, x.status || 'belum', x.method, x.distance, x.note, x.createdAt ? new Date(x.createdAt).toISOString() : ''])];
        const a = h('a', { href: URL.createObjectURL(new Blob([lines.map(l => l.map(csvCell).join(',')).join('\n')], { type: 'text/csv' })), download: `presensi-${r.class.code}-${id}.csv` });
        document.body.append(a); a.click(); a.remove();
    };
    const mark = u => {
        const sel = h('select', {}, Object.entries(STATUS_LABEL).map(([k, v]) => h('option', { value: k }, v)));
        const note = h('input', { placeholder: 'alasan (wajib)', size: 14 });
        return h('td', {}, sel, note, h('button', { class: 'link', onclick: () => guard(async () => {
            await apiAuth('manual-mark', {}, { method: 'POST', body: { meetingId: id, username: u.username, status: sel.value, note: note.value } }); route();
        }) }, 'Simpan'));
    };
    $app.replaceChildren(h('p', {}, h('a', { href: '#/' }, '← Kelas')),
        h('h2', {}, `${r.class.name} — ${r.meeting.title}`),
        h('p', {}, `${fmt(r.meeting.startsAt)} · `, h('span', { class: 'badge ' + (r.meeting.open ? 'hadir' : 'none') }, r.meeting.open ? 'Dibuka' : 'Ditutup')),
        h('div', { class: 'row' },
            h('button', { class: 'btn', onclick: exportCsv }, 'Ekspor CSV'),
            r.meeting.open ? h('button', { class: 'btn ghost', onclick: () => guard(async () => { await apiAuth('meeting-close', { id }, { method: 'PATCH' }); route(); }) }, 'Tutup pertemuan') : null),
        h('table', {}, h('thead', {}, h('tr', {}, ['Nama', 'NIM', 'Status', 'Metode', 'Jarak', 'Catatan', 'Override manual'].map(x => h('th', {}, x)))),
            h('tbody', {}, rows.map(u => h('tr', {}, h('td', {}, u.name), h('td', {}, u.idNumber || '-'), h('td', {}, badge(u.status)),
                h('td', {}, u.method || '-'), h('td', {}, u.distance != null ? u.distance.toFixed(3) : '-'), h('td', {}, u.note || ''), mark(u))))));
}

// ---------- Admin ----------
async function renderAdmin() {
    const s = await apiAuth('admin-stats');
    const f = { username: h('input', { required: true }), name: h('input', { required: true }), password: h('input', { type: 'password', minlength: 8, required: true }),
        email: h('input', { type: 'email' }), role: h('select', {}, ['mahasiswa', 'dosen', 'admin'].map(r => h('option', { value: r }, r))) };
    const act = (label, fn) => h('button', { class: 'link', onclick: () => guard(async () => { await fn(); route(); }) }, label);
    $app.replaceChildren(h('h2', {}, 'Admin'),
        h('p', {}, Object.entries(s.counts).map(([k, v]) => `${k}: ${v}`).join(' · ')),
        h('section', { class: 'card' }, h('h3', {}, 'Akun'),
            h('table', {}, h('thead', {}, h('tr', {}, ['Nama', 'Username', 'Peran', 'Wajah', 'Aksi'].map(x => h('th', {}, x)))),
                h('tbody', {}, s.users.map(u => h('tr', {}, h('td', {}, u.name), h('td', {}, u.username), h('td', {}, u.role), h('td', {}, u.enrolled ? 'Terdaftar' : '-'),
                    h('td', {},
                        u.enrolled ? act('Reset wajah', async () => { if (confirm(`Hapus template wajah ${u.username}?`)) await apiAuth('admin-face-reset', { username: u.username }, { method: 'DELETE' }); }) : null, ' ',
                        act('Ganti password', async () => { const p = prompt(`Password baru untuk ${u.username} (min 8 karakter):`); if (p) await apiAuth('admin-set-password', { id: u.id }, { method: 'PATCH', body: { password: p } }); }), ' ',
                        act('Ubah peran', async () => { const r = prompt('Peran baru (mahasiswa/dosen/admin):', u.role); if (r && r !== u.role) await apiAuth('admin-set-role', { id: u.id }, { method: 'PATCH', body: { role: r } }); }))))))),
        h('form', { class: 'card', onsubmit: ev => { ev.preventDefault(); guard(async () => {
            await apiAuth('admin-create-account', {}, { method: 'POST', body: Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value])) }); toast('Akun dibuat.'); route();
        }); } }, h('h3', {}, 'Buat akun'), field('Username', f.username), field('Nama', f.name), field('Email', f.email), field('Password', f.password), field('Peran', f.role),
            h('button', { class: 'btn', type: 'submit' }, 'Buat akun')));
}
