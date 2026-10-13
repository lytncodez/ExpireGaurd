"""RBAC and company isolation."""

from tests.helpers import create_batch, create_product, create_user


async def test_dispenser_permissions(client, admin):
    staff = await create_user(client, admin["headers"], "staff@acme.test", "dispenser")
    product = await create_product(client, admin["headers"])
    await create_batch(client, admin["headers"], product["id"], days=200, qty=10)

    # A dispenser can read and sell...
    assert (await client.get("/products", headers=staff["headers"])).status_code == 200
    sale = await client.post("/sales", json={"product_id": product["id"], "quantity": 1}, headers=staff["headers"])
    assert sale.status_code == 201
    # ...but cannot manage catalogue, users or run checks.
    resp = await client.post("/products", json={"name": "X", "sku": "X-1"}, headers=staff["headers"])
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"
    assert (await client.get("/users", headers=staff["headers"])).status_code == 403
    assert (await client.post("/expiry/check", headers=staff["headers"])).status_code == 403


async def test_dispenser_cannot_see_costs_or_valuation(client, admin):
    dispenser = await create_user(client, admin["headers"], "disp@acme.test", "dispenser")
    h = dispenser["headers"]
    product = await create_product(client, admin["headers"], sku="DSP-1", barcode="7000000000001")
    await create_batch(client, admin["headers"], product["id"], days=100, qty=10)
    assert (await client.get(f"/products/{product['id']}", headers=h)).json()["cost_price"] is None
    assert (await client.get(f"/products/{product['id']}", headers=admin["headers"])).json()["cost_price"] == "1.00"
    assert (await client.get("/barcode/lookup/7000000000001", headers=h)).json()["product"]["cost_price"] is None
    assert (await client.get("/inventory", headers=h)).json()["items"][0]["inventory_value"] is None
    for path in ("/analytics/overview", "/dashboard/summary", "/inventory/summary", "/sales/summary", "/insights"):
        assert (await client.get(path, headers=h)).status_code == 403, path
    assert (await client.delete(f"/products/{product['id']}", headers=h)).status_code == 403
    assert (await client.delete(f"/products/{product['id']}", headers=admin["headers"])).status_code == 204


async def test_last_admin_cannot_be_removed(client, admin):
    resp = await client.patch(f"/users/{admin['user']['id']}", json={"role": "dispenser"}, headers=admin["headers"])
    assert resp.status_code == 400


async def test_company_isolation(client, admin, other_admin):
    product = await create_product(client, admin["headers"])
    batch = await create_batch(client, admin["headers"], product["id"], days=1, qty=5)
    await client.post("/expiry/check", headers=admin["headers"])
    alert_id = (await client.get("/alerts", headers=admin["headers"])).json()["items"][0]["id"]
    sale = (await client.post("/sales", json={"product_id": product["id"], "quantity": 1}, headers=admin["headers"])).json()
    sale_id = sale["sales"][0]["id"]

    h = other_admin["headers"]
    assert (await client.get(f"/products/{product['id']}", headers=h)).status_code == 404
    assert (await client.patch(f"/products/{product['id']}", json={"name": "Hacked"}, headers=h)).status_code == 404
    assert (await client.get(f"/batches/{batch['id']}", headers=h)).status_code == 404
    assert (await client.get(f"/alerts/{alert_id}", headers=h)).status_code == 404
    assert (await client.patch(f"/alerts/{alert_id}/resolve", headers=h)).status_code == 404
    assert (await client.get(f"/sales/{sale_id}", headers=h)).status_code == 404
    assert (await client.get(f"/barcode/lookup/{product['barcode']}", headers=h)).status_code == 404
    assert (await client.get("/products", headers=h)).json()["total"] == 0
    assert (await client.get("/alerts", headers=h)).json()["total"] == 0
    assert (await client.get("/sales", headers=h)).json()["total"] == 0
    # Cannot attach a batch or a sale to another company's product
    resp = await client.post("/batches", json={
        "product_id": product["id"], "batch_number": "X", "expiry_date": "2030-01-01", "initial_quantity": 1,
    }, headers=h)
    assert resp.status_code == 404
    assert (await client.post("/sales", json={"product_id": product["id"], "quantity": 1}, headers=h)).status_code == 404
    assert (await client.post("/inventory/adjust", json={
        "batch_id": batch["id"], "movement_type": "ADJUSTMENT", "quantity_change": -1,
    }, headers=h)).status_code == 404
    # The same SKU is allowed in another company
    await create_product(client, h)
