import sys, glob, os
from PIL import Image, ImageDraw
src, out, cols, scale = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
names = sys.argv[5:]
ims = [Image.open(os.path.join(src, n + '.png')).convert('RGB') for n in names]
w, h = int(ims[0].width * scale), int(ims[0].height * scale)
rows = (len(ims) + cols - 1) // cols
M = Image.new('RGB', (cols * (w + 8), rows * (h + 8)), (120, 120, 120))
for k, im in enumerate(ims):
    M.paste(im.resize((w, h), Image.LANCZOS), ((k % cols) * (w + 8), (k // cols) * (h + 8)))
M.save(out); print(out, M.size)
