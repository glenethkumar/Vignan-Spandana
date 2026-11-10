"""
Generate Side-by-Side Visual Comparison Images:
Left: Reference Video Frame (sohel-frontend_.mp4)
Right: Our Implementation Screen (VIIT AI Feedback)
"""

import os
import cv2
import numpy as np

REF_DIR = os.path.abspath("docs/reference-frames")
SCREEN_DIR = os.path.abspath("docs/screenshots-v2")
OUT_DIR = os.path.abspath("docs/comparison")
os.makedirs(OUT_DIR, exist_ok=True)

COMPARISON_PAIRS = [
    {
        "name": "01_landing_hero",
        "title": "Landing Hero: Video Reference vs Our Implementation",
        "ref": "frame_03s.jpg",
        "screen": "01_home_top_desktop.png"
    },
    {
        "name": "02_landing_flow",
        "title": "Workflow 3-Card Grid: Video Reference vs Our Implementation",
        "ref": "frame_06s.jpg",
        "screen": "01_home_flow_desktop.png"
    },
    {
        "name": "03_landing_action",
        "title": "Issue Resolution Cards: Video Reference vs Our Implementation",
        "ref": "frame_09s.jpg",
        "screen": "01_home_action_desktop.png"
    },
    {
        "name": "04_split_login",
        "title": "Split-Screen Login: Video Reference vs Our Implementation",
        "ref": "frame_14s.jpg",
        "screen": "02_login_split_desktop.png"
    },
    {
        "name": "05_admin_dashboard",
        "title": "Admin Dashboard: Video Reference vs Our Implementation",
        "ref": "frame_24s.jpg",
        "screen": "03_dashboard_admin_desktop.png"
    },
    {
        "name": "06_wizard_step1_dept",
        "title": "Wizard Step 1 (Departments): Video Reference vs Our Implementation",
        "ref": "frame_27s.jpg",
        "screen": "04_wizard_01_dept_desktop.png"
    },
    {
        "name": "07_wizard_step2_year",
        "title": "Wizard Step 2 (Academic Year): Video Reference vs Our Implementation",
        "ref": "frame_30s.jpg",
        "screen": "04_wizard_02_year_desktop.png"
    },
    {
        "name": "08_wizard_step3_section",
        "title": "Wizard Step 3 (Section Grid): Video Reference vs Our Implementation",
        "ref": "frame_36s.jpg",
        "screen": "04_wizard_03_section_desktop.png"
    },
    {
        "name": "09_wizard_step4_module",
        "title": "Wizard Step 4 (Module Selection): Video Reference vs Our Implementation",
        "ref": "frame_39s.jpg",
        "screen": "04_wizard_04_module_desktop.png"
    },
    {
        "name": "10_wizard_step5_upload_valid",
        "title": "Wizard Step 5 (Dropzone & Verified Roster): Video Reference vs Our Implementation",
        "ref": "frame_45s.jpg",
        "screen": "04_wizard_05_upload_valid_desktop.png"
    },
    {
        "name": "11_wizard_step5_upload_error",
        "title": "Wizard Step 5 (Inline Error Banner): Video Reference vs Our Implementation",
        "ref": "frame_47s.jpg",
        "screen": "04_wizard_05_upload_error_desktop.png"
    },
    {
        "name": "12_reports_screen",
        "title": "Reports & Analytics Screen: Video Reference vs Our Implementation",
        "ref": "frame_61s.jpg",
        "screen": "06_reports_campaigns_desktop.png"
    }
]

def create_comparison(pair):
    ref_path = os.path.join(REF_DIR, pair["ref"])
    screen_path = os.path.join(SCREEN_DIR, pair["screen"])
    out_path = os.path.join(OUT_DIR, f"compare_{pair['name']}.png")

    if not os.path.exists(ref_path):
        print(f"[Skip] Reference frame not found: {ref_path}")
        return
    if not os.path.exists(screen_path):
        print(f"[Skip] Screenshot not found: {screen_path}")
        return

    ref_img = cv2.imread(ref_path)
    screen_img = cv2.imread(screen_path)

    # Normalize height to 720px
    target_h = 720
    ref_w = int(ref_img.shape[1] * (target_h / ref_img.shape[0]))
    screen_w = int(screen_img.shape[1] * (target_h / screen_img.shape[0]))

    ref_resized = cv2.resize(ref_img, (ref_w, target_h), interpolation=cv2.INTER_AREA)
    screen_resized = cv2.resize(screen_img, (screen_w, target_h), interpolation=cv2.INTER_AREA)

    # Add header bars
    header_h = 60
    total_w = ref_w + screen_w + 12 # 12px divider
    combined = np.full((target_h + header_h, total_w, 3), 245, dtype=np.uint8)

    # Header backgrounds
    cv2.rectangle(combined, (0, 0), (ref_w, header_h), (25, 30, 36), -1)
    cv2.rectangle(combined, (ref_w + 12, 0), (total_w, header_h), (151, 74, 1), -1) # VIIT Brand #014A97 (BGR: 151, 74, 1)

    # Header labels
    cv2.putText(combined, "REFERENCE VIDEO (sohel-frontend_.mp4)", (24, 38),
                cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(combined, "OUR BUILD (VIIT AI Feedback)", (ref_w + 36, 38),
                cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2, cv2.LINE_AA)

    # Paste images
    combined[header_h:header_h + target_h, 0:ref_w] = ref_resized
    # Divider line
    combined[header_h:header_h + target_h, ref_w:ref_w + 12] = (220, 224, 230)
    combined[header_h:header_h + target_h, ref_w + 12:total_w] = screen_resized

    cv2.imwrite(out_path, combined)
    print(f"[Generated] {os.path.basename(out_path)} ({total_w}x{target_h + header_h})")

def main():
    print("--- Generating Side-by-Side Visual Comparison Images ---")
    for pair in COMPARISON_PAIRS:
        create_comparison(pair)
    print(f"All comparison images written to {OUT_DIR}")

if __name__ == "__main__":
    main()
