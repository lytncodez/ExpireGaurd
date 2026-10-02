"""Product CRUD routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all products for user"""
    products = db.query(Product).filter(Product.user_id == current_user.id).all()
    return products


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create new product"""
    # Check if SKU already exists for this user
    existing = db.query(Product).filter(
        Product.user_id == current_user.id,
        Product.sku == product_data.sku,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with SKU {product_data.sku} already exists"
        )
    
    db_product = Product(
        user_id=current_user.id,
        name=product_data.name,
        sku=product_data.sku,
        barcode=product_data.barcode,
        category=product_data.category,
        brand=product_data.brand,
        unit=product_data.unit or "pieces",
        selling_price=product_data.selling_price if product_data.selling_price is not None else (product_data.unit_price or 0.0),
        cost_price=product_data.cost_price,
        unit_price=product_data.unit_price if product_data.unit_price is not None else product_data.selling_price,
        description=product_data.description,
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get product by ID"""
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductResponse)
@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update product"""
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    if product_data.selling_price is not None:
        product.unit_price = product_data.selling_price
        product.selling_price = product_data.selling_price

    if product_data.cost_price is not None:
        product.cost_price = product_data.cost_price

    if product_data.unit_price is not None:
        product.unit_price = product_data.unit_price
        product.selling_price = product_data.unit_price
    
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete product"""
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return None
