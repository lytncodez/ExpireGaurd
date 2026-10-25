"""AI advice mode, files shared with the assistant, and the demand forecast."""

import io

import pandas as pd

from app.services.forecast_service import project, reorder_units
from tests.ai_helpers import stock_store, tamper, use_provider
from tests.helpers import iso

SALES_CSV = (
    "Date,Product,Qty Sold,Amount (GHS)\n"
    "2026-07-01,Zinc Tablets,30,90\n"
    "2026-07-31,Zinc Tablets,30,90\n"
    "2026-07-15,Infant Formula 400g,20,240\n"
).encode()


def stock_xlsx() -> bytes:
    buf = io.BytesIO()
    pd.DataFrame({
        "Product Name": ["Amoxicillin 500mg", "Vitamin C 1000mg"],
        "Batch No": ["AMX-1", "VTC-1"],
        "Expiry Date": [iso(5), iso(300)],
        "Qty": [40, 100],
    }).to_excel(buf, index=False)
    return buf.getvalue()


async def upload(client, headers, name: str, content: bytes, mime: str = "text/csv"):
    return await client.post("/ai/files", headers=headers, files={"file": (name, content, mime)})


# --------------------------------------------------------------------------- advice mode


async def test_marketing_question_uses_advice_mode(client, admin, db):
    await stock_store(client, admin, db)
    body = (await client.post("/ai/chat", json={"message": "How can I improve sales with marketing?"},
                              headers=admin["headers"])).json()
    assert body["intent"] == "BUSINESS_ADVICE" and body["answer_mode"] == "advice"
    assert body["grounded"] is True and body["fallback_used"] is False
    assert "WhatsApp" in body["answer"] and "Infant Formula 400g" in body["answer"]
    assert "General business & marketing knowledge" in body["data_sources_used"]


async def test_advice_mode_allows_general_tips(client, admin, db):
    await stock_store(client, admin, db)

    def general(payload, task):
        payload["answer"] = ("General tip: post on Instagram three times a week and run a 10% bundle discount "
                             "during the holiday season, when competitors may also promote.")
        payload["evidence"] = []

    use_provider(tamper(general))
    body = (await client.post("/ai/chat", json={"message": "Give me marketing ideas"},
                              headers=admin["headers"])).json()
    assert body["fallback_used"] is False and "Instagram" in body["answer"]


async def test_advice_mode_still_blocks_invented_store_figures(client, admin, db):
    await stock_store(client, admin, db)

    def invent(payload, task):
        payload["answer"] = "You sold 987654 units last month, so promote on WhatsApp."

    use_provider(tamper(invent))
    body = (await client.post("/ai/chat", json={"message": "Give me marketing ideas"},
                              headers=admin["headers"])).json()
    assert body["fallback_used"] is True and "987654" not in body["answer"]


async def test_advice_mode_still_blocks_action_claims(client, admin, db):
    await stock_store(client, admin, db)

    def act(payload, task):
        payload["answer"] = "I have discounted your slow movers and posted the offer on Facebook."

    use_provider(tamper(act))
    body = (await client.post("/ai/chat", json={"message": "Give me marketing ideas"},
                              headers=admin["headers"])).json()
    assert body["fallback_used"] is True


async def test_data_questions_stay_strict(client, admin, db):
    await stock_store(client, admin, db)
    body = (await client.post("/ai/chat", json={"message": "Which products are at highest expiry risk?"},
                              headers=admin["headers"])).json()
    assert body["answer_mode"] == "data"


# --------------------------------------------------------------------------- forecast


def test_project_flat_and_trending_series():
    flat = project([70.0] * 8, 30)
    assert flat.daily_rate == 10.0 and flat.forecast_units == 300 and flat.confidence == "High"
    rising = project([10, 20, 30, 40, 50, 60, 70, 80], 30)
    assert rising.trend_pct is not None and 0 < rising.trend_pct <= 50
    falling = project([80, 70, 60, 50, 40, 30, 20, 10], 30)
    assert falling.trend_pct is not None and -50 <= falling.trend_pct < 0
    assert project([], 30).forecast_units == 0
    assert reorder_units(300, 10.0, 8) == 362 and reorder_units(60, 2.0, 140) == 0


