import os
import json
from bs4 import BeautifulSoup

# Define folder containing HTML files
FOLDER_PATH = './Figures'

# Keywords to skip for summary/overview pages
EXCLUDE_KEYWORDS = [
    'overview',
    'schemes',
    'tropes',
    'flowers',
    'groupings',
    'categories'
]

# Output list
output = []

# Helper function to decide whether to skip a file
def should_skip(filename):
    lower = filename.lower()
    return any(keyword in lower for keyword in EXCLUDE_KEYWORDS)

# Process a single HTML file
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

# Collect all HTML files excluding summary ones
all_files = []
for root, dirs, files in os.walk(FOLDER_PATH):
    for name in files:
        if (name.endswith('.htm') or name.endswith('.html')) and not should_skip(name):
            all_files.append(os.path.join(root, name))

print(f"Found {len(all_files)} figure files to process.")

# Process each file
for file_path in all_files:
    result = process_html(file_path)
    if result:
        output.append(result)

# Write to JSON
with open('figures_individual_data.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"Extraction complete. {len(output)} figures saved to figures_individual_data.json.")