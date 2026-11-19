"""Découpe une prise ElevenLabs (plusieurs répliques à la suite) en une réplique par fichier.
Whisper donne l'horodatage de chaque mot ; on aligne ces mots sur le texte attendu, réplique par réplique,
puis on coupe dans les silences. Avec plusieurs prises, on garde la meilleure prise pour chaque réplique.
Usage : python -I tts\\split.py m02,m03b,... prise1.mp3 [prise2.mp3 ...]"""
import difflib, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from check import norm  # noqa: E402

STUDIO = os.path.dirname(HERE)
OUT = os.path.join(STUDIO, "out", "voices")
FFMPEG = os.path.join(STUDIO, "node_modules", "ffmpeg-static", "ffmpeg.exe")


def align(model, path, ids, lines, prompt):
    segs, _ = model.transcribe(path, language="fr", beam_size=5, word_timestamps=True, initial_prompt=prompt)
    words = [(w.word, w.start, w.end) for s in segs for w in s.words]
    heard = []  # (mot normalisé, index du mot whisper)
    for i, (w, _, _) in enumerate(words):
        for t in norm(w):
            heard.append((t, i))
    want = []  # (mot normalisé, id de réplique)
    for lid in ids:
        L = lines[lid]
        for t in norm(L.get("say") or L["text"]):
            want.append((t, lid))
    sm = difflib.SequenceMatcher(None, [w for w, _ in want], [h for h, _ in heard], autojunk=False)
    hit = {lid: [] for lid in ids}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            hit[want[a + k][1]].append(heard[b + k][1])
    res = {}
    for lid in ids:
        idx = hit[lid]
        if not idx:
            continue
        n_want = len(norm(lines[lid].get("say") or lines[lid]["text"]))
        res[lid] = {"start": words[min(idx)][1], "end": words[max(idx)][2], "score": len(idx) / max(1, n_want)}
    # bornes : pas de chevauchement avec la réplique voisine
    order = [l for l in ids if l in res]
    for a, b in zip(order, order[1:]):
        mid = (res[a]["end"] + res[b]["start"]) / 2
        res[a]["cut_end"] = min(res[a]["end"] + 0.25, mid)
        res[b]["cut_start"] = max(res[b]["start"] - 0.12, mid)
    for lid in order:
        res[lid].setdefault("cut_start", max(0, res[lid]["start"] - 0.12))
        res[lid].setdefault("cut_end", res[lid]["end"] + 0.25)
    return res


def main():
    from faster_whisper import WhisperModel
    ids = sys.argv[1].split(",")
    takes = sys.argv[2:]
    dlg = json.load(open(os.path.join(STUDIO, "dialogue.json"), encoding="utf-8"))
    lines = {L["id"]: L for L in dlg["lines"]}
    prompt = dlg.get("prompt_whisper", "Dialogue en français.")  # aide Whisper avec les noms propres
    model = WhisperModel("medium", device="cpu", compute_type="int8")
    best = {}
    for tk in takes:
        for lid, r in align(model, tk, ids, lines, prompt).items():
            print(f"{os.path.basename(tk)} {lid:5} {r['score']:.2f}  {r['start']:.2f}-{r['end']:.2f}", flush=True)
            if lid not in best or r["score"] > best[lid][1]["score"]:
                best[lid] = (tk, r)
    os.makedirs(OUT, exist_ok=True)
    for lid in ids:
        if lid not in best:
            print("!! introuvable :", lid)
            continue
        tk, r = best[lid]
        wav = os.path.join(OUT, lid + ".wav")
        dur = r["cut_end"] - r["cut_start"]
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", f"{r['cut_start']:.3f}", "-t", f"{dur:.3f}", "-i", tk,
                        "-af", "afade=t=in:d=0.02,areverse,afade=t=in:d=0.06,areverse", "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", wav], check=True)
        open(os.path.join(OUT, lid + ".key"), "w").write("eleven-web:" + os.path.basename(tk))
        print(f"-> {lid:5} {os.path.basename(tk)}  {dur:.2f}s  score {r['score']:.2f}")


if __name__ == "__main__":
    main()
