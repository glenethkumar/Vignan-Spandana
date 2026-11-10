"""
Captures high-fidelity desktop (1280x800) and mobile (375x667) screenshots
of all Phase 2 pages using Microsoft Edge headless engine.
Saves outputs to docs/screenshots/phase2/
"""

import os
import sys
import subprocess
import tempfile

sys.path.insert(0, os.path.abspath("."))
from app import app
from database import init_db, set_active_db_path

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUTPUT_DIR = os.path.abspath("docs/screenshots/phase2")
os.makedirs(OUTPUT_DIR, exist_ok=True)

CSS_ABSPATH = os.path.abspath("static/css/style.css").replace("\\", "/")
EMBLEM_ABSPATH = os.path.abspath("static/images/viit_emblem.png").replace("\\", "/")

app.config["TESTING"] = True
app.config["WTF_CSRF_ENABLED"] = False


def prepare_html(html_content, open_modal_id=None):
    # Rewrite static assets to absolute file URLs for offline renderer
    html = html_content.replace("/static/css/style.css", f"file:///{CSS_ABSPATH}")
    html = html.replace("/static/css/style.css?v=3.0", f"file:///{CSS_ABSPATH}")
    html = html.replace("/static/css/style.css?v=3.5", f"file:///{CSS_ABSPATH}")
    html = html.replace("/static/images/viit_emblem.png", f"file:///{EMBLEM_ABSPATH}")
    
    if open_modal_id:
        # Force modal to display flex
        html = html.replace(f'id="{open_modal_id}" class="modal-overlay"', f'id="{open_modal_id}" class="modal-overlay active" style="display: flex;"')
        html = html.replace(f'id="{open_modal_id}" class="modal-overlay active"', f'id="{open_modal_id}" class="modal-overlay active" style="display: flex;"')
    
    return html


def capture_screenshot(html, filename_prefix):
    with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8", delete=False) as f:
        f.write(html)
        tmp_html = f.name

    try:
        # 1. Desktop: 1280x800
        desktop_png = os.path.join(OUTPUT_DIR, f"{filename_prefix}_desktop.png")
        subprocess.run([
            EDGE_PATH,
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            f"--window-size=1280,800",
            f"--screenshot={desktop_png}",
            tmp_html
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Captured: {desktop_png} ({os.path.getsize(desktop_png):,} bytes)")

        # 2. Mobile: 375x667
        mobile_png = os.path.join(OUTPUT_DIR, f"{filename_prefix}_mobile.png")
        subprocess.run([
            EDGE_PATH,
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            f"--window-size=375,667",
            f"--screenshot={mobile_png}",
            tmp_html
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Captured: {mobile_png} ({os.path.getsize(mobile_png):,} bytes)")

    finally:
        try:
            os.remove(tmp_html)
        except OSError:
            pass


def main():
    os.environ["DEMO_MODE"] = "1"
    client = app.test_client()

    print("--- 1. Login Page ---")
    resp = client.get("/login")
    capture_screenshot(prepare_html(resp.get_data(as_text=True)), "01_login")

    print("--- 2. Admin Dashboard ---")
    client.post("/login", data={"username": "admin", "password": "admin123"}, follow_redirects=True)
    resp = client.get("/dashboard")
    capture_screenshot(prepare_html(resp.get_data(as_text=True)), "02_admin_dashboard")

    print("--- 3. Faculty Dashboard ---")
    client.get("/logout")
    client.post("/login", data={"username": "faculty_cse", "password": "faculty123"}, follow_redirects=True)
    resp = client.get("/dashboard")
    capture_screenshot(prepare_html(resp.get_data(as_text=True)), "03_faculty_dashboard")

    print("--- 4. Hostel Dean Dashboard ---")
    client.get("/logout")
    client.post("/login", data={"username": "dean_hostel", "password": "dean123"}, follow_redirects=True)
    resp = client.get("/dashboard")
    capture_screenshot(prepare_html(resp.get_data(as_text=True)), "04_hostel_dean_dashboard")

    print("--- 5. Students Directory (Admin) ---")
    client.get("/logout")
    client.post("/login", data={"username": "admin", "password": "admin123"}, follow_redirects=True)
    resp = client.get("/students")
    capture_screenshot(prepare_html(resp.get_data(as_text=True)), "05_students_directory_admin")

    print("--- 6. Students Directory (Faculty) ---")
    client.get("/logout")
    client.post("/login", data={"username": "faculty_cse", "password": "faculty123"}, follow_redirects=True)
    resp = client.get("/students")
    capture_screenshot(prepare_html(resp.get_data(as_text=True)), "06_students_directory_faculty")

    print("--- 7. Student Detail (Profile) ---")
    client.get("/logout")
    client.post("/login", data={"username": "admin", "password": "admin123"}, follow_redirects=True)
    resp = client.get("/student/1")
    capture_screenshot(prepare_html(resp.get_data(as_text=True)), "07_student_detail")

    print("--- 8. Empty State ---")
    resp = client.get("/students?query=nonexistent_student_query_xyz")
    capture_screenshot(prepare_html(resp.get_data(as_text=True)), "08_empty_state")

    print("--- 9. Confirmation Modal ---")
    resp = client.get("/students")
    capture_screenshot(prepare_html(resp.get_data(as_text=True), open_modal_id="archiveStudentModal"), "09_confirmation_modal")

    print("--- 10. Placeholder Page ---")
    resp = client.get("/campaigns/new")
    capture_screenshot(prepare_html(resp.get_data(as_text=True)), "10_placeholder")

    print("--- 11. Design System Style Guide ---")
    resp = client.get("/dev/styleguide")
    capture_screenshot(prepare_html(resp.get_data(as_text=True)), "11_styleguide")

    print("\nAll 22 screenshots successfully captured in docs/screenshots/phase2/")


if __name__ == "__main__":
    main()
