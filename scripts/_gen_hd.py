# scripts/_gen_hd.py — Encode des variantes HD (dest/ images/hd + backgrounds/hd).
# Mapping vérifié par mad multi-frames (<12) sur 3 instants. crf 21, cap 1080/1920,
# faststart (streaming distant pour l'APK qui ne bundle PAS ces fichiers).
import subprocess, os, json

BIN = r"C:\Users\tsall\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin"
FF = os.path.join(BIN, "ffmpeg.exe")
N = r"C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space"
DL = r"C:\Users\tsall\Downloads"

# dest_rel -> (source, 'v' vertical | 'h' horizontal)
MAP = {
    "images/hd/analyse-des-zodiaque1.mp4": (os.path.join(DL, "des-zodiaque1.mp4"), "h"),
    "images/hd/analyse-runes1.mp4": (os.path.join(DL, "runes1.mp4"), "h"),
    "images/hd/analyse-runes2.mp4": (os.path.join(DL, "runes2.mp4"), "h"),
    "images/hd/analyse-runes3.mp4": (os.path.join(DL, "runes3.mp4"), "h"),
    "images/hd/analyse-runes4.mp4": (os.path.join(DL, "runes4.mp4"), "h"),
    "images/hd/analyse-runes5.mp4": (os.path.join(DL, "runes5.mp4"), "h"),
    "images/hd/analyse-tarot1.mp4": (os.path.join(DL, "tarot.mp4"), "v"),
    "images/hd/analyse-tarot2.mp4": (os.path.join(DL, "analyse-tarot2.mp4"), "v"),
    "images/hd/analyse-tarot3.mp4": (os.path.join(DL, "tarot3.mp4"), "v"),
    "images/hd/analyse-yi-jing-h1.mp4": (os.path.join(DL, "minimax-h3-max_b_Perfect_looping_cycl.mp4"), "h"),
    "images/hd/analyse-yi-jing4.mp4": (os.path.join(DL, "Image to video_08_28_1335.mp4"), "v"),
    "images/hd/analyse-yi-jing5.mp4": (os.path.join(DL, "Image to video_08_28_1303 (online-video-cutter.com).mp4"), "v"),
    "images/hd/analyse-yi-jing6.mp4": (os.path.join(DL, "Image to video_08_28_1321.mp4"), "v"),
    "backgrounds/hd/yi-jing-bg1.mp4": (os.path.join(DL, "Image to video_09_07_1658.mp4"), "v"),
}

VF = {
    "v": "scale=1080:1920:force_original_aspect_ratio=decrease:force_divisible_by=2",
    "h": "scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2",
}

report = {}
for dest_rel, (src, orient) in MAP.items():
    if not os.path.exists(src):
        report[dest_rel] = "SOURCE MANQUANTE"; continue
    dest = os.path.join(N, "public", dest_rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    cmd = [FF, "-v", "error", "-y", "-i", src, "-vf", VF[orient],
           "-c:v", "libx264", "-crf", "21", "-preset", "slow",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", dest]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        report[dest_rel] = "ERR " + (r.stderr or "")[-200:]
    else:
        report[dest_rel] = f"OK {os.path.getsize(dest)//1024} Ko"
print(json.dumps(report, indent=1, ensure_ascii=False))
