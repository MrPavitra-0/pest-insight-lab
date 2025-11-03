import torch
import torch.nn as nn
from torchvision import models

class CropGuardianModel(nn.Module):
    """
    Crop pest detection model based on ResNet50 with transfer learning.
    
    Architecture:
    - Base: ResNet50 pre-trained on ImageNet
    - Custom classification head: 2048 -> 512 -> num_classes
    - Dropout for regularization
    """
    
    def __init__(self, num_classes: int = 4, dropout: float = 0.3):
        """
        Initialize the model.
        
        Args:
            num_classes: Number of pest classes to classify
            dropout: Dropout rate for regularization
        """
        super(CropGuardianModel, self).__init__()
        
        # Load pre-trained ResNet50
        self.base_model = models.resnet50(pretrained=True)
        
        # Freeze base model layers (for transfer learning)
        for param in self.base_model.parameters():
            param.requires_grad = False
        
        # Get the number of features from the last layer
        num_features = self.base_model.fc.in_features
        
        # Replace the final fully connected layer with custom classifier
        self.base_model.fc = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(512, num_classes)
        )
        
        self.num_classes = num_classes
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass through the network.
        
        Args:
            x: Input tensor of shape (batch_size, 3, 224, 224)
        
        Returns:
            Output logits of shape (batch_size, num_classes)
        """
        return self.base_model(x)
    
    def unfreeze_base(self, num_layers: int = None):
        """
        Unfreeze base model layers for fine-tuning.
        
        Args:
            num_layers: Number of layers to unfreeze from the end.
                       If None, unfreezes all layers.
        """
        if num_layers is None:
            # Unfreeze all layers
            for param in self.base_model.parameters():
                param.requires_grad = True
        else:
            # Unfreeze only the last n layers
            layers = list(self.base_model.children())
            for layer in layers[-num_layers:]:
                for param in layer.parameters():
                    param.requires_grad = True
