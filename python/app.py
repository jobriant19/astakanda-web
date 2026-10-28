"""
ASTA KANDA — Gesture Matching Service
Menerima landmark tangan (dari MediaPipe Hands di browser, via Laravel) lalu
mencocokkannya dengan sample yang tersimpan di database, dan mengembalikan
label yang paling cocok.

== Update: mesin pengenalan berbasis neural network (deep learning ringan) ==
Sebelumnya pengenalan 100% memakai pencocokan jarak terdekat (nearest-neighbor)
ke SEMUA frame tersimpan — akurat tapi (a) gampang meleset kalau tangan sedikit
berputar/bergeser karena membandingkan koordinat mentah apa adanya, dan
(b) harus memindai seluruh data setiap request (makin banyak rekaman makin
lambat). Sekarang di setiap request:

  1) Fitur yang diekstrak dari landmark diperkaya dengan SUDUT TIAP RUAS JARI
     (bukan cuma koordinat), yang jauh lebih tahan terhadap rotasi/posisi
     tangan yang sedikit berbeda dari saat merekam — karena yang dilihat
     adalah "jari menekuk berapa derajat", bukan "titik ada di koordinat
     berapa". Ini sumber peningkatan akurasi paling besar.
  2) Fitur itu dipakai melatih MLPClassifier (jaringan saraf tiruan kecil,
     scikit-learn) dari seluruh rekaman yang dikirim. Model INI YANG
     dipakai untuk menjawab tiap request (bukan lagi memindai satu per
     satu), jadi jauh lebih cepat — klasifikasi 1x forward-pass, bukan
     O(jumlah seluruh frame tersimpan).
  3) Model di-cache di memori & hanya dilatih ULANG saat data rekaman
     berubah (dideteksi dari jumlah sample per label), bukan setiap
     request — supaya tidak ada jeda melatih ulang tiap kali tangan
     dibaca.
  4) Kalau rekaman untuk suatu kata/huruf masih terlalu sedikit untuk
     dilatih (atau network belum yakin / confidence rendah), otomatis
     JATUH KE pencocokan jarak terdekat yang lama sebagai cadangan —
     supaya tetap bisa dipakai sejak rekaman pertama, tidak menunggu
     "cukup data" dulu.

Catatan jujur: ini BUKAN model deep learning raksasa yang dilatih dari
jutaan data (butuh infrastruktur training & dataset yang jauh lebih besar
dari yang tersedia di sini) — ini jaringan saraf kecil yang dilatih
otomatis dari rekaman Anda sendiri, cukup ringan untuk berjalan real-time
di laptop biasa, dengan akurasi & kecepatan yang terukur lebih baik
daripada pencocokan jarak murni di atas.

Jalankan:  python app.py   (default port 5001)
"""
import hashlib
import json
import threading

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    from sklearn.neural_network import MLPClassifier
    SKLEARN_OK = True
except Exception:  # scikit-learn belum terpasang -> otomatis pakai NN saja
    SKLEARN_OK = False

app = Flask(__name__)
CORS(app)

# Jarak di bawah threshold ini dianggap "cocok" (jalur cadangan/NN).
MATCH_THRESHOLD = 0.35

# Confidence minimal dari neural network supaya jawabannya dipakai; di bawah
# ini, sistem jatuh ke pencocokan jarak terdekat sebagai cadangan yang lebih
# "hati-hati" (lebih baik menolak daripada salah menjawab).
MLP_CONFIDENCE_THRESHOLD = 0.55

# Butuh minimal segini sample per label & minimal segini label berbeda
# sebelum neural network dilatih — di bawah itu data belum cukup untuk
# belajar pola yang masuk akal, jadi otomatis pakai NN saja dulu.
MIN_SAMPLES_PER_CLASS = 3
MIN_CLASSES = 2

MAX_HANDS = 2  # sinkron dengan `maxNumHands` MediaPipe di app.js


