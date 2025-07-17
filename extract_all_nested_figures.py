import os
import json
from bs4 import BeautifulSoup

FOLDER_PATH = './Figures'
output = []

def extract_entries_from_file(file_path):
    entries = []
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        soup = BeautifulSoup(f, 'html.parser')

        # Case 1: Pages with multiple <h3> or <strong> headings
        headings = soup.find_all(['h3', 'strong'])
        if headings:
            for heading in headings:
                figure_name = heading.get_text(strip=True)
                # Collect the sibling paragraphs until the next heading
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
                entries.append({
                    "figure_name": figure_name,
                    "definition": definition,
                    "examples": examples,
                    "notes": notes,
                    "source_file": file_path,
                    "attribution": "Silva Rhetoricae (rhetoric.byu.edu), Gideon O. Burton, Brigham Young University"
                })
        else:
            # Case 2: Pages with a single <h2>
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

for file_path in all_files:
    entries = extract_entries_from_file(file_path)
    output.extend(entries)

with open('figures_all_individual_figures.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"Extraction complete. {len(output)} figures saved to figures_all_individual_figures.json.")