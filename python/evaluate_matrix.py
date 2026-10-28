import json
import numpy as np
import pandas as pd
import mysql.connector
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, classification_report

# 1. Konfigurasi Koneksi ke Database MySQL (Laragon)
db_config = {
    'host': '127.0.0.1',
    'database': 'astakanda',
    'user': 'root',
    'password': ''  # Sesuaikan jika password MySQL Laragon Anda diisi
}

try:
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    
    # Ambil data sampel gestur dari tabel gesture_samples
    cursor.execute("""
        SELECT gesture_words.label, gesture_samples.landmarks 
        FROM gesture_samples 
        JOIN gesture_words ON gesture_samples.gesture_word_id = gesture_words.id
    """)
    rows = cursor.fetchall()
    
    if not rows:
        print("Belum ada data sampel di database! Silakan lakukan perekaman di Mode Belajar terlebih dahulu.")
        exit()

except mysql.connector.Error as err:
    print(f"Gagal terhubung ke Database MySQL: {err}")
    exit()
finally:
    if 'conn' in locals() and conn.is_connected():
        cursor.close()
        conn.close()

# 2. Fungsi Ekstraksi Vektor Landmark (Mereplikasi Logika JavaScript app.js)
ASPECT = 4 / 3
Z_WEIGHT = 0.5

def hand_to_points(hand):
    w = hand[0]
    d = lambda a, b: np.hypot((a['x'] - b['x']) * ASPECT, a['y'] - b['y'])
    scale = (d(hand[0], hand[5]) + d(hand[0], hand[9]) + d(hand[0], hand[17]) + d(hand[5], hand[17])) / 4
    if scale == 0:
        scale = 1e-6
        
    pts = []
    for i in range(1, 21):
        pts.append(((hand[i]['x'] - w['x']) * ASPECT) / scale)
        pts.append((hand[i]['y'] - w['y']) / scale)
        z_val = hand[i].get('z', 0.0) - w.get('z', 0.0)
        pts.append((z_val / scale) * Z_WEIGHT)
    return pts, scale

def build_vector(hands):
    if not hands or not isinstance(hands, list):
        return None
    valid = [h for h in hands if isinstance(h, list) and len(h) == 21]
    if not valid or len(valid) > 2:
        return None
    
    # Urutkan tangan kiri ke kanan berdasarkan koordinat x pergelangan
    valid.sort(key=lambda h: h[0]['x'])
    
    parts = [hand_to_points(h) for h in valid]
    vec = []
    for p, _ in parts:
        vec.extend(p)
        
    if len(parts) == 2:
        s = (parts[0][1] + parts[1][1]) / 2
        vec.append(((valid[1][0]['x'] - valid[0][0]['x']) * ASPECT) / s)
        vec.append(((valid[1][0]['y'] - valid[0][0]['y']) * ASPECT) / s)
        vec.append(0.0)
        
    return np.array(vec, dtype=float)

# 3. Memproses Data Sampel dari Database
dataset = []
for row in rows:
    label = row['label']
    raw_landmarks = row['landmarks']
    
    # Parsing data JSON landmarks dari database
    if isinstance(raw_landmarks, str):
        try:
            frames = json.loads(raw_landmarks)
        except:
            continue
    else:
        frames = raw_landmarks
        
    if not isinstance(frames, list):
        continue
        
    for frame in frames:
        vec = build_vector(frame)
        if vec is not None:
            dataset.append({'label': label, 'vec': vec})

if len(dataset) < 2:
    print("Jumlah sampel valid kurang untuk pengujian matriks.")
    exit()

# 4. Simulasi Evaluasi Pengujian (KNN / Vector Distance Matching)
MATCH_THRESHOLD = 0.30
K_NEAREST = 3

def vec_distance(a, b):
    if len(a) != len(b):
        return float('inf')
    sum_dist = 0
    for i in range(0, len(a), 3):
        dx = a[i] - b[i]
        dy = a[i+1] - b[i+1]
        dz = a[i+2] - b[i+2]
        sum_dist += np.sqrt(dx*dx + dy*dy + dz*dz)
    return sum_dist / (len(a) / 3)

y_true = []
y_pred = []

# Leave-One-Out / Cross-Validation Sederhana antar sampel database
for i, test_sample in enumerate(dataset):
    true_label = test_sample['label']
    test_vec = test_sample['vec']
    
    best = {} # label -> list distance
    for j, train_sample in enumerate(dataset):
        if i == j: 
            continue # Jangan bandingkan dengan diri sendiri
        
        d = vec_distance(test_vec, train_sample['vec'])
        lbl = train_sample['label']
        
        if lbl not in best:
            best[lbl] = []
        best[lbl].append(d)
        
    # Hitung rerata K-Nearest Neighbors
    best_avg_dist = {}
    for lbl, dists in best.items():
        dists.sort()
        k_dists = dists[:K_NEAREST]
        best_avg_dist[lbl] = sum(k_dists) / len(k_dists)
        
    if not best_avg_dist:
        continue
        
    # Cari label dengan jarak terdekat (minimum)
    pred_label = min(best_avg_dist, key=best_avg_dist.get)
    min_dist = best_avg_dist[pred_label]
    
    if min_dist > MATCH_THRESHOLD:
        pred_label = 'TIDAK_DIKENALI'
        
    y_true.append(true_label)
    y_pred.append(pred_label)

# 5. Membuat Visualisasi Confusion Matrix menggunakan Seaborn
labels_unique = sorted(list(set(y_true + y_pred)))
cm = confusion_matrix(y_true, y_pred, labels=labels_unique)

plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=labels_unique, yticklabels=labels_unique)

plt.title('Confusion Matrix - Pengenalan Gestur ASTAKANDA', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('Predicted Label', fontsize=12)
plt.ylabel('True Label', fontsize=12)
plt.tight_layout()

# Simpan gambar output otomatis
output_filename = 'confusion_matrix_astakanda.png'
plt.savefig(output_filename, dpi=300)
print(f"Berhasil! Grafik Confusion Matrix telah disimpan sebagai '{output_filename}'")

# Cetak laporan teks ringkas ke terminal
print("\n--- LAPORAN KLASIFIKASI ---")
print(classification_report(y_true, y_pred, zero_division=0))

# Tampilkan plot secara interaktif jika diinginkan
plt.show()