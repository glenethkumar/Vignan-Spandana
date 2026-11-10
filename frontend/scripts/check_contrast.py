"""
WCAG 2.1 AA Contrast Ratio Checker for VIIT AI Feedback React Frontend Design Tokens.
Checks normal text (>= 4.5:1) and large text / badges / buttons (>= 3.0:1 or >= 4.5:1).
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
    "brand": "#014A97",
    "brand-dark": "#0B2038",
    "brand-accent": "#0498ED",
    "brand-50": "#EFF6FF",
    "neutral-page": "#F7F8FA",
    "neutral-surface": "#FFFFFF",
    "neutral-border": "#E5E7EB",
    "text-primary": "#111827",
    "text-secondary": "#4B5563", # Darkened from #6B7280 to #4B5563 to achieve > 4.5:1 on subtle surfaces
    "orange-text": "#C2410C",
    "orange-icon": "#EA580C",
    "orange-tint": "#FFF1E6",
    "success-text": "#1E7B4F",
    "success-tint": "#E7F5EE",
    "warning-text": "#8A5A00",
    "warning-tint": "#FFF6E0",
    "danger-text": "#B42318",
    "danger-tint": "#FDECEA",
    "white": "#FFFFFF",
}

PAIRS = [
    ("Primary Text on Surface", "text-primary", "neutral-surface", 4.5),
    ("Primary Text on Page BG", "text-primary", "neutral-page", 4.5),
    ("Secondary Text on Surface", "text-secondary", "neutral-surface", 4.5),
    ("Secondary Text on Page BG", "text-secondary", "neutral-page", 4.5),
    ("Primary CTA: White on brand-dark", "white", "brand-dark", 4.5),
    ("Primary CTA: White on brand (#014A97)", "white", "brand", 4.5),
    ("Active Nav Link: brand on brand-50", "brand", "brand-50", 4.5),
    ("Success Badge: success-text on success-tint", "success-text", "success-tint", 4.5),
    ("Warning Badge: warning-text on warning-tint", "warning-text", "warning-tint", 4.5),
    ("Danger Badge: danger-text on danger-tint", "danger-text", "danger-tint", 4.5),
    ("Issue Badge: orange-text on orange-tint", "orange-text", "orange-tint", 4.5),
    ("Issue Button: White on orange-text (#C2410C)", "white", "orange-text", 4.5),
]

def check_all():
    print(f"{'UI Pair Description':<42} | {'Foreground':<14} | {'Background':<14} | {'Ratio':<8} | {'Min Req':<8} | {'Status'}")
    print("-" * 105)
    all_pass = True
    for desc, fg_key, bg_key, min_req in PAIRS:
        fg = TOKENS[fg_key]
        bg = TOKENS[bg_key]
        ratio = contrast_ratio(fg, bg)
        passed = ratio >= min_req
        if not passed:
            all_pass = False
        status = "PASS" if passed else "FAIL"
        print(f"{desc:<42} | {fg:<14} | {bg:<14} | {ratio:>6.2f}:1 | {min_req:>6.1f}:1 | {status}")
    print("-" * 105)
    if all_pass:
        print("ALL PAIRS PASS WCAG 2.1 AA (>= 4.5:1)")
    else:
        print("WARNING: Some pairs failed WCAG AA threshold!")
    return all_pass

if __name__ == "__main__":
    check_all()
