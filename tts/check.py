"""Contrôle qualité des voix : retranscrit chaque réplique avec Whisper et la compare au texte prévu.
Signale les répliques mal prononcées, coupées ou trop longues (bruits parasites en fin de phrase)."""
import difflib, json, os, re, sys, unicodedata, wave

HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.dirname(HERE)
OUT = os.path.join(STUDIO, "out", "voices")


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9 ]+", " ", s).split()


def main():
    from faster_whisper import WhisperModel
    lines = json.load(open(os.path.join(STUDIO, "dialogue.json"), encoding="utf-8"))["lines"]
    model = WhisperModel("small", device="cpu", compute_type="int8")
    report, bad = [], []
    for L in lines:
        name = f'{L["id"]}_0' if L["who"] == "choeur" else L["id"]
        f = os.path.join(OUT, name + ".wav")
        with wave.open(f) as w:
            dur = w.getnframes() / w.getframerate()
        segs, _ = model.transcribe(f, language="fr", beam_size=5, vad_filter=False)
        heard = " ".join(s.text.strip() for s in segs)
        want, got = norm(L.get("say") or L["text"]), norm(heard)
        score = difflib.SequenceMatcher(None, want, got).ratio()
        expected = 0.35 + 0.075 * len(L["text"])
        flag = score < 0.7 or dur > 2.2 * expected + 0.4
        report.append({"id": L["id"], "dur": round(dur, 2), "score": round(score, 2), "heard": heard, "flag": flag})
        if flag:
            bad.append(L["id"])
        print(f'{"!!" if flag else "ok"} {L["id"]:4} {dur:5.2f}s  {score:.2f}  « {heard} »', flush=True)
    json.dump(report, open(os.path.join(STUDIO, "out", "voice-check.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("A REFAIRE:", " ".join(bad) if bad else "aucune")


if __name__ == "__main__":
    main()
