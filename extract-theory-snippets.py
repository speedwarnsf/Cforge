#!/usr/bin/env python3
"""
Extract and integrate visual rhetoric theory snippets into corpus
"""

import json
import re

def extract_theory_from_rtf():
    """Extract theory snippets from RTF file"""
    try:
        with open('attached_assets/TheoryAdd_1752647029708.rtf', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract JSON content from RTF
        # Look for the JSON array structure
        start_marker = '['
        end_marker = ']'
        
        start_idx = content.find(start_marker)
        end_idx = content.rfind(end_marker) + 1
        
        if start_idx == -1 or end_idx == 0:
            print("❌ No JSON array found in RTF file")
            return []
        
        # Extract the raw JSON content
        json_content = content[start_idx:end_idx]
        
        # Clean RTF formatting artifacts
        json_content = json_content.replace('\\', '')
        json_content = json_content.replace('\n    ', ' ')
        json_content = re.sub(r'\s+', ' ', json_content)
        
        # Parse JSON
        theory_data = json.loads(json_content)
        
        print(f"✅ Extracted {len(theory_data)} theory snippets")
        return theory_data
        
    except Exception as e:
        print(f"❌ Error extracting theory: {e}")
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
        
        # Ensure required fields
        if not enhanced_entry.get('whenToUse'):
            enhanced_entry['whenToUse'] = 'Visual rhetoric application in advertising design'
        if not enhanced_entry.get('whenNotToUse'):
            enhanced_entry['whenNotToUse'] = 'Direct product claims requiring literal representation'
        
        enhanced.append(enhanced_entry)
    
    return enhanced

def integrate_theory_into_corpus(corpus, theory_entries):
    """Integrate theory entries into existing corpus"""
    
    # Check for duplicates
    existing_campaigns = set()
    for campaign in corpus:
        key = f"{campaign.get('campaign', '').lower()}-{campaign.get('brand', '').lower()}"
        existing_campaigns.add(key)
    
    unique_theory = []
    duplicates = 0
    
    for theory in theory_entries:
        key = f"{theory.get('campaign', '').lower()}-{theory.get('brand', '').lower()}"
        if key not in existing_campaigns:
            unique_theory.append(theory)
            existing_campaigns.add(key)
        else:
            duplicates += 1
    
    print(f"📊 Theory integration: {len(unique_theory)} unique, {duplicates} duplicates skipped")
    
    # Add theory entries to corpus
    enhanced_corpus = corpus + unique_theory
    
    # Sort by year and type (theory entries last)
    enhanced_corpus.sort(key=lambda x: (
        0 if not x.get('isTheory') else 1,  # Regular campaigns first
        x.get('year', 0),
        x.get('brand', ''),
        x.get('campaign', '')
    ))
    
    return enhanced_corpus

def main():
    print("🔄 Integrating visual rhetoric theory into corpus...")
    
    # Extract theory from RTF
    theory_entries = extract_theory_from_rtf()
    if not theory_entries:
        print("❌ No theory entries to integrate")
        return
    
    # Load current corpus
    current_corpus = load_current_corpus()
    print(f"📊 Current corpus: {len(current_corpus)} campaigns")
    
    # Enhance theory entries
    enhanced_theory = enhance_theory_entries(theory_entries)
    
    # Integrate into corpus
    final_corpus = integrate_theory_into_corpus(current_corpus, enhanced_theory)
    
    print(f"📊 Final corpus: {len(final_corpus)} campaigns (including theory)")
    
    # Create enhanced corpus with theory
    corpus_with_theory = {"campaigns": final_corpus}
    
    # Save updated corpus
    with open('data/retrieval-corpus.json', 'w', encoding='utf-8') as f:
        json.dump(corpus_with_theory, f, indent=2, ensure_ascii=False)
    
    # Save backup
    with open('corpus-with-theory.json', 'w', encoding='utf-8') as f:
        json.dump(corpus_with_theory, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Enhanced corpus saved to data/retrieval-corpus.json")
    print(f"💾 Backup saved to corpus-with-theory.json")
    
    # Generate statistics
    theory_count = len([c for c in final_corpus if c.get('isTheory')])
    campaign_count = len(final_corpus) - theory_count
    
    # Analyze theory coverage
    theory_devices = set()
    for theory in enhanced_theory:
        devices = theory.get('rhetoricalDevices', [])
        theory_devices.update(devices)
    
    all_devices = set()
    for campaign in final_corpus:
        devices = campaign.get('rhetoricalDevices', [])
        all_devices.update(devices)
    
    print(f"\n📊 Integration Summary:")
    print(f"   Practical Campaigns: {campaign_count}")
    print(f"   Theory Frameworks: {theory_count}")
    print(f"   Total Entries: {len(final_corpus)}")
    print(f"   Visual Rhetoric Devices: {len(theory_devices)}")
    print(f"   All Rhetorical Devices: {len(all_devices)}")
    
    print(f"\n🎯 Theory Framework Coverage:")
    for theory in enhanced_theory:
        devices = ', '.join(theory.get('rhetoricalDevices', [])[:3])
        print(f"   {theory.get('brand', 'Unknown')} ({theory.get('year', 'N/A')}): {devices}")
    
    print(f"\n🎨 Visual Rhetoric Enhancement:")
    visual_devices = [d for d in theory_devices if 'visual' in d.lower()]
    print(f"   Visual-specific devices: {len(visual_devices)}")
    print(f"   Examples: {', '.join(list(visual_devices)[:5])}")
    
    return len(final_corpus)

if __name__ == "__main__":
    main()