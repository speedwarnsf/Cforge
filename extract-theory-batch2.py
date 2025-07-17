#!/usr/bin/env python3
"""
Extract and integrate second batch of visual rhetoric theory snippets
"""

import json
import re

def extract_theory_from_rtf():
    """Extract theory snippets from second RTF file"""
    try:
        with open('attached_assets/TheoryAdd2_1752647706818.rtf', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract JSON content from RTF
        start_marker = '['
        end_marker = ']'
        
        start_idx = content.find(start_marker)
        end_idx = content.rfind(end_marker) + 1
        
        if start_idx == -1 or end_idx == 0:
            print("❌ No JSON array found in RTF file")
            return []
        
        # Extract and clean JSON content
        json_content = content[start_idx:end_idx]
        json_content = json_content.replace('\\', '')
        json_content = json_content.replace('\n    ', ' ')
        json_content = re.sub(r'\s+', ' ', json_content)
        
        # Parse JSON
        theory_data = json.loads(json_content)
        
        print(f"✅ Extracted {len(theory_data)} theory snippets from batch 2")
        return theory_data
        
    except Exception as e:
        print(f"❌ Error extracting theory batch 2: {e}")
        return []

def load_current_corpus():
    """Load current corpus"""
    try:
        with open('data/retrieval-corpus.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('campaigns', [])
    except FileNotFoundError:
        print("❌ Current corpus not found")
        return []

def filter_new_theories(theory_entries, existing_corpus):
    """Filter out theories that already exist in corpus"""
    existing_keys = set()
    
    for campaign in existing_corpus:
        key = f"{campaign.get('campaign', '').lower().strip()}-{campaign.get('brand', '').lower().strip()}"
        existing_keys.add(key)
    
    new_theories = []
    duplicates = []
    
    for theory in theory_entries:
        key = f"{theory.get('campaign', '').lower().strip()}-{theory.get('brand', '').lower().strip()}"
        if key not in existing_keys:
            new_theories.append(theory)
            existing_keys.add(key)
        else:
            duplicates.append(theory)
    
    print(f"📊 Filtering results: {len(new_theories)} new, {len(duplicates)} duplicates")
    
    return new_theories, duplicates

def enhance_theory_entries(theory_entries):
    """Enhance theory entries with additional metadata"""
    enhanced = []
    
    for entry in theory_entries:
        enhanced_entry = entry.copy()
        
        # Add metadata for theory entries
        enhanced_entry['isTheory'] = True
        enhanced_entry['outcome'] = 'Academic Framework'
        enhanced_entry['impactMetric'] = 'Foundational Theory'
        enhanced_entry['award'] = 'Theoretical Framework'
        
        # Ensure required fields exist
        if not enhanced_entry.get('whenToUse'):
            enhanced_entry['whenToUse'] = 'Visual rhetoric application in advertising design'
        if not enhanced_entry.get('whenNotToUse'):
            enhanced_entry['whenNotToUse'] = 'Direct product claims requiring literal representation'
        
        enhanced.append(enhanced_entry)
    
    return enhanced

def integrate_into_corpus(corpus, new_theories):
    """Integrate new theory entries into existing corpus"""
    
    # Add new theories to corpus
    enhanced_corpus = corpus + new_theories
    
    # Sort by type and year (theories at end, sorted by year)
    enhanced_corpus.sort(key=lambda x: (
        0 if not x.get('isTheory') else 1,  # Regular campaigns first
        x.get('year', 0),
        x.get('brand', ''),
        x.get('campaign', '')
    ))
    
    return enhanced_corpus

def main():
    print("🔄 Integrating second batch of visual rhetoric theory...")
    
    # Extract new theory snippets
    theory_entries = extract_theory_from_rtf()
    if not theory_entries:
        print("❌ No theory entries to integrate")
        return
    
    # Load current corpus
    current_corpus = load_current_corpus()
    print(f"📊 Current corpus: {len(current_corpus)} entries")
    
    # Filter out duplicates
    new_theories, duplicates = filter_new_theories(theory_entries, current_corpus)
    
    if duplicates:
        print(f"⚠️ Skipped duplicates:")
        for dup in duplicates[:3]:
            print(f"   - {dup.get('campaign', 'Unknown')} ({dup.get('brand', 'Unknown')})")
    
    if not new_theories:
        print("ℹ️ No new theories to add (all were duplicates)")
        return
    
    # Enhance new theory entries
    enhanced_theories = enhance_theory_entries(new_theories)
    
    # Integrate into corpus
    final_corpus = integrate_into_corpus(current_corpus, enhanced_theories)
    
    print(f"📊 Final corpus: {len(final_corpus)} entries")
    
    # Create enhanced corpus
    corpus_with_new_theory = {"campaigns": final_corpus}
    
    # Save updated corpus
    with open('data/retrieval-corpus.json', 'w', encoding='utf-8') as f:
        json.dump(corpus_with_new_theory, f, indent=2, ensure_ascii=False)
    
    # Save backup
    with open('corpus-with-theory-batch2.json', 'w', encoding='utf-8') as f:
        json.dump(corpus_with_new_theory, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Enhanced corpus saved to data/retrieval-corpus.json")
    print(f"💾 Backup saved to corpus-with-theory-batch2.json")
    
    # Generate statistics
    theory_count = len([c for c in final_corpus if c.get('isTheory')])
    campaign_count = len(final_corpus) - theory_count
    
    # Analyze new theory coverage
    new_devices = set()
    for theory in enhanced_theories:
        devices = theory.get('rhetoricalDevices', [])
        new_devices.update(devices)
    
    all_devices = set()
    for campaign in final_corpus:
        devices = campaign.get('rhetoricalDevices', [])
        all_devices.update(devices)
    
    print(f"\n📊 Integration Summary:")
    print(f"   Practical Campaigns: {campaign_count}")
    print(f"   Theory Frameworks: {theory_count}")
    print(f"   Total Entries: {len(final_corpus)}")
    print(f"   New Visual Devices Added: {len(new_devices)}")
    print(f"   Total Rhetorical Devices: {len(all_devices)}")
    
    print(f"\n🎯 New Theory Framework Coverage:")
    for theory in enhanced_theories:
        devices = ', '.join(theory.get('rhetoricalDevices', [])[:3])
        year = theory.get('year', 'N/A')
        brand = theory.get('brand', 'Unknown')
        print(f"   {brand} ({year}): {devices}")
    
    print(f"\n🎨 Visual Rhetoric Enhancement (Batch 2):")
    visual_devices = [d for d in new_devices if 'visual' in d.lower()]
    print(f"   New visual-specific devices: {len(visual_devices)}")
    if visual_devices:
        print(f"   Examples: {', '.join(list(visual_devices)[:5])}")
    
    # Show year span of new theories
    theory_years = [t.get('year', 0) for t in enhanced_theories if t.get('year')]
    if theory_years:
        print(f"\n📅 New Theory Timeline:")
        print(f"   Year range: {min(theory_years)}-{max(theory_years)}")
        print(f"   Spanning {max(theory_years) - min(theory_years)} years")
    
    return len(final_corpus)

if __name__ == "__main__":
    main()