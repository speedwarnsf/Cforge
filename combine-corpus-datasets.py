#!/usr/bin/env python3
"""
Combine and deduplicate corpus datasets to create the final 157-campaign corpus
"""

import json

def load_corpus(filename):
    """Load corpus from JSON file"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('campaigns', [])
    except FileNotFoundError:
        print(f"⚠️  File not found: {filename}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ JSON error in {filename}: {e}")
        return []

def create_campaign_key(campaign):
    """Create a unique key for campaign deduplication"""
    campaign_name = campaign.get('campaign', '').strip().lower()
    brand = campaign.get('brand', '').strip().lower()
    year = campaign.get('year', 0)
    
    # Handle brand variations (e.g., "P&G" vs "Procter & Gamble")
    brand_variations = {
        'p&g': 'procter & gamble',
        'procter & gamble': 'p&g',
    }
    
    normalized_brand = brand_variations.get(brand, brand)
    
    return f"{campaign_name}|{normalized_brand}|{year}"

def deduplicate_campaigns(campaigns):
    """Remove duplicate campaigns while preserving the most complete version"""
    
    seen_keys = {}
    unique_campaigns = []
    duplicates = []
    
    for campaign in campaigns:
        key = create_campaign_key(campaign)
        
        if key in seen_keys:
            # Found duplicate
            existing_campaign = seen_keys[key]
            duplicates.append({
                'campaign': campaign.get('campaign', ''),
                'brand': campaign.get('brand', ''),
                'year': campaign.get('year', ''),
                'duplicate_of': existing_campaign.get('campaign', '')
            })
            
            # Keep the version with more complete data
            existing_data_count = sum(1 for v in existing_campaign.values() if v)
            new_data_count = sum(1 for v in campaign.values() if v)
            
            if new_data_count > existing_data_count:
                # Replace with more complete version
                seen_keys[key] = campaign
                # Update in unique_campaigns list
                for i, uc in enumerate(unique_campaigns):
                    if create_campaign_key(uc) == key:
                        unique_campaigns[i] = campaign
                        break
        else:
            seen_keys[key] = campaign
            unique_campaigns.append(campaign)
    
    return unique_campaigns, duplicates

def main():
    print("🔄 Combining corpus datasets...")
    
    # Load both datasets
    corpus1 = load_corpus('new-retrieval-corpus.json')  # Original 97 campaigns
    corpus2 = load_corpus('complete-157-corpus.json')   # New 82 campaigns
    
    print(f"📊 Dataset 1: {len(corpus1)} campaigns")
    print(f"📊 Dataset 2: {len(corpus2)} campaigns")
    print(f"📊 Combined raw total: {len(corpus1) + len(corpus2)} campaigns")
    
    # Combine all campaigns
    all_campaigns = corpus1 + corpus2
    
    # Deduplicate
    unique_campaigns, duplicates = deduplicate_campaigns(all_campaigns)
    
    print(f"✅ After deduplication: {len(unique_campaigns)} unique campaigns")
    print(f"🔄 Removed {len(duplicates)} duplicates")
    
    if duplicates:
        print(f"\n📋 Duplicates removed:")
        for dup in duplicates[:10]:  # Show first 10
            print(f"   - {dup['campaign']} ({dup['brand']}, {dup['year']})")
        if len(duplicates) > 10:
            print(f"   ... and {len(duplicates) - 10} more")
    
    # Sort campaigns by year and brand for consistency
    unique_campaigns.sort(key=lambda x: (x.get('year', 0), x.get('brand', ''), x.get('campaign', '')))
    
    # Create final corpus
    final_corpus = {"campaigns": unique_campaigns}
    
    # Save the combined and deduplicated corpus
    with open('final-157-corpus.json', 'w', encoding='utf-8') as f:
        json.dump(final_corpus, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Saved final corpus to final-157-corpus.json")
    
    # Generate comprehensive statistics
    brands = set(c.get('brand', '') for c in unique_campaigns)
    years = [c.get('year', 0) for c in unique_campaigns if isinstance(c.get('year'), int)]
    
    all_devices = []
    for campaign in unique_campaigns:
        devices = campaign.get('rhetoricalDevices', [])
        if isinstance(devices, list):
            all_devices.extend(devices)
    
    unique_devices = set(all_devices)
    
    print(f"\n📊 Final Dataset Statistics:")
    print(f"   Total Campaigns: {len(unique_campaigns)}")
    print(f"   Unique Brands: {len(brands)}")
    print(f"   Year Range: {min(years) if years else 'N/A'} - {max(years) if years else 'N/A'}")
    print(f"   Rhetorical Devices: {len(unique_devices)}")
    
    # Check against target
    if len(unique_campaigns) >= 157:
        print(f"\n🎉 TARGET ACHIEVED! {len(unique_campaigns)} campaigns")
        if len(unique_campaigns) > 157:
            print(f"   Exceeds target by {len(unique_campaigns) - 157} campaigns")
    else:
        print(f"\n📊 Progress: {len(unique_campaigns)}/157 campaigns")
        print(f"   Still need {157 - len(unique_campaigns)} more campaigns")
    
    # Show brand distribution
    brand_counts = {}
    for campaign in unique_campaigns:
        brand = campaign.get('brand', 'Unknown')
        brand_counts[brand] = brand_counts.get(brand, 0) + 1
    
    top_brands = sorted(brand_counts.items(), key=lambda x: x[1], reverse=True)[:15]
    print(f"\n🏢 Top Brands (Top 15):")
    for brand, count in top_brands:
        print(f"   {brand}: {count} campaigns")
    
    # Show decade distribution
    decade_counts = {}
    for year in years:
        decade = (year // 10) * 10
        decade_counts[decade] = decade_counts.get(decade, 0) + 1
    
    print(f"\n📅 Campaigns by Decade:")
    for decade in sorted(decade_counts.keys()):
        print(f"   {decade}s: {decade_counts[decade]} campaigns")
    
    return len(unique_campaigns)

if __name__ == "__main__":
    final_count = main()