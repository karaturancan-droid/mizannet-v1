import math
from PIL import Image, ImageDraw

SS = 4  # supersample factor

BLUE = (0, 123, 255)      # 007BFF Gok Mavisi
BLUE_TOP = (61, 155, 255)
GRAY = (189, 189, 189)    # BDBDBD Platin Gri
GRAY_TOP = (207, 207, 207)

PTS = [(120, 384), (120, 152), (256, 258), (392, 152), (392, 384)]
W = 64.0
DIAMOND = [(256, 48), (300, 92), (256, 136), (212, 92)]


def _line_intersect(p1, d1, p2, d2):
    # solve p1 + t*d1 = p2 + s*d2
    denom = d1[0] * (-d2[1]) - (-d2[0]) * d1[1]
    if abs(denom) < 1e-9:
        return p1
    t = ((p2[0] - p1[0]) * (-d2[1]) - (-(d2[0])) * (p2[1] - p1[1])) / denom
    return (p1[0] + t * d1[0], p1[1] + t * d1[1])


def stroke_polyline(points, w):
    h = w / 2.0
    segs = []
    for i in range(len(points) - 1):
        a, b = points[i], points[i + 1]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy)
        ux, uy = dx / L, dy / L
        nx, ny = -uy, ux
        segs.append((a, b, (ux, uy), (nx, ny)))

    left, right = [], []
    for i, (a, b, u, n) in enumerate(segs):
        if i == 0:
            l0 = (a[0] + n[0] * h, a[1] + n[1] * h)
            r0 = (a[0] - n[0] * h, a[1] - n[1] * h)
        else:
            _, _, u_p, n_p = segs[i - 1]
            p_l = (a[0] + n_p[0] * h, a[1] + n_p[1] * h)
            p_r = (a[0] - n_p[0] * h, a[1] - n_p[1] * h)
            l0 = _line_intersect(p_l, u, a[0] + n[0] * h, n)
            r0 = _line_intersect(p_r, u, a[0] - n[0] * h, n)
        if i == len(segs) - 1:
            l1 = (b[0] + n[0] * h, b[1] + n[1] * h)
            r1 = (b[0] - n[0] * h, b[1] - n[1] * h)
        else:
            _, _, u_n, n_n = segs[i + 1]
            q = (b[0], b[1])
            l1 = _line_intersect(l0, u, q[0] + n_n[0] * h, n_n)
            r1 = _line_intersect(r0, u, q[0] - n_n[0] * h, n_n)
        left += [l0, l1]
        right += [r1, r0]

    right.reverse()
    return left + right


def transform(poly, scale, cx, cy, tx, ty):
    return [((p[0] - cx) * scale + tx, (p[1] - cy) * scale + ty) for p in poly]


def draw_mark(img, scale, tx, ty, clip_blue_y=None, gray_only_below=None):
    """Draw M mark. Coordinates in 512 space -> mapped by scale/tx/ty."""
    draw = ImageDraw.Draw(img)
    poly = stroke_polyline(PTS, W)
    dia = [p for p in DIAMOND]
    cx, cy = 256.0, 232.0  # content center of 512-space mark

    def tp(p):
        return ((p[0] - cx) * scale + tx, (p[1] - cy) * scale + ty)

    poly_t = [tp(p) for p in poly]
    dia_t = [tp(p) for p in dia]

    if gray_only_below is None:
        draw.polygon(poly_t, fill=GRAY)
        draw.polygon(dia_t, fill=GRAY)
        return

    # split: gray part below clip line, blue part above
    ycut = (gray_only_below - cy) * scale + ty
    # gray: full shape masked to y >= ycut
    m_gray = Image.new("L", img.size, 0)
    ImageDraw.Draw(m_gray).polygon(poly_t, fill=255)
    band = Image.new("L", img.size, 0)
    ImageDraw.Draw(band).rectangle([0, int(ycut), img.size[0], img.size[1]], fill=255)
    gray_layer = Image.new("RGBA", img.size, GRAY + (0,))
    img.paste(Image.merge("RGBA", (*GRAY, Image.new("L", img.size, 255))), (0, 0), Image.eval(Image.composite(band, Image.new("L", img.size, 0), band), lambda x: x))
    # simpler: draw with masks manually
    _paste_color(img, poly_t, GRAY, lambda xy: xy[1] >= ycut)
    _paste_color(img, [[tx + (p[0] - cx) * scale, ty + (p[1] - cy) * scale] for p in DIAMOND], GRAY, lambda xy: True)
    _paste_color(img, poly_t, BLUE, lambda xy: xy[1] < ycut)


