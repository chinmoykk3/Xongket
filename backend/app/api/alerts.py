"""Alert management endpoints."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alert import Alert, AlertStatus, Hazard, Severity
from app.models.alert_delivery import AlertDelivery
from app.models.user import User, UserRole
from app.models.village import Village
from app.schemas.api import AcknowledgeAlertIn, AlertOut, ManualAlertIn
from app.services.auth import get_current_user, require_roles
from app.services.websocket_manager import ws_manager
from app.translations.alert_messages import get_alert_message

router = APIRouter(prefix="/alerts", tags=["Disaster Alerts"])


@router.get("", response_model=list[AlertOut], summary="List disaster alerts with filters")
def list_alerts(
    village_id: Optional[int] = Query(None, description="Filter by village ID"),
    severity: Optional[str] = Query(None, description="advisory, warning, danger"),
    hazard: Optional[str] = Query(None, description="flood, landslide, earthquake"),
    status: Optional[str] = Query(None, description="active, acknowledged, resolved, expired"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Alert)
    if village_id is not None:
        query = query.filter(Alert.village_id == village_id)
    if severity is not None:
        query = query.filter(Alert.severity == severity.lower())
    if hazard is not None:
        query = query.filter(Alert.hazard == hazard.lower())
    if status is not None:
        query = query.filter(Alert.status == status.lower())

    return query.order_by(Alert.created_at.desc()).offset(offset).limit(limit).all()


@router.post(
    "/manual",
    response_model=AlertOut,
    status_code=status.HTTP_201_CREATED,
    summary="Issue manual emergency alert (admin or district officer)",
)
def create_manual_alert(
    payload: ManualAlertIn,
    current_user: User = Depends(require_roles([UserRole.admin.value, UserRole.district_officer.value])),
    db: Session = Depends(get_db),
):
    village = db.query(Village).filter(Village.id == payload.village_id).first()
    if not village:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Village with id={payload.village_id} not found",
        )

    # If district officer, verify permissions for this district
    if current_user.role == UserRole.district_officer.value and current_user.district_id:
        if village.district_id != current_user.district_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="District officer can only issue alerts for their assigned district",
            )

    # Format message if not manually provided
    message = payload.message
    if not message:
        message = get_alert_message(
            hazard=payload.hazard,
            severity=payload.severity,
            language=village.language,
            village_name=village.name,
            value="N/A",
            unit="",
        )

    now = datetime.now(timezone.utc)
    alert = Alert(
        village_id=payload.village_id,
        severity=payload.severity.lower(),
        hazard=payload.hazard.lower(),
        message=message,
        created_at=now,
        status=AlertStatus.active.value,
        source="manual",
    )
    db.add(alert)
    db.flush()

    delivery = AlertDelivery(
        alert_id=alert.id,
        channel="dashboard",
        status="sent",
        sent_at=now,
    )
    db.add(delivery)
    db.commit()
    db.refresh(alert)

    # Broadcast via WebSocket
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            ws_manager.broadcast(
                "new_alert",
                {
                    "id": alert.id,
                    "village_id": alert.village_id,
                    "village_name": village.name,
                    "severity": alert.severity,
                    "hazard": alert.hazard,
                    "message": alert.message,
                    "created_at": alert.created_at.isoformat(),
                    "status": alert.status,
                    "issued_by": current_user.username,
                },
            )
        )
    except RuntimeError:
        pass

    return alert


@router.patch(
    "/{id}/acknowledge",
    response_model=AlertOut,
    summary="Acknowledge or resolve an active alert",
)
def acknowledge_alert(
    id: int,
    payload: AcknowledgeAlertIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {id} not found")

    alert.status = payload.new_status
    db.commit()
    db.refresh(alert)

    # Broadcast acknowledgement via WebSocket
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            ws_manager.broadcast(
                "alert_acknowledged",
                {
                    "id": alert.id,
                    "status": alert.status,
                    "acknowledged_by": current_user.username,
                    "role": current_user.role,
                    "note": payload.note,
                },
            )
        )
    except RuntimeError:
        pass

    return alert
