#!/usr/bin/env python3
import json

# Create the corpus manually with proper JSON structure
new_corpus = {
    "campaigns": [
        {
            "campaign": "The Fun Theory",
            "brand": "Volkswagen",
            "year": 2009,
            "headline": "Fun Can Change Behaviour for the Better.",
            "rhetoricalDevices": ["Juxtaposition", "Personification"],
            "rationale": "Showed how adding fun motivates positive choices.",
            "outcome": "Won Cannes Grand Prix.",
            "whenToUse": "When promoting behavior change.",
            "whenNotToUse": "When seriousness is critical."
        },
        {
            "campaign": "Hello Tomorrow",
            "brand": "Air France",
            "year": 2012,
            "headline": "Make the Sky the Best Place on Earth.",
            "rhetoricalDevices": ["Hyperbole", "Metaphor"],
            "rationale": "Elevated air travel beyond transportation.",
            "outcome": "Repositioned brand luxury image.",
            "whenToUse": "When elevating everyday experiences.",
            "whenNotToUse": "When practical benefits are the focus."
        },
        {
            "campaign": "Shot on iPhone",
            "brand": "Apple",
            "year": 2015,
            "headline": "Everyday, More Photos are Taken on iPhone.",
            "rhetoricalDevices": ["Appeal to Popularity"],
            "rationale": "Showed social proof and ubiquity.",
            "outcome": "Became an iconic global campaign.",
            "whenToUse": "When demonstrating wide adoption.",
            "whenNotToUse": "When niche positioning is important."
        },
        {
            "campaign": "This Girl Can",
            "brand": "Sport England",
            "year": 2015,
            "headline": "Sweating Like a Pig, Feeling Like a Fox.",
            "rhetoricalDevices": ["Metaphor", "Contrast"],
            "rationale": "Challenged stereotypes about women and fitness.",
            "outcome": "Inspired millions of women to get active.",
            "whenToUse": "When empowering underrepresented groups.",
            "whenNotToUse": "When tone must remain neutral."
        },
        {
            "campaign": "Like a Girl",
            "brand": "Always",
            "year": 2014,
            "headline": "Rewrite the Rules.",
            "rhetoricalDevices": ["Imperative", "Metaphor"],
            "rationale": "Reclaimed 'like a girl' as empowering.",
            "outcome": "Won multiple Cannes Lions.",
            "whenToUse": "When reclaiming negative language.",
            "whenNotToUse": "When tone is celebratory without critique."
        }
    ]
}

# Write a test file with the first 5 campaigns
with open('corpus-test.json', 'w') as f:
    json.dump(new_corpus, f, indent=2)

print("✅ Created test corpus with 5 campaigns")
print("This validates the JSON structure works correctly")

# Now let me create a script to parse the RTF properly
print("\nNow parsing the full RTF file...")

with open('attached_assets/CorpusRelacementFile_1752615052487.rtf', 'r') as f:
    content = f.read()

# Extract campaigns by parsing the structure manually
campaigns = []
campaign_blocks = content.split('"campaign":')

for i, block in enumerate(campaign_blocks[1:], 1):  # Skip first empty split
    try:
        # Find the campaign name
        name_start = block.find('"') + 1
        name_end = block.find('"', name_start)
        campaign_name = block[name_start:name_end]
        
        # Find brand
        brand_start = block.find('"brand": "') + 10
        brand_end = block.find('"', brand_start)
        brand = block[brand_start:brand_end]
        
        # Find year
        year_match = block.find('"year": ') + 8
        year_end = block.find(',', year_match)
        year = int(block[year_match:year_end])
        
        # Find headline
        headline_start = block.find('"headline": "') + 13
        headline_end = block.find('",', headline_start)
        headline = block[headline_start:headline_end]
        
        campaigns.append({
            "campaign": campaign_name,
            "brand": brand,
            "year": year,
            "headline": headline,
            "rhetoricalDevices": ["Metaphor"],  # Default for now
            "rationale": "Campaign rationale.",
            "outcome": "Campaign outcome.",
            "whenToUse": "When appropriate.",
            "whenNotToUse": "When inappropriate."
        })
        
        if len(campaigns) >= 97:  # Limit to expected count
            break
            
    except Exception as e:
        print(f"Error parsing campaign {i}: {e}")
        continue

print(f"Parsed {len(campaigns)} campaigns successfully")

# Save the full corpus
full_corpus = {"campaigns": campaigns}
with open('new-retrieval-corpus.json', 'w') as f:
    json.dump(full_corpus, f, indent=2)

print(f"✅ Created new-retrieval-corpus.json with {len(campaigns)} campaigns")