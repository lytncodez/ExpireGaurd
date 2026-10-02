"""
Tests for batch endpoints.
Covers: create, read, update, delete (CRUD) operations.
"""

import pytest
from fastapi import status
from datetime import datetime, timedelta


class TestCreateBatch:
    """Batch creation tests."""
    
    def test_create_batch_success(self, client, test_user, test_product, test_batch_data):
        """Authenticated user can create a batch."""
        batch_payload = {
            **test_batch_data,
            "product_id": test_product["id"],
        }
        response = client.post(
            "/batches",
            json=batch_payload,
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["batch_number"] == test_batch_data["batch_number"]
        assert data["product_id"] == test_product["id"]
        assert data["quantity_received"] == test_batch_data["quantity_received"]
        assert data["quantity_remaining"] == test_batch_data["quantity_received"]
        assert "id" in data
        assert "status" in data
    
    def test_create_batch_no_auth(self, client, test_product, test_batch_data):
        """Unauthenticated user cannot create batch."""
        batch_payload = {
            **test_batch_data,
            "product_id": test_product["id"],
        }
        response = client.post(
            "/batches",
            json=batch_payload,
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_batch_invalid_product(self, client, test_user, test_batch_data):
        """Cannot create batch for non-existent product."""
        batch_payload = {
            **test_batch_data,
            "product_id": 99999,
        }
        response = client.post(
            "/batches",
            json=batch_payload,
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_create_batch_invalid_dates(self, client, test_user, test_product):
        """Cannot create batch with expiry date before manufacturing date."""
        today = datetime.now().date()
        invalid_data = {
            "batch_number": "BATCH-001",
            "manufacturing_date": today.isoformat(),
            "expiry_date": (today - timedelta(days=10)).isoformat(),  # Before manufacturing
            "quantity_received": 100,
            "product_id": test_product["id"],
        }
        response = client.post(
            "/batches",
            json=invalid_data,
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestGetBatches:
    """Batch retrieval tests."""
    
    def test_get_all_batches(self, client, test_user, test_batch):
        """Authenticated user can get all batches."""
        response = client.get(
            "/batches",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]["batch_number"] == test_batch["batch_number"]
    
    def test_get_batches_no_auth(self, client):
        """Unauthenticated request to get batches fails."""
        response = client.get("/batches")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_batch_by_id_success(self, client, test_user, test_batch):
        """User can get a specific batch by ID."""
        response = client.get(
            f"/batches/{test_batch['id']}",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_batch["id"]
        assert data["batch_number"] == test_batch["batch_number"]
    
    def test_get_batch_by_id_not_found(self, client, test_user):
        """Getting non-existent batch returns 404."""
        response = client.get(
            "/batches/99999",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateBatch:
    """Batch update tests."""
    
    def test_update_batch_quantity(self, client, test_user, test_batch):
        """User can update batch quantity remaining."""
        update_data = {
            "quantity_remaining": 50,
        }
        response = client.patch(
            f"/batches/{test_batch['id']}",
            json=update_data,
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["quantity_remaining"] == 50
    
    def test_update_batch_status(self, client, test_user, test_batch):
        """User can update batch status."""
        update_data = {
            "status": "PARTIAL",
        }
        response = client.patch(
            f"/batches/{test_batch['id']}",
            json=update_data,
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "PARTIAL"
    
    def test_update_batch_no_auth(self, client, test_batch):
        """Unauthenticated user cannot update batch."""
        response = client.patch(
            f"/batches/{test_batch['id']}",
            json={"quantity_remaining": 50},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_batch_not_found(self, client, test_user):
        """Updating non-existent batch returns 404."""
        response = client.patch(
            "/batches/99999",
            json={"quantity_remaining": 50},
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestDeleteBatch:
    """Batch deletion tests."""
    
    def test_delete_batch_success(self, client, test_user, test_batch):
        """User can delete a batch."""
        response = client.delete(
            f"/batches/{test_batch['id']}",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify batch is deleted
        get_response = client.get(
            f"/batches/{test_batch['id']}",
            headers=test_user["headers"],
        )
        assert get_response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_batch_no_auth(self, client, test_batch):
        """Unauthenticated user cannot delete batch."""
        response = client.delete(
            f"/batches/{test_batch['id']}",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_delete_batch_not_found(self, client, test_user):
        """Deleting non-existent batch returns 404."""
        response = client.delete(
            "/batches/99999",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
