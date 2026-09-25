"""CSV parsing and import service"""

import io
from datetime import date
import pandas as pd
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.batch import Batch
from app.services.expiry_service import update_batch_expiry_status
from app.services.alert_service import create_alert_for_batch


def parse_csv(contents: bytes) -> pd.DataFrame:
    """Parse CSV file into DataFrame"""
    try:
        df = pd.read_csv(io.BytesIO(contents))
        return df
    except Exception as e:
        raise ValueError(f"Error parsing CSV: {str(e)}")


def validate_csv(df: pd.DataFrame) -> list[str]:
    """Validate CSV structure. Return list of errors, empty if valid"""
    errors = []
    
    # Required columns
    required = ["product_name", "sku", "batch_number", "quantity", "expiry_date"]
    for col in required:
        if col not in df.columns:
            errors.append(f"Missing required column: {col}")
    
    if errors:
        return errors
    
    # Check for empty rows
    if df.empty:
        errors.append("CSV is empty")
        return errors
    
    # Validate dates
    for idx, row in df.iterrows():
        try:
            pd.to_datetime(row["expiry_date"])
        except:
            errors.append(f"Row {idx + 2}: Invalid date format in expiry_date")
    
    return errors


def import_csv(db: Session, contents: bytes, user_id: int) -> dict:
    """Import CSV data into database"""
    # Parse CSV
    df = parse_csv(contents)
    
    # Validate
    errors = validate_csv(df)
    if errors:
        raise ValueError("; ".join(errors))
    
    products_created = 0
    batches_created = 0
    errors_list = []
    
    for idx, row in df.iterrows():
        try:
            # Get or create product
            product = db.query(Product).filter(Product.sku == row["sku"]).first()
            if not product:
                product = Product(
                    user_id=user_id,
                    name=row["product_name"],
                    sku=row["sku"],
                    category=row.get("category"),
                    unit_price=float(row.get("unit_price", 0)),
                    description=row.get("description"),
                )
                db.add(product)
                db.flush()  # Flush to get ID without committing
                products_created += 1
            
            # Create batch
            expiry_date = pd.to_datetime(row["expiry_date"]).date()
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
            
            # Calculate status and create alert
            update_batch_expiry_status(db, batch)
            create_alert_for_batch(db, batch)
            
            batches_created += 1
        
        except Exception as e:
            errors_list.append(f"Row {idx + 2}: {str(e)}")
    
    # Commit all changes
    db.commit()
    
    return {
        "status": "success" if not errors_list else "partial",
        "products_created": products_created,
        "batches_created": batches_created,
        "errors": errors_list,
    }
