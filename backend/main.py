"""Narrative Iran API — demo lifelog backend (one photo every 30s → daily moments)."""
import random
from datetime import date, datetime, timedelta

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Narrative Iran API")

# (title_fa, title_en, place_fa, place_en, tags, start_hour, hue)
SCENES = [
    ("قهوه صبحگاهی", "Morning coffee", "کافه لمیز، ولیعصر", "Lamiz Café, Valiasr", ["food", "calm"], 8, 28),
    ("پیاده‌روی در بازار تجریش", "Walk through Tajrish bazaar", "بازار تجریش", "Tajrish Bazaar", ["city", "walk"], 9, 36),
    ("جلسه تیم محصول", "Product team meeting", "دفتر نریتیو", "Narrative HQ", ["work"], 10, 215),
    ("مترو تا میدان انقلاب", "Metro to Enghelab", "مترو خط ۴", "Metro line 4", ["city"], 11, 200),
    ("ناهار با خانواده", "Lunch with family", "خانه مادربزرگ", "Grandma's house", ["family", "food"], 13, 12),
    ("کتاب‌خوانی در باغ کتاب", "Reading at Book Garden", "باغ کتاب تهران", "Tehran Book Garden", ["calm"], 14, 150),
    ("بازی بچه‌ها در پارک", "Kids playing in the park", "پارک آب و آتش", "Ab-o-Atash Park", ["family", "nature"], 16, 110),
    ("غروب در دربند", "Sunset at Darband", "دربند", "Darband", ["nature", "travel"], 18, 20),
    ("دورهمی دوستانه", "Friends get-together", "کافه رستوران ارغوان", "Arghavan Café", ["friends", "food"], 20, 330),
    ("شب‌گردی کنار برج میلاد", "Night stroll by Milad Tower", "برج میلاد", "Milad Tower", ["city", "friends"], 21, 265),
    ("میدان نقش جهان", "Naqsh-e Jahan Square", "اصفهان", "Isfahan", ["travel", "city"], 11, 42),
    ("پل خواجو در شب", "Khaju Bridge at night", "اصفهان", "Isfahan", ["travel", "nature"], 20, 240),
    ("کلاس یوگا", "Yoga class", "باشگاه آرامش", "Aramesh Studio", ["calm", "sport"], 7, 170),
    ("دوچرخه‌سواری در چیتگر", "Cycling at Chitgar", "دریاچه چیتگر", "Chitgar Lake", ["sport", "nature"], 17, 190),
]
TAGS = sorted({t for s in SCENES for t in s[4]})


def img(seed: str, w=1000, h=750) -> str:
    return f"https://picsum.photos/seed/{seed}/{w}/{h}"


def seed_db(days=14):
    rnd, today, db = random.Random(31), date.today(), {}
    for d in range(days):
        day = today - timedelta(days=d)
        travel = d in (4, 5)  # a weekend trip to Isfahan
        pool = [s for s in SCENES if ("travel" in s[4]) == travel or s[5] in (8, 13)]
        for s in sorted(rnd.sample(pool, min(len(pool), rnd.randint(5, 8))), key=lambda s: s[5]):
            mid = f"{day:%Y%m%d}-{len(db)}"
            start = datetime.combine(day, datetime.min.time()) + timedelta(hours=s[5], minutes=rnd.randint(0, 40))
            n = rnd.randint(8, 24)  # frames, one every 30s
            db[mid] = {
                "id": mid, "day": day.isoformat(), "start": start.isoformat(),
                "end": (start + timedelta(seconds=30 * n)).isoformat(),
                "title": {"fa": s[0], "en": s[1]}, "place": {"fa": s[2], "en": s[3]},
                "tags": s[4], "hue": s[6], "favorite": rnd.random() < 0.18,
                "cover": img(f"nar{mid}"), "frames": [img(f"nar{mid}-{i}") for i in range(n)],
                "count": n,
            }
    return db


