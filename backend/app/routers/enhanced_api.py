from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from ..database import get_db
from ..auth import get_current_user
from .. import crud, schemas, models
from ..ai_service import analyzer

router = APIRouter()

# Enhanced Project Endpoints
@router.get("/projects", response_model=List[schemas.Project])
async def get_projects(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's projects"""
    return crud.get_projects(db, current_user.id, skip=skip, limit=limit)

@router.post("/projects", response_model=schemas.Project)
async def create_project(
    project: schemas.ProjectCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    try:
        return crud.create_project(db, project, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create project: {str(e)}")

@router.get("/projects/{project_id}", response_model=schemas.Project)
async def get_project(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific project"""
    project = crud.get_project(db, project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/projects/{project_id}", response_model=schemas.Project)
async def update_project(
    project_id: int,
    project: schemas.ProjectUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a project"""
    try:
        updated_project = crud.update_project(db, project_id, project, current_user.id)
        if not updated_project:
            raise HTTPException(status_code=404, detail="Project not found")
        return updated_project
    except Exception as e:
        print(f"API Error updating project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update project: {str(e)}")

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a project"""
    success = crud.delete_project(db, project_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}

# Enhanced AI Analysis Endpoints
@router.post("/analyze", response_model=schemas.AIAnalysisResponse)
async def analyze_network(
    request: schemas.AIAnalysisRequest,
    current_request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze network topology with device type tracking (no user prompt)"""
    try:
        # Debug log: แสดง nodes และ edges ที่ได้รับจาก frontend
        import logging
        logging.getLogger("uvicorn.info").info(f"[AI Analyze Debug] nodes: {request.nodes}")
        logging.getLogger("uvicorn.info").info(f"[AI Analyze Debug] edges: {request.edges}")
        import time
        start_time = time.time()
        # Use fixed model gpt-oss:latest
        model_to_use = "gpt-oss:latest"
        # Model is fixed, no need to set it dynamically
        analysis_result = await analyzer.get_ai_analysis(
            request.nodes,
            request.edges
        )
        execution_time = int(time.time() - start_time)
        analysis_history = schemas.AIAnalysisHistoryCreate(
            model_used=model_to_use,
            total_device_count=len(request.nodes),
            analysis_result=analysis_result,
            execution_time_seconds=execution_time,
            project_id=request.project_id
        )
        db_analysis = crud.create_analysis_history(db, analysis_history, current_user.id)
        return schemas.AIAnalysisResponse(
            analysis=analysis_result,
            status="success",
            analysis_id=db_analysis.id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/analysis-history")
async def get_analysis_history(
    project_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analysis history with device information"""
    history_items = crud.get_analysis_history(db, current_user.id, project_id, skip, limit)
    
    # Transform for frontend compatibility
    result = []
    for item in history_items:
        item_dict = {
            "id": item.id,
            "user_id": item.user_id,
            "project_id": item.project_id,
            "model_used": item.model_used,
            "device_count": item.total_device_count,  # Map total_device_count to device_count
            "analysis_result": item.analysis_result,
            "execution_time_seconds": item.execution_time_seconds,
            "created_at": item.created_at
        }
        result.append(item_dict)
    
    return result

@router.delete("/analysis-history/{analysis_id}")
async def delete_analysis(
    analysis_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific analysis"""
    success = crud.delete_analysis_history(db, analysis_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"message": "Analysis deleted successfully"}

@router.delete("/analysis-history")
async def delete_all_analysis(
    project_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all analysis history for user or specific project"""
    count = crud.delete_all_analysis_history(db, current_user.id, project_id)
    return {"message": f"Deleted {count} analysis records"}