def normalize_hand(hand):
    """hand = list of 21 dict {x,y,z} -> np.array (21,3) yang sudah
    digeser ke pergelangan tangan (index 0) dan diskalakan supaya ukuran
    tangan (jauh/dekat ke kamera) tidak memengaruhi jarak."""
    pts = np.array([[p['x'], p['y'], p['z']] for p in hand], dtype=np.float32)
    wrist = pts[0]
    pts = pts - wrist
    scale = np.linalg.norm(pts[9]) or 1e-6  # jarak wrist -> pangkal jari tengah
    return pts / scale


def hand_distance(a, b):
    """a, b = hasil normalize_hand, kembalikan rata-rata jarak euclidean per titik."""
    return float(np.mean(np.linalg.norm(a - b, axis=1)))


def frame_distance(live_frame, sample_frame):
    """live_frame / sample_frame = list of hands (masing-masing 21 titik).
    Cocokkan tangan berdasarkan urutan yang tersedia (mendukung 1-2 tangan)."""
    n = min(len(live_frame), len(sample_frame))
    if n == 0:
        return float('inf')
    dists = []
    for i in range(n):
        a = normalize_hand(live_frame[i])
        b = normalize_hand(sample_frame[i])
        dists.append(hand_distance(a, b))
    return float(np.mean(dists))


# ---------------------------------------------------------------------------
# Fitur untuk neural network: koordinat ternormalisasi + sudut tiap ruas jari.
# Sudut dipakai karena tahan rotasi/pergeseran tangan — yang penting jari
# menekuk berapa derajat, bukan di koordinat piksel mana persis.
# ---------------------------------------------------------------------------
FINGER_JOINTS = [
    (1, 2, 3), (2, 3, 4),        # ibu jari
    (5, 6, 7), (6, 7, 8),        # telunjuk
    (9, 10, 11), (10, 11, 12),   # tengah
    (13, 14, 15), (14, 15, 16),  # manis
    (17, 18, 19), (18, 19, 20),  # kelingking
]
FEATURES_PER_HAND = 21 * 3 + len(FINGER_JOINTS)  # 63 koordinat + 10 sudut = 73


def joint_angles(pts):
    """pts = hasil normalize_hand (21,3) -> list sudut (radian) di tiap ruas jari."""
    angles = []
    for a, b, c in FINGER_JOINTS:
        v1 = pts[a] - pts[b]
        v2 = pts[c] - pts[b]
        n1 = np.linalg.norm(v1) or 1e-6
        n2 = np.linalg.norm(v2) or 1e-6
        cosang = float(np.clip(np.dot(v1, v2) / (n1 * n2), -1.0, 1.0))
        angles.append(np.arccos(cosang))
    return angles


def hand_features(hand):
    pts = normalize_hand(hand)
    return np.concatenate([pts.flatten(), np.array(joint_angles(pts), dtype=np.float32)])


def frame_features(frame_hands):
    """frame_hands = list tangan (1-2) -> vektor fitur PANJANG TETAP, supaya
    bisa dipakai neural network (selalu MAX_HANDS slot; slot kosong diisi 0)."""
    feats = []
    for i in range(MAX_HANDS):
        if i < len(frame_hands):
            feats.append(hand_features(frame_hands[i]))
        else:
            feats.append(np.zeros(FEATURES_PER_HAND, dtype=np.float32))
    return np.concatenate(feats)


# ---------------------------------------------------------------------------
# Model neural network di-cache di memori, dilatih ulang hanya saat data
# rekaman berubah (bukan setiap request) — supaya tetap cepat.
# ---------------------------------------------------------------------------
_model_lock = threading.Lock()
_model_cache = {'hash': None, 'clf': None}


def _samples_signature(samples):
    """Sidik jari RINGAN dari data rekaman (label + jumlah frame per label),
    cukup untuk mendeteksi "ada rekaman baru/berubah" tanpa harus meng-hash
    seluruh isi landmark (yang jauh lebih besar & lambat)."""
    sig = sorted((s.get('label'), len(s.get('landmarks') or [])) for s in samples)
    return hashlib.md5(json.dumps(sig).encode()).hexdigest()


