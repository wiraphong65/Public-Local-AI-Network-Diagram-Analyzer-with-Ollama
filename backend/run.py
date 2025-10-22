import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=10800, 
        reload=True,
        timeout_keep_alive=4200,  # 70 นาที - เพื่อให้ AI มีเวลาเต็มที่
        timeout_graceful_shutdown=30
    )