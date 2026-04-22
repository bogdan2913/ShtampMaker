import base64
import webview
import shutil
from pathlib import Path

STAMPS_DIR = Path("stamps/")
TRASH_DIR = STAMPS_DIR / "trash" # это тоже объект Path, / - конкатенация в Path


class Api:
    def close_window(self):
        if window:
            window.destroy()

    def get_categories(self):
        directory = STAMPS_DIR.iterdir()
        lst_categories = []

        for category in directory:
            if category.is_dir():
                if category.name == "trash": # пропускаем корзину, не добавляем её в список категорий
                    continue
                lst_categories.append(category.name)
        return lst_categories

    def get_stamps(self, category):
        lst_stamps = []
        category = (STAMPS_DIR / category).iterdir()  # конкатенация в Path /

        for stamp in category:
            if stamp.suffix in [".png", ".jpg"]:

                with open(stamp, "rb") as bin_f:
                    str_ = bin_f.read()
                    img = base64.b64encode(str_).decode("utf-8")
                    lst_stamps.append({"name": stamp.name, "image": img})

        return lst_stamps

    def add_stamp(self, category, name, width_cm, height_cm, image_data):
        img = base64.b64decode(image_data)
        img_name = name + "_" + width_cm + "х" + height_cm + ".png"

        with open(STAMPS_DIR / category / img_name, "wb") as f:
            f.write(img)

    def delete_stamp(self, category, name):
        file_path = STAMPS_DIR / category / name
        trash_path = TRASH_DIR / category / name
        trash_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.replace(trash_path)


    def add_category(self, category):
        file_path = STAMPS_DIR / category
        file_path.mkdir()

    def delete_category(self, category):
        file_path = STAMPS_DIR / category
        trash_path = TRASH_DIR / category
        trash_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.replace(trash_path)


    def get_stamps_from_trash(self, category):
        lst_stamps = []
        category = (TRASH_DIR / category).iterdir()  # конкатенация в Path /

        for stamp in category:
            if stamp.suffix in [".png", ".jpg"]:

                with open(stamp, "rb") as bin_f:
                    str_ = bin_f.read()
                    img = base64.b64encode(str_).decode("utf-8")
                    lst_stamps.append({"name": stamp.name, "image": img})
        return lst_stamps
    
    def restore_stamp(self, category, name):
        file_path = TRASH_DIR / category / name
        trash_path = STAMPS_DIR / category / name
        trash_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.replace(trash_path)
    

    def delete_stamp_from_trash(self, category, name):
        file_path = TRASH_DIR / category / name
        file_path.unlink()
        
    def empty_trash(self):
        shutil.rmtree(TRASH_DIR)

    
api = Api()
window = webview.create_window(
    title="Мастер добавления штампов",
    url=str(Path("ui/index.html").resolve()),
    js_api=api,
)
webview.start(debug=False)
