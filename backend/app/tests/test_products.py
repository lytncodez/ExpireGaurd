"""
Tests for product endpoints.
Covers: create, read, update, delete (CRUD) operations.
"""

import pytest
from fastapi import status


class TestCreateProduct:
    """Product creation tests."""
    
    def test_create_product_success(self, client, test_user, test_product_data):
        """Authenticated user can create a product."""
        response = client.post(
            "/products",
            json=test_product_data,
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == test_product_data["name"]
        assert data["sku"] == test_product_data["sku"]
        assert data["barcode"] == test_product_data["barcode"]
        assert data["selling_price"] == test_product_data["selling_price"]
        assert "id" in data
    
    def test_create_product_no_auth(self, client, test_product_data):
        """Unauthenticated user cannot create product."""
        response = client.post(
            "/products",
            json=test_product_data,
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_product_duplicate_sku(self, client, test_user, test_product, test_product_data):
        """Cannot create product with duplicate SKU."""
        duplicate_data = test_product_data.copy()
        duplicate_data["sku"] = test_product["sku"]  # Same SKU as existing product
        
        response = client.post(
            "/products",
            json=duplicate_data,
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_409_CONFLICT
    
    def test_create_product_invalid_prices(self, client, test_user):
        """Cannot create product with invalid prices."""
        invalid_data = {
            "name": "Test Product",
            "sku": "TEST-001",
            "barcode": "1234567890123",
            "category": "Electronics",
            "brand": "TestBrand",
            "unit": "pieces",
            "selling_price": -100.00,  # Negative price
            "cost_price": 100.00,
        }
        response = client.post(
            "/products",
            json=invalid_data,
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestGetProducts:
    """Product retrieval tests."""
    
    def test_get_all_products(self, client, test_user, test_product):
        """Authenticated user can get all products."""
        response = client.get(
            "/products",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]["name"] == test_product["name"]
    
    def test_get_products_no_auth(self, client):
        """Unauthenticated request to get products fails."""
        response = client.get("/products")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_products_empty(self, client, test_user):
        """Get products returns empty list when none exist."""
        response = client.get(
            "/products",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_get_product_by_id_success(self, client, test_user, test_product):
        """User can get a specific product by ID."""
        response = client.get(
            f"/products/{test_product['id']}",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_product["id"]
        assert data["name"] == test_product["name"]
    
    def test_get_product_by_id_not_found(self, client, test_user):
        """Getting non-existent product returns 404."""
        response = client.get(
            "/products/99999",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateProduct:
    """Product update tests."""
    
    def test_update_product_success(self, client, test_user, test_product):
        """User can update a product."""
        update_data = {
            "name": "Updated Product Name",
            "selling_price": 200.00,
        }
        response = client.patch(
            f"/products/{test_product['id']}",
            json=update_data,
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Product Name"
        assert data["selling_price"] == 200.00
        assert data["id"] == test_product["id"]  # ID should not change
    
    def test_update_product_no_auth(self, client, test_product):
        """Unauthenticated user cannot update product."""
        response = client.patch(
            f"/products/{test_product['id']}",
            json={"name": "New Name"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_product_not_found(self, client, test_user):
        """Updating non-existent product returns 404."""
        response = client.patch(
            "/products/99999",
            json={"name": "New Name"},
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestDeleteProduct:
    """Product deletion tests."""
    
    def test_delete_product_success(self, client, test_user, test_product):
        """User can delete a product."""
        response = client.delete(
            f"/products/{test_product['id']}",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify product is deleted
        get_response = client.get(
            f"/products/{test_product['id']}",
            headers=test_user["headers"],
        )
        assert get_response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_product_no_auth(self, client, test_product):
        """Unauthenticated user cannot delete product."""
        response = client.delete(
            f"/products/{test_product['id']}",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_delete_product_not_found(self, client, test_user):
        """Deleting non-existent product returns 404."""
        response = client.delete(
            "/products/99999",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
