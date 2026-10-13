"""Single-pharmacy sign-up, user management, GS1 scans and import preview."""

import pytest

from app.core.config import settings
from app.utils.gs1 import gs1_date, parse
from tests.helpers import PASSWORD, create_product


@pytest.fixture
def single_pharmacy(monkeypatch):
    monkeypatch.setattr(settings, "ALLOW_MULTIPLE_COMPANIES", False)
    monkeypatch.setattr(settings, "ALLOW_PUBLIC_SIGNUP", True)


async def _signup(client, email, name="Some One"):
    return await client.post("/auth/register", json={"name": name, "email": email, "password": PASSWORD})


async def test_first_signup_is_admin_then_dispensers(client, single_pharmacy):
    first = await _signup(client, "owner@pharm.test", "Owner")
    assert first.status_code == 201 and first.json()["user"]["role"] == "admin"
    assert first.json()["company"]["name"] == settings.PHARMACY_NAME
    second = await _signup(client, "staff@pharm.test")
    assert second.status_code == 201 and second.json()["user"]["role"] == "dispenser"
    assert second.json()["company"]["id"] == first.json()["company"]["id"]


async def test_closed_signup(client, single_pharmacy, monkeypatch):
    await _signup(client, "owner@pharm.test")
    monkeypatch.setattr(settings, "ALLOW_PUBLIC_SIGNUP", False)
    resp = await _signup(client, "late@pharm.test")
    assert resp.status_code == 403


async def test_admin_user_management(client, admin):
    h = admin["headers"]
    created = await client.post("/users", json={"name": "Kofi Boateng", "email": "kofi@acme.test", "role": "dispenser"},
                                headers=h)
    assert created.status_code == 201
    body = created.json()
    assert body["temporary_password"]
    login = await client.post("/auth/login", json={"email": "kofi@acme.test", "password": body["temporary_password"]})
    assert login.status_code == 200 and login.json()["user"]["last_login_at"]
    promoted = await client.patch(f"/users/{body['id']}", json={"role": "admin"}, headers=h)
    assert promoted.json()["role"] == "admin"
    assert (await client.delete(f"/users/{admin['user']['id']}", headers=h)).status_code == 400  # not yourself
    assert (await client.delete(f"/users/{body['id']}", headers=h)).status_code == 204
    assert (await client.post("/auth/login", json={"email": "kofi@acme.test",
                                                   "password": body["temporary_password"]})).status_code == 401


def test_gs1_parsing():
    r = parse("(01)04006381333931(17)270325(10)PAR-3312-EX")
    assert r.is_gs1 and r.gtin == "04006381333931" and r.batch_number == "PAR-3312-EX"
    assert r.expiry_date.isoformat() == "2027-03-25" and not r.errors
    raw = parse("]d2010400638133393117270300\x1d10lot7\x1d21SN99")
    assert raw.batch_number == "LOT7" and raw.serial == "SN99" and raw.expiry_date.isoformat() == "2027-03-31"
    assert parse("6001234567890").is_gs1 is False  # plain EAN: product only
    assert gs1_date("261399") is None
    assert parse("(01)00345678901285(17)261025(10)X").errors  # bad check digit is reported


async def test_parse_endpoint_matches_known_product(client, admin):
    h = admin["headers"]
    await create_product(client, h, barcode="4006381333931", sku="PAR-1")
    resp = (await client.post("/barcode/parse", json={"code": "(01)04006381333931(17)270325(10)PAR-3312-EX"},
                              headers=h)).json()
    assert resp["isGs1"] is True and resp["batchNumber"] == "PAR-3312-EX" and resp["expiryDate"] == "2027-03-25"
    assert resp["product"]["sku"] == "PAR-1"
    plain = (await client.post("/barcode/parse", json={"code": "4006381333931"}, headers=h)).json()
    assert plain["isGs1"] is False and plain["batchNumber"] is None and plain["product"]["sku"] == "PAR-1"


async def test_import_preview_writes_nothing(client, admin):
    from tests.helpers import iso

    h = admin["headers"]
    template = await client.get("/imports/template.csv", headers=h)
    assert template.status_code == 200 and template.text.startswith("product_name,category")
    csv = ("product_name,category,batch_number,expiry_date,quantity,unit_cost,supplier,storage_location\n"
           f"Ciprofloxacin 500mg,Antibiotics,CIP-1,{iso(4)},300,28,Kinapharma,Aisle B1\n"
           f"Cetirizine 10mg,Antihistamines,CET-1,{iso(-2)},350,8.5,MediSupply,Q1\n"
           f"Bad Row,Misc,X-1,{iso(10)},abc,1,,\n").encode()
    files = {"file": ("stock.csv", csv, "text/csv")}
    preview = (await client.post("/imports/preview", files=files, headers=h)).json()
    assert preview["valid"] and preview["batches_to_create"] == 2 and preview["failed_rows"] == 1
    assert preview["risk_bands"] == {"Critical": 1, "Expired": 1} and preview["products_to_create"] == 2
    assert (await client.get("/items", headers=h)).json() == []
    done = (await client.post("/imports/csv", files=files, headers=h)).json()
    assert done["batches_created"] == 2
    items = {i["name"]: i for i in (await client.get("/items", headers=h)).json()}
    assert items["Ciprofloxacin 500mg"]["supplier"] == "Kinapharma" and items["Ciprofloxacin 500mg"]["location"] == "Aisle B1"
