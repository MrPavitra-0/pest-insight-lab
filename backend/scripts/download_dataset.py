"""
Download sample crop pest images for initial dataset creation.
This is an optional script to help bootstrap your dataset.

For production use, you should collect real images from your agricultural context.
"""

import os
import logging
import argparse
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_dataset_structure(output_dir: str):
    """
    Create the initial dataset directory structure.
    
    Args:
        output_dir: Root directory for the dataset
    """
    class_names = ['wheat_rust', 'aphids', 'armyworm', 'healthy']
    
    logger.info(f"Creating dataset structure in {output_dir}")
    
    for class_name in class_names:
        class_dir = os.path.join(output_dir, class_name)
        os.makedirs(class_dir, exist_ok=True)
        
        # Create a README in each directory
        readme_path = os.path.join(class_dir, 'README.txt')
        with open(readme_path, 'w') as f:
            f.write(f"# {class_name.replace('_', ' ').title()} Images\n\n")
            f.write(f"Place {class_name} images in this directory.\n\n")
            f.write("Image requirements:\n")
            f.write("- Format: JPEG or PNG\n")
            f.write("- Resolution: At least 224x224 pixels\n")
            f.write("- Quality: Clear, well-lit images\n")
            f.write("- Quantity: Minimum 50-100 images per class recommended\n\n")
            f.write("Tips for collecting images:\n")
            f.write("- Capture images from different angles and distances\n")
            f.write("- Include various lighting conditions\n")
            f.write("- Use diverse crop backgrounds\n")
            f.write("- Ensure images clearly show the pest or healthy crop\n")
    
    logger.info(f"Dataset structure created successfully!")
    logger.info(f"\nNext steps:")
    logger.info(f"1. Add images to the class directories in {output_dir}")
    logger.info(f"2. Run: python scripts/prepare_data.py --raw-dir {output_dir}")
    logger.info(f"3. Run: python scripts/train.py")
    
    logger.info(f"\nImage sources to consider:")
    logger.info("- PlantVillage Dataset (https://plantvillage.psu.edu/)")
    logger.info("- iNaturalist (https://www.inaturalist.org/)")
    logger.info("- Your own field photographs")
    logger.info("- Agricultural research databases")
    logger.info("- Kaggle plant disease datasets")

def main():
    parser = argparse.ArgumentParser(
        description='Create initial dataset structure for crop pest detection'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='./data/raw',
        help='Output directory for dataset structure'
    )
    
    args = parser.parse_args()
    
    create_dataset_structure(args.output_dir)

if __name__ == '__main__':
    main()
