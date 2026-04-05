import os
import shutil
import json
import random
import glob
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Attempt to load platform libraries
try:
    import kaggle
    KAGGLE_AVAILABLE = True
except ImportError:
    KAGGLE_AVAILABLE = False

try:
    from roboflow import Roboflow
    ROBOFLOW_AVAILABLE = True
except ImportError:
    ROBOFLOW_AVAILABLE = False

try:
    from datasets import load_dataset
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False


MAX_IMAGES_PER_DATASET = 500

BASE_DIR = Path(__file__).resolve().parent
UNIFIED_DIR = BASE_DIR / "unified_images"
LABELS_FILE = BASE_DIR / "unified_labels.json"
TEMP_DIR = BASE_DIR / "temp_raw"


# --- CONFIGURATION FROM LINKS ---
KAGGLE_DATASETS = [
    "shubhamgoel27/dermnet",
    "ibrahimfateen/wound-classification",
    "gunavenkatdoddi/eye-diseases-classification"
]

ROBOFLOW_DATASETS = [
    # Format: ("workspace", "project-name", version_int)
    # Using generally accessible public project formats
    ("binussss", "burn-wound-classification", 1),
    ("ssk-r6ppk", "diabetic_ulcers", 1),
    ("object-detection-ttfpu", "bug-bites", 1),
    ("insect-bite-identifier-ceyst", "insect-bites", 1),
    ("snake-bite", "snake-bite-detection", 1),
    ("nabeel-alanbar-2vn5y", "bruise-x5paj", 1),
    ("clinicvision", "basic-wound-classify-mpoys", 1)
]

HF_DATASETS = [
    "Nagabu/HAM10000"
    # Note: BI55/MedText is predominantly text-based so we skip standard image extraction for it
]


def setup():
    UNIFIED_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    if not LABELS_FILE.exists():
        with open(LABELS_FILE, "w") as f:
            json.dump([], f)

def clean_temp():
    if TEMP_DIR.exists():
        shutil.rmtree(TEMP_DIR)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

def append_records(records):
    with open(LABELS_FILE, "r") as f:
        data = json.load(f)
    data.extend(records)
    with open(LABELS_FILE, "w") as f:
        json.dump(data, f, indent=2)
    print(f"--> Saved {len(records)} records. Unified Dataset Total: {len(data)} images.")


# --- KAGGLE LOGIC ---
def process_kaggle():
    if not KAGGLE_AVAILABLE:
        print("Skipping Kaggle: kaggle library not installed or configured.")
        return

    for ds in KAGGLE_DATASETS:
        print(f"\\n[Kaggle] Downloading {ds}...")
        clean_temp()
        try:
            # Download and unzip instantly to TEMP_DIR
            kaggle.api.dataset_download_files(ds, path=TEMP_DIR, unzip=True)
            
            # Find all images
            all_images = []
            for ext in ["*.jpg", "*.jpeg", "*.png"]:
                all_images.extend(list(TEMP_DIR.rglob(ext)) + list(TEMP_DIR.rglob(ext.upper())))
                
            # Sample to limit
            random.shuffle(all_images)
            selected_images = all_images[:MAX_IMAGES_PER_DATASET]
            
            records = []
            for img_path in selected_images:
                # Often the folder name is the class name in Kaggle datasets
                # e.g., temp/train/Melanoma/img1.jpg -> parent is Melanoma
                condition_label = img_path.parent.name
                if condition_label.lower() in ["train", "test", "val", "images"]:
                    condition_label = img_path.parent.parent.name # Go one level up
                    
                new_filename = f"kaggle_{ds.split('/')[-1]}_{img_path.name}"
                new_path = UNIFIED_DIR / new_filename
                
                shutil.copy2(img_path, new_path)
                records.append({
                    "image_path": str(new_path.relative_to(BASE_DIR.parent)),
                    "source": f"Kaggle: {ds}",
                    "condition_label": condition_label
                })
                
            append_records(records)
        except Exception as e:
            print(f"Failed to process Kaggle {ds}: {e}")
            
        clean_temp() # Stream and purge


