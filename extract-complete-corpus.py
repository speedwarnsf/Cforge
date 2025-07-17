#!/usr/bin/env python3
"""
Extract complete 157-campaign corpus from the new RTF file
"""

import re
import json

def clean_rtf_to_json(rtf_content):
    """Convert RTF content to clean JSON"""
    
    # Remove RTF header and control sequences
    content = re.sub(r'^.*?\\strokec2\s*', '', rtf_content, flags=re.DOTALL)
    
    # Handle RTF escape sequences
    content = content.replace('\\"', '"')
    content = content.replace('\\{', '{')
    content = content.replace('\\}', '}')
    content = content.replace('\\[', '[')
    content = content.replace('\\]', ']')
    content = content.replace('\\\\', '\\')
    
    # Handle RTF smart quotes and characters
    content = content.replace("\\'92", "'")  # Smart apostrophe
    content = content.replace("\\'93", '"')  # Smart open quote
    content = content.replace("\\'94", '"')  # Smart close quote
    content = content.replace("\\'e9", 'é')  # Accented e
    content = content.replace("\\'a2", '¢')  # Cent symbol
    
    # Remove RTF line continuation backslashes
    content = re.sub(r'\\\s*\n', '', content)
    content = re.sub(r'\\\s*$', '', content, flags=re.MULTILINE)
    
    # Clean up whitespace
    content = re.sub(r'\s+', ' ', content)
    content = content.strip()
    
    # Remove any trailing RTF markup
    content = re.sub(r'\s*\}+\s*$', '', content)
    
    return content

def extract_campaigns_from_rtf(file_path):
    """Extract all campaigns from the RTF file"""
    
    print(f"📖 Reading {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        rtf_content = f.read()
    
    print(f"📏 RTF file size: {len(rtf_content):,} characters ({len(rtf_content.splitlines()):,} lines)")
    
    # Clean RTF formatting
    cleaned = clean_rtf_to_json(rtf_content)
    print(f"🧹 Cleaned size: {len(cleaned):,} characters")
    
    # The file starts with an array, so wrap it in campaigns object
    if cleaned.startswith('['):
        json_text = '{"campaigns": ' + cleaned + '}'
    else:
        json_text = cleaned
    
    # Save for debugging
    with open('debug-complete-extraction.json', 'w', encoding='utf-8') as f:
        f.write(json_text)
    
    try:
        data = json.loads(json_text)
        campaigns = data.get('campaigns', [])
        
        print(f"✅ Successfully parsed {len(campaigns)} campaigns")
        
        return campaigns
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing failed: {e}")
        print(f"💾 Debug data saved to debug-complete-extraction.json")
        
        # Try to find and fix common issues
        if 'Expecting' in str(e) and 'delimiter' in str(e):
            print("🔧 Attempting to fix JSON structure...")
            
            # Look for incomplete entries at the end
            last_brace = json_text.rfind('}')
            if last_brace > 0:
                # Try truncating to last complete entry
                truncated = json_text[:last_brace+1]
                if not truncated.endswith(']}'):
                    truncated += ']}'
                
                try:
                    data = json.loads(truncated)
                    campaigns = data.get('campaigns', [])
                    print(f"✅ Fixed! Parsed {len(campaigns)} campaigns")
                    return campaigns
                except:
                    pass
        
        return []

def main():
    rtf_file = 'attached_assets/CorpusReplacementFile2_1752617878279.rtf'
    
    campaigns = extract_campaigns_from_rtf(rtf_file)
    
    if campaigns:
        # Create the final corpus
        corpus_data = {"campaigns": campaigns}
        
        # Save the complete dataset
        with open('complete-157-corpus.json', 'w', encoding='utf-8') as f:
            json.dump(corpus_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved {len(campaigns)} campaigns to complete-157-corpus.json")
        
        # Show comprehensive statistics
        brands = set(c.get('brand', 'Unknown') for c in campaigns)
        years = [c.get('year', 0) for c in campaigns if c.get('year')]
        devices = []
        for campaign in campaigns:
            devices.extend(campaign.get('rhetoricalDevices', []))
        
        unique_devices = set(devices)
        
        print(f"\n📊 Complete Dataset Statistics:")
        print(f"   Total Campaigns: {len(campaigns)}")
        print(f"   Unique Brands: {len(brands)}")
        print(f"   Year Range: {min(years) if years else 'N/A'} - {max(years) if years else 'N/A'}")
        print(f"   Rhetorical Devices: {len(unique_devices)}")
        
        # Show most common rhetorical devices
        device_counts = {}
        for device in devices:
            device_counts[device] = device_counts.get(device, 0) + 1
        
        top_devices = sorted(device_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        print(f"\n🎯 Top Rhetorical Devices:")
        for device, count in top_devices:
            print(f"   {device}: {count} uses")
        
        # Show sample of newest campaigns
        recent = sorted(campaigns, key=lambda x: x.get('year', 0), reverse=True)[:15]
        print(f"\n🔥 Recent Campaigns (Top 15):")
        for i, campaign in enumerate(recent):
            print(f"   {i+1:2d}. {campaign.get('campaign', 'Unknown')} - {campaign.get('brand', 'Unknown')} ({campaign.get('year', 'N/A')})")
        
        if len(campaigns) >= 157:
            print(f"\n🎉 SUCCESS! Complete dataset confirmed: {len(campaigns)} campaigns")
            print(f"   This exceeds the target of 157 campaigns")
        else:
            print(f"\n⚠️  Found {len(campaigns)} campaigns, target was 157")
            print(f"   Missing: {157 - len(campaigns)} campaigns")
            
    else:
        print("❌ Extraction failed")

if __name__ == "__main__":
    main()