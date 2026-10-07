// Pipeline wajah di peramban: TinyFaceDetector -> 68 landmark -> descriptor 128-D (face-api.js),
// sama dengan jalur face-api.js pada app-riset-pdp. Hanya descriptor yang keluar dari modul ini;
// frame video tidak pernah disimpan atau dikirim.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const Face = {
    stream: null, loaded: false,

    async load() {
        if (this.loaded) return;
        await faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODEL_URL);
        this.loaded = true;
    },
    async start(video) {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Peramban tidak mendukung kamera (butuh HTTPS).');
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        video.srcObject = this.stream; video.muted = true; video.playsInline = true;
        await video.play();
    },
    stop(video) {
        this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
        if (video) video.srcObject = null;
    },
    async detect(video, withDescriptor) {
        const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
        const t = faceapi.detectSingleFace(video, opts).withFaceLandmarks();
        return withDescriptor ? t.withFaceDescriptor() : t;
    },
    goodQuality(det) {
        return det && det.detection.score >= CONFIG.MIN_SCORE && det.detection.box.width >= CONFIG.MIN_FACE_PX;
    },
    // Rasio posisi hidung antara tepi rahang kiri/kanan (koordinat frame mentah, tidak dicermin).
    // ~0.5 = menghadap lurus; >0.62 = menoleh ke KIRI pengguna; <0.38 = ke KANAN pengguna.
    yaw(det) { const p = det.landmarks.positions; return (p[30].x - p[0].x) / (p[16].x - p[0].x); },
    ear(det) {
        const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        const eye = e => (d(e[1], e[5]) + d(e[2], e[4])) / (2 * d(e[0], e[3]));
        const p = det.landmarks.positions;
        return (eye(p.slice(36, 42)) + eye(p.slice(42, 48))) / 2;
    },
    isFrontal(det) { const y = this.yaw(det); return y > 0.4 && y < 0.6; },

    /** Kumpulkan n descriptor dari frame yang menghadap lurus & berkualitas baik. */
    async collect(video, n, onHint, timeoutMs = 20000) {
        const out = []; const t0 = Date.now(); let last = 0;
        while (out.length < n) {
            if (Date.now() - t0 > timeoutMs) throw new Error('Wajah tidak terdeteksi cukup jelas. Perbaiki pencahayaan, dekatkan wajah, hadap lurus ke kamera.');
            const det = await this.detect(video, true);
            if (!det) { onHint?.('Wajah tidak terdeteksi'); await sleep(150); continue; }
            if (!this.goodQuality(det)) { onHint?.('Dekatkan wajah / perbaiki cahaya'); await sleep(150); continue; }
            if (!this.isFrontal(det)) { onHint?.('Hadap lurus ke kamera'); await sleep(150); continue; }
            if (Date.now() - last < 350) { await sleep(60); continue; }   // beri variasi antar-sampel
            last = Date.now(); out.push(Array.from(det.descriptor));
            onHint?.(`Sampel ${out.length}/${n}`);
        }
        return out;
    },

    /** Tantangan liveness aktif: kedip, atau tengok kiri/kanan lalu kembali menghadap lurus.
     *  CATATAN: dievaluasi di klien — penangkal foto/layar sederhana, BUKAN jaminan anti-spoofing. */
    async liveness(video, kind, onHint, timeoutMs = 12000) {
        const t0 = Date.now();
        const text = { blink: 'Kedipkan mata Anda', turn_left: 'Tengokkan kepala ke KIRI Anda', turn_right: 'Tengokkan kepala ke KANAN Anda' }[kind];
        let stage = 0;
        while (Date.now() - t0 < timeoutMs) {
            const det = await this.detect(video, false);
            if (det && this.goodQuality(det)) {
                if (kind === 'blink') {
                    const e = this.ear(det);
                    if (stage === 0 && e > 0.25) stage = 1;            // mata terbuka
                    else if (stage === 1 && e < 0.21) stage = 2;       // menutup
                    else if (stage === 2 && e > 0.25) return true;     // terbuka lagi
                    onHint?.(text);
                } else {
                    const y = this.yaw(det);
                    const hit = kind === 'turn_left' ? y > 0.62 : y < 0.38;
                    if (stage === 0 && hit) stage = 1;
                    else if (stage === 1 && y > 0.42 && y < 0.58) return true;   // kembali lurus
                    onHint?.(stage === 0 ? text : 'Sekarang hadap lurus kembali');
                }
            } else onHint?.('Wajah tidak terdeteksi');
            await sleep(80);
        }
        return false;
    },
};
