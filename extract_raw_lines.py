import os
import json
from bs4 import BeautifulSoup

FOLDER_PATH = './Figures'
OUTPUT_FILE = 'raw_lines.json'

lines = []

for root, dirs, files in os.walk(FOLDER_PATH):
    for name in files:
        if name.endswith('.htm') or name.endswith('.html'):
            file_path = os.path.join(root, name)
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                soup = BeautifulSoup(f, 'html.parser')
                paragraphs = soup.find_all('p')
                for p in paragraphs:
                    text = p.get_text("\n", strip=True)
                    # Split into individual lines
                    for line in text.split("\n"):
                        clean_line = line.strip()
                        if clean_line:
                            lines.append({
                                "source_file": file_path,
                                "text": clean_line
                            })

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(lines, f, ensure_ascii=False, indent=2)

print(f"✅ Extraction complete! {len(lines)} lines saved to {OUTPUT_FILE}")
print("Download link will be available in your Replit file manager.")