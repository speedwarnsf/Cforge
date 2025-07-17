import os
import json
from bs4 import BeautifulSoup

FOLDER_PATH = './Figures'
output = []

def process_html(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        soup = BeautifulSoup(f, 'html.parser')
        title_tag = soup.find('h2')
        if not title_tag:
            return None

        figure_name = title_tag.get_text(strip=True)
        paras = soup.find_all('p')
        if not paras:
            return None

        definition = paras[0].get_text(" ", strip=True)

        examples = []
        notes = []
        for p in paras[1:]:
            text = p.get_text(" ", strip=True)
            if text.lower().startswith('example'):
                examples.append(text)
            else:
                notes.append(text)

        return {
            "figure_name": figure_name,
            "definition": definition,
            "examples": examples,
            "notes": notes,
            "source_file": file_path,
            "attribution": "Silva Rhetoricae (rhetoric.byu.edu), Gideon O. Burton, Brigham Young University"
        }

all_files = []
for root, dirs, files in os.walk(FOLDER_PATH):
    if root == FOLDER_PATH:
        continue
    for name in files:
        if name.endswith('.htm') or name.endswith('.html'):
            all_files.append(os.path.join(root, name))

print(f"Found {len(all_files)} individual figure files to process.")

for file_path in all_files:
    result = process_html(file_path)
    if result:
        output.append(result)

with open('figures_individual_data.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"Extraction complete. {len(output)} figures saved to figures_individual_data.json.")