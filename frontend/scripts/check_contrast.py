"""
WCAG 2.1 AA Contrast Ratio Checker for VIIT AI Feedback React Frontend Design Tokens.
Checks normal text (>= 4.5:1) and UI components (>= 3.0:1 or >= 4.5:1).
"""

def hex_to_rgb(hex_str):
    hex_str = hex_str.strip().lstrip("#")
    return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def relative_luminance(rgb):
    def channel_lum(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel_lum(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast_ratio(hex1, hex2):
    lum1 = relative_luminance(hex_to_rgb(hex1))
    lum2 = relative_luminance(hex_to_rgb(hex2))
    lighter = max(lum1, lum2)
    darker = min(lum1, lum2)
    return (lighter + 0.05) / (darker + 0.05)

TOKENS = {
    "ink": "#111111",
    "text-body": "#1F2933",
    "text-muted": "#4B5563",
    "page-bg": "#FAFAFA",
    "surface-white": "#FFFFFF",
    "soft-card": "#F7F7F7",
    "brand": "#014A97",
    "brand-dark": "#0B2038",
    "brand-50": "#EAF3FC",
    "orange-text": "#C2410C",
    "orange-tint": "#FFF1E6",
    "success-text": "#047857",
    "success-tint": "#ECFDF5",
    "white": "#FFFFFF",
}

PAIRS = [
    ("Headline Ink on White Surface", "ink", "surface-white", 4.5),
    ("Headline Ink on Page BG", "ink", "page-bg", 4.5),
    ("Body Text on White Surface", "text-body", "surface-white", 4.5),
    ("Secondary Muted Text on Surface", "text-muted", "surface-white", 4.5),
    ("Primary Black Pill: White on #111111", "white", "ink", 4.5),
    ("Brand Accent on White Surface", "brand", "surface-white", 4.5),
    ("Brand Dark on White Surface", "brand-dark", "surface-white", 4.5),
    ("Active Nav Link: brand on brand-50", "brand", "brand-50", 4.5),
    ("Active Nav Text: brand-dark on brand-50", "brand-dark", "brand-50", 4.5),
    ("Success Badge: success-text on success-tint", "success-text", "success-tint", 4.5),
    ("Issue Badge: orange-text on orange-tint", "orange-text", "orange-tint", 4.5),
    ("Issue Button: White on orange-text (#C2410C)", "white", "orange-text", 4.5),
]

def check_all():
    print(f"{'UI Pair Description':<44} | {'Foreground':<14} | {'Background':<14} | {'Ratio':<8} | {'Min Req':<8} | {'Status'}")
    print("-" * 105)
    all_pass = True
    for desc, fg_key, bg_key, min_req in PAIRS:
        fg = TOKENS[fg_key]
        bg = TOKENS[bg_key]
        ratio = contrast_ratio(fg, bg)
        passed = ratio >= min_req
        if not passed:
            all_pass = False
        status_str = "PASS" if passed else "FAIL"
        print(f"{desc:<44} | {fg:<14} | {bg:<14} | {ratio:>6.2f}:1 | {min_req:>6.1f}:1 | {status_str}")
    print("-" * 105)
    if all_pass:
        print("RESULT: ALL 12 COLOR PAIRS PASS WCAG 2.1 AA ACCESSIBILITY REQUIREMENTS.")
    else:
        print("RESULT: SOME COLOR PAIRS FAILED WCAG AA.")
    return all_pass

if __name__ == "__main__":
    import sys
    sys.exit(0 if check_all() else 1)

