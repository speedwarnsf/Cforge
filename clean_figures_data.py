import json

INPUT_FILE = 'figures_all_individual_figures.json'
OUTPUT_FILE = 'figures_all_individual_figures_cleaned.json'

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

cleaned = []

seen = set()
for entry in data:
    name = entry.get('figure_name', '').strip()
    definition = entry.get('definition', '').strip()

    # Skip if no name or name too short
    if not name or len(name) < 3:
        continue
    # Skip if no definition
    if not definition:
        continue
    # Optionally deduplicate by name
    key = name.lower()
    if key in seen:
        continue
    seen.add(key)

    cleaned.append(entry)

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(cleaned, f, ensure_ascii=False, indent=2)

print(f"Cleaned {len(cleaned)} figures saved to {OUTPUT_FILE}.")