"""Frontend-facing inventory endpoints (camelCase JSON, one item per batch)."""

import uuid

from fastapi import APIRouter, Query, Request, Response, status

from app.core.exceptions import error_responses
from app.dependencies.auth import AdminUser, StaffUser
from app.dependencies.database import DbSession
from app.schemas.items import (
    CloseFlagBody,
    InventoryItemOut,
    ItemCreate,
    ItemUpdate,
    NoteBody,
    OptionalNoteBody,
    ReasonBody,
    SellBody,
)
from app.services import items_service
from app.utils.helpers import client_ip

router = APIRouter(prefix="/items", tags=["Inventory items (frontend)"])
OUT = {"response_model": InventoryItemOut, "response_model_by_alias": True}
SCOPE = " Cost, supplier and receipt fields are null for dispensers."


@router.get("", response_model=list[InventoryItemOut], response_model_by_alias=True,
            summary="All inventory items",
            description="Every in-stock (or quarantined/returned/disposed) batch of every active product, soonest expiry first, with live risk band, days to "
                        "expiry, velocity, workflow state and activity history." + SCOPE,
            responses=error_responses(401))
async def list_items(
    user: StaffUser, db: DbSession,
    include_depleted: bool = Query(False, alias="includeDepleted", description="Also list sold-out batches"),
) -> list[InventoryItemOut]:
    return await items_service.list_items(db, user, include_depleted)


@router.post("", status_code=status.HTTP_201_CREATED, **OUT, summary="Add stock",
             description="Creates the batch (and the product and category if they are new, matched by barcode, "
                         "SKU or name), records a PURCHASE movement, then runs the expiry check for it. Dispensers "
                         "cannot set cost or supplier; those fields are ignored for them.",
             responses=error_responses(400, 401, 409, 422))
async def create_item(data: ItemCreate, user: StaffUser, request: Request, db: DbSession) -> InventoryItemOut:
    return await items_service.create_item(db, user, data, client_ip(request))


@router.get("/{item_id}", **OUT, summary="One inventory item", description="Single batch." + SCOPE,
            responses=error_responses(401, 404))
async def get_item(item_id: uuid.UUID, user: StaffUser, db: DbSession) -> InventoryItemOut:
    return await items_service.get_item(db, user, item_id)


@router.patch("/{item_id}", **OUT, summary="Edit item",
              description="Anyone can set photoUrl (image data URL) and location; other fields are admin-only.",
              responses=error_responses(400, 401, 403, 404, 422))
async def update_item(item_id: uuid.UUID, data: ItemUpdate, user: StaffUser, request: Request, db: DbSession) -> InventoryItemOut:
    return await items_service.update_item(db, user, item_id, data, client_ip(request))


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete item",
               description="Deletes a batch entered by mistake. Batches with dispensing history cannot be deleted "
                           "(dispose them instead). ADMIN only.",
               responses=error_responses(401, 403, 404, 409))
async def delete_item(item_id: uuid.UUID, user: AdminUser, request: Request, db: DbSession) -> Response:
    await items_service.delete_item(db, user, item_id, client_ip(request))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{item_id}/acknowledge", **OUT, summary="Acknowledge expiry alert",
             description="Records who acknowledged the batch's expiry warning and marks its alerts read.",
             responses=error_responses(401, 404))
async def acknowledge(item_id: uuid.UUID, user: StaffUser, request: Request, db: DbSession) -> InventoryItemOut:
    return await items_service.acknowledge(db, user, item_id, client_ip(request))


@router.post("/{item_id}/flag", **OUT, summary="Flag for admin review",
             description="Escalates the batch to an admin with a note.", responses=error_responses(401, 404, 422))
async def flag(item_id: uuid.UUID, body: NoteBody, user: StaffUser, request: Request, db: DbSession) -> InventoryItemOut:
    return await items_service.flag_for_review(db, user, item_id, body.note, client_ip(request))


@router.post("/{item_id}/flag/close", **OUT, summary="Resolve or dismiss a review flag",
             description="ADMIN only.", responses=error_responses(401, 403, 404, 409, 422))
async def close_flag(item_id: uuid.UUID, body: CloseFlagBody, user: AdminUser, request: Request, db: DbSession) -> InventoryItemOut:
    return await items_service.close_flag(db, user, item_id, body, client_ip(request))


@router.post("/{item_id}/quarantine", **OUT, summary="Move to quarantine",
             description="Takes the batch out of sale (it can no longer be dispensed) and closes its expiry alerts.",
             responses=error_responses(401, 404, 409, 422))
async def quarantine(item_id: uuid.UUID, body: ReasonBody, user: StaffUser, request: Request, db: DbSession) -> InventoryItemOut:
    return await items_service.quarantine(db, user, item_id, body, client_ip(request))


@router.post("/{item_id}/notes", **OUT, summary="Add a batch note", description="Appends to the activity history.",
             responses=error_responses(401, 404, 422))
async def add_note(item_id: uuid.UUID, body: NoteBody, user: StaffUser, request: Request, db: DbSession) -> InventoryItemOut:
    return await items_service.add_note(db, user, item_id, body.note, client_ip(request))


@router.post("/{item_id}/return-request", **OUT, summary="Request supplier return",
             description="Marks the batch Pending Return. Repeating the request is a no-op.",
             responses=error_responses(401, 404, 409, 422))
async def request_return(item_id: uuid.UUID, body: OptionalNoteBody, user: StaffUser, request: Request, db: DbSession) -> InventoryItemOut:
    return await items_service.request_return(db, user, item_id, body.note, client_ip(request))


@router.post("/{item_id}/return-process", **OUT, summary="Process supplier return",
             description="Completes a requested return; the batch is quarantined with reason Supplier Return. ADMIN only.",
             responses=error_responses(401, 403, 404, 409))
async def process_return(item_id: uuid.UUID, user: AdminUser, request: Request, db: DbSession) -> InventoryItemOut:
    return await items_service.process_return(db, user, item_id, client_ip(request))


@router.post("/{item_id}/dispose", **OUT, summary="Confirm physical disposal",
             description="Writes the remaining quantity off (EXPIRED/DAMAGED/TRANSFER/ADJUSTMENT movement) and marks "
                         "the batch Disposed.", responses=error_responses(401, 404, 409, 422))
async def dispose(item_id: uuid.UUID, body: ReasonBody, user: StaffUser, request: Request, db: DbSession) -> InventoryItemOut:
    return await items_service.dispose(db, user, item_id, body, client_ip(request))


@router.post("/{item_id}/sell", **OUT, summary="Dispense units",
             description="Records a sale from this batch. Refused for expired, quarantined, pending-return or disposed "
                         "batches, or if there is not enough stock.", responses=error_responses(400, 401, 404, 409, 422))
async def sell(item_id: uuid.UUID, body: SellBody, user: StaffUser, request: Request, db: DbSession) -> InventoryItemOut:
    return await items_service.sell(db, user, item_id, body.units, client_ip(request))
