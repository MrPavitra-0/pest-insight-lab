import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms
import io
import logging
from typing import List, Dict

from app.models.classifier import CropGuardianModel

logger = logging.getLogger(__name__)

class InferenceService:
    """Service for running inference on crop images"""
    
    # Treatment recommendations for each pest class
    TREATMENT_RECOMMENDATIONS = {
        "wheat_rust": "Apply fungicide containing tebuconazole or propiconazole. Monitor field regularly and remove infected plants. Ensure proper spacing for air circulation.",
        "aphids": "Apply insecticidal soap or neem oil. Introduce beneficial insects like ladybugs. Use reflective mulches to deter aphids. Monitor regularly.",
        "armyworm": "Apply Bacillus thuringiensis (Bt) or spinosad-based insecticides. Hand-pick larvae in small infestations. Use pheromone traps for monitoring.",
        "healthy": "No treatment needed. Continue regular monitoring and maintain good agricultural practices. Ensure proper irrigation and fertilization."
    }
    
    def __init__(self, model_path: str, device: str = None):
        """
        Initialize the inference service.
        
        Args:
            model_path: Path to the trained model checkpoint (.pt file)
            device: Device to run inference on ('cpu' or 'cuda'). Auto-detects if None.
        """
        self.model_path = model_path
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        
        logger.info(f"Using device: {self.device}")
        
        # Load model
        self.model, self.class_names = self._load_model(model_path)
        self.model.eval()  # Set to evaluation mode
        
        # Define image preprocessing pipeline
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],  # ImageNet mean
                std=[0.229, 0.224, 0.225]     # ImageNet std
            )
        ])
        
        logger.info(f"Model loaded with {len(self.class_names)} classes: {self.class_names}")
    
    def _load_model(self, model_path: str) -> tuple:
        """
        Load the trained model from checkpoint.
        
        Args:
            model_path: Path to the model checkpoint
        
        Returns:
            Tuple of (model, class_names)
        """
        try:
            # Load checkpoint
            checkpoint = torch.load(model_path, map_location=self.device)
            
            # Extract class names and model state
            class_names = checkpoint.get('class_names', ['aphids', 'armyworm', 'healthy', 'wheat_rust'])
            num_classes = len(class_names)
            
            # Initialize model
            model = CropGuardianModel(num_classes=num_classes)
            model.load_state_dict(checkpoint['model_state_dict'])
            model.to(self.device)
            
            logger.info(f"Model loaded successfully from {model_path}")
            logger.info(f"Model accuracy: {checkpoint.get('accuracy', 'N/A')}")
            
            return model, class_names
            
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise
    
    def preprocess_image(self, image_bytes: bytes) -> torch.Tensor:
        """
        Preprocess image bytes for inference.
        
        Args:
            image_bytes: Raw image bytes
        
        Returns:
            Preprocessed image tensor of shape (1, 3, 224, 224)
        """
        # Open image from bytes
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Apply transformations
        image_tensor = self.transform(image)
        
        # Add batch dimension
        image_tensor = image_tensor.unsqueeze(0)
        
        return image_tensor
    
    def predict(self, image_bytes: bytes, top_k: int = 3) -> List[Dict]:
        """
        Run inference on an image and return top predictions.
        
        Args:
            image_bytes: Raw image bytes
            top_k: Number of top predictions to return
        
        Returns:
            List of prediction dictionaries with class_name, confidence, and treatment
        """
        # Preprocess image
        image_tensor = self.preprocess_image(image_bytes)
        image_tensor = image_tensor.to(self.device)
        
        # Run inference
        with torch.no_grad():
            outputs = self.model(image_tensor)
            probabilities = F.softmax(outputs, dim=1)
        
        # Get top-k predictions
        top_probs, top_indices = torch.topk(probabilities, min(top_k, len(self.class_names)))
        
        # Convert to CPU and numpy
        top_probs = top_probs.cpu().numpy()[0]
        top_indices = top_indices.cpu().numpy()[0]
        
        # Build predictions list
        predictions = []
        for prob, idx in zip(top_probs, top_indices):
            class_name = self.class_names[idx]
            predictions.append({
                'class_name': class_name,
                'confidence': float(prob),
                'treatment': self.TREATMENT_RECOMMENDATIONS.get(
                    class_name,
                    "Consult with an agricultural expert for proper treatment recommendations."
                )
            })
        
        return predictions
