#!/usr/bin/env python3
"""
Robust corpus extraction with proper unicode handling
"""

import re
import json

def clean_rtf_content(content):
    """Clean RTF content with comprehensive escape handling"""
    
    # Remove RTF header
    content = re.sub(r'^.*?\\strokec2\s*', '', content, flags=re.DOTALL)
    
    # Handle all RTF escape sequences
    replacements = {
        '\\"': '"',
        '\\{': '{',
        '\\}': '}',
        '\\[': '[',
        '\\]': ']',
        '\\\\': '\\',
        "\\'92": "'",  # Smart apostrophe
        "\\'93": '"',  # Smart open quote
        "\\'94": '"',  # Smart close quote
        "\\'e9": 'é',  # Accented e
        "\\'a2": '¢',  # Cent symbol
        "\\'96": '–',  # En dash
        "\\'97": '—',  # Em dash
        "\\'85": '…',  # Ellipsis
        "\\'91": "'",  # Left single quote
        "\\'99": "™",  # Trademark
        "\\'ae": "®",  # Registered
        "\\'a9": "©",  # Copyright
    }
    
    for rtf_code, replacement in replacements.items():
        content = content.replace(rtf_code, replacement)
    
    # Handle remaining RTF control codes
    content = re.sub(r'\\[a-z]+\d*\s*', '', content)
    content = re.sub(r'\\[^a-z\s]', '', content)
    
    # Remove line continuation backslashes
    content = re.sub(r'\\\s*\n', '', content)
    content = re.sub(r'\\\s*$', '', content, flags=re.MULTILINE)
    
    # Clean whitespace
    content = re.sub(r'\s+', ' ', content)
    content = content.strip()
    
    # Remove trailing RTF markers
    content = re.sub(r'\s*\}+\s*$', '', content)
    
    return content

def extract_and_validate_json(content):
    """Extract and validate JSON with error recovery"""
    
    # If content starts with array, wrap it
    if content.startswith('['):
        json_content = '{"campaigns": ' + content + '}'
    else:
        json_content = content
    
    # Try parsing as-is first
    try:
        data = json.loads(json_content)
        return data.get('campaigns', [])
    except json.JSONDecodeError as e:
        print(f"⚠️  Initial parsing failed: {e}")
        
        # Find the error position and try to fix
        error_pos = getattr(e, 'pos', 0)
        
        # Look for incomplete entries near the error
        if error_pos > 0:
            # Find the last complete campaign entry before the error
            before_error = json_content[:error_pos]
            last_complete = before_error.rfind('},')
            
            if last_complete > 0:
                # Truncate to last complete entry
                truncated = json_content[:last_complete+1] + ']}'
                print(f"🔧 Truncating to position {last_complete+1}")
                
                try:
                    data = json.loads(truncated)
                    campaigns = data.get('campaigns', [])
                    print(f"✅ Recovery successful: {len(campaigns)} campaigns")
                    return campaigns
                except json.JSONDecodeError as e2:
                    print(f"❌ Recovery failed: {e2}")
        
        # Final attempt: try to extract individual campaign objects
        print("🔧 Attempting manual campaign extraction...")
        campaign_pattern = r'\{[^{}]*"campaign"[^{}]*\}'
        matches = re.findall(campaign_pattern, json_content, re.DOTALL)
        
        valid_campaigns = []
        for match in matches:
            try:
                campaign = json.loads(match)
                if 'campaign' in campaign:
                    valid_campaigns.append(campaign)
            except:
                continue
        
        if valid_campaigns:
            print(f"✅ Manual extraction: {len(valid_campaigns)} campaigns")
            return valid_campaigns
        
        return []

def main():
    rtf_file = 'attached_assets/CorpusReplacementFile2_1752617878279.rtf'
    
    print(f"🚀 Extracting complete corpus from {rtf_file}")
    
    with open(rtf_file, 'r', encoding='utf-8') as f:
        rtf_content = f.read()
    
    print(f"📏 File size: {len(rtf_content):,} characters")
    
    # Clean the RTF content
    cleaned = clean_rtf_content(rtf_content)
    print(f"🧹 Cleaned to: {len(cleaned):,} characters")
    
    # Save cleaned version for debugging
    with open('debug-cleaned-final.txt', 'w', encoding='utf-8') as f:
        f.write(cleaned)
    
    # Extract campaigns with error recovery
    campaigns = extract_and_validate_json(cleaned)
    
    if campaigns:
        # Save the complete corpus
        corpus_data = {"campaigns": campaigns}
        
        with open('complete-157-corpus.json', 'w', encoding='utf-8') as f:
            json.dump(corpus_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Saved {len(campaigns)} campaigns to complete-157-corpus.json")
        
        # Generate comprehensive statistics
        brands = set(c.get('brand', '') for c in campaigns)
        years = [c.get('year', 0) for c in campaigns if isinstance(c.get('year'), int)]
        
        all_devices = []
        for campaign in campaigns:
            devices = campaign.get('rhetoricalDevices', [])
            if isinstance(devices, list):
                all_devices.extend(devices)
        
        unique_devices = set(all_devices)
        
        print(f"\n📊 Dataset Analysis:")
        print(f"   Total Campaigns: {len(campaigns)}")
        print(f"   Unique Brands: {len(brands)}")
        print(f"   Year Range: {min(years) if years else 'N/A'} - {max(years) if years else 'N/A'}")
        print(f"   Rhetorical Devices: {len(unique_devices)}")
        
        # Show top brands by campaign count
        brand_counts = {}
        for campaign in campaigns:
            brand = campaign.get('brand', 'Unknown')
            brand_counts[brand] = brand_counts.get(brand, 0) + 1
        
        top_brands = sorted(brand_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        print(f"\n🏢 Top Brands by Campaign Count:")
        for brand, count in top_brands:
            print(f"   {brand}: {count} campaigns")
        
        # Show device usage
        device_counts = {}
        for device in all_devices:
            device_counts[device] = device_counts.get(device, 0) + 1
        
        top_devices = sorted(device_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        print(f"\n🎯 Most Used Rhetorical Devices:")
        for device, count in top_devices:
            print(f"   {device}: {count} uses")
        
        # Show recent campaigns
        recent = sorted([c for c in campaigns if c.get('year', 0) > 2020], 
                       key=lambda x: x.get('year', 0), reverse=True)[:10]
        print(f"\n🔥 Recent Campaigns (2021+):")
        for i, campaign in enumerate(recent):
            print(f"   {i+1:2d}. {campaign.get('campaign', 'Unknown')} - {campaign.get('brand', 'Unknown')} ({campaign.get('year', 'N/A')})")
        
        # Check target completion
        if len(campaigns) >= 157:
            print(f"\n🎉 SUCCESS! Complete dataset: {len(campaigns)} campaigns")
            print(f"   Exceeds target of 157 campaigns by {len(campaigns) - 157}")
        else:
            print(f"\n📊 Current status: {len(campaigns)}/157 campaigns")
            print(f"   {157 - len(campaigns)} campaigns short of target")
            
        return len(campaigns)
    else:
        print("❌ No campaigns extracted")
        return 0

if __name__ == "__main__":
    main()