# --- ROBOFLOW LOGIC ---
def process_roboflow():
    if not ROBOFLOW_AVAILABLE:
        print("Skipping Roboflow: roboflow library not installed or api key missing.")
        return
        
    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        print("Skipping Roboflow: ROBOFLOW_API_KEY not set in .env")
        return

    rf = Roboflow(api_key=api_key)
    
    for workspace, project_name, version in ROBOFLOW_DATASETS:
        print(f"\\n[Roboflow] Downloading {project_name}...")
        clean_temp()
        os.chdir(TEMP_DIR) # Roboflow downloads into CWD
        try:
            project = rf.workspace(workspace).project(project_name)
            dataset = project.version(version).download("folder") # folder format groups by class
            
            ds_path = Path(dataset.location)
            
            all_images = []
            for ext in ["*.jpg", "*.jpeg", "*.png"]:
                all_images.extend(list(ds_path.rglob(ext)) + list(ds_path.rglob(ext.upper())))
                
            random.shuffle(all_images)
            selected_images = all_images[:MAX_IMAGES_PER_DATASET]
            
            records = []
            for img_path in selected_images:
                # In 'folder' export, parent directory is the class
                condition_label = img_path.parent.name
                
                new_filename = f"rf_{project_name}_{img_path.name}"
                new_path = UNIFIED_DIR / new_filename
                
                shutil.copy2(img_path, new_path)
                records.append({
                    "image_path": str(new_path.relative_to(BASE_DIR.parent)),
                    "source": f"Roboflow: {project_name}",
                    "condition_label": condition_label
                })
                
            append_records(records)
        except Exception as e:
            print(f"Failed to process Roboflow {project_name}: {e}")
            
        os.chdir(BASE_DIR)
        clean_temp() # Stream and purge


# --- HUGGINGFACE LOGIC ---
def process_huggingface():
    if not HF_AVAILABLE:
        print("Skipping HuggingFace: datasets library not installed.")
        return

    for ds in HF_DATASETS:
        print(f"\\n[HuggingFace] Processing {ds}...")
        try:
            # Load dataset in streaming mode so it doesn't download everything into cache at once
            dataset = load_dataset(ds, split="train", streaming=True)
            
            records = []
            count = 0
            
            for row in dataset:
                if count >= MAX_IMAGES_PER_DATASET:
                    break
                    
                # HF image fields usually named 'image' and label/condition varies
                if "image" in row:
                    img = row["image"]
                    # Figure out label
                    label = "Unknown"
                    if "dx" in row: # HAM10000 uses 'dx' for diagnosis
                        label = row["dx"]
                    elif "label" in row:
                        label = row["label"]
                    
                    # Convert PIL Image to RGB and save directly
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                        
                    new_filename = f"hf_{ds.split('/')[-1]}_{count}.jpg"
                    new_path = UNIFIED_DIR / new_filename
                    img.save(new_path)
                    
                    records.append({
                        "image_path": str(new_path.relative_to(BASE_DIR.parent)),
                        "source": f"HuggingFace: {ds}",
                        "condition_label": str(label)
                    })
                    count += 1
            
            append_records(records)
            
        except Exception as e:
            print(f"Failed to process HuggingFace {ds}: {e}")
            

def main():
    print("=======================================")
    print(" Starting Stream & Purge Data Pipeline ")
    print("=======================================")
    setup()
    
    process_kaggle()
    process_roboflow()
    process_huggingface()
    
    clean_temp() # Final safety purge
    
    print("\\nPipeline Complete! Data is normalized in:")
    print(f"- Images: {UNIFIED_DIR}")
    print(f"- Labels Index: {LABELS_FILE}")

if __name__ == "__main__":
    main()
