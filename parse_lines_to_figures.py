import json

INPUT_FILE = 'raw_lines.json'
OUTPUT_FILE = 'figures_parsed.json'

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

parsed = []
current_figure = None
current_definition_lines = []
current_source = None

for entry in data:
    text = entry['text'].strip()
    source = entry['source_file']
    # If the line has 1-3 words, treat as figure name
    if text and len(text.split()) <= 3:
        if current_figure and current_definition_lines:
            parsed.append({
                "figure_name": current_figure,
                "definition": " ".join(current_definition_lines).strip(),
                "source_file": current_source
            })
        current_figure = text
        current_definition_lines = []
        current_source = source
    else:
        if text:
            current_definition_lines.append(text)

# Save the last figure if any
if current_figure and current_definition_lines:
    parsed.append({
        "figure_name": current_figure,
        "definition": " ".join(current_definition_lines).strip(),
        "source_file": current_source
    })

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(parsed, f, ensure_ascii=False, indent=2)

print(f"✅ Parsing complete! {len(parsed)} figures saved to {OUTPUT_FILE}")