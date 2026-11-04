import json, os, sys, urllib.request, urllib.error

ENV = "/Volumes/TRANSCEND/PNC_Soft_Tech/Dorjee/.env"
HERE = os.path.dirname(os.path.abspath(__file__))
key = None
for line in open(ENV, encoding="utf-8"):
    line = line.strip()
    if line.startswith("ELEVEN_LABS_API_KEY="):
        key = line.split("=", 1)[1].strip().strip('"').strip("'")
if not key:
    sys.exit("no key")

VOICE = "nPczCjzI2devNBz1zQrb"
os.makedirs(os.path.join(HERE, "audio"), exist_ok=True)
only = sys.argv[1:]
for s in json.load(open(os.path.join(HERE, "script.json"), encoding="utf-8")):
    if only and s["id"] not in only:
        continue
    body = json.dumps({
        "text": s["text"],
        "model_id": "eleven_v4",
        "language_code": "bn",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.2, "speed": 1.0},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128",
        data=body, headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            open(os.path.join(HERE, "audio", s["id"] + ".mp3"), "wb").write(r.read())
        print("ok", s["id"])
    except urllib.error.HTTPError as e:
        print("ERR", s["id"], e.code, e.read().decode()[:400])
        sys.exit(1)
