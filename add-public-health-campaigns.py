#!/usr/bin/env python3
"""
Add 38 public health and non-profit campaigns to reach 200 total campaigns
"""

import json

def load_existing_corpus():
    """Load current corpus"""
    try:
        with open('data/retrieval-corpus.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('campaigns', [])
    except FileNotFoundError:
        print("❌ Current corpus not found")
        return []

def load_public_health_campaigns():
    """Load public health campaigns from attached file"""
    try:
        with open('attached_assets/Pasted--campaign-America-s-AIDS-Campaign-brand-Ad-Council-CDC-year-1987-headline-A-1752632284736_1752632284737.txt', 'r', encoding='utf-8') as f:
            content = f.read()
            # Extract the JSON array from the file
            start_marker = '['
            end_marker = ']'
            
            start_idx = content.find(start_marker)
            end_idx = content.rfind(end_marker) + 1
            
            if start_idx == -1 or end_idx == 0:
                print("❌ No JSON array found in file")
                return []
                
            json_content = content[start_idx:end_idx]
            data = json.loads(json_content)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"❌ Error loading public health campaigns: {e}")
        return []

def create_campaign_key(campaign):
    """Create unique key for deduplication"""
    campaign_name = campaign.get('campaign', '').strip().lower()
    brand = campaign.get('brand', '').strip().lower()
    year = campaign.get('year', 0)
    return f"{campaign_name}|{brand}|{year}"

def deduplicate_campaigns(existing, new_campaigns):
    """Remove duplicates between existing and new campaigns"""
    
    existing_keys = set()
    for campaign in existing:
        key = create_campaign_key(campaign)
        existing_keys.add(key)
    
    unique_new = []
    duplicates = []
    
    for campaign in new_campaigns:
        key = create_campaign_key(campaign)
        
        if key in existing_keys:
            duplicates.append(campaign)
        else:
            unique_new.append(campaign)
            existing_keys.add(key)
    
    return unique_new, duplicates

