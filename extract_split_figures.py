import os
import json
from bs4 import BeautifulSoup

FOLDER_PATH = './Figures'
OUTPUT_FILE = 'figures_fully_split.json'

output = []

def extract_entries_from_file(file_path):
    entries = []
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        soup = BeautifulSoup(f, 'html.parser')

        headings = soup.find_all(['h3', 'strong'])
        if headings:
            for heading in headings:
                figure_name = heading.get_text(strip=True)
                if not figure_name or len(figure_name) < 3:
                    continue

                definition = ""
                examples = []
                notes = []
                next_elem = heading.find_next_sibling()
                while next_elem and next_elem.name not in ['h3', 'strong']:
                    if next_elem.name == 'p':
                        text = next_elem.get_text(" ", strip=True)
                        if not definition:
                            definition = text
                        elif text.lower().startswith('example'):
                            examples.append(text)
                        else:
                            notes.append(text)
                    next_elem = next_elem.find_next_sibling()

                if not definition:
                    continue

                entries.append({
                    "figure_name": figure_name,
                    "definition": definition,
                    "examples": examples,
                    "notes": notes,
                    "source_file": file_path,
                    "attribution": "Silva Rhetoricae (rhetoric.byu.edu), Gideon O. Burton, Brigham Young University"
                })

        else:
            title_tag = soup.find('h2')
            if title_tag:
                figure_name = title_tag.get_text(strip=True)
                paras = soup.find_all('p')
                if paras:
                    definition = paras[0].get_text(" ", strip=True)
                    examples = []
                    notes = []
                    for p in paras[1:]:
                        text = p.get_text(" ", strip=True)
                        if text.lower().startswith('example'):
                            examples.append(text)
                        else:
                            notes.append(text)
                    if definition:
                        entries.append({
                            "figure_name": figure_name,
                            "definition": definition,
                            "examples": examples,
                            "notes": notes,
                            "source_file": file_path,
                            "attribution": "Silva Rhetoricae (rhetoric.byu.edu), Gideon O. Burton, Brigham Young University"
                        })

    return entries

all_files = []
for root, dirs, files in os.walk(FOLDER_PATH):
    for name in files:
        if name.endswith('.htm') or name.endswith('.html'):
            all_files.append(os.path.join(root, name))

print(f"Found {len(all_files)} HTML files to process.")

seen = set()
for file_path in all_files:
    entries = extract_entries_from_file(file_path)
    for e in entries:
        key = e['figure_name'].lower()
        if key not in seen:
            seen.add(key)
            output.append(e)

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"✅ Extraction complete! {len(output)} figures saved to {OUTPUT_FILE}")