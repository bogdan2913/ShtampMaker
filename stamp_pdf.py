import pymupdf as pdf
import os
from PIL import Image

file = '12.pdf'
stamp = 'stamps/1.png'


def get_stamp_size():
    with Image.open(stamp) as img:
        img.load()
        img.show()
        print(img.size)


get_stamp_size()


# with pdf.open(file) as doc:
#     page = doc[-1]
#     # print(page.rect)
#     stamp_rect = pdf.Rect(page.rect.x1 - 150, page.rect.y1 - 150, page.rect.x1 - 20, page.rect.y1 - 20)
#     page.insert_image(stamp_rect, filename=stamp)
#     doc.save(file+"_temp")

# os.replace(file+"_temp", file)

