#!/usr/bin/env python3
# Regenerate icons/*.png after editing the shapes below.

from pathlib import Path

from PIL import Image, ImageDraw

SUPERSAMPLE = 1024
SIZES = (16, 32, 48, 128)
OUT_DIR = Path(__file__).resolve().parent.parent / "icons"

BLUE = (26, 115, 232, 255)
GHOST = (255, 255, 255, 105)
SOLID = (255, 255, 255, 255)


def draw_master() -> Image.Image:
    s = SUPERSAMPLE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    unit = s / 1024

    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=225 * unit, fill=BLUE)

    # Two overlapping tabs: the faded one is the duplicate about to go.
    tab = 470 * unit
    radius = 70 * unit
    back = (188 * unit, 218 * unit)
    front = (368 * unit, 398 * unit)

    for origin, fill in ((back, GHOST), (front, SOLID)):
        x, y = origin
        draw.rounded_rectangle([x, y, x + tab, y + tab], radius=radius, fill=fill)
        # Punch a gap so the front tab stays readable against the back one.
        if fill is GHOST:
            continue
        draw.rounded_rectangle(
            [x - 26 * unit, y - 26 * unit, x + tab + 26 * unit, y + tab + 26 * unit],
            radius=radius + 26 * unit,
            outline=BLUE,
            width=int(26 * unit),
        )

    return img


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    master = draw_master()
    for size in SIZES:
        icon = master.resize((size, size), Image.LANCZOS)
        icon.save(OUT_DIR / f"icon{size}.png")
        print(f"wrote {OUT_DIR / f'icon{size}.png'}")


if __name__ == "__main__":
    main()
