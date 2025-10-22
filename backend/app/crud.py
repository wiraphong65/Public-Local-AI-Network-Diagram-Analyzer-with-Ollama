from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json

from . import models, schemas
from .auth import get_password_hash

# User CRUD
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    # Check for duplicate username or email
    if get_user_by_email(db, user.email):
        return None  # Email already exists
    if get_user_by_username(db, user.username):
        return None  # Username already exists

    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Project CRUD
def get_projects(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Project)\
        .filter(models.Project.owner_id == user_id)\
        .offset(skip).limit(limit).all()

def get_user_projects(db: Session, owner_id: int, skip: int = 0, limit: int = 100):
    """Alias for backward compatibility"""
    return get_projects(db, owner_id, skip, limit)

def get_project(db: Session, project_id: int, owner_id: int):
    """Get project by ID and owner ID"""
    return db.query(models.Project)\
        .filter(and_(models.Project.id == project_id, models.Project.owner_id == owner_id))\
        .first()

def create_project(db: Session, project: schemas.ProjectCreate, owner_id: int):
    project_data = project.dict()
    db_project = models.Project(**project_data, owner_id=owner_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate, owner_id: int):
    try:
        db_project = get_project(db, project_id, owner_id)
        if not db_project:
            return None
            
        update_data = project_update.dict(exclude_unset=True)
        
        # Check for unique constraint violation before update
        if 'name' in update_data:
            existing_project = db.query(models.Project).filter(
                and_(
                    models.Project.owner_id == owner_id,
                    models.Project.name == update_data['name'],
                    models.Project.id != project_id
                )
            ).first()
            
            if existing_project:
                raise ValueError(f"Project name '{update_data['name']}' already exists")
        
        # Validate and set each field
        for field, value in update_data.items():
            if hasattr(db_project, field):
                setattr(db_project, field, value)
            else:
                print(f"Warning: Field '{field}' not found in Project model")
        
        db.commit()
        db.refresh(db_project)
        return db_project
        
    except Exception as e:
        print(f"Error updating project {project_id}: {e}")
        db.rollback()
        raise e

def delete_project(db: Session, project_id: int, owner_id: int):
    db_project = get_project(db, project_id, owner_id)
    if db_project:
        db.delete(db_project)
        db.commit()
        return True
    return False

# AI Analysis History CRUD
def get_analysis_history(db: Session, user_id: int, project_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.AIAnalysisHistory)\
        .options(joinedload(models.AIAnalysisHistory.project))\
        .filter(models.AIAnalysisHistory.user_id == user_id)
    
    if project_id:
        query = query.filter(models.AIAnalysisHistory.project_id == project_id)
    
    return query.order_by(desc(models.AIAnalysisHistory.created_at)).offset(skip).limit(limit).all()

def create_analysis_history(db: Session, analysis: schemas.AIAnalysisHistoryCreate, user_id: int):
    analysis_data = analysis.dict()
    db_analysis = models.AIAnalysisHistory(**analysis_data, user_id=user_id)
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    return db_analysis

def get_analysis_by_id(db: Session, analysis_id: int, user_id: int):
    return db.query(models.AIAnalysisHistory)\
        .options(joinedload(models.AIAnalysisHistory.project))\
        .filter(and_(models.AIAnalysisHistory.id == analysis_id, models.AIAnalysisHistory.user_id == user_id))\
        .first()

def delete_analysis_history(db: Session, analysis_id: int, user_id: int):
    db_analysis = get_analysis_by_id(db, analysis_id, user_id)
    if db_analysis:
        db.delete(db_analysis)
        db.commit()
        return True
    return False

def delete_all_analysis_history(db: Session, user_id: int, project_id: Optional[int] = None):
    query = db.query(models.AIAnalysisHistory).filter(models.AIAnalysisHistory.user_id == user_id)
    if project_id:
        query = query.filter(models.AIAnalysisHistory.project_id == project_id)
    
    count = query.count()
    query.delete()
    db.commit()
    return count



# Legacy functions for backward compatibility
def update_user_password(db: Session, user_id: int, new_password: str):
    """Update user password"""
    hashed_password = get_password_hash(new_password)
    db.query(models.User).filter(models.User.id == user_id).update({
        'hashed_password': hashed_password
    })
    db.commit()
    return True