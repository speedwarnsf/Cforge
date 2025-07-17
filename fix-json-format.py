#!/usr/bin/env python3
import re
import json

# Read the extracted JSON
with open('corpus-replacement-clean.json', 'r') as f:
    content = f.read().strip()

# Fix common JSON formatting issues
content = content.replace('{ "campaigns":', '{"campaigns":')
content = content.replace('} ]', '}]')
content = content.replace('} }', '}}')

# Remove any remaining RTF artifacts
content = re.sub(r'[{}]\s*[{}]', '', content)

# Ensure proper JSON structure
if not content.startswith('{"campaigns"'):
    # Find the start of campaigns array
    campaigns_start = content.find('"campaigns"')
    if campaigns_start != -1:
        # Find the opening bracket
        bracket_start = content.find('[', campaigns_start)
        if bracket_start != -1:
            content = '{"campaigns":' + content[bracket_start:]

# Ensure it ends properly
if not content.endswith('}}'):
    if content.endswith('}]'):
        content = content + '}'
    elif content.endswith('}'):
        # Check if we need to close the campaigns array
        if content.count('[') > content.count(']'):
            content = content + ']}'
        else:
            content = content + '}'

# Write fixed JSON
with open('corpus-replacement-fixed.json', 'w') as f:
    f.write(content)

# Test validity
try:
    data = json.loads(content)
    campaign_count = len(data.get('campaigns', []))
    print(f"✅ JSON is now valid!")
    print(f"📊 Campaign count: {campaign_count}")
    
    # Pretty print first campaign as example
    if campaign_count > 0:
        first_campaign = data['campaigns'][0]
        print(f"\n📋 First campaign example:")
        print(f"   Campaign: {first_campaign.get('campaign', 'N/A')}")
        print(f"   Brand: {first_campaign.get('brand', 'N/A')}")
        print(f"   Year: {first_campaign.get('year', 'N/A')}")
        print(f"   Headline: {first_campaign.get('headline', 'N/A')}")
        
except json.JSONDecodeError as e:
    print(f"❌ Still invalid JSON: {e}")
    print(f"Content preview: {content[:200]}...")