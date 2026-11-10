"""
WCAG 2.1 AA Contrast Ratio Checker for Vignan Spandana design tokens.
Verifies that all text-color / background-color combinations achieve:
- At least 4.5:1 for normal body text
- At least 3.0:1 for large text (>= 18pt or bold >= 14pt) / UI component borders
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
    "navy-900": "#0F2B48",
    "navy-800": "#0B2038",
    "blue-600": "#1F5FA8",
    "blue-50": "#E8F0F8",
    "bg-page": "#F5F7FA",
    "surface": "#FFFFFF",
    "border": "#D9E0E8",
    "text-900": "#1A2433",
    "text-600": "#5B6B7F",
    "success-700": "#1E7B4F",
    "success-50": "#E7F5EE",
    "warning-700": "#8A5A00",
    "warning-50": "#FFF6E0",
    "error-700": "#B42318",
    "error-50": "#FDECEA",
    "alert-600": "#C2410C",
    "alert-500": "#EA580C",
    "alert-50": "#FFF1E6",
    "alert-border": "#FDBA74",
    "white": "#FFFFFF",
}

PAIRS = [
    ("Primary Text on Surface", "text-900", "surface", 4.5),
    ("Primary Text on Page BG", "text-900", "bg-page", 4.5),
    ("Secondary Text on Surface", "text-600", "surface", 4.5),
    ("Secondary Text on Page BG", "text-600", "bg-page", 4.5),
    ("Link / Accent on Surface", "blue-600", "surface", 4.5),
    ("Table Header text on blue-50", "text-900", "blue-50", 4.5),
    ("Primary Button: White on navy-900", "white", "navy-900", 4.5),
    ("Sidebar Active text on navy-900", "white", "navy-900", 4.5),
    ("Success Badge: success-700 on success-50", "success-700", "success-50", 4.5),
    ("Warning Badge: warning-700 on warning-50", "warning-700", "warning-50", 4.5),
    ("Error Badge: error-700 on error-50", "error-700", "error-50", 4.5),
    ("Alert/Issue Badge: alert-600 on alert-50", "alert-600", "alert-50", 4.5),
    ("Alert/Issue Button: White on alert-600", "white", "alert-600", 4.5),
    ("Destructive Button: White on error-700", "white", "error-700", 4.5),
]

def check_all():
    print(f"{'UI Pair Description':<40} | {'Foreground':<12} | {'Background':<12} | {'Ratio':<8} | {'Min Req':<8} | {'Status'}")
    print("-" * 100)
    all_pass = True
    results = []
    for desc, fg_key, bg_key, min_req in PAIRS:
        fg = TOKENS[fg_key]
        bg = TOKENS[bg_key]
        ratio = contrast_ratio(fg, bg)
        passed = ratio >= min_req
        if not passed:
            all_pass = False
        status = "PASS" if passed else "FAIL"
        results.append((desc, fg, bg, ratio, min_req, status))
        print(f"{desc:<40} | {fg:<12} | {bg:<12} | {ratio:>6.2f}:1 | {min_req:>6.1f}:1 | {status}")
    print("-" * 100)
    if all_pass:
        print("ALL PAIRS PASS WCAG 2.1 AA (>= 4.5:1)")
    else:
        print("WARNING: Some pairs failed WCAG AA threshold!")
    return all_pass, results

if __name__ == "__main__":
    check_all()
