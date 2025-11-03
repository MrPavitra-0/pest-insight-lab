"""
Create a dummy model for quick testing without training.
This script generates a minimal model checkpoint that can be loaded by the API.
"""

import torch
import os
import sys
import logging

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.classifier import CropGuardianModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_dummy_model(output_path: str = './models/crop_guardian.pt'):
    """
    Create a dummy model checkpoint for testing.
    
    Args:
        output_path: Path where the model will be saved
    """
    # Define class names
    class_names = ['aphids', 'armyworm', 'healthy', 'wheat_rust']
    num_classes = len(class_names)
    
    logger.info(f"Creating dummy model with {num_classes} classes: {class_names}")
    
    # Initialize model
    model = CropGuardianModel(num_classes=num_classes)
    
    # Create dummy optimizer state
    optimizer_state = {
        'state': {},
        'param_groups': [{
            'lr': 0.001,
            'betas': (0.9, 0.999),
            'eps': 1e-08,
            'weight_decay': 0,
            'amsgrad': False
        }]
    }
    
    # Create checkpoint
    checkpoint = {
        'epoch': 0,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer_state,
        'accuracy': 0.0,
        'class_names': class_names,
        'train_loss': 0.0,
        'val_loss': 0.0,
        'note': 'This is a dummy model for testing. Train a real model for production use.'
    }
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Save checkpoint
    torch.save(checkpoint, output_path)
    
    logger.info(f"Dummy model saved to {output_path}")
    logger.info(f"Model size: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB")
    logger.info("\nIMPORTANT: This is an untrained model for testing purposes only!")
    logger.info("Train a real model using 'python scripts/train.py' for production use.")
    
    return output_path

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Create dummy model for testing')
    parser.add_argument(
        '--output',
        type=str,
        default='./models/crop_guardian.pt',
        help='Output path for the model'
    )
    
    args = parser.parse_args()
    create_dummy_model(args.output)