# ponytail: in-memory store, resets on restart; swap for SQLite/Postgres when real users exist.
DB = seed_db()
DEVICE = {"name": "Narrative Clip 2", "battery": 76, "storage_used": 5.8, "storage_total": 8.0,
          "capturing": True, "interval": 30, "wifi_upload": True, "firmware": "2.4.1",
          "last_sync": datetime.now().replace(microsecond=0).isoformat()}
SETTINGS = {"blur_faces": True, "blur_screens": True, "share_location": False,
            "auto_delete_days": 0, "plan": "free"}
PLANS = [
    {"id": "free", "price": 0, "storage": 5, "features": ["timeline", "search", "30days"]},
    {"id": "pro", "price": 250_000, "yearly": 2_500_000, "storage": 500,
     "features": ["timeline", "search", "unlimited", "albums", "export", "support"]},
]


def summary(m):
    return {k: v for k, v in m.items() if k != "frames"}


def get(mid):
    if mid not in DB:
        raise HTTPException(404, "moment not found")
    return DB[mid]


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/overview")
def overview():
    days = {}
    for m in DB.values():
        d = days.setdefault(m["day"], {"day": m["day"], "moments": 0, "photos": 0, "cover": m["cover"]})
        d["moments"] += 1
        d["photos"] += m["count"]
    return {"days": sorted(days.values(), key=lambda d: d["day"], reverse=True), "tags": TAGS,
            "totals": {"moments": len(DB), "photos": sum(m["count"] for m in DB.values()),
                       "favorites": sum(m["favorite"] for m in DB.values())}}


@app.get("/api/moments")
def moments(day: str | None = None, q: str = "", tag: str | None = None, favorite: bool = False):
    q = q.strip().lower()
    out = [summary(m) for m in DB.values()
           if (not day or m["day"] == day) and (not tag or tag in m["tags"]) and (not favorite or m["favorite"])
           and (not q or any(q in s.lower() for s in (*m["title"].values(), *m["place"].values(), *m["tags"])))]
    return sorted(out, key=lambda m: m["start"], reverse=not day)


@app.get("/api/moments/{mid}")
def moment(mid: str):
    return get(mid)


class MomentPatch(BaseModel):
    favorite: bool


@app.patch("/api/moments/{mid}")
def patch_moment(mid: str, body: MomentPatch):
    get(mid)["favorite"] = body.favorite
    return summary(DB[mid])


@app.delete("/api/moments/{mid}")
def delete_moment(mid: str):
    get(mid)
    del DB[mid]
    return {"ok": True}


@app.get("/api/device")
def device():
    return DEVICE


class DevicePatch(BaseModel):
    capturing: bool | None = None
    interval: int | None = None
    wifi_upload: bool | None = None


@app.patch("/api/device")
def patch_device(body: DevicePatch):
    if body.interval is not None and body.interval not in (10, 30, 60, 120):
        raise HTTPException(422, "interval must be 10, 30, 60 or 120")
    DEVICE.update(body.model_dump(exclude_none=True))
    return DEVICE


@app.post("/api/device/sync")
def sync():
    DEVICE["last_sync"] = datetime.now().replace(microsecond=0).isoformat()
    return DEVICE


@app.get("/api/settings")
def settings():
    return {**SETTINGS, "plans": PLANS}


class SettingsPatch(BaseModel):
    blur_faces: bool | None = None
    blur_screens: bool | None = None
    share_location: bool | None = None
    auto_delete_days: int | None = None
    plan: str | None = None


@app.patch("/api/settings")
def patch_settings(body: SettingsPatch):
    if body.plan is not None and body.plan not in {p["id"] for p in PLANS}:
        raise HTTPException(422, "unknown plan")
    if body.auto_delete_days is not None and body.auto_delete_days not in (0, 7, 30, 90):
        raise HTTPException(422, "auto_delete_days must be 0, 7, 30 or 90")
    SETTINGS.update(body.model_dump(exclude_none=True))
    return {**SETTINGS, "plans": PLANS}


@app.get("/api/export")
def export():
    return {"exported_at": datetime.now().isoformat(), "settings": SETTINGS, "moments": list(DB.values())}
