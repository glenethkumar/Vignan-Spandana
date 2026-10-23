"""
Automated end-to-end sanity tests updated for Stage 1 security & roles.
"""
import re
from app import app
from database import init_db


def get_token(client):
    resp = client.get('/login')
    match = re.search(r'name="csrf_token"\s+value="([a-f0-9]+)"', resp.get_data(as_text=True))
    if match:
        return match.group(1)
    with client.session_transaction() as sess:
        return sess.get('csrf_token')


def test_endpoints_smoke():
    init_db(seed_data=True)
    app.config["TESTING"] = True
    client = app.test_client()

    # 1. Login page GET
    resp = client.get('/login')
    assert resp.status_code == 200, f"Login GET failed: {resp.status_code}"
    assert b"Institutional Sign In" in resp.data

    # 2. Login POST (admin with CSRF)
    token = get_token(client)
    resp = client.post('/login', data={'username': 'admin', 'password': 'admin123', 'csrf_token': token}, follow_redirects=True)
    assert resp.status_code == 200
    assert b"Student Communication Directory" in resp.data

    # 3. Dashboard student list
    assert b"211FA04001" in resp.data
    assert b"K. Sai Praneeth" in resp.data

    # 4. Student detail page
    resp = client.get('/student/1')
    assert resp.status_code == 200
    assert b"Parent AI Call History" in resp.data

    # 5. Add follow up note with CSRF
    token = get_token(client)
    resp = client.post('/student/1/followup', data={
        'notes': 'Test follow-up counseling performed.',
        'action_required': 'Attendance Warning Issued',
        'csrf_token': token
    }, follow_redirects=True)
    assert resp.status_code == 200
    assert b"Test follow-up counseling performed." in resp.data

    # 6. Sample CSV download
    resp = client.get('/sample-csv')
    assert resp.status_code == 200
    assert b"roll_number,name,department" in resp.data

    # 7. Import page GET
    resp = client.get('/import')
    assert resp.status_code == 200
    assert b"Upload Spreadsheet File" in resp.data

    # 8. Two-Step Import CSV test with CSRF
    token = get_token(client)
    with open('sample_students.csv', 'rb') as f:
        resp = client.post('/import', data={
            'file': (f, 'sample_students.csv'),
            'csrf_token': token
        })
        assert resp.status_code == 200
        assert b"Student Import Validation Preview" in resp.data

    # Confirm step
    token = get_token(client)
    resp = client.post('/import/confirm', data={'csrf_token': token}, follow_redirects=True)
    assert resp.status_code == 200
    assert b"Successfully committed" in resp.data

    # 9. Admin pages
    resp_users = client.get('/admin/users')
    assert resp_users.status_code == 200
    assert b"User &amp; Role Management" in resp_users.data or b"User & Role Management" in resp_users.data

    resp_audit = client.get('/admin/audit-logs')
    assert resp_audit.status_code == 200
    assert b"Institutional Security Audit Trail" in resp_audit.data


if __name__ == '__main__':
    test_endpoints_smoke()
    print("Smoke test passed successfully!")
