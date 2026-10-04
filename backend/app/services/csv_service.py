"""CSV parsing and import service.

This project originally depended on pandas, but that package is not reliably
available in constrained environments. The CSV logic here keeps the same
behavior using the Python standard library.
"""

import csv
import io
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.product import Product
from app.models.user import User
from app.services.alert_service import process_batch_alerts


def parse_csv(contents: bytes):
    """Parse CSV content into a list of dict rows."""
    try:
        text = contents.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
        if not rows:
            return []
        return rows
    except Exception as exc:
        raise ValueError(f"Error parsing CSV: {exc}") from exc


def validate_csv(rows) -> list[str]:
    """Validate CSV structure. Return list of errors, empty if valid."""
    errors = []

    if not rows:
        return ["CSV is empty"]

    required = ["product_name", "sku", "batch_number", "quantity", "expiry_date"]
    columns = rows[0].keys()
    for col in required:
        if col not in columns:
            errors.append(f"Missing required column: {col}")

    if errors:
        return errors

    for idx, row in enumerate(rows, start=2):
        try:
            datetime.strptime(str(row["expiry_date"]).strip(), "%Y-%m-%d")
        except ValueError:
            errors.append(f"Row {idx}: Invalid date format in expiry_date")

    return errors


def import_csv(db: Session, contents: bytes, user_id: int) -> dict:
    """Import CSV data into database."""
    rows = parse_csv(contents)
    errors = validate_csv(rows)
    if errors:
        raise ValueError("; ".join(errors))

    products_created = 0
    batches_created = 0
    errors_list = []
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} does not exist")

    for idx, row in enumerate(rows, start=2):
        try:
            product = db.query(Product).filter(Product.sku == row["sku"]).first()
            if not product:
                product = Product(
                    user_id=user_id,
                    name=row["product_name"],
                    sku=row["sku"],
                    category=row.get("category"),
                    unit_price=float(row.get("unit_price", 0) or 0),
                    description=row.get("description"),
                )
                db.add(product)
                db.flush()
                products_created += 1

            expiry_date = datetime.strptime(str(row["expiry_date"]).strip(), "%Y-%m-%d").date()
            quantity = float(row["quantity"])

            batch = Batch(
                product_id=product.id,
                batch_number=row["batch_number"],
                quantity_received=quantity,
                quantity_remaining=quantity,
                expiry_date=expiry_date,
            )
            db.add(batch)
            db.flush()

            process_batch_alerts(db, batch, user.phone)
            batches_created += 1
        except Exception as exc:
            errors_list.append(f"Row {idx}: {exc}")

    db.commit()

    return {
        "status": "success" if not errors_list else "partial",
        "products_created": products_created,
        "batches_created": batches_created,
        "errors": errors_list,
    }
