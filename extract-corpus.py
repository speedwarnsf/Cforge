#!/usr/bin/env python3
import re
import json

def extract_json_from_rtf(filename):
    """Extract clean JSON from RTF file"""
    with open(filename, 'r') as f:
        content = f.read()
    
    # Find the JSON content
    json_start = content.find('{"campaigns"')
    if json_start == -1:
        json_start = content.find('{')
    
    json_end = content.rfind('}]')
    if json_end != -1:
        json_end = content.find('}', json_end + 2) + 1
    else:
        json_end = content.rfind('}') + 1
    
    if json_start == -1 or json_end == -1:
        raise ValueError("Could not find JSON boundaries")
    
    raw_json = content[json_start:json_end]
    
    # Clean RTF formatting step by step
    clean_json = raw_json
    
    # Remove RTF escape sequences
    clean_json = re.sub(r'\\[a-z]+\d*\s*', '', clean_json)
    
    # Fix escaped characters
    clean_json = clean_json.replace('\\"', '"')
    clean_json = clean_json.replace('\\\\', '\\')
    clean_json = clean_json.replace('\\.', '.')
    clean_json = clean_json.replace('\\,', ',')
    clean_json = clean_json.replace('\\:', ':')
    clean_json = clean_json.replace('\\;', ';')
    clean_json = clean_json.replace('\\-', '-')
    clean_json = clean_json.replace('\\_', '_')
    clean_json = clean_json.replace('\\(', '(')
    clean_json = clean_json.replace('\\)', ')')
    clean_json = clean_json.replace('\\[', '[')
    clean_json = clean_json.replace('\\]', ']')
    clean_json = clean_json.replace('\\{', '{')
    clean_json = clean_json.replace('\\}', '}')
    
    # Handle special characters
    clean_json = clean_json.replace("\\'93", '"')
    clean_json = clean_json.replace("\\'94", '"')
    clean_json = clean_json.replace("\\'92", "'")
    clean_json = clean_json.replace("\\'91", "'")
    
    # Normalize whitespace
    clean_json = re.sub(r'\s+', ' ', clean_json)
    clean_json = clean_json.strip()
    
    return clean_json

if __name__ == "__main__":
    try:
        clean_json = extract_json_from_rtf('attached_assets/CorpusRelacementFile_1752615052487.rtf')
        
        # Write to file
        with open('corpus-replacement-clean.json', 'w') as f:
            f.write(clean_json)
        
        # Count campaigns
        campaign_count = clean_json.count('"campaign":')
        
        print(f"✅ Clean JSON extracted successfully")
        print(f"📊 Number of campaigns found: {campaign_count}")
        print(f"📄 File size: {len(clean_json)} characters")
        print(f"💾 Saved to: corpus-replacement-clean.json")
        
        # Test JSON validity
        try:
            parsed = json.loads(clean_json)
            print(f"✅ JSON is valid")
            if 'campaigns' in parsed:
                actual_count = len(parsed['campaigns'])
                print(f"📈 Actual campaign count: {actual_count}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON validation failed: {e}")
            
    except Exception as e:
        print(f"❌ Error: {e}")