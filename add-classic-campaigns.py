#!/usr/bin/env python3
"""
Add classic 1990s campaigns to corpus (allowing to exceed 157 target)
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
    """Load classic campaigns"""
    try:
        with open('attached_assets/Pasted--campaign-Hello-Boys-brand-Wonderbra-year-1994-headline-Hello-Boys-rhetori-1752631692905_1752631692905.txt', 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"❌ Error loading campaigns: {e}")
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
    print("🔄 Adding classic 1990s campaigns (exceeding 157 target allowed)...")
    
    # Load existing corpus
    existing_campaigns = load_existing_corpus()
    print(f"📊 Current corpus: {len(existing_campaigns)} campaigns")
    
    # Load classic campaigns
    new_campaigns = load_new_campaigns()
    print(f"📊 Classic campaigns to add: {len(new_campaigns)} campaigns")
    
    if not new_campaigns:
        print("❌ No campaigns to add")
        return
    
    # Remove duplicates
    unique_new, duplicates = deduplicate_campaigns(existing_campaigns, new_campaigns)
    
    print(f"✅ Unique classic campaigns: {len(unique_new)}")
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
    with open('corpus-with-classics.json', 'w', encoding='utf-8') as f:
        json.dump(final_corpus, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Updated corpus saved to data/retrieval-corpus.json")
    print(f"💾 Backup saved to corpus-with-classics.json")
    
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
    
    # Show progress beyond target
    print(f"\n🎯 TARGET STATUS:")
    if len(all_campaigns) >= 157:
        print(f"   ✅ TARGET EXCEEDED! {len(all_campaigns)} campaigns")
        print(f"   📈 Exceeds 157 target by {len(all_campaigns) - 157} campaigns")
    else:
        print(f"   📊 Progress: {len(all_campaigns)}/157 campaigns")
        print(f"   🔄 Need {157 - len(all_campaigns)} more to reach target")
    
    # Show iconic classic campaigns added
    classic_90s = [c for c in unique_new if 1990 <= c.get('year', 0) <= 1999]
    print(f"\n🏆 Iconic 1990s Campaigns Added:")
    for i, campaign in enumerate(classic_90s[:15]):
        outcome = campaign.get('outcome', '')
        award = 'Gold' if 'Gold' in outcome else 'Lions' if 'Lions' in outcome else 'Award' if 'Award' in outcome else ''
        print(f"   {i+1:2d}. {campaign.get('campaign', 'Unknown')} - {campaign.get('brand', 'Unknown')} ({campaign.get('year', 'N/A')}) {award}")
    
    # Show decade distribution
    decade_counts = {}
    for year in years:
        decade = (year // 10) * 10
        decade_counts[decade] = decade_counts.get(decade, 0) + 1
    
    print(f"\n📅 Campaigns by Decade:")
    for decade in sorted(decade_counts.keys()):
        print(f"   {decade}s: {decade_counts[decade]} campaigns")
    
    # Show most awarded brands
    brand_counts = {}
    for campaign in all_campaigns:
        brand = campaign.get('brand', 'Unknown')
        brand_counts[brand] = brand_counts.get(brand, 0) + 1
    
    top_brands = sorted(brand_counts.items(), key=lambda x: x[1], reverse=True)[:15]
    print(f"\n🏢 Most Represented Brands:")
    for brand, count in top_brands:
        print(f"   {brand}: {count} campaigns")
    
    return len(all_campaigns)

if __name__ == "__main__":
    main()