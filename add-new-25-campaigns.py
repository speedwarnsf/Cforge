#!/usr/bin/env python3
"""
Add 25 new campaigns to existing corpus
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

def load_new_campaigns():
    """Load new 25 campaigns"""
    try:
        with open('attached_assets/Pasted--campaign-Parental-Leave-Mortgage-brand-Nordea-year-2025-headline-null-rheto-1752630654234_1752630654235.txt', 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"❌ Error loading new campaigns: {e}")
        return []

def deduplicate_campaigns(existing, new_campaigns):
    """Remove duplicates between existing and new campaigns"""
    
    # Create lookup set for existing campaigns
    existing_keys = set()
    for campaign in existing:
        key = f"{campaign.get('campaign', '').lower()}|{campaign.get('brand', '').lower()}|{campaign.get('year', 0)}"
        existing_keys.add(key)
    
    # Filter new campaigns
    unique_new = []
    duplicates = []
    
    for campaign in new_campaigns:
        key = f"{campaign.get('campaign', '').lower()}|{campaign.get('brand', '').lower()}|{campaign.get('year', 0)}"
        
        if key in existing_keys:
            duplicates.append(campaign)
        else:
            unique_new.append(campaign)
    
    return unique_new, duplicates

def main():
    print("🔄 Adding 25 new campaigns to corpus...")
    
    # Load existing corpus
    existing_campaigns = load_existing_corpus()
    print(f"📊 Current corpus: {len(existing_campaigns)} campaigns")
    
    # Load new campaigns
    new_campaigns = load_new_campaigns()
    print(f"📊 New campaigns: {len(new_campaigns)} campaigns")
    
    if not new_campaigns:
        print("❌ No new campaigns to add")
        return
    
    # Remove duplicates
    unique_new, duplicates = deduplicate_campaigns(existing_campaigns, new_campaigns)
    
    print(f"✅ Unique new campaigns: {len(unique_new)}")
    if duplicates:
        print(f"🔄 Duplicates found: {len(duplicates)}")
        for dup in duplicates:
            print(f"   - {dup.get('campaign', 'Unknown')} ({dup.get('brand', 'Unknown')}, {dup.get('year', 'N/A')})")
    
    # Combine campaigns
    all_campaigns = existing_campaigns + unique_new
    
    # Sort by year and brand for consistency
    all_campaigns.sort(key=lambda x: (x.get('year', 0), x.get('brand', ''), x.get('campaign', '')))
    
    # Create final corpus
    final_corpus = {"campaigns": all_campaigns}
    
    # Save updated corpus
    with open('data/retrieval-corpus.json', 'w', encoding='utf-8') as f:
        json.dump(final_corpus, f, indent=2, ensure_ascii=False)
    
    # Also save backup
    with open('corpus-with-25-new.json', 'w', encoding='utf-8') as f:
        json.dump(final_corpus, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Updated corpus saved to data/retrieval-corpus.json")
    print(f"💾 Backup saved to corpus-with-25-new.json")
    
    # Generate statistics
    brands = set(c.get('brand', '') for c in all_campaigns)
    years = [c.get('year', 0) for c in all_campaigns if isinstance(c.get('year'), int)]
    
    all_devices = []
    for campaign in all_campaigns:
        devices = campaign.get('rhetoricalDevices', [])
        if isinstance(devices, list):
            all_devices.extend(devices)
    
    unique_devices = set(all_devices)
    
    print(f"\n📊 Updated Dataset Statistics:")
    print(f"   Total Campaigns: {len(all_campaigns)}")
    print(f"   Unique Brands: {len(brands)}")
    print(f"   Year Range: {min(years) if years else 'N/A'} - {max(years) if years else 'N/A'}")
    print(f"   Rhetorical Devices: {len(unique_devices)}")
    
    # Check progress toward 157
    if len(all_campaigns) >= 157:
        print(f"\n🎉 TARGET ACHIEVED! {len(all_campaigns)} campaigns")
        print(f"   Exceeds target by {len(all_campaigns) - 157}")
    else:
        print(f"\n📊 Progress: {len(all_campaigns)}/157 campaigns")
        print(f"   Still need {157 - len(all_campaigns)} more campaigns")
    
    # Show new campaigns added
    print(f"\n🆕 New Campaigns Added:")
    recent_2025 = [c for c in unique_new if c.get('year') == 2025]
    for i, campaign in enumerate(recent_2025[:10]):  # Show first 10
        print(f"   {i+1:2d}. {campaign.get('campaign', 'Unknown')} - {campaign.get('brand', 'Unknown')}")
    if len(recent_2025) > 10:
        print(f"   ... and {len(recent_2025) - 10} more")
    
    return len(all_campaigns)

if __name__ == "__main__":
    main()