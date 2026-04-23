import base64
import re
import webview
import shutil
from pathlib import Path

STAMPS_DIR = Path("stamps/")
TRASH_DIR = STAMPS_DIR / "trash"


class Api:
    def close_window(self):
        if window:
            window.destroy()

    def _safe_path(self, base: Path, *parts: str) -> Path:
        base_abs = base.resolve()
        target = base_abs.joinpath(*parts).resolve()
        target.relative_to(base_abs)  # бросает ValueError при path traversal
        return target

    def get_categories(self):
        lst_categories = []
        for category in STAMPS_DIR.iterdir():
            if category.is_dir() and category.name != "trash":
                lst_categories.append(category.name)
        return lst_categories

    def get_stamps(self, category):
        lst_stamps = []
        cat_path = self._safe_path(STAMPS_DIR, category)
        if not cat_path.exists():
            return lst_stamps
        for stamp in cat_path.iterdir():
            if stamp.suffix in [".png", ".jpg"]:
                with open(stamp, "rb") as f:
                    img = base64.b64encode(f.read()).decode("utf-8")
                    lst_stamps.append({"name": stamp.name, "image": img})
        return lst_stamps

    def add_stamp(self, category, name, width_cm, height_cm, image_data):
        img = base64.b64decode(image_data)
        img_name = f"{name}_{width_cm}x{height_cm}.png"  # латинская x
        with open(self._safe_path(STAMPS_DIR, category, img_name), "wb") as f:
            f.write(img)

    def delete_stamp(self, category, name):
        file_path = self._safe_path(STAMPS_DIR, category, name)
        trash_path = self._safe_path(TRASH_DIR, category, name)
        trash_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.replace(trash_path)

    def add_category(self, category):
        self._safe_path(STAMPS_DIR, category).mkdir()

    def delete_category(self, category):
        file_path = self._safe_path(STAMPS_DIR, category)
        trash_path = TRASH_DIR / category
        trash_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(file_path, trash_path)

    def get_stamps_from_trash(self, category):
        lst_stamps = []
        cat_path = self._safe_path(TRASH_DIR, category)
        if not cat_path.exists():
            return lst_stamps
        for stamp in cat_path.iterdir():
            if stamp.suffix in [".png", ".jpg"]:
                with open(stamp, "rb") as f:
                    img = base64.b64encode(f.read()).decode("utf-8")
                    lst_stamps.append({"name": stamp.name, "image": img})
        return lst_stamps

    def get_categories_from_trash(self):
        if not TRASH_DIR.exists():
            return []
        lst_categories = []
        for category in TRASH_DIR.iterdir():
            if category.is_dir():
                lst_categories.append(category.name)
        return lst_categories

    def restore_category(self, name):
        src = self._safe_path(TRASH_DIR, name)
        dst = self._safe_path(STAMPS_DIR, name)
        if dst.exists():
            for file in src.iterdir():
                file.replace(dst / file.name)
            src.rmdir()
        else:
            shutil.move(src, dst)

    def delete_category_from_trash(self, name):
        shutil.rmtree(self._safe_path(TRASH_DIR, name))

    def restore_stamp(self, category, name):
        file_path = self._safe_path(TRASH_DIR, category, name)
        dst_path = self._safe_path(STAMPS_DIR, category, name)
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.replace(dst_path)

    def delete_stamp_from_trash(self, category, name):
        self._safe_path(TRASH_DIR, category, name).unlink()

    def empty_trash(self):
        if TRASH_DIR.exists():
            shutil.rmtree(TRASH_DIR)

    def rename_stamp(self, category, old_filename, new_display_name):
        match = re.search(r'(_[\d.]+x[\d.]+)(\.[^.]+)$', old_filename)
        suffix = (match.group(1) + match.group(2)) if match else Path(old_filename).suffix
        new_filename = new_display_name + suffix
        self._safe_path(STAMPS_DIR, category, old_filename).rename(
            self._safe_path(STAMPS_DIR, category, new_filename)
        )
        return new_filename

    def rename_category(self, old_name, new_name):
        self._safe_path(STAMPS_DIR, old_name).rename(
            self._safe_path(STAMPS_DIR, new_name)
        )


api = Api()
window = webview.create_window(
    title="Мастер добавления штампов",
    url=str(Path("ui/index.html").resolve()),
    js_api=api,
)
webview.start(debug=False)
