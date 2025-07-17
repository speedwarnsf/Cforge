import json
import csv

INPUT_FILE = "figures_all_individual_figures.json"
OUTPUT_FILE = "figures_cleaned.csv"

try:
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"ERROR: {INPUT_FILE} not found.")
    exit()

cleaned = []
seen = set()
for entry in data:
    name = entry.get("figure_name", "").strip()
    definition = entry.get("definition", "").strip()
    examples = "; ".join(entry.get("examples", []))
    notes = "; ".join(entry.get("notes", []))
    source = entry.get("source_file", "")

    # Skip if no name or too short
    if not name or len(name) < 3:
        continue
    # Skip if no definition
    if not definition:
        continue

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

with open(OUTPUT_FILE, "w", encoding="utf-8", newline="") as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=[
        "figure_name", "definition", "examples", "notes", "source_file"
    ])
    writer.writeheader()
    writer.writerows(cleaned)

print("✅ CSV conversion complete!")
print(f"Input records: {len(data)}")
print(f"Cleaned records saved: {len(cleaned)}")
print(f"Output file created: {OUTPUT_FILE}")