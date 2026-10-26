"""
DriveGuard Lightweight Eye CNN Training Script

Trains a 45k-parameter binary classification CNN to predict Open vs. Closed eye states.

Features:
- Lightweight architecture suitable for low-latency CPU inference.
- Data augmentation: Random horizontal flip, subtle rotation, affine shear, color jitter.
- Supports both physical datasets (MRL Eye Dataset / Kaggle Closed Eyes) and synthetic verification mode.
- Saves weights to 'eye_model_weights.pt'.

Usage:
    python train_eye_cnn.py --dataset_dir /path/to/dataset --epochs 15
    python train_eye_cnn.py --synthetic --epochs 5
"""

import os
import argparse
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, Dataset
    from torchvision import transforms
    from PIL import Image
    from eye_model import LightweightEyeCNN
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


class SyntheticEyeDataset(Dataset):
    """
    Generates synthetic eye crops for training verification:
    - Open eyes: Simulated dark pupil/iris centered on lighter background.
    - Closed eyes: Horizontal skin fold lines without high-contrast central disk.
    """
    def __init__(self, num_samples: int = 500, transform=None):
        self.num_samples = num_samples
        self.transform = transform

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        # 0: Open, 1: Closed
        label = idx % 2
        img_arr = np.ones((64, 64, 3), dtype=np.uint8) * 180  # skin-like tone

        if label == 0:
            # Open eye: Draw simulated dark circle in center (pupil)
            y, x = np.ogrid[:64, :64]
            dist_from_center = np.sqrt((x - 32) ** 2 + (y - 32) ** 2)
            pupil_mask = dist_from_center <= 10
            sclera_mask = (dist_from_center > 10) & (dist_from_center <= 22)

            img_arr[pupil_mask] = [30, 30, 30]  # dark pupil
            img_arr[sclera_mask] = [230, 230, 230]  # white sclera
        else:
            # Closed eye: Draw horizontal eyelid seam line
            img_arr[31:33, 10:54] = [50, 40, 40]  # eyelid fold shadow

        # Add Gaussian noise
        noise = np.random.normal(0, 10, img_arr.shape).astype(np.int16)
        img_arr = np.clip(img_arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        img = Image.fromarray(img_arr)

        if self.transform:
            img = self.transform(img)

        return img, label


class PhysicalEyeDataset(Dataset):
    """
    Loads eye crops from a standard directory structure:
        dataset_dir/
            open/
                *.jpg
            closed/
                *.jpg
    """
    def __init__(self, root_dir: str, transform=None):
        self.transform = transform
        self.samples = []

        for label_name, label_idx in [("open", 0), ("closed", 1)]:
            dir_path = os.path.join(root_dir, label_name)
            if os.path.isdir(dir_path):
                for f in os.listdir(dir_path):
                    if f.lower().endswith((".jpg", ".jpeg", ".png")):
                        self.samples.append((os.path.join(dir_path, f), label_idx))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


def train(args):
    if not HAS_TORCH:
        print("[Error] PyTorch is required to run the training script. Please run 'pip install torch torchvision'.")
        return

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[DriveGuard Train] Training on device: {device}")

    # Transforms
    train_transform = transforms.Compose([
        transforms.Resize((64, 64)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(degrees=8),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.Resize((64, 64)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    if args.synthetic or not args.dataset_dir:
        print("[DriveGuard Train] Using synthetic eye dataset fixture...")
        train_ds = SyntheticEyeDataset(num_samples=800, transform=train_transform)
        val_ds = SyntheticEyeDataset(num_samples=200, transform=val_transform)
    else:
        print(f"[DriveGuard Train] Loading physical dataset from: {args.dataset_dir}")
        train_ds = PhysicalEyeDataset(args.dataset_dir, transform=train_transform)
        val_ds = PhysicalEyeDataset(args.dataset_dir, transform=val_transform)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False)

    model = LightweightEyeCNN().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=args.learning_rate, weight_decay=1e-4)

    best_val_acc = 0.0
    output_path = args.output or os.path.join(os.path.dirname(__file__), "eye_model_weights.pt")

    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)

        epoch_loss = running_loss / total
        epoch_acc = correct / total

        # Validation phase
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                _, preds = torch.max(outputs, 1)
                val_correct += torch.sum(preds == labels.data).item()
                val_total += labels.size(0)

        val_acc = val_correct / (val_total or 1)
        print(f"Epoch [{epoch:02d}/{args.epochs:02d}] - Train Loss: {epoch_loss:.4f} | Train Acc: {epoch_acc*100:.2f}% | Val Acc: {val_acc*100:.2f}%")

        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), output_path)
            print(f"  -> Saved best checkpoint (Val Acc: {val_acc*100:.2f}%) to {output_path}")

    print(f"\n[DriveGuard Train] Training completed. Best validation accuracy: {best_val_acc*100:.2f}%")
    print(f"Model saved to: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Lightweight Eye State CNN")
    parser.add_argument("--dataset_dir", type=str, default="", help="Path to open/closed dataset")
    parser.add_argument("--synthetic", action="store_true", help="Train on synthetic verification samples")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--learning_rate", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--output", type=str, default="", help="Output .pt checkpoint path")
    parsed_args = parser.parse_args()

    train(parsed_args)
