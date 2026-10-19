"""Seasonal purchase plan and pinned conversations."""

from tests.ai_helpers import stock_store
from tests.helpers import create_user


async def test_seasonal_plan_endpoint(client, admin, db):
    await stock_store(client, admin, db)
    resp = await client.post("/ai/seasonal-plan", params={"season": "HARMATTAN"}, headers=admin["headers"])
    assert resp.status_code == 200, resp.text
    card = resp.json()
    assert card["season_name"].startswith("Harmattan")
    assert card["disclaimer"]
    assert 0 < len(card["products"]) <= 6
    for p in card["products"]:
        assert p["recommended_order_qty"] % 10 == 0  # rounded to supplier pack size
        assert p["confidence"] in {"High", "Medium", "Low"}
        assert p["sold_last_season"] >= 0
    # The test store has under a year of history, so every product is a labelled cold start.
    assert card["cold_start_note"]
    assert all(p["cold_start"] and p["confidence"] == "Low" for p in card["products"])


async def test_seasonal_plan_is_admin_only(client, admin):
    dispenser = await create_user(client, admin["headers"], "seasonal-dispenser@example.com", "dispenser")
    resp = await client.post("/ai/seasonal-plan", headers=dispenser["headers"])
    assert resp.status_code == 403


async def test_chat_attaches_seasonal_card(client, admin, db):
    await stock_store(client, admin, db)
    body = (await client.post("/ai/chat", json={"message": "What should I stock up on this season?"},
                              headers=admin["headers"])).json()
    assert body["intent"] == "SEASONAL_PURCHASE"
    assert body["seasonal_card"] is not None
    assert "compute_seasonal_plan" in body["tools_invoked"]


async def test_pin_conversation(client, admin, db):
    await stock_store(client, admin, db)
    h = admin["headers"]
    first = (await client.post("/ai/chat", json={"message": "Which products expire soon?"}, headers=h)).json()
    await client.post("/ai/chat", json={"message": "What is low on stock?"}, headers=h)
    cid = first["conversation_id"]

    resp = await client.patch(f"/ai/conversations/{cid}", json={"is_pinned": True, "title": "Expiry check"}, headers=h)
    assert resp.status_code == 200, resp.text
    assert resp.json()["is_pinned"] is True and resp.json()["title"] == "Expiry check"

    items = (await client.get("/ai/conversations", headers=h)).json()["items"]
    assert items[0]["id"] == cid  # pinned conversations are listed first