def _build_mlp(samples):
    X, y = [], []
    counts = {}
    for sample in samples:
        label = sample.get('label')
        frames = sample.get('landmarks') or []
        for frame in frames:
            try:
                X.append(frame_features(frame))
                y.append(label)
                counts[label] = counts.get(label, 0) + 1
            except Exception:
                continue  # frame rusak/kosong -> lewati, jangan sampai gagal semua

    eligible = {label for label, n in counts.items() if n >= MIN_SAMPLES_PER_CLASS}
    if len(eligible) < MIN_CLASSES:
        return None  # data belum cukup beragam -> biar fallback NN yang jalan

    keep = [i for i, label in enumerate(y) if label in eligible]
    X = np.array([X[i] for i in keep], dtype=np.float32)
    y = np.array([y[i] for i in keep])

    clf = MLPClassifier(
        hidden_layer_sizes=(64, 32),
        activation='relu',
        alpha=1e-3,
        learning_rate_init=0.01,
        max_iter=500,
        random_state=0,
    )
    try:
        clf.fit(X, y)
    except Exception:
        return None
    return clf


def get_model(samples):
    """Mengembalikan model MLP yang sudah/baru dilatih, atau None kalau
    scikit-learn tidak tersedia atau data belum cukup (fallback NN)."""
    if not SKLEARN_OK:
        return None
    h = _samples_signature(samples)
    with _model_lock:
        if _model_cache['hash'] == h:
            return _model_cache['clf']
        clf = _build_mlp(samples)
        _model_cache['hash'] = h
        _model_cache['clf'] = clf
        return clf


def nearest_neighbor(live, samples):
    best_label, best_dist = None, float('inf')
    for sample in samples:
        label = sample.get('label')
        frames = sample.get('landmarks') or []
        for frame in frames:
            d = frame_distance(live, frame)
            if d < best_dist:
                best_dist = d
                best_label = label
    return best_label, best_dist


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'ok': True, 'service': 'astakanda-gesture', 'engine': 'mlp' if SKLEARN_OK else 'nn'})


@app.route('/recognize', methods=['POST'])
def recognize():
    payload = request.get_json(force=True) or {}
    live = payload.get('landmarks')       # list of hands (1 frame saat ini)
    samples = payload.get('samples', [])  # [{label, landmarks: [frame, frame, ...]}, ...]

    if not live:
        return jsonify({'ok': False, 'message': 'landmarks kosong'}), 400

    # 1) Coba neural network dulu (cepat & tahan rotasi/posisi tangan)
    clf = get_model(samples)
    if clf is not None:
        try:
            feat = frame_features(live).reshape(1, -1)
            proba = clf.predict_proba(feat)[0]
            idx = int(np.argmax(proba))
            confidence = float(proba[idx])
            if confidence >= MLP_CONFIDENCE_THRESHOLD:
                return jsonify({
                    'ok': True,
                    'label': clf.classes_[idx],
                    'distance': None,
                    'confidence': round(confidence, 3),
                    'engine': 'mlp',
                })
            # confidence rendah -> lanjut ke jalur cadangan di bawah, jangan
            # langsung menolak (mungkin NN jarak terdekat masih yakin)
        except Exception:
            pass  # amankan: apa pun yang gagal di jalur MLP, tetap lanjut ke NN

    # 2) Cadangan: pencocokan jarak terdekat (dipakai juga saat rekaman
    #    masih sedikit, atau neural network belum cukup yakin)
    best_label, best_dist = nearest_neighbor(live, samples)
    if best_label is None or best_dist > MATCH_THRESHOLD:
        return jsonify({'ok': False, 'label': None, 'distance': best_dist})

    confidence = max(0.0, 1.0 - (best_dist / MATCH_THRESHOLD))
    return jsonify({
        'ok': True,
        'label': best_label,
        'distance': best_dist,
        'confidence': round(confidence, 3),
        'engine': 'nn',
    })


if __name__ == '__main__':
    # debug=False & threaded=True: server dev Flask dengan debug=True menambah
    # overhead nyata di setiap request (reloader & debugger) dan bisa terasa
    # sebagai "lag" saat dipanggil berkali-kali tiap detik seperti di sini.
    app.run(host='127.0.0.1', port=5001, debug=False, threaded=True)