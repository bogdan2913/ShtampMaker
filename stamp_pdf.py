import sys
import re
import base64
import webview
import pymupdf
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
STAMPS_DIR = SCRIPT_DIR / "stamps"
CM_TO_PT   = 28.3465
MARGIN_PT  = 20


# ─── Простановка штампа ─────────────────────────────────────────────────────

def apply_stamp_to_pdf(pdf_path: str, stamp_path: str) -> None:
    stamp = Path(stamp_path)
    match = re.search(r'_([\d.]+)x([\d.]+)\.[^.]+$', stamp.name)
    if match:
        w_pt = float(match.group(1)) * CM_TO_PT
        h_pt = float(match.group(2)) * CM_TO_PT
    else:
        w_pt, h_pt = 150.0, 60.0

    tmp = pdf_path + ".tmp"
    with pymupdf.open(pdf_path) as doc:
        page = doc[0]
        r = page.rect
        rect = pymupdf.Rect(
            r.x1 - MARGIN_PT - w_pt,
            r.y0 + MARGIN_PT,
            r.x1 - MARGIN_PT,
            r.y0 + MARGIN_PT + h_pt,
        )
        page.insert_image(rect, filename=str(stamp))
        doc.save(tmp)

    Path(tmp).replace(pdf_path)


# ─── API для пикера ─────────────────────────────────────────────────────────

class Api:
    def __init__(self, pdf_files: list[str]):
        self._pdfs = pdf_files

    def get_categories(self) -> list[str]:
        if not STAMPS_DIR.exists():
            return []
        return [d.name for d in STAMPS_DIR.iterdir()
                if d.is_dir() and d.name != "trash"]

    def get_stamps(self, category: str) -> list[dict]:
        result = []
        cat_path = STAMPS_DIR / category
        if not cat_path.exists():
            return result
        for f in cat_path.iterdir():
            if f.suffix in (".png", ".jpg"):
                img = base64.b64encode(f.read_bytes()).decode()
                result.append({"name": f.name, "path": str(f), "image": img})
        return result

    def apply(self, stamp_path: str) -> str:
        errors = []
        for pdf in self._pdfs:
            try:
                apply_stamp_to_pdf(pdf, stamp_path)
            except Exception as e:
                errors.append(f"{Path(pdf).name}: {e}")
        if errors:
            return "\n".join(errors)
        window.destroy()
        return ""

    def cancel(self) -> None:
        window.destroy()


# ─── Точка входа ────────────────────────────────────────────────────────────

pdf_files = sys.argv[1:]

if not pdf_files:
    sys.exit(0)

n = len(pdf_files)
suffix = ("ов" if n % 10 in (0, 5, 6, 7, 8, 9) or 11 <= n % 100 <= 19
          else ("а" if n % 10 in (2, 3, 4) else ""))
title = f"Поставить штамп — {n} файл{suffix}"

api = Api(pdf_files)
window = webview.create_window(
    title=title,
    url=str((SCRIPT_DIR / "ui" / "picker.html").resolve()),
    js_api=api,
    width=640,
    height=480,
    resizable=False,
)
webview.start(debug=False)
