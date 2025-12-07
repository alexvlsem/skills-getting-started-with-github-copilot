import uuid

from fastapi.testclient import TestClient

from src.app import app


client = TestClient(app)


def test_get_activities():
    """Test that GET /activities returns all activities"""
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # basic sanity: one known activity exists
    assert "Chess Club" in data


def test_get_activities_structure():
    """Test that each activity has required fields"""
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    for activity_name, activity_details in data.items():
        assert "description" in activity_details
        assert "schedule" in activity_details
        assert "max_participants" in activity_details
        assert "participants" in activity_details
        assert isinstance(activity_details["participants"], list)


def test_signup_new_participant():
    """Test signing up a new participant to an activity"""
    activity = "Programming Class"
    email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"

    # ensure it's not already present
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email not in resp.json()[activity]["participants"]

    # sign up
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # verify added
    resp = client.get("/activities")
    assert email in resp.json()[activity]["participants"]


def test_signup_duplicate_participant():
    """Test that duplicate signup is rejected"""
    activity = "Chess Club"
    email = "michael@mergington.edu"  # existing participant
    
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 400
    assert "already signed up" in resp.json().get("detail", "")


def test_signup_nonexistent_activity():
    """Test signing up for an activity that doesn't exist"""
    email = "student@example.com"
    
    resp = client.post(f"/activities/Nonexistent%20Activity/signup?email={email}")
    assert resp.status_code == 404
    assert "not found" in resp.json().get("detail", "")


def test_unregister_existing_participant():
    """Test unregistering an existing participant"""
    activity = "Tennis Club"
    email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"

    # First sign up
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200

    # Then unregister
    resp = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 200
    assert "Unregistered" in resp.json().get("message", "")

    # verify removed
    resp = client.get("/activities")
    assert email not in resp.json()[activity]["participants"]


def test_unregister_nonexistent_participant():
    """Test unregistering a participant not in the activity"""
    activity = "Chess Club"
    email = "notregistered@example.com"
    
    resp = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 400
    assert "not signed up" in resp.json().get("detail", "")


def test_unregister_from_nonexistent_activity():
    """Test unregistering from an activity that doesn't exist"""
    email = "student@example.com"
    
    resp = client.post(f"/activities/Nonexistent%20Activity/unregister?email={email}")
    assert resp.status_code == 404
    assert "not found" in resp.json().get("detail", "")


def test_signup_and_unregister_flow():
    """Test the complete signup and unregister flow"""
    activity = "Chess Club"
    # use a unique email so tests are idempotent across runs
    email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"

    # ensure it's not already present
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email not in resp.json()[activity]["participants"]

    # sign up
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # verify added
    resp = client.get("/activities")
    assert email in resp.json()[activity]["participants"]

    # unregister
    resp = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 200
    assert "Unregistered" in resp.json().get("message", "")

    # verify removed
    resp = client.get("/activities")
    assert email not in resp.json()[activity]["participants"]
