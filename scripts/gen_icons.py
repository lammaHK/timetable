"""Generate free PWA icons: teal rounded square + white clock glyph."""
from PIL import Image, ImageDraw

TEAL_A = (47, 214, 189)
TEAL_B = (11, 143, 128)


def rounded_rect_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def draw_icon(px):
    img = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    mask = rounded_rect_mask(px, int(px * 0.22))
    # vertical gradient background
    bg = Image.new('RGBA', (px, px))
    d = ImageDraw.Draw(bg)
    for y in range(px):
        t = y / (px - 1)
        c = tuple(int(TEAL_A[i] * (1 - t) + TEAL_B[i] * t) for i in range(3))
        d.line([(0, y), (px, y)], fill=(*c, 255))
    img.paste(bg, (0, 0), mask)

    # white clock
    od = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    dd = ImageDraw.Draw(od)
    cx = cy = px / 2
    r_body = px * 0.30
    sw = max(2, int(px * 0.055))
    dd.ellipse([cx - r_body, cy - r_body, cx + r_body, cy + r_body], outline=(255, 255, 255, 255), width=sw)
    # hands
    hx = cx + 0  # minute toward top
    dd.line([(cx, cy), (cx, cy - r_body * 0.55)], fill=(255, 255, 255, 255), width=sw)
    dd.line([(cx, cy), (cx + r_body * 0.45, cy)], fill=(255, 255, 255, 255), width=sw)
    # center dot
    dd.ellipse([cx - sw, cy - sw, cx + sw, cy + sw], fill=(255, 255, 255, 255))
    img = Image.alpha_composite(img, od)
    return img


def save(name, px):
    draw_icon(px).save(name, 'PNG')
    print('wrote', name, px)


save('public/icon-512.png', 512)
save('public/icon-192.png', 192)
save('public/apple-touch-icon.png', 180)
