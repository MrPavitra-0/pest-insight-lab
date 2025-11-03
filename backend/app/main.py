from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import time
from typing import List
import os

from app.services.inference import InferenceService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Crop Guardian API",
    description="AI-powered pest detection system for agricultural crops",
    version="1.0.0"
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Response models
class PredictionResult(BaseModel):
    class_name: str
    confidence: float
    treatment: str

class PredictionResponse(BaseModel):
    predictions: List[PredictionResult]
    processing_time_ms: float

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_path: str
    num_classes: int

# Global inference service
inference_service = None

@app.on_event("startup")
async def startup_event():
    """Initialize the inference service on startup"""
    global inference_service
    try:
        model_path = os.getenv("MODEL_PATH", "./models/crop_guardian.pt")
        logger.info(f"Loading model from {model_path}")
        inference_service = InferenceService(model_path)
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        inference_service = None

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Crop Guardian API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    if inference_service is None:
        return HealthResponse(
            status="error",
            model_loaded=False,
            model_path="",
            num_classes=0
        )
    
    return HealthResponse(
        status="ok",
        model_loaded=True,
        model_path=inference_service.model_path,
        num_classes=len(inference_service.class_names)
    )

@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict(file: UploadFile = File(...)):
    """
    Predict pest class from uploaded crop image
    
    Args:
        file: Image file (JPEG, PNG)
    
    Returns:
        PredictionResponse with top 3 predictions and treatment recommendations
    """
    start_time = time.time()
    
    # Validate inference service
    if inference_service is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please check server logs."
        )
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Please upload an image."
        )
    
    try:
        # Read image file
        image_bytes = await file.read()
        
        # Run inference
        predictions = inference_service.predict(image_bytes)
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # Convert to ms
        
        logger.info(f"Prediction completed in {processing_time:.2f}ms")
        logger.info(f"Top prediction: {predictions[0]['class_name']} ({predictions[0]['confidence']:.2%})")
        
        return PredictionResponse(
            predictions=[PredictionResult(**pred) for pred in predictions],
            processing_time_ms=round(processing_time, 2)
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