def main():
    print("🔄 Adding public health and non-profit campaigns to reach 200 total...")
    
    # Load existing corpus
    existing_campaigns = load_existing_corpus()
    print(f"📊 Current corpus: {len(existing_campaigns)} campaigns")
    
    # Load public health campaigns
    new_campaigns = load_public_health_campaigns()
    print(f"📊 Public health campaigns to add: {len(new_campaigns)} campaigns")
    
    if not new_campaigns:
        print("❌ No campaigns to add")
        return
    
    # Remove duplicates
    unique_new, duplicates = deduplicate_campaigns(existing_campaigns, new_campaigns)
    
    print(f"✅ Unique public health campaigns: {len(unique_new)}")
    if duplicates:
        print(f"🔄 Duplicates found: {len(duplicates)}")
        for dup in duplicates[:5]:  # Show first 5
            print(f"   - {dup.get('campaign', 'Unknown')} ({dup.get('brand', 'Unknown')}, {dup.get('year', 'N/A')})")
        if len(duplicates) > 5:
            print(f"   ... and {len(duplicates) - 5} more")
    
    # Combine campaigns
    all_campaigns = existing_campaigns + unique_new
    
    # Sort by year and brand
    all_campaigns.sort(key=lambda x: (x.get('year', 0), x.get('brand', ''), x.get('campaign', '')))
    
    # Create final corpus
    final_corpus = {"campaigns": all_campaigns}
    
    # Save updated corpus
    with open('data/retrieval-corpus.json', 'w', encoding='utf-8') as f:
        json.dump(final_corpus, f, indent=2, ensure_ascii=False)
    
    # Save backup
    with open('corpus-with-public-health.json', 'w', encoding='utf-8') as f:
        json.dump(final_corpus, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Updated corpus saved to data/retrieval-corpus.json")
    print(f"💾 Backup saved to corpus-with-public-health.json")
    
    # Generate comprehensive statistics
    brands = set(c.get('brand', '') for c in all_campaigns)
    years = [c.get('year', 0) for c in all_campaigns if isinstance(c.get('year'), int)]
    
    all_devices = []
    for campaign in all_campaigns:
        devices = campaign.get('rhetoricalDevices', [])
        if isinstance(devices, list):
            all_devices.extend(devices)
    
    unique_devices = set(all_devices)
    
    print(f"\n📊 Final Dataset Statistics:")
    print(f"   Total Campaigns: {len(all_campaigns)}")
    print(f"   Unique Brands: {len(brands)}")
    print(f"   Year Range: {min(years) if years else 'N/A'} - {max(years) if years else 'N/A'}")
    print(f"   Rhetorical Devices: {len(unique_devices)}")
    
    # Show 200 campaign milestone achievement
    print(f"\n🎯 200 CAMPAIGN MILESTONE:")
    if len(all_campaigns) >= 200:
        print(f"   ✅ MILESTONE ACHIEVED! {len(all_campaigns)} campaigns")
        print(f"   📈 Exceeds 200 target by {len(all_campaigns) - 200} campaigns")
    else:
        print(f"   📊 Progress: {len(all_campaigns)}/200 campaigns")
        print(f"   🔄 Need {200 - len(all_campaigns)} more to reach 200")
    
    # Show public health campaigns added
    public_health_campaigns = [c for c in unique_new if any(keyword in c.get('brand', '').lower() 
                              for keyword in ['council', 'foundation', 'health', 'cdc', 'fda', 'promise', 'prevention'])]
    print(f"\n🏥 Public Health Campaigns Added:")
    for i, campaign in enumerate(public_health_campaigns[:15]):
        outcome = campaign.get('outcome', '')
        award = 'Effie' if 'Effie' in outcome else 'Clio' if 'Clio' in outcome else 'Lions' if 'Lions' in outcome else ''
        print(f"   {i+1:2d}. {campaign.get('campaign', 'Unknown')} - {campaign.get('brand', 'Unknown')} ({campaign.get('year', 'N/A')}) {award}")
    
    # Show campaign types distribution
    campaign_types = {
        'Public Health': 0,
        'Safety': 0,
        'Mental Health': 0,
        'Anti-Smoking': 0,
        'Disease Awareness': 0,
        'Social Causes': 0
    }
    
    for campaign in unique_new:
        brand = campaign.get('brand', '').lower()
        campaign_name = campaign.get('campaign', '').lower()
        
        if any(keyword in brand for keyword in ['health', 'cdc', 'fda']):
            campaign_types['Public Health'] += 1
        elif any(keyword in brand for keyword in ['safety', 'nhtsa', 'prevention']):
            campaign_types['Safety'] += 1
        elif 'mental' in campaign_name or 'mental' in brand:
            campaign_types['Mental Health'] += 1
        elif any(keyword in campaign_name for keyword in ['smoking', 'tobacco', 'drug']):
            campaign_types['Anti-Smoking'] += 1
        elif any(keyword in campaign_name for keyword in ['cancer', 'aids', 'disease']):
            campaign_types['Disease Awareness'] += 1
        else:
            campaign_types['Social Causes'] += 1
    
    print(f"\n📋 Public Health Campaign Categories:")
    for category, count in campaign_types.items():
        if count > 0:
            print(f"   {category}: {count} campaigns")
    
    # Show most awarded organizations
    org_counts = {}
    for campaign in unique_new:
        brand = campaign.get('brand', 'Unknown')
        org_counts[brand] = org_counts.get(brand, 0) + 1
    
    top_orgs = sorted(org_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    print(f"\n🏢 Most Active Public Health Organizations:")
    for org, count in top_orgs:
        print(f"   {org}: {count} campaigns")
    
    # Show rhetorical devices in public health
    ph_devices = []
    for campaign in unique_new:
        devices = campaign.get('rhetoricalDevices', [])
        if isinstance(devices, list):
            ph_devices.extend(devices)
    
    device_counts = {}
    for device in ph_devices:
        device_counts[device] = device_counts.get(device, 0) + 1
    
    top_devices = sorted(device_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    print(f"\n🎯 Top Rhetorical Devices in Public Health:")
    for device, count in top_devices:
        print(f"   {device}: {count} uses")
    
    return len(all_campaigns)

if __name__ == "__main__":
    main()