import os
import sys
from PIL import Image
from supabase import create_client

# Credenziali inserite direttamente
SUPABASE_URL = "https://tssgkiytaxmcrodrcrpu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzc2draXl0YXhtY3JvZHJjcnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzkwNDAsImV4cCI6MjEwMzYxNTA0MH0.BrQEJodD0Vbrqo_S-tiOYxgbk3CEvfnjtR6TO0L43aE"
BUCKET_NAME = "assets"
IMAGE_PATH = os.environ.get("IMAGE_PATH", "input.png")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def split_and_clean_image(image_path, output_dir="output"):
    os.makedirs(output_dir, exist_ok=True)
    img = Image.open(image_path).convert("RGBA")
    
    width, height = img.size
    mid_w, mid_h = width // 2, height // 2
    
    boxes = [
        (0, 0, mid_w, mid_h),           # 1. Front (Alto-sinistra)
        (mid_w, 0, width, mid_h),       # 2. Back (Alto-destra)
        (0, mid_h, mid_w, height),      # 3. Left (Basso-sinistra)
        (mid_w, mid_h, width, height)   # 4. Right (Basso-destra)
    ]
    
    positions = ["front", "back", "left", "right"]
    saved_files = []
    
    for i, box in enumerate(boxes):
        quadrant = img.crop(box)
        bg_color = quadrant.getpixel((0, 0))[:3]
        
        datas = quadrant.getdata()
        new_data = []
        for item in datas:
            r, g, b, a = item
            if abs(r - bg_color[0]) < 15 and abs(g - bg_color[1]) < 15 and abs(b - bg_color[2]) < 15:
                new_data.append((0, 0, 0, 0)) # Trasparente
            else:
                new_data.append(item)
                
        quadrant.putdata(new_data)
        
        output_path = os.path.join(output_dir, f"{positions[i]}.png")
        quadrant.save(output_path, "PNG")
        saved_files.append((output_path, positions[i]))
        
    return saved_files

def upload_to_supabase(file_info_list, base_folder="character_sprite"):
    for file_path, pos_name in file_info_list:
        file_name = f"{base_folder}/{pos_name}.png"
        with open(file_path, "rb") as f:
            response = supabase.storage.from_(BUCKET_NAME).upload(
                file=f,
                path=file_name,
                file_options={"upsert": "true"}
            )
        print(f"Caricato {file_name} su Supabase con successo!")

if __name__ == "__main__":
    if not os.path.exists(IMAGE_PATH):
        print(f"Errore: Immagine {IMAGE_PATH} non trovata.")
        sys.exit(1)
        
    print("Taglio e pulizia sprite in corso...")
    processed_files = split_and_clean_image(IMAGE_PATH)
    print("Upload su Supabase in corso...")
    upload_to_supabase(processed_files, base_folder="personaggi_pixel")
    print("Fatto!")
