import os
import shutil
import json
import random
import glob
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR.parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Attempt to load platform libraries
# NOTE: kaggle must be imported AFTER load_dotenv because it authenticates
# at import time using KAGGLE_USERNAME and KAGGLE_KEY env vars.
try:
    import kaggle
    KAGGLE_AVAILABLE = True
except (ImportError, OSError):
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

UNIFIED_DIR = BASE_DIR / "unified_images"
LABELS_FILE = BASE_DIR / "unified_labels.json"
TEMP_DIR = BASE_DIR.parent.parent / "temp_raw"

def make_long_path_safe(path):
    """Convert path to an absolute string with Windows long-path prefix if needed."""
    abs_path = str(Path(path).resolve())
    if os.name == 'nt' and not abs_path.startswith('\\\\?\\'):
        return '\\\\?\\' + abs_path
    return abs_path


# --- CONFIGURATION FROM ENV ---
def parse_roboflow_datasets(env_str):
    if not env_str:
        return []
    envs = []
    for item in env_str.split(","):
        parts = item.split(":")
        if len(parts) == 3:
            envs.append((parts[0].strip(), parts[1].strip(), int(parts[2].strip())))
    return envs

_KAGGLE_ENV = os.environ.get("KAGGLE_DATASETS", "")
_ROBOFLOW_ENV = os.environ.get("ROBOFLOW_DATASETS", "")
_HF_ENV = os.environ.get("HF_DATASETS", "")

KAGGLE_DATASETS = [x.strip() for x in _KAGGLE_ENV.split(",")] if _KAGGLE_ENV else []
ROBOFLOW_DATASETS = parse_roboflow_datasets(_ROBOFLOW_ENV)
HF_DATASETS = [x.strip() for x in _HF_ENV.split(",")] if _HF_ENV else []


def setup():
    UNIFIED_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    if not LABELS_FILE.exists():
        with open(LABELS_FILE, "w") as f:
            json.dump([], f)

def clean_temp():
    if TEMP_DIR.exists():
        shutil.rmtree(TEMP_DIR, ignore_errors=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

def get_completed_sources():
    """Return the set of source strings already recorded in unified_labels.json."""
    if not LABELS_FILE.exists():
        return set()
    with open(LABELS_FILE, "r") as f:
        data = json.load(f)
    return {r["source"] for r in data if "source" in r}

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

    completed = get_completed_sources()

    for ds in KAGGLE_DATASETS:
        source_key = f"Kaggle: {ds}"
        if source_key in completed:
            print(f"\\n[Kaggle] Already downloaded {ds} — skipping.")
            continue

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
                
                shutil.copy2(make_long_path_safe(img_path), make_long_path_safe(new_path))
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
    
    completed = get_completed_sources()

    for workspace, project_name, version in ROBOFLOW_DATASETS:
        source_key = f"Roboflow: {project_name}"
        if source_key in completed:
            print(f"\\n[Roboflow] Already downloaded {project_name} — skipping.")
            continue

        print(f"\\n[Roboflow] Downloading {project_name}...")
        clean_temp()
        os.chdir(make_long_path_safe(str(TEMP_DIR))) # Roboflow downloads into CWD. Use long path to protect zip extraction
        try:
            project = rf.workspace(workspace).project(project_name)

            # Try "multiclass" first (works for detection/segmentation projects).
            # If the project is a pure classification type, fall back to "folder".
            dataset = None
            for fmt in ["multiclass", "folder"]:
                try:
                    dataset = project.version(version).download(fmt)
                    break
                except Exception as fmt_err:
                    err_str = str(fmt_err)
                    if "invalid format" in err_str and fmt == "multiclass":
                        print(f"  'multiclass' not supported for {project_name}, retrying with 'folder'...")
                        continue
                    raise  # Re-raise unexpected errors

            if dataset is None:
                print(f"Could not download {project_name} in any supported format — skipping.")
                os.chdir(BASE_DIR)
                clean_temp()
                continue

            ds_path = Path(dataset.location)
            
            all_images = []
            for ext in ["*.jpg", "*.jpeg", "*.png"]:
                all_images.extend(list(ds_path.rglob(ext)) + list(ds_path.rglob(ext.upper())))
                
            random.shuffle(all_images)
            selected_images = all_images[:MAX_IMAGES_PER_DATASET]
            
            records = []
            for img_path in selected_images:
                # Parent directory is the class label in both "multiclass" and "folder" exports
                condition_label = img_path.parent.name
                if condition_label.lower() in ["train", "test", "val", "valid", "images"]:
                    condition_label = img_path.parent.parent.name
                
                # Truncate long filenames to avoid Windows MAX_PATH errors
                stem = img_path.stem[:80]
                safe_name = f"{stem}{img_path.suffix}"
                new_filename = f"rf_{project_name}_{safe_name}"
                new_path = UNIFIED_DIR / new_filename
                
                shutil.copy2(make_long_path_safe(img_path), make_long_path_safe(new_path))
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

    completed = get_completed_sources()

    for ds in HF_DATASETS:
        source_key = f"HuggingFace: {ds}"
        if source_key in completed:
            print(f"\\n[HuggingFace] Already downloaded {ds} — skipping.")
            continue

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
