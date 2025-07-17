#!/usr/bin/env python3
"""
Simple RTF extraction - convert to text first, then parse JSON
"""

import re
import json

def rtf_to_text(rtf_content):
    """Convert RTF to plain text by removing RTF codes"""
    
    # Remove RTF header and control words
    text = re.sub(r'^.*?\\strokec2\s*', '', rtf_content, flags=re.DOTALL)
    
    # Remove RTF control sequences
    text = re.sub(r'\\[a-z]+\d*\s*', '', text)
    text = re.sub(r'\\[^a-z]', '', text)
    
    # Handle RTF escape sequences for quotes and special chars
    text = text.replace('\\"', '"')
    text = text.replace('\\{', '{')
    text = text.replace('\\}', '}')
    text = text.replace('\\\\', '\\')
    
    # Handle smart quotes from RTF
    text = text.replace("\\'92", "'")
    text = text.replace("\\'93", '"')
    text = text.replace("\\'94", '"')
    text = text.replace("\\'e9", 'é')
    
    # Remove line breaks within the RTF
    text = re.sub(r'\\\s*\n', '', text)
    text = re.sub(r'\\\s*$', '', text, flags=re.MULTILINE)
    
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    return text

def main():
    rtf_file = 'attached_assets/CorpusRelacementFile_1752615052487.rtf'
    
    print(f"📖 Reading {rtf_file}")
    
    with open(rtf_file, 'r', encoding='utf-8') as f:
        rtf_content = f.read()
    
    print(f"📏 RTF size: {len(rtf_content):,} characters")
    
    # Convert to plain text
    text = rtf_to_text(rtf_content)
    print(f"📄 Text size: {len(text):,} characters")
    
    # Save for debugging
    with open('debug-text.txt', 'w', encoding='utf-8') as f:
        f.write(text)
    
    # Look for the JSON structure
    print(f"🔍 Looking for JSON structure...")
    
    # Find campaigns array
    start = text.find('"campaigns": [')
    if start == -1:
        start = text.find('"campaigns":[')
    
    if start == -1:
        print("❌ Could not find campaigns array")
        return
    
    print(f"✅ Found campaigns at position {start}")
    
    # Find the opening brace of the main object
    brace_start = text.rfind('{', 0, start)
    if brace_start == -1:
        brace_start = 0
    
    # Find the end by looking for comments or end of campaigns
    comment_pos = text.find('// Continuing to add more')
    if comment_pos > start:
        print(f"🔍 Found comment at {comment_pos}, truncating there")
        # Go back to find the last complete campaign entry
        last_brace = text.rfind('}', start, comment_pos)
        if last_brace > start:
            # Add closing for array and object
            json_text = text[brace_start:last_brace+1] + ']}'
        else:
            json_text = text[brace_start:comment_pos]
    else:
        # Look for the end of the object
        brace_count = 0
        in_string = False
        escape_next = False
        pos = brace_start
        
        while pos < len(text):
            char = text[pos]
            
            if escape_next:
                escape_next = False
            elif char == '\\':
                escape_next = True
            elif char == '"' and not escape_next:
                in_string = not in_string
            elif not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_text = text[brace_start:pos+1]
                        break
            
            pos += 1
        else:
            # Couldn't find end, take everything
            json_text = text[brace_start:]
    
    # Clean up the JSON text
    json_text = json_text.strip()
    
    # Save the extracted JSON for debugging
    with open('debug-extracted.json', 'w', encoding='utf-8') as f:
        f.write(json_text)
    
    print(f"📝 Extracted JSON: {len(json_text):,} characters")
    
    try:
        data = json.loads(json_text)
        campaigns = data.get('campaigns', [])
        
        print(f"✅ Successfully parsed {len(campaigns)} campaigns")
        
        # Save the final result
        with open('complete-extracted-corpus.json', 'w', encoding='utf-8') as f:
            json.dump({"campaigns": campaigns}, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved to complete-extracted-corpus.json")
        
        # Show stats
        brands = len(set(c.get('brand', '') for c in campaigns))
        years = [c.get('year', 0) for c in campaigns if c.get('year')]
        
        print(f"\n📊 Statistics:")
        print(f"   Campaigns: {len(campaigns)}")
        print(f"   Brands: {brands}")
        print(f"   Years: {min(years) if years else 'N/A'} - {max(years) if years else 'N/A'}")
        
        if len(campaigns) < 157:
            print(f"\n⚠️  Expected 157, found {len(campaigns)} ({157 - len(campaigns)} missing)")
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing failed: {e}")
        print(f"🔍 Check debug-extracted.json for issues")

if __name__ == "__main__":
    main()