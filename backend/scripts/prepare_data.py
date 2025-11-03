import os
import shutil
from pathlib import Path
import argparse
import logging
from PIL import Image
import random

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def validate_image(image_path: str) -> bool:
    """
    Validate if a file is a valid image.
    
    Args:
        image_path: Path to the image file
    
    Returns:
        True if valid image, False otherwise
    """
    try:
        img = Image.open(image_path)
        img.verify()
        return True
    except Exception:
        return False

def prepare_data(raw_dir: str, output_dir: str, train_ratio: float = 0.7, 
                val_ratio: float = 0.15, test_ratio: float = 0.15, seed: int = 42):
    """
    Prepare and split dataset into train/val/test sets.
    
    Args:
        raw_dir: Directory containing raw data organized by class
        output_dir: Output directory for processed data
        train_ratio: Ratio of training data
        val_ratio: Ratio of validation data
        test_ratio: Ratio of test data
        seed: Random seed for reproducibility
    """
    random.seed(seed)
    
    # Verify ratios sum to 1
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 0.01, \
        "Train, val, and test ratios must sum to 1.0"
    
    # Create output directories
    splits = ['train', 'val', 'test']
    for split in splits:
        os.makedirs(os.path.join(output_dir, split), exist_ok=True)
    
    # Get all class directories
    class_dirs = [d for d in Path(raw_dir).iterdir() if d.is_dir()]
    
    if not class_dirs:
        logger.error(f"No class directories found in {raw_dir}")
        logger.info("Expected structure: raw_dir/class_name/image_files")
        return
    
    logger.info(f"Found {len(class_dirs)} classes: {[d.name for d in class_dirs]}")
    
    total_images = 0
    total_valid = 0
    total_invalid = 0
    stats = {}
    
    # Process each class
    for class_dir in class_dirs:
        class_name = class_dir.name
        logger.info(f"\nProcessing class: {class_name}")
        
        # Create class directories in output splits
        for split in splits:
            os.makedirs(os.path.join(output_dir, split, class_name), exist_ok=True)
        
        # Get all image files
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
        image_files = [
            f for f in class_dir.iterdir()
            if f.suffix.lower() in image_extensions
        ]
        
        logger.info(f"Found {len(image_files)} image files")
        
        # Validate images
        valid_images = []
        for img_file in image_files:
            if validate_image(str(img_file)):
                valid_images.append(img_file)
                total_valid += 1
            else:
                logger.warning(f"Invalid image: {img_file}")
                total_invalid += 1
        
        total_images += len(image_files)
        
        if not valid_images:
            logger.warning(f"No valid images found for class {class_name}")
            continue
        
        # Shuffle images
        random.shuffle(valid_images)
        
        # Calculate split indices
        n_train = int(len(valid_images) * train_ratio)
        n_val = int(len(valid_images) * val_ratio)
        
        train_images = valid_images[:n_train]
        val_images = valid_images[n_train:n_train + n_val]
        test_images = valid_images[n_train + n_val:]
        
        stats[class_name] = {
            'total': len(valid_images),
            'train': len(train_images),
            'val': len(val_images),
            'test': len(test_images)
        }
        
        # Copy images to respective directories
        for img_file in train_images:
            dst = os.path.join(output_dir, 'train', class_name, img_file.name)
            shutil.copy2(img_file, dst)
        
        for img_file in val_images:
            dst = os.path.join(output_dir, 'val', class_name, img_file.name)
            shutil.copy2(img_file, dst)
        
        for img_file in test_images:
            dst = os.path.join(output_dir, 'test', class_name, img_file.name)
            shutil.copy2(img_file, dst)
        
        logger.info(f"Split: Train={len(train_images)}, "
                   f"Val={len(val_images)}, Test={len(test_images)}")
    
    # Print summary
    logger.info("\n" + "="*60)
    logger.info("Data Preparation Summary")
    logger.info("="*60)
    logger.info(f"Total images processed: {total_images}")
    logger.info(f"Valid images: {total_valid}")
    logger.info(f"Invalid images: {total_invalid}")
    logger.info("\nPer-class statistics:")
    logger.info("-"*60)
    
    for class_name, class_stats in stats.items():
        logger.info(f"\n{class_name}:")
        logger.info(f"  Total: {class_stats['total']}")
        logger.info(f"  Train: {class_stats['train']} "
                   f"({100*class_stats['train']/class_stats['total']:.1f}%)")
        logger.info(f"  Val:   {class_stats['val']} "
                   f"({100*class_stats['val']/class_stats['total']:.1f}%)")
        logger.info(f"  Test:  {class_stats['test']} "
                   f"({100*class_stats['test']/class_stats['total']:.1f}%)")
    
    logger.info("\n" + "="*60)
    logger.info(f"Data prepared successfully in {output_dir}")
    logger.info("="*60)

def main():
    parser = argparse.ArgumentParser(
        description='Prepare and split crop pest dataset'
    )
    parser.add_argument(
        '--raw-dir',
        type=str,
        default='./data/raw',
        help='Directory containing raw data organized by class'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='./data/processed',
        help='Output directory for processed data'
    )
    parser.add_argument(
        '--train-ratio',
        type=float,
        default=0.7,
        help='Ratio of training data (default: 0.7)'
    )
    parser.add_argument(
        '--val-ratio',
        type=float,
        default=0.15,
        help='Ratio of validation data (default: 0.15)'
    )
    parser.add_argument(
        '--test-ratio',
        type=float,
        default=0.15,
        help='Ratio of test data (default: 0.15)'
    )
    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Random seed for reproducibility (default: 42)'
    )
    
    args = parser.parse_args()
    
    prepare_data(
        raw_dir=args.raw_dir,
        output_dir=args.output_dir,
        train_ratio=args.train_ratio,
        val_ratio=args.val_ratio,
        test_ratio=args.test_ratio,
        seed=args.seed
    )

if __name__ == '__main__':
    main()
