# Crop Guardian Backend - Complete Setup Guide

## 🌾 Overview
This is the Python FastAPI backend for Crop Guardian - an AI-powered pest detection system for wheat crops using PyTorch and transfer learning.

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Environment Setup](#environment-setup)
4. [Model Training](#model-training)
5. [Running Locally](#running-locally)
6. [Docker Deployment](#docker-deployment)
7. [API Documentation](#api-documentation)
8. [Expanding the Model](#expanding-the-model)

---

## Prerequisites

### Required Software
- Python 3.9 or higher
- pip (Python package manager)
- Docker & Docker Compose (for containerized deployment)
- CUDA-capable GPU (optional, for faster training)

### Python Dependencies
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
torch==2.1.0
torchvision==0.16.0
Pillow==10.1.0
numpy==1.24.3
pydantic==2.5.0
```

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── models/
│   │   ├── __init__.py
│   │   └── classifier.py    # PyTorch model definition
│   ├── services/
│   │   ├── __init__.py
│   │   └── inference.py     # Inference logic
│   └── utils/
│       ├── __init__.py
│       └── image_processing.py
├── data/
│   ├── raw/                 # Place your dataset here
│   │   ├── wheat_rust/
│   │   ├── aphids/
│   │   ├── armyworm/
│   │   └── healthy/
│   └── processed/
├── models/
│   └── crop_guardian.pt     # Trained model weights
├── scripts/
│   ├── train.py             # Training script
│   ├── prepare_data.py      # Data preparation
│   └── download_dataset.py  # Dataset downloader
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Environment Setup

### 1. Clone and Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Variables
Create a `.env` file in the backend directory:
```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development

# Model Configuration
MODEL_PATH=./models/crop_guardian.pt
IMAGE_SIZE=224
BATCH_SIZE=32

# CORS Origins (add your frontend URL)
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
```

---

## Model Training

### Option 1: Use Pre-trained Transfer Learning (Recommended)

The system uses ResNet50 pre-trained on ImageNet with custom classification head.

```bash
# Download and prepare dataset
python scripts/download_dataset.py

# Train the model
python scripts/train.py --epochs 20 --batch-size 32 --learning-rate 0.001
```

### Option 2: Use Your Own Dataset

1. **Organize your dataset:**
```
data/raw/
├── wheat_rust/
│   ├── image1.jpg
│   ├── image2.jpg
│   └── ...
├── aphids/
│   ├── image1.jpg
│   └── ...
├── armyworm/
│   └── ...
└── healthy/
    └── ...
```

2. **Prepare the data:**
```bash
python scripts/prepare_data.py --input data/raw --output data/processed
```

3. **Train the model:**
```bash
python scripts/train.py \
  --data-dir data/processed \
  --epochs 30 \
  --batch-size 32 \
  --model-type resnet50 \
  --output models/crop_guardian.pt
```

### Training Script (`scripts/train.py`)
```python
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
import argparse

def create_model(num_classes=4):
    """Create ResNet50 model with custom classifier"""
    model = models.resnet50(pretrained=True)
    
    # Freeze early layers
    for param in model.parameters():
        param.requires_grad = False
    
    # Replace final layer
    num_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Linear(num_features, 512),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(512, num_classes)
    )
    
    return model

def train_model(data_dir, epochs, batch_size, lr, output_path):
    # Data transforms
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    # Load datasets
    train_dataset = datasets.ImageFolder(f"{data_dir}/train", transform=train_transform)
    val_dataset = datasets.ImageFolder(f"{data_dir}/val", transform=val_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size)
    
    # Create model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = create_model(num_classes=len(train_dataset.classes)).to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.fc.parameters(), lr=lr)
    
    # Training loop
    best_acc = 0.0
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
        
        # Validation
        model.eval()
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, predicted = torch.max(outputs, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
        
        val_acc = 100 * val_correct / val_total
        print(f"Epoch {epoch+1}/{epochs} - Loss: {train_loss/len(train_loader):.4f} - Val Acc: {val_acc:.2f}%")
        
        # Save best model
        if val_acc > best_acc:
            best_acc = val_acc
            torch.save({
                'model_state_dict': model.state_dict(),
                'class_names': train_dataset.classes,
                'epoch': epoch,
                'accuracy': val_acc
            }, output_path)
            print(f"Model saved with accuracy: {val_acc:.2f}%")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data/processed")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=0.001)
    parser.add_argument("--output", default="models/crop_guardian.pt")
    
    args = parser.parse_args()
    train_model(args.data_dir, args.epochs, args.batch_size, args.learning_rate, args.output)
```

---

## Running Locally

### Start the Backend Server
```bash
# Make sure virtual environment is activated
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: `http://localhost:8000`
- Interactive Docs: `http://localhost:8000/docs`
- OpenAPI Schema: `http://localhost:8000/openapi.json`

---

## Docker Deployment

### Build and Run with Docker Compose

```bash
# Build and start containers
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Dockerfile
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/models:/app/models
      - ./backend/data:/app/data
    environment:
      - ENVIRONMENT=production
      - MODEL_PATH=/app/models/crop_guardian.pt
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://backend:8000
    restart: unless-stopped
```

---

## API Documentation

### Endpoints

#### 1. Health Check
```bash
GET /health

Response:
{
  "status": "healthy",
  "model_loaded": true
}
```

#### 2. Predict Pest
```bash
POST /predict

Content-Type: multipart/form-data

Body:
- file: image file (JPEG, PNG)

Response:
{
  "predictions": [
    {
      "class_name": "wheat_rust",
      "confidence": 0.89,
      "treatment": "Apply fungicide containing tebuconazole..."
    },
    {
      "class_name": "aphids",
      "confidence": 0.07,
      "treatment": "Apply neem oil or insecticidal soap..."
    },
    {
      "class_name": "healthy",
      "confidence": 0.04,
      "treatment": "No treatment needed..."
    }
  ],
  "processing_time_ms": 245
}
```

### Usage Examples

#### cURL
```bash
curl -X POST "http://localhost:8000/predict" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/wheat_image.jpg"
```

#### Python
```python
import requests

url = "http://localhost:8000/predict"
files = {"file": open("wheat_image.jpg", "rb")}
response = requests.post(url, files=files)
print(response.json())
```

#### JavaScript (Fetch)
```javascript
const formData = new FormData();
formData.append('file', imageFile);

fetch('http://localhost:8000/predict', {
  method: 'POST',
  body: formData
})
  .then(response => response.json())
  .then(data => console.log(data));
```

---

## Expanding the Model

### Adding New Pest Classes

1. **Add training data:**
```bash
# Create new directory for new pest class
mkdir data/raw/new_pest_name
# Add images to this directory
```

2. **Retrain the model:**
```bash
python scripts/train.py --data-dir data/processed --epochs 30
```

3. **Update treatment recommendations:**
Edit `app/services/inference.py`:
```python
TREATMENTS = {
    "wheat_rust": "Apply fungicide...",
    "aphids": "Apply neem oil...",
    "armyworm": "Apply Bacillus thuringiensis...",
    "healthy": "No treatment needed...",
    "new_pest_name": "Your treatment recommendation..."  # Add this
}
```

4. **Test the updated model:**
```bash
# Restart the server
uvicorn app.main:app --reload
```

### Improving Model Accuracy

1. **Collect more training data** (aim for 500+ images per class)
2. **Use data augmentation** (already included in training script)
3. **Fine-tune hyperparameters:**
   - Learning rate
   - Batch size
   - Number of epochs
   - Model architecture (try ResNet101, EfficientNet)
4. **Implement ensemble methods** (combine multiple models)

---

## FastAPI Application Code

### `app/main.py`
```python
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
from PIL import Image
import io
import time
from typing import List

from app.services.inference import InferenceService
from app.models.classifier import CropGuardianModel

app = FastAPI(
    title="Crop Guardian API",
    description="AI-Powered Pest Detection for Wheat Crops",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize model
inference_service = InferenceService(model_path="models/crop_guardian.pt")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": inference_service.model is not None
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Run inference
        start_time = time.time()
        predictions = inference_service.predict(image)
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "predictions": predictions,
            "processing_time_ms": round(processing_time, 2)
        }
    
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### `app/services/inference.py`
```python
import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
from typing import List, Dict

from app.models.classifier import CropGuardianModel

TREATMENTS = {
    "wheat_rust": "Apply fungicide containing tebuconazole or propiconazole. Remove and destroy infected leaves. Ensure proper plant spacing for air circulation.",
    "aphids": "Apply neem oil or insecticidal soap. Introduce beneficial insects like ladybugs. Use reflective mulches to repel aphids.",
    "armyworm": "Apply Bacillus thuringiensis (Bt) based pesticide. Hand-pick larvae if infestation is small. Use pheromone traps for monitoring.",
    "healthy": "No treatment needed. Continue regular monitoring and maintenance. Maintain optimal irrigation and fertilization."
}

class InferenceService:
    def __init__(self, model_path: str):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = self.load_model(model_path)
        self.transform = self.get_transform()
        
    def load_model(self, model_path: str):
        checkpoint = torch.load(model_path, map_location=self.device)
        self.class_names = checkpoint.get('class_names', ['wheat_rust', 'aphids', 'armyworm', 'healthy'])
        
        model = CropGuardianModel(num_classes=len(self.class_names))
        model.load_state_dict(checkpoint['model_state_dict'])
        model.to(self.device)
        model.eval()
        
        return model
    
    def get_transform(self):
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
    
    def predict(self, image: Image.Image, top_k: int = 3) -> List[Dict]:
        # Preprocess
        input_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        # Inference
        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = F.softmax(outputs, dim=1)[0]
        
        # Get top-k predictions
        top_probs, top_indices = torch.topk(probabilities, min(top_k, len(self.class_names)))
        
        results = []
        for prob, idx in zip(top_probs, top_indices):
            class_name = self.class_names[idx.item()]
            results.append({
                "class_name": class_name,
                "confidence": float(prob.item()),
                "treatment": TREATMENTS.get(class_name, "Consult agricultural expert.")
            })
        
        return results
```

### `app/models/classifier.py`
```python
import torch.nn as nn
from torchvision import models

class CropGuardianModel(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        self.resnet = models.resnet50(pretrained=True)
        
        # Replace final layer
        num_features = self.resnet.fc.in_features
        self.resnet.fc = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes)
        )
    
    def forward(self, x):
        return self.resnet(x)
```

---

## Production Deployment Checklist

- [ ] Set up proper logging (use Python logging module)
- [ ] Implement rate limiting (use SlowAPI)
- [ ] Add authentication if needed (JWT tokens)
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure HTTPS/SSL certificates
- [ ] Optimize model loading (use model caching)
- [ ] Set up CI/CD pipeline
- [ ] Create backup strategy for models
- [ ] Document API versioning strategy
- [ ] Load testing (use Locust or Apache Bench)

---

## Troubleshooting

### Common Issues

**Issue: Model file not found**
```bash
# Make sure model file exists
ls -la models/crop_guardian.pt

# If missing, train the model first
python scripts/train.py
```

**Issue: CUDA out of memory**
```bash
# Reduce batch size in training
python scripts/train.py --batch-size 16

# Or use CPU
export CUDA_VISIBLE_DEVICES=""
```

**Issue: Poor predictions**
- Ensure training data quality
- Check class balance in dataset
- Increase training epochs
- Use data augmentation
- Collect more diverse samples

---

## Support & Contributing

For issues or questions:
- Create an issue in the repository
- Contact: support@cropguardian.ai

## License

MIT License - See LICENSE file for details
