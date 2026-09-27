from fastapi.testclient import TestClient
from main import app

c = TestClient(app)


def test_flow():
    ov = c.get("/api/overview").json()
    day = ov["days"][0]["day"]
    ms = c.get("/api/moments", params={"day": day}).json()
    assert ms and all(m["day"] == day for m in ms) and "frames" not in ms[0]
    assert [m["start"] for m in ms] == sorted(m["start"] for m in ms)
    mid = ms[0]["id"]
    assert len(c.get(f"/api/moments/{mid}").json()["frames"]) == ms[0]["count"]
    assert c.patch(f"/api/moments/{mid}", json={"favorite": True}).json()["favorite"]
    assert any(m["id"] == mid for m in c.get("/api/moments", params={"favorite": True}).json())
    assert c.get("/api/moments", params={"q": "tajrish"}).json() or c.get("/api/moments", params={"q": "coffee"}).json()
    assert c.patch("/api/device", json={"interval": 7}).status_code == 422
    assert c.patch("/api/device", json={"capturing": False}).json()["capturing"] is False
    assert c.patch("/api/settings", json={"plan": "nope"}).status_code == 422
    assert c.delete(f"/api/moments/{mid}").json()["ok"]
    assert c.get(f"/api/moments/{mid}").status_code == 404
