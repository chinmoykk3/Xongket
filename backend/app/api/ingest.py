"""FastAPI router for sensor telemetry ingestion."""

from __future__ import annotations

from typing import Union

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ingest import (
    IngestResponse,
    IngestedReadingResult,
    ReadingIngestItem,
)
from app.services.ingest import IngestionError, process_ingest_items

router = APIRouter(tags=["Telemetry Ingestion"])


@router.post(
    "/ingest",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest sensor readings (single or batch)",
    description=(
        "Accepts a single reading object or a JSON array of reading objects. "
        "Validates sensor physical ranges, detects stuck values and duplicate timestamps, "
        "updates node status/battery/last_seen, and stores readings with quality flags. "
        "Requires X-API-Key header matching the sensor node's API key."
    ),
)
def ingest_readings(
    payload: Union[ReadingIngestItem, list[ReadingIngestItem]],
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    items = payload if isinstance(payload, list) else [payload]
    if not items:
        return IngestResponse(status="success", processed=0, readings=[])

    try:
        saved_readings = process_ingest_items(
            db=db, items=items, api_key=x_api_key, bypass_auth=False
        )
    except IngestionError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)

    results = [
        IngestedReadingResult(
            id=r.id,
            node_id=r.node_id,
            ts=r.ts,
            value=r.value,
            unit=r.unit,
            quality_flag=r.quality_flag,
        )
        for r in saved_readings
    ]

    return IngestResponse(
        status="success",
        processed=len(results),
        readings=results,
    )
