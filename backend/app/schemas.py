from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from datetime import timezone

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Removed Tag schemas - not used in frontend

# Project Schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    diagram_data: Optional[Dict[str, Any]] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    diagram_data: Optional[Dict[str, Any]] = None
    is_favorite: Optional[bool] = None

class Project(ProjectBase):
    id: int
    diagram_data: Optional[Dict[str, Any]] = None
    is_favorite: bool = False
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

# Removed DeviceType and AnalysisDevice schemas - using JSON instead

# AI Analysis History Schemas
class AIAnalysisHistoryBase(BaseModel):
    model_used: str
    total_device_count: int
    analysis_result: str
    execution_time_seconds: Optional[int] = None

class AIAnalysisHistoryCreate(AIAnalysisHistoryBase):
    project_id: Optional[int] = None

class AIAnalysisHistory(AIAnalysisHistoryBase):
    id: int
    user_id: int
    project_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Removed UserPreferences schemas - not used in frontend

# Removed ModelUsageStats and SystemAnalytics schemas - not used in frontend

# Token Schemas (unchanged)
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    current_password: str
    new_password: str

# AI Analysis Request/Response (updated)
class AIAnalysisRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    project_id: Optional[int] = None

class AIAnalysisResponse(BaseModel):
    analysis: str
    status: str
    analysis_id: Optional[int] = None
    timestamp: datetime = datetime.now()

class NetworkTopologyData(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    project_name: Optional[str] = None

# System monitoring schemas removed - not used in frontend