from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, auth, models, crud
from ..database import get_db
from ..ai_service import analyzer
import logging
import json
import time

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/analyze", response_model=schemas.AIAnalysisResponse)
async def analyze_network_topology(
    request: schemas.AIAnalysisRequest,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    วิเคราะห์แผนผังเครือข่ายด้วย AI และบันทึกประวัติ (ไม่รับ prompt จาก user)
    """
    start_time = time.time()
    try:
        logger.info(f"AI analysis requested by user {current_user.id}")
        # ใช้ default prompt (ไม่รับจาก user)
        analysis_result = await analyzer.get_ai_analysis(
            nodes=request.nodes,
            edges=request.edges
        )
        execution_time = int(time.time() - start_time)
        analysis_history_data = schemas.AIAnalysisHistoryCreate(
            model_used=analyzer.ollama_service.model,
            total_device_count=len(request.nodes),
            analysis_result=analysis_result,
            execution_time_seconds=execution_time,
            project_id=request.project_id
        )
        analysis_history = crud.create_analysis_history(db, analysis_history_data, current_user.id)
        return schemas.AIAnalysisResponse(
            analysis=analysis_result,
            status="success",
            analysis_id=analysis_history.id,
            devices_analyzed=[schemas.AnalysisDevice(
                device_type_id=ad.device_type_id,
                count=ad.count,
                device_type=ad.device_type
            ) for ad in analysis_history.analysis_devices]
        )
    except Exception as e:
        db.rollback()
        logger.error(f"AI analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"เกิดข้อผิดพลาดในการวิเคราะห์: {str(e)}"
        )

@router.get("/health")
async def check_ai_health(
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    """
    ตรวจสอบสถานะการเชื่อมต่อกับ Ollama
    """
    try:
        is_healthy = await analyzer.ollama_service.check_ollama_health()
        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "ollama_connected": is_healthy,
            "model": analyzer.ollama_service.model,
            "base_url": analyzer.ollama_service.base_url,
            "api_version": "v1"  # ระบุว่าใช้ v1 API
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "error",
            "ollama_connected": False,
            "error": str(e),
            "api_version": "v1"
        }