async def test_forecast_endpoint(client, admin, db):
    await stock_store(client, admin, db)
    body = (await client.get("/ai/forecast?horizon_days=30", headers=admin["headers"])).json()
    top = body["products"][0]
    assert top["product"] == "Infant Formula 400g"
    assert top["forecast_units"] == 300 and top["stock"] == 8 and top["reorder_units"] == 362
    assert top["confidence"] == "Medium"
    assert len(body["weekly_history"]) == 12 and len(body["charts"]) == 2
    assert body["reorder_count"] >= 1


async def test_forecast_chat_returns_charts(client, admin, db):
    await stock_store(client, admin, db)
    body = (await client.post("/ai/chat", json={"message": "Forecast my sales for the next month"},
                              headers=admin["headers"])).json()
    assert body["intent"] == "FORECAST" and body["grounded"] is True and body["fallback_used"] is False
    assert "Infant Formula 400g" in body["answer"] and "362" in body["answer"]
    assert body["charts"] and body["charts"][0]["type"] == "bar"


# --------------------------------------------------------------------------- files


async def test_sales_file_kept_for_analysis_feeds_chat_and_forecast(client, admin, db):
    await stock_store(client, admin, db)
    h = admin["headers"]
    resp = await upload(client, h, "july_sales.csv", SALES_CSV)
    assert resp.status_code == 201, resp.text
    ds = resp.json()
    assert ds["kind"] == "SALES_HISTORY" and ds["status"] == "PENDING" and ds["can_import"] is False
    assert ds["summary"]["suggested_action"] == "KEEP" and ds["summary"]["total_units"] == 80

    kept = (await client.post(f"/ai/files/{ds['id']}/keep", headers=h)).json()
    assert kept["status"] == "KEPT"
    assert [f["filename"] for f in (await client.get("/ai/files", headers=h)).json()] == ["july_sales.csv"]

    body = (await client.post("/ai/chat", json={"message": "What does the file I uploaded show?"}, headers=h)).json()
    assert body["intent"] == "DATASETS" and "july_sales.csv" in body["answer"] and body["grounded"] is True

    fc = (await client.get("/ai/forecast", headers=h)).json()
    zinc = next(p for p in fc["products"] if p["product"] == "Zinc Tablets")
    assert zinc["product_id"] is None and zinc["source"].startswith("uploaded file")


async def test_inventory_file_can_be_imported_once(client, admin):
    h = admin["headers"]
    xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ds = (await upload(client, h, "stock.xlsx", stock_xlsx(), xlsx)).json()
    assert ds["kind"] == "INVENTORY" and ds["can_import"] is True
    assert ds["summary"]["suggested_action"] == "IMPORT" and ds["summary"]["expiring_within_90_days"] == 1

    resp = await client.post(f"/ai/files/{ds['id']}/import", headers=h)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["batches_created"] == 2 and body["dataset"]["status"] == "IMPORTED"
    assert body["dataset"]["can_import"] is False
    assert (await client.post(f"/ai/files/{ds['id']}/import", headers=h)).status_code == 400


async def test_file_upload_validation_and_isolation(client, admin, other_admin):
    h = admin["headers"]
    assert (await upload(client, h, "notes.pdf", b"%PDF-1.4", "application/pdf")).status_code == 400
    assert (await upload(client, h, "empty.csv", b"")).status_code == 400
    ds = (await upload(client, h, "list.csv", b"Name,Score\na,1\nb,2\n")).json()
    assert ds["kind"] == "OTHER"
    assert (await client.post(f"/ai/files/{ds['id']}/import", headers=h)).status_code == 400
    assert (await client.get(f"/ai/files/{ds['id']}", headers=other_admin["headers"])).status_code == 404
    assert (await client.delete(f"/ai/files/{ds['id']}", headers=h)).status_code == 204
    assert (await client.get("/ai/files", headers=h)).json() == []


async def test_waste_question_with_typo_gets_a_plan(client, admin, db):
    await stock_store(client, admin, db)
    body = (await client.post("/ai/chat", json={"message": "tell me about how to curb ex[piry wastage"},
                              headers=admin["headers"])).json()
    assert body["intent"] == "WASTE_REDUCTION" and body["answer_mode"] == "advice"
    assert body["grounded"] is True and body["fallback_used"] is False
    assert "MLK-TMRW" in body["answer"] and "FEFO" in body["answer"]
