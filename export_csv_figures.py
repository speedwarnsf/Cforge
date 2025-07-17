import json
import csv

INPUT_FILE = 'figures_all_individual_figures.json'
OUTPUT_FILE = 'figures_cleaned_for_google_sheets.csv'

# Load data
with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Prepare cleaned entries
cleaned = []
seen = set()
for entry in data:
    name = entry.get('figure_name', '').strip()
    definition = entry.get('definition', '').strip()
    examples = "; ".join(entry.get('examples', []))
    notes = "; ".join(entry.get('notes', []))
    source = entry.get('source_file', '')

    # Skip empty or junk names
    if not name or len(name) < 3:
        continue
    # Skip empty definitions
    if not definition:
        continue
    # Deduplicate by figure_name
    key = name.lower()
    if key in seen:
        continue
    seen.add(key)

    cleaned.append({
        "figure_name": name,
        "definition": definition,
        "examples": examples,
        "notes": notes,
        "source_file": source
    })

# Write to CSV
with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=[
        "figure_name",
        "definition",
        "examples",
        "notes",
        "source_file"
    ])
    writer.writeheader()
    for row in cleaned:
        writer.writerow(row)

print(f"✅ CSV export complete!")
print(f"Total cleaned entries: {len(cleaned)}")
print(f"Output file created: {OUTPUT_FILE}")