def _paste_color(img, poly, color, pred):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).polygon(poly, fill=255)
    if pred:
        cut = Image.new("L", img.size, 0)
        dc = ImageDraw.Draw(cut)
        for y in range(img.size[1]):
            for x in range(0, img.size[0], 64):
                pass
        # vectorized-ish: zero rows failing predicate
        import numpy as np
        arr = np.array(cut)
        ys, xs = np.mgrid[0:img.size[1], 0:img.size[0]]
        keep = np.vectorize(lambda y: pred((0, y)))(ys)
        arr = np.where(keep, 255, 0).astype("uint8")
        cut = Image.fromarray(arr)
        mask = Image.composite(mask, Image.new("L", img.size, 0), cut)
    layer = Image.new("RGBA", img.size, color + (255,))
    img.paste(layer, (0, 0), mask)


def make_mark_512():
    size = 512 * SS
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = SS * (512 / 512)
    poly = [tuple(v * s for v in p) for p in stroke_polyline(PTS, W)]
    dia = [tuple(v * s for v in p) for p in DIAMOND]
    # gray below y=264, blue above
    _paste_color(img, poly, GRAY, lambda xy: xy[1] >= 264 * s)
    _paste_color(img, poly, BLUE, lambda xy: xy[1] < 264 * s)
    _paste_color(img, dia, GRAY, None)
    return img.resize((512, 512), Image.LANCZOS)


def rounded_gradient_bg(size, radius, top=(255, 255, 255), bottom=(234, 242, 250)):
    import numpy as np
    arr = np.zeros((size, size, 4), dtype="uint8")
    t = np.linspace(0, 1, size)[:, None, None]
    grad = (1 - t) * np.array(top) + t * np.array(bottom)
    arr[..., :3] = grad.astype("uint8")
    arr[..., 3] = 255
    img = Image.fromarray(arr, "RGBA")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    img.putalpha(mask)
    return img


def make_app_icon(size=1024):
    img = rounded_gradient_bg(size, int(size * 0.22))
    draw = ImageDraw.Draw(img)
    s = size / 512.0
    poly = [tuple(v * s for v in p) for p in stroke_polyline(PTS, W)]
    dia = [tuple(v * s for v in p) for p in DIAMOND]
    scale2 = SS  # supersample whole icon instead
    big = Image.new("RGBA", (size * 2, size * 2), (0, 0, 0, 0))
    bg2 = rounded_gradient_bg(size * 2, int(size * 2 * 0.22))
    poly2 = [tuple(v * 2 for v in p) for p in poly]
    dia2 = [tuple(v * 2 for v in p) for p in dia]
    _paste_color(bg2, poly2, GRAY, lambda xy: xy[1] >= 264 * 2 * s)
    _paste_color(bg2, poly2, BLUE, lambda xy: xy[1] < 264 * 2 * s)
    _paste_color(bg2, dia2, GRAY, None)
    return bg2.resize((size, size), Image.LANCZOS)


def main():
    mark = make_mark_512()
    mark.save(r"D:\madenapp\brand\mizannet-mark.png")

    icon = make_app_icon(1024)
    icon.save(r"D:\madenapp\src-tauri\app-icon.png")
    icon.resize((512, 512), Image.LANCZOS).save(r"D:\madenapp\public\logo.png")

    # favicon.ico multi-size
    ico_sizes = []
    for px in (16, 24, 32, 48):
        ico_sizes.append(icon.resize((px, px), Image.LANCZOS))
    ico_sizes[2].save(
        r"D:\madenapp\src\app\favicon.ico",
        format="ICO",
        sizes=[(p, p) for p in (16, 24, 32, 48)],
        append_images=[icon.resize((p, p), Image.LANCZOS) for p in (16, 24, 48)],
    )
    icon.resize((256, 256), Image.LANCZOS).save(r"D:\madenapp\public\icon-256.png")
    print("OK")


if __name__ == "__main__":
    main()
