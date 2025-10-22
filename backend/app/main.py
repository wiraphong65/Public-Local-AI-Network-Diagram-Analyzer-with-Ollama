from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, ai, enhanced_api
from .database import engine
from . import models

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Network Topology API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:10800",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://10.80.49.110:10800", 
        "http://10.80.49.110", 
        "http://10.80.49.110:10800/~wiraphong",
        "http://10.80.49.110:10801",
        "http://10.80.49.110:10801/~wiraphong"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])

# Include enhanced API routes
app.include_router(enhanced_api.router, prefix="/api", tags=["enhanced-api"])


# Admin routes are included in normalized_api.router

@app.get("/")
def read_root():
    return {"message": "Network Topology API is running"}

@app.get("/health")
def health_check():
    """Health check endpoint with database status"""
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        
        # Check main tables
        users_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
        projects_count = db.execute(text("SELECT COUNT(*) FROM projects")).scalar()
        analyses_count = db.execute(text("SELECT COUNT(*) FROM ai_analysis_history")).scalar()
        
        db.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "tables": {
                "users": users_count,
                "projects": projects_count,
                "analyses": analyses_count
            },
            "api_version": "1.0.0",
            "minimal_schema": "v3"
        }
    except Exception as e:
        if db:
            db.close()
        return {
            "status": "unhealthy",
            "database": "error",
            "error": str(e)
        } 