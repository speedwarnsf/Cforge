#!/usr/bin/env python3
"""
RTF to JSON corpus extractor
Handles RTF escape sequences and extracts the complete JSON structure
"""

import re
import json

def clean_rtf_content(content):
    """Clean RTF formatting to extract pure JSON"""
    
    # Remove RTF header and formatting commands
    content = re.sub(r'^.*?\\strokec2 ', '', content, flags=re.DOTALL)
    
    # Remove RTF escape sequences
    content = content.replace('\\"', '"')
    content = content.replace('\\\\', '\\')
    content = content.replace('\\\n', '')
    content = content.replace('\\}', '}')
    content = content.replace('\\{', '{')
    content = content.replace('\\[', '[')
    content = content.replace('\\]', ']')
    content = content.replace('\\/', '/')
    content = content.replace("\\'92", "'")  # Smart apostrophe
    content = content.replace("\\'93", '"')  # Smart quote
    content = content.replace("\\'94", '"')  # Smart quote
    content = content.replace("\\'e9", 'é')  # accented e
    
    # Remove RTF line continuation backslashes
    content = re.sub(r'\\\s*\n', '', content)
    content = re.sub(r'\\\s*$', '', content, flags=re.MULTILINE)
    
    # Remove trailing RTF markup
    content = re.sub(r'\s*\}+\s*$', '', content)
    
    # Clean up whitespace
    content = re.sub(r'\s+', ' ', content)
    content = content.strip()
    
    return content

def extract_campaigns(file_path):
    """Extract campaigns from RTF file"""
    
    print(f"📖 Reading RTF file: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"📏 Original file size: {len(content):,} characters")
    
    # Clean RTF formatting
    cleaned = clean_rtf_content(content)
    print(f"🧹 Cleaned size: {len(cleaned):,} characters")
    
    # Save cleaned content for debugging
    with open('debug-cleaned-rtf.txt', 'w', encoding='utf-8') as f:
        f.write(cleaned)
    
    try:
        # Parse the JSON
        data = json.loads(cleaned)
        campaigns = data.get('campaigns', [])
        
        print(f"✅ Successfully parsed {len(campaigns)} campaigns")
        
        # Filter out placeholder/example campaigns
        real_campaigns = []
        for campaign in campaigns:
            campaign_name = campaign.get('campaign', '')
            brand_name = campaign.get('brand', '')
            
            # Skip obvious placeholders
            if ('Example' in campaign_name or 'Example' in brand_name or 
                'Fill 157' in campaign_name or 'To Fill' in campaign_name):
                print(f"⏭️  Skipping placeholder: {campaign_name}")
                continue
                
            real_campaigns.append(campaign)
        
        print(f"📊 Real campaigns after filtering: {len(real_campaigns)}")
        
        return real_campaigns
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing failed: {e}")
        
        # Look for comments that might indicate incomplete data
        if '// Continuing to add more' in cleaned:
            print("🔍 Found comment indicating incomplete dataset")
            
        # Try to find the end of actual campaign data
        comment_start = cleaned.find('// Continuing to add more')
        if comment_start > 0:
            print(f"✂️  Truncating at comment position {comment_start}")
            before_comment = cleaned[:comment_start].rstrip().rstrip(',')
            
            # Add proper JSON closing
            if not before_comment.endswith(']'):
                before_comment += ']'
            if not before_comment.endswith('}'):
                before_comment += '}'
                
            try:
                data = json.loads(before_comment)
                campaigns = data.get('campaigns', [])
                print(f"✅ Parsed {len(campaigns)} campaigns from truncated data")
                return campaigns
            except json.JSONDecodeError as e2:
                print(f"❌ Still failed after truncation: {e2}")
        
        return []

def main():
    rtf_file = 'attached_assets/CorpusRelacementFile_1752615052487.rtf'
    
    campaigns = extract_campaigns(rtf_file)
    
    if campaigns:
        # Create the corpus structure
        corpus_data = {"campaigns": campaigns}
        
        # Save the extracted data
        with open('complete-extracted-corpus.json', 'w', encoding='utf-8') as f:
            json.dump(corpus_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved {len(campaigns)} campaigns to complete-extracted-corpus.json")
        
        # Show statistics
        brands = set(c.get('brand', 'Unknown') for c in campaigns)
        years = [c.get('year', 0) for c in campaigns if c.get('year')]
        
        print(f"\n📈 Dataset Statistics:")
        print(f"   Campaigns: {len(campaigns)}")
        print(f"   Brands: {len(brands)}")
        print(f"   Year range: {min(years) if years else 'N/A'} - {max(years) if years else 'N/A'}")
        
        # Show recent campaigns
        recent = sorted(campaigns, key=lambda x: x.get('year', 0), reverse=True)[:10]
        print(f"\n🔥 Most Recent Campaigns:")
        for i, campaign in enumerate(recent):
            print(f"   {i+1:2d}. {campaign.get('campaign', 'Unknown')} - {campaign.get('brand', 'Unknown')} ({campaign.get('year', 'N/A')})")
            
        # Check if we have the expected 157
        if len(campaigns) < 157:
            print(f"\n⚠️  Expected 157 campaigns, but only found {len(campaigns)}")
            print(f"   Missing: {157 - len(campaigns)} campaigns")
            print(f"   This RTF file appears to be incomplete or truncated")
        else:
            print(f"\n✅ Full dataset confirmed: {len(campaigns)} campaigns")
            
    else:
        print("❌ No campaigns could be extracted")

if __name__ == "__main__":
    main()