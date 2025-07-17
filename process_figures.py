#!/usr/bin/env python3
"""
HTML Figure Extraction Script
Processes Figures.zip to extract rhetorical figure data from HTML files
"""

import os
import json
import zipfile
import glob
from bs4 import BeautifulSoup

def extract_figures_data():
    """Extract figure data from HTML files in Figures directory"""
    
    # Check if Figures.zip exists
    if not os.path.exists('Figures.zip'):
        print("Waiting for Figures.zip to be uploaded...")
        return False
    
    print("Found Figures.zip - starting extraction...")
    
    # Unzip the file
    with zipfile.ZipFile('Figures.zip', 'r') as zip_ref:
        zip_ref.extractall('.')
    
    print("✅ Figures.zip extracted successfully")
    
    # Find all HTML files in Figures folder and subfolders
    html_files = []
    for pattern in ['Figures/**/*.html', 'Figures/**/*.htm']:
        html_files.extend(glob.glob(pattern, recursive=True))
    
    if not html_files:
        print("❌ No HTML files found in Figures directory")
        return False
    
    print(f"🔍 Found {len(html_files)} HTML files to process")
    
    figures_data = []
    
    # Process each HTML file
    for html_file in html_files:
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            soup = BeautifulSoup(content, 'html.parser')
            
            # Extract figure name from h2 tag
            h2_tag = soup.find('h2')
            figure_name = h2_tag.get_text().strip() if h2_tag else ""
            
            # Get all p tags
            p_tags = soup.find_all('p')
            
            if not p_tags:
                continue
            
            # First p tag is definition
            definition = p_tags[0].get_text().strip() if p_tags else ""
            
            # Process remaining p tags
            examples = []
            notes = []
            
            for p_tag in p_tags[1:]:  # Skip first p tag (definition)
                text = p_tag.get_text().strip()
                if text.startswith("Example"):
                    examples.append(text)
                else:
                    notes.append(text)
            
            # Build JSON object
            figure_data = {
                "figure_name": figure_name,
                "definition": definition,
                "examples": examples,
                "notes": notes,
                "source_file": html_file,
                "attribution": "Silva Rhetoricae (rhetoric.byu.edu), Gideon O. Burton, Brigham Young University"
            }
            
            figures_data.append(figure_data)
            
        except Exception as e:
            print(f"⚠️ Error processing {html_file}: {e}")
            continue
    
    # Save to figures_data.json
    with open('figures_data.json', 'w', encoding='utf-8') as f:
        json.dump(figures_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Processed {len(figures_data)} figures")
    print("✅ Saved data to figures_data.json")
    
    return True

if __name__ == "__main__":
    if extract_figures_data():
        print("Extraction complete.")
    else:
        print("Please upload Figures.zip to continue.")