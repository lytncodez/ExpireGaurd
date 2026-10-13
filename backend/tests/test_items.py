"""The frontend-facing /items API: shape, role scoping, workflow and dispensing."""

from app.services.sms_service import MockSMSProvider
from tests.helpers import create_user, iso


async def _add(client, headers, **over):
    body = {"name": "Amoxicillin 500mg", "category": "Antibiotics", "batchNo": "AMX-01", "quantity": 100,
            "unitCostGhs": 18.5, "sellingPriceGhs": 28.0, "expiryDate": iso(20),
            "supplier": "PharmaCorp Inc.", "location": "Aisle A1 - Shelf 2"}
    body.update(over)
    resp = await client.post("/items", json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_and_read_in_frontend_shape(client, admin):
    h = admin["headers"]
    item = await _add(client, h)
    for key in ("id", "name", "productName", "category", "batchNo", "batchNumber", "quantity", "unitPrice",
                "unitCostGhs", "sellingPriceGhs", "expiryDate", "daysToExpiry", "supplier", "location",
                "storageLocation", "status", "riskStatus", "recommendedAction", "velocity", "activityLog"):
        assert key in item, key
    assert item["riskStatus"] == "Action Required" and item["daysToExpiry"] == 20
    assert item["status"] == "In Stock" and item["unitPrice"] == 18.5 and item["unitCostGhs"] == 18.5
    assert item["supplier"] == "PharmaCorp Inc." and item["location"] == "Aisle A1 - Shelf 2"
    assert item["activityLog"][0]["action"].startswith("Received batch")
    listed = (await client.get("/items", headers=h)).json()
    assert [i["id"] for i in listed] == [item["id"]]
    # Same product name again -> new batch of the same product, not a new product
    second = await _add(client, h, batchNo="AMX-02", expiryDate=iso(200))
    assert second["productId"] == item["productId"] and second["riskStatus"] == "Safe"
    dup = await client.post("/items", json={"name": "Amoxicillin 500mg", "category": "Antibiotics", "batchNo": "amx-01",
                                            "quantity": 5, "expiryDate": iso(30)}, headers=h)
    assert dup.status_code == 409


async def test_dispenser_never_sees_cost_or_supplier(client, admin):
    item = await _add(client, admin["headers"])
    disp = await create_user(client, admin["headers"], "disp@acme.test", "dispenser")
    seen = (await client.get(f"/items/{item['id']}", headers=disp["headers"])).json()
    assert seen["unitCostGhs"] is None and seen["supplier"] is None and seen["dateReceived"] is None
    assert seen["unitPrice"] == 28.0  # selling price
    # a dispenser adding stock cannot set cost or supplier
    mine = await _add(client, disp["headers"], name="Paracetamol 500mg", batchNo="PAR-1", unitCostGhs=99,
                      supplier="Shady Ltd", sellingPriceGhs=12)
    as_admin = (await client.get(f"/items/{mine['id']}", headers=admin["headers"])).json()
    assert as_admin["unitCostGhs"] == 0 and as_admin["supplier"] is None and as_admin["sellingPriceGhs"] == 12
    assert (await client.patch(f"/items/{mine['id']}", json={"supplier": "X"}, headers=disp["headers"])).status_code == 403
    assert (await client.delete(f"/items/{mine['id']}", headers=disp["headers"])).status_code == 403


async def test_photo_and_location_update(client, admin):
    item = await _add(client, admin["headers"])
    photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
    upd = await client.patch(f"/items/{item['id']}", json={"photoUrl": photo, "location": "Bay 4"}, headers=admin["headers"])
    assert upd.status_code == 200 and upd.json()["photoUrl"] == photo and upd.json()["location"] == "Bay 4"
    bad = await client.patch(f"/items/{item['id']}", json={"photoUrl": "javascript:alert(1)"}, headers=admin["headers"])
    assert bad.status_code == 400


async def test_sell_from_batch(client, admin):
    h = admin["headers"]
    item = await _add(client, h, quantity=10)
    sold = (await client.post(f"/items/{item['id']}/sell", json={"units": 4}, headers=h)).json()
    assert sold["quantity"] == 6 and sold["unitsSold"] == 4
    assert sold["activityLog"][-1]["action"] == "Dispensed 4 units"
    assert (await client.post(f"/items/{item['id']}/sell", json={"units": 7}, headers=h)).status_code == 409
    expired = await _add(client, h, batchNo="OLD", expiryDate=iso(-1))
    assert expired["riskStatus"] == "Expired"
    assert (await client.post(f"/items/{expired['id']}/sell", json={"units": 1}, headers=h)).status_code == 400


async def test_quarantine_return_and_disposal_workflow(client, admin):
    h = admin["headers"]
    disp = await create_user(client, h, "disp@acme.test", "dispenser")
    item = await _add(client, h, expiryDate=iso(3))  # Critical -> alert + SMS on creation
    assert item["riskStatus"] == "Critical" and len(MockSMSProvider.outbox) == 1

    ack = (await client.post(f"/items/{item['id']}/acknowledge", headers=disp["headers"])).json()
    assert ack["acknowledged"]["actorName"] == "Dispenser User"

    flagged = (await client.post(f"/items/{item['id']}/flag", json={"note": "Box damaged"}, headers=disp["headers"])).json()
    assert flagged["adminFlag"]["status"] == "open"
    assert (await client.post(f"/items/{item['id']}/flag/close", json={"status": "resolved"},
                              headers=disp["headers"])).status_code == 403
    closed = (await client.post(f"/items/{item['id']}/flag/close", json={"status": "resolved", "note": "ok"},
                                headers=h)).json()
    assert closed["adminFlag"]["status"] == "resolved" and closed["adminFlag"]["closedBy"] == "Admin User"

    req = (await client.post(f"/items/{item['id']}/return-request", json={"note": "Near expiry"},
                             headers=disp["headers"])).json()
    assert req["status"] == "Pending Return" and req["supplierReturnRequest"]["status"] == "requested"
    assert "supplierName" not in req["supplierReturnRequest"]  # hidden from dispensers
    assert (await client.post(f"/items/{item['id']}/sell", json={"units": 1}, headers=h)).status_code == 400
    # the open expiry alert closes once the batch is off sale
    assert (await client.get("/alerts?is_resolved=false", headers=h)).json()["total"] == 0

    done = (await client.post(f"/items/{item['id']}/return-process", headers=h)).json()
    assert done["status"] == "Quarantined" and done["quarantineReason"] == "Supplier Return"

    gone = (await client.post(f"/items/{item['id']}/dispose", json={"reason": "Expired", "note": "Incinerated"},
                              headers=disp["headers"])).json()
    assert gone["status"] == "Disposed" and gone["quantity"] == 0 and gone["disposal"]["quantity"] == 100
    actions = [a["action"] for a in gone["activityLog"]]
    assert actions[-1] == "Confirmed physical disposal" and "Requested supplier return" in actions
    moves = (await client.get(f"/inventory/movements?batch_id={item['id']}", headers=h)).json()["items"]
    assert any(m["movement_type"] == "EXPIRED" and m["quantity"] == -100 for m in moves)
    # disposed batches stay visible for the Disposed tab
    assert any(i["id"] == item["id"] for i in (await client.get("/items", headers=h)).json())


async def test_quarantine_and_notes(client, admin):
    h = admin["headers"]
    item = await _add(client, h)
    q = (await client.post(f"/items/{item['id']}/quarantine", json={"reason": "Damaged"}, headers=h)).json()
    assert q["status"] == "Quarantined" and q["quarantineReason"] == "Damaged"
    n = (await client.post(f"/items/{item['id']}/notes", json={"note": "Moved to bay Q1"}, headers=h)).json()
    assert n["activityLog"][-1]["note"] == "Moved to bay Q1"
    assert (await client.post(f"/items/{item['id']}/quarantine", json={"reason": "Lost"}, headers=h)).status_code == 422


async def test_items_are_company_scoped(client, admin, other_admin):
    item = await _add(client, admin["headers"])
    assert (await client.get("/items", headers=other_admin["headers"])).json() == []
    assert (await client.get(f"/items/{item['id']}", headers=other_admin["headers"])).status_code == 404
    assert (await client.post(f"/items/{item['id']}/sell", json={"units": 1},
                              headers=other_admin["headers"])).status_code == 404
