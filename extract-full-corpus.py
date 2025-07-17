#!/usr/bin/env python3
"""
Comprehensive RTF corpus extraction tool
Extracts all campaigns from the RTF file to ensure we get all 157 expected entries
"""

import re
import json

def extract_campaigns_from_rtf(file_path):
    """Extract all campaigns from RTF file with robust pattern matching"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"📁 File size: {len(content):,} characters")
    
    # Count total campaign entries
    campaign_patterns = [
        r'\\"campaign\\"',
        r'"campaign"',
        r'campaign.*:',
    ]
    
    for pattern in campaign_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        print(f"🔍 Pattern '{pattern}': {len(matches)} matches")
    
    # Find the JSON structure in RTF
    # RTF escapes quotes and backslashes, so we need to handle that
    
    # Look for the campaigns array start
    start_pattern = r'\\"campaigns\\":\s*\['
    start_match = re.search(start_pattern, content)
    
    if not start_match:
        print("❌ Could not find campaigns array start")
        return []
    
    print(f"✅ Found campaigns array at position {start_match.start()}")
    
    # Extract everything from campaigns start to end
    start_pos = start_match.start()
    
    # Find the matching closing bracket
    bracket_count = 0
    in_string = False
    escape_next = False
    campaigns_content = ""
    
    i = start_pos
    while i < len(content):
        char = content[i]
        
        if escape_next:
            escape_next = False
            campaigns_content += char
            i += 1
            continue
            
        if char == '\\':
            escape_next = True
            campaigns_content += char
            i += 1
            continue
            
        if char == '"' and not escape_next:
            in_string = not in_string
            
        if not in_string:
            if char == '[':
                bracket_count += 1
            elif char == ']':
                bracket_count -= 1
                
        campaigns_content += char
        
        if bracket_count == 0 and char == ']':
            break
            
        i += 1
    
    print(f"📝 Extracted {len(campaigns_content):,} characters of campaigns data")
    
    # Clean up RTF formatting
    # Remove RTF escaping
    cleaned = campaigns_content.replace('\\"', '"')
    cleaned = cleaned.replace('\\\\', '\\')
    cleaned = cleaned.replace('\\\n', '')
    cleaned = cleaned.replace('\\', '')
    
    # Remove RTF line breaks and formatting
    cleaned = re.sub(r'\s*\\\s*', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    print(f"🧹 Cleaned to {len(cleaned):,} characters")
    
    # Extract just the array content
    array_match = re.search(r'"campaigns":\s*(\[.*\])', cleaned, re.DOTALL)
    
    if not array_match:
        print("❌ Could not extract campaigns array")
        return []
    
    array_content = array_match.group(1)
    print(f"📊 Found campaigns array: {len(array_content):,} characters")
    
    try:
        campaigns = json.loads(array_content)
        print(f"✅ Successfully parsed {len(campaigns)} campaigns")
        return campaigns
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
        
        # Save the cleaned content for debugging
        with open('debug-extracted-content.json', 'w') as f:
            f.write(array_content)
        print("💾 Saved debug content to debug-extracted-content.json")
        
        # Try to extract individual campaign objects
        campaign_objects = re.findall(r'\{[^}]*"campaign"[^}]*\}', array_content, re.DOTALL)
        print(f"🔧 Found {len(campaign_objects)} individual campaign objects")
        
        return []

def main():
    rtf_file = 'attached_assets/CorpusRelacementFile_1752615052487.rtf'
    
    print("🚀 Starting comprehensive RTF extraction...")
    campaigns = extract_campaigns_from_rtf(rtf_file)
    
    if campaigns:
        # Save the extracted campaigns
        corpus_data = {"campaigns": campaigns}
        
        with open('full-extracted-corpus.json', 'w', encoding='utf-8') as f:
            json.dump(corpus_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved {len(campaigns)} campaigns to full-extracted-corpus.json")
        
        # Show some stats
        brands = set(c.get('brand', 'Unknown') for c in campaigns)
        years = [c.get('year', 0) for c in campaigns if c.get('year')]
        
        print(f"📈 Brands: {len(brands)}")
        print(f"📅 Year range: {min(years) if years else 'N/A'} - {max(years) if years else 'N/A'}")
        
        # Show first few campaigns
        print(f"\n📋 First 5 campaigns:")
        for i, campaign in enumerate(campaigns[:5]):
            print(f"  {i+1}. {campaign.get('campaign', 'Unknown')} - {campaign.get('brand', 'Unknown')} ({campaign.get('year', 'N/A')})")
            
    else:
        print("❌ No campaigns extracted")

if __name__ == "__main__":
    main()