"""
MizanNet Resmi Marka Varlıkları Oluşturucu
Kullanıcının ilettiği Teknik Izgara İnşaatı ve Birincil Renk Paleti kılavuzuna (MizanNet_brand_kit_version_one_20260919151117.jpeg)
birebir sadık kalarak vektörel (SVG) ve çoklu çözünürlüklü (PNG/ICO/ICNS) marka varlıklarını üretir.

Renkler:
- Gök Mavisi: #237CC8
- Platin Gri: #BDBDBD
- Platin Gri (Gölge): #9AA1A8
- Kontur: #1E293B
"""

import math
import os
from PIL import Image, ImageDraw, ImageFont

s = 1.0 / math.sqrt(3) # tan(30) = 0.5773502691896257

def get_polygons(size=512.0):
    scale = size / 512.0
    cx = size / 2.0
    
    W = 184.0 * scale
    w_leg = 46.0 * scale
    w_in = W - w_leg # 138.0 * scale
    gap = 20.0 * scale
    
    # 1. TOP DIAMOND
    w_dia = 96.0 * scale
    h_dia = w_dia * s
    y_dia_top = 46.0 * scale
    y_dia_mid = y_dia_top + h_dia
    y_dia_bot = y_dia_top + 2 * h_dia
    
    diamond = [
        (cx, y_dia_top),
        (cx + w_dia, y_dia_mid),
        (cx, y_dia_bot),
        (cx - w_dia, y_dia_mid)
    ]
    
    # 2. BLUE M
    y_blue_top_v = y_dia_bot + gap
    y_blue_peak = y_blue_top_v - w_in * s
    y_blue_outer_top = y_blue_peak + w_leg * s
    
    y_blue_inner_v = y_blue_top_v + w_leg
    y_blue_inner_shoulder = y_blue_peak + w_leg
    
    y_base_outer = y_blue_outer_top + 206.0 * scale
    y_blue_inner_bot = y_base_outer + w_leg * s
    
    blue_m = [
        (cx - W, y_blue_outer_top),
        (cx - w_in, y_blue_peak),
        (cx, y_blue_top_v),
        (cx + w_in, y_blue_peak),
        (cx + W, y_blue_outer_top),
        (cx + W, y_base_outer),
        (cx + w_in, y_blue_inner_bot),
        (cx + w_in, y_blue_inner_shoulder),
        (cx, y_blue_inner_v),
        (cx - w_in, y_blue_inner_shoulder),
        (cx - w_in, y_blue_inner_bot),
        (cx - W, y_base_outer),
    ]
    
    # 3. BOTTOM CHEVRON
    y_chev_outer_top = y_base_outer + gap
    h_chev = w_leg
    y_chev_outer_bot = y_chev_outer_top + h_chev
    
    y_chev_top_v = y_chev_outer_top + W * s
    y_chev_bot_tip = y_chev_outer_bot + W * s
    
    chevron = [
        (cx - W, y_chev_outer_top),
        (cx, y_chev_top_v),
        (cx + W, y_chev_outer_top),
        (cx + W, y_chev_outer_bot),
        (cx, y_chev_bot_tip),
        (cx - W, y_chev_outer_bot),
    ]
    
    # 4. INNER M
    w_im_out = w_in - gap
    w_im_leg = 42.0 * scale
    w_im_in = w_im_out - w_im_leg
    
    y_im_top_v = y_blue_inner_v + gap
    w_im_peak = w_im_out - 14.0 * scale
    y_im_peak = y_im_top_v - w_im_peak * s
    y_im_outer_top = y_im_peak + 14.0 * scale * s
    
    y_im_outer_bot = y_base_outer + (W - w_im_out) * s
    y_im_inner_bot = y_im_outer_bot + w_im_leg * s
    
    y_im_apex = y_im_top_v + 36.0 * scale
    h_vert = 40.0 * scale
    y_im_cutout_corner = y_im_inner_bot - h_vert
    
    inner_m = [
        (cx - w_im_out, y_im_outer_top),
        (cx - w_im_peak, y_im_peak),
        (cx, y_im_top_v),
        (cx + w_im_peak, y_im_peak),
        (cx + w_im_out, y_im_outer_top),
        (cx + w_im_out, y_im_outer_bot),
        (cx + w_im_in, y_im_inner_bot),
        (cx + w_im_in, y_im_cutout_corner),
        (cx, y_im_apex),
        (cx - w_im_in, y_im_cutout_corner),
        (cx - w_im_in, y_im_inner_bot),
        (cx - w_im_out, y_im_outer_bot),
    ]
    
    return diamond, blue_m, inner_m, chevron

def pts_str(pts):
    return " ".join(f"{x:.2f},{y:.2f}" for x, y in pts)

def make_svg_mark(stroke="#1E293B", stroke_w=3):
    d, bm, im, ch = get_polygons(512)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- MizanNet Resmi Logo Markası - Teknik İzometrik Kılavuz İnşaatı -->
  <polygon points="{pts_str(ch)}" fill="#BDBDBD" stroke="{stroke}" stroke-width="{stroke_w}" stroke-linejoin="round"/>
  <polygon points="{pts_str(im)}" fill="#9AA1A8" stroke="{stroke}" stroke-width="{stroke_w}" stroke-linejoin="round"/>
  <polygon points="{pts_str(bm)}" fill="#237CC8" stroke="{stroke}" stroke-width="{stroke_w}" stroke-linejoin="round"/>
  <polygon points="{pts_str(d)}" fill="#BDBDBD" stroke="{stroke}" stroke-width="{stroke_w}" stroke-linejoin="round"/>
</svg>"""

def make_svg_full_light():
    # Logo for dark/blue sidebar (bg = #237CC8)
    d, bm, im, ch = get_polygons(512)
    scale = 36.0 / 512.0
    def t(pts):
        return " ".join(f"{4 + x * scale:.2f},{6 + y * scale:.2f}" for x, y in pts)
    
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 48" fill="none">
  <!-- Sol Beyaz Rozet -->
  <rect x="2" y="4" width="40" height="40" rx="10" fill="#FFFFFF" fill-opacity="0.96"/>
  <!-- İzometrik Logo Sembolü -->
  <polygon points="{t(ch)}" fill="#BDBDBD" stroke="#1E293B" stroke-width="1.5" stroke-linejoin="round"/>
  <polygon points="{t(im)}" fill="#9AA1A8" stroke="#1E293B" stroke-width="1.5" stroke-linejoin="round"/>
  <polygon points="{t(bm)}" fill="#237CC8" stroke="#1E293B" stroke-width="1.5" stroke-linejoin="round"/>
  <polygon points="{t(d)}" fill="#BDBDBD" stroke="#1E293B" stroke-width="1.5" stroke-linejoin="round"/>
  <!-- Tipografi -->
  <text x="52" y="32" font-family="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="700" font-size="22" letter-spacing="-0.02em" fill="#FFFFFF">Mizan<tspan font-weight="700" fill="#E3F0EE">Net</tspan></text>
</svg>"""

def make_svg_full_dark():
    # Logo for light backgrounds (white/gray)
    d, bm, im, ch = get_polygons(512)
    scale = 38.0 / 512.0
    def t(pts):
        return " ".join(f"{2 + x * scale:.2f},{5 + y * scale:.2f}" for x, y in pts)
    
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 48" fill="none">
  <!-- İzometrik Logo Sembolü -->
  <polygon points="{t(ch)}" fill="#BDBDBD" stroke="#1E293B" stroke-width="1.5" stroke-linejoin="round"/>
  <polygon points="{t(im)}" fill="#9AA1A8" stroke="#1E293B" stroke-width="1.5" stroke-linejoin="round"/>
  <polygon points="{t(bm)}" fill="#237CC8" stroke="#1E293B" stroke-width="1.5" stroke-linejoin="round"/>
  <polygon points="{t(d)}" fill="#BDBDBD" stroke="#1E293B" stroke-width="1.5" stroke-linejoin="round"/>
  <!-- Tipografi -->
  <text x="48" y="32" font-family="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="700" font-size="22" letter-spacing="-0.02em" fill="#0F172A">Mizan<tspan font-weight="700" fill="#237CC8">Net</tspan></text>
</svg>"""

def render_antialiased_image(size=512, bg=None, stroke="#1E293B", stroke_w=3):
    scale = 4
    high_size = size * scale
    d, bm, im, ch = get_polygons(high_size)
    
    img = Image.new("RGBA", (high_size, high_size), (0, 0, 0, 0) if bg is None else bg)
    draw = ImageDraw.Draw(img)
    
    sw = stroke_w * scale
    C_BLUE = "#237CC8"
    C_GRAY = "#BDBDBD"
    C_INNER = "#9AA1A8"
    
    draw.polygon(ch, fill=C_GRAY, outline=stroke, width=sw)
    draw.polygon(im, fill=C_INNER, outline=stroke, width=sw)
    draw.polygon(bm, fill=C_BLUE, outline=stroke, width=sw)
    draw.polygon(d, fill=C_GRAY, outline=stroke, width=sw)
    
    return img.resize((size, size), Image.Resampling.LANCZOS)

def main():
    root = r"D:\madenapp"
    os.chdir(root)
    
    print("MizanNet resmi marka varlıkları üretiliyor...")
    
    # 1. Standalone SVG Marks
    svg_mark = make_svg_mark(stroke="#1E293B", stroke_w=3)
    for p in ["public/logo-mark.svg", "public/mizannet-mark.svg", "public/logo-mark-standalone.svg",
              "brand/logo-mark.svg", "brand/mizannet-mark.svg", "brand/logo-mark-standalone.svg"]:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(svg_mark)
        print("Yazıldı:", p)
    
    # 2. Full Horizontal SVGs
    svg_full_light = make_svg_full_light()
    for p in ["public/mizannet-full-light.svg", "brand/mizannet-full-light.svg", "public/logo-full-light.svg", "brand/logo-full-light.svg"]:
        with open(p, "w", encoding="utf-8") as f:
            f.write(svg_full_light)
        print("Yazıldı:", p)
        
    svg_full_dark = make_svg_full_dark()
    for p in ["public/mizannet-full.svg", "brand/mizannet-full.svg", "public/logo-full.svg", "brand/logo-full.svg"]:
        with open(p, "w", encoding="utf-8") as f:
            f.write(svg_full_dark)
        print("Yazıldı:", p)

    # 3. Master 1024x1024 PNG
    im_1024 = render_antialiased_image(1024)
    im_1024.save("public/logo.png", "PNG")
    im_1024.save("src-tauri/app-icon.png", "PNG")
    print("1024x1024 PNG kaydedildi: public/logo.png, src-tauri/app-icon.png")

    # 4. 512x512 PNG
    im_512 = render_antialiased_image(512)
    im_512.save("public/logo-mark.png", "PNG")
    im_512.save("public/mizannet-mark.png", "PNG")
    im_512.save("brand/logo-mark.png", "PNG")
    im_512.save("brand/mizannet-mark.png", "PNG")
    im_512.save("src-tauri/icons/icon.png", "PNG")
    print("512x512 PNG kaydedildi: public/logo-mark.png, src-tauri/icons/icon.png vb.")

    # 5. Icons for tauri and web
    im_256 = im_1024.resize((256, 256), Image.Resampling.LANCZOS)
    im_256.save("src-tauri/icons/128x128@2x.png", "PNG")

    im_128 = im_1024.resize((128, 128), Image.Resampling.LANCZOS)
    im_128.save("src-tauri/icons/128x128.png", "PNG")

    im_64 = im_1024.resize((64, 64), Image.Resampling.LANCZOS)
    im_64.save("src-tauri/icons/64x64.png", "PNG")

    im_32 = im_1024.resize((32, 32), Image.Resampling.LANCZOS)
    im_32.save("src-tauri/icons/32x32.png", "PNG")

    # Windows Store and Square logos
    square_sizes = [
        ("Square30x30Logo.png", 30),
        ("Square44x44Logo.png", 44),
        ("Square71x71Logo.png", 71),
        ("Square89x89Logo.png", 89),
        ("Square107x107Logo.png", 107),
        ("Square142x142Logo.png", 142),
        ("Square150x150Logo.png", 150),
        ("Square284x284Logo.png", 284),
        ("Square310x310Logo.png", 310),
        ("StoreLogo.png", 50),
    ]
    for name, s_px in square_sizes:
        p_sq = im_1024.resize((s_px, s_px), Image.Resampling.LANCZOS)
        p_sq.save(os.path.join("src-tauri/icons", name), "PNG")
    print("Kare ve mağaza ikonları güncellendi.")

    # 6. Windows ICO and Favicon
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    im_1024.save("src-tauri/icons/icon.ico", format="ICO", sizes=ico_sizes)
    print("src-tauri/icons/icon.ico oluşturuldu.")

    fav_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    im_1024.save("src/app/favicon.ico", format="ICO", sizes=fav_sizes)
    im_1024.save("public/favicon.ico", format="ICO", sizes=fav_sizes)
    print("Favicon dosyaları güncellendi.")

    # 7. Horizontal full logo PNG for brand folder
    im_full_dark = Image.new("RGBA", (480, 96), (255, 255, 255, 0))
    d_full = ImageDraw.Draw(im_full_dark)
    mark_thumb = im_512.resize((80, 80), Image.Resampling.LANCZOS)
    im_full_dark.paste(mark_thumb, (8, 8), mark_thumb)
    try:
        fnt_bold = ImageFont.truetype("arialbd.ttf", 44)
    except:
        fnt_bold = ImageFont.load_default()
    d_full.text((104, 24), "MizanNet", fill="#0F172A", font=fnt_bold)
    im_full_dark.save("public/logo-full.png", "PNG")
    im_full_dark.save("brand/logo-full.png", "PNG")
    print("public/logo-full.png ve brand/logo-full.png oluşturuldu.")

    print("\nTüm varlıklar başarıyla üretildi!")

if __name__ == "__main__":
    main()
