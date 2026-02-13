/**
 * Import fourth batch of new corpus entries
 * Transform format to match existing corpus schema
 */

import { importCorpusEntries, getAllCorpusEntries, type RetrievalCorpusEntry } from './server/utils/retrievalCorpusManager.js';

// Fourth batch of raw data from attached file
const rawNewEntries = [
  {
    "campaign": "Waves of Change",
    "brand": "Patagonia",
    "year": 2019,
    "headline": "Wear Future",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Clothing as activism.",
    "when_to_use": "When promoting sustainability.",
    "when_not_to_use": "When neutrality is preferred."
  },
  {
    "campaign": "Hidden Currents",
    "brand": "Levi's",
    "year": 2016,
    "headline": "Denim Unseen",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "noun-as-adjective",
    "rationale": "Jeans as silent culture.",
    "when_to_use": "When celebrating authenticity.",
    "when_not_to_use": "When highlighting trends."
  },
  {
    "campaign": "New Rituals",
    "brand": "Starbucks",
    "year": 2015,
    "headline": "Sip Purpose",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Coffee as connection.",
    "when_to_use": "When emphasizing community.",
    "when_not_to_use": "When focusing on convenience."
  },
  {
    "campaign": "Unseen Energy",
    "brand": "Tesla",
    "year": 2018,
    "headline": "Drive Silent",
    "rhetorical_device_visual": "paradox",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Electricity as quiet power.",
    "when_to_use": "When highlighting disruption.",
    "when_not_to_use": "When tradition is key."
  },
  {
    "campaign": "Instant Wonder",
    "brand": "Polaroid",
    "year": 2017,
    "headline": "Freeze Joy",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Photography as preservation.",
    "when_to_use": "When celebrating nostalgia.",
    "when_not_to_use": "When focusing on technology."
  },
  {
    "campaign": "Voices Rising",
    "brand": "Spotify",
    "year": 2019,
    "headline": "Stream Freedom",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Music as liberation.",
    "when_to_use": "When promoting diversity.",
    "when_not_to_use": "When uniformity is needed."
  },
  {
    "campaign": "Eternal Flame",
    "brand": "Zippo",
    "year": 2016,
    "headline": "Spark Always",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Lighter as legacy.",
    "when_to_use": "When emphasizing reliability.",
    "when_not_to_use": "When novelty is focus."
  },
  {
    "campaign": "Urban Canvas",
    "brand": "Vans",
    "year": 2017,
    "headline": "Skate Stories",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "noun-as-noun",
    "rationale": "Shoes as self-expression.",
    "when_to_use": "When targeting youth.",
    "when_not_to_use": "When tradition is valued."
  },
  {
    "campaign": "Hidden Patterns",
    "brand": "IKEA",
    "year": 2018,
    "headline": "Assemble Magic",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Furniture as transformation.",
    "when_to_use": "When highlighting possibility.",
    "when_not_to_use": "When focusing on simplicity."
  },
  {
    "campaign": "Infinite Journey",
    "brand": "Virgin Atlantic",
    "year": 2016,
    "headline": "Fly Limitless",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Flight as transcendence.",
    "when_to_use": "When inspiring exploration.",
    "when_not_to_use": "When practicality is needed."
  },
  {
    "campaign": "Vital Signs",
    "brand": "Fitbit",
    "year": 2015,
    "headline": "Track Life",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Data as vitality.",
    "when_to_use": "When emphasizing health.",
    "when_not_to_use": "When leisure is focus."
  },
  {
    "campaign": "Bright Future",
    "brand": "SolarCity",
    "year": 2017,
    "headline": "Shine Forward",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Solar as hope.",
    "when_to_use": "When promoting optimism.",
    "when_not_to_use": "When status quo is needed."
  },
  {
    "campaign": "Creative Fuel",
    "brand": "Adobe",
    "year": 2016,
    "headline": "Design Infinite",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Software as empowerment.",
    "when_to_use": "When inspiring creators.",
    "when_not_to_use": "When focusing on limits."
  },
  {
    "campaign": "Hidden Threads",
    "brand": "Etsy",
    "year": 2018,
    "headline": "Craft Story",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Handmade as narrative.",
    "when_to_use": "When promoting authenticity.",
    "when_not_to_use": "When mass production is focus."
  },
  {
    "campaign": "Open Skies",
    "brand": "Delta",
    "year": 2015,
    "headline": "Explore Air",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Flight as possibility.",
    "when_to_use": "When promoting adventure.",
    "when_not_to_use": "When emphasizing routine."
  },
  {
    "campaign": "Urban Pulse",
    "brand": "Uber",
    "year": 2017,
    "headline": "Move Instantly",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Transport as vitality.",
    "when_to_use": "When highlighting immediacy.",
    "when_not_to_use": "When focusing on safety."
  },
  {
    "campaign": "Green Light",
    "brand": "Lyft",
    "year": 2016,
    "headline": "Share Roads",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Ride-sharing as collaboration.",
    "when_to_use": "When emphasizing community.",
    "when_not_to_use": "When independence is focus."
  },
  {
    "campaign": "Silent Signal",
    "brand": "Signal",
    "year": 2019,
    "headline": "Message Free",
    "rhetorical_device_visual": "paradox",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Privacy as liberation.",
    "when_to_use": "When focusing on security.",
    "when_not_to_use": "When openness is valued."
  },
  {
    "campaign": "Unseen Path",
    "brand": "North Face",
    "year": 2018,
    "headline": "Climb Hidden",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Adventure as revelation.",
    "when_to_use": "When inspiring exploration.",
    "when_not_to_use": "When safety is focus."
  },
  {
    "campaign": "Bold Lines",
    "brand": "Sharpie",
    "year": 2015,
    "headline": "Mark Forever",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Writing as permanence.",
    "when_to_use": "When celebrating creativity.",
    "when_not_to_use": "When focusing on ephemera."
  },
  {
    "campaign": "Digital Bloom",
    "brand": "Squarespace",
    "year": 2017,
    "headline": "Grow Online",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Website as garden.",
    "when_to_use": "When promoting entrepreneurship.",
    "when_not_to_use": "When simplicity is focus."
  },
  {
    "campaign": "Everyday Epic",
    "brand": "GoPro",
    "year": 2016,
    "headline": "Film Hero",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Life as adventure.",
    "when_to_use": "When celebrating action.",
    "when_not_to_use": "When caution is needed."
  },
  {
    "campaign": "Silent Harmony",
    "brand": "Bose",
    "year": 2018,
    "headline": "Hear Purity",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Sound as clarity.",
    "when_to_use": "When highlighting premium.",
    "when_not_to_use": "When affordability is focus."
  },
  {
    "campaign": "Time Capsule",
    "brand": "Kodak",
    "year": 2015,
    "headline": "Keep Moments",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Photography as memory.",
    "when_to_use": "When promoting nostalgia.",
    "when_not_to_use": "When focusing on tech."
  },
  {
    "campaign": "Eternal Spring",
    "brand": "Evian",
    "year": 2016,
    "headline": "Drink Youth",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Water as rejuvenation.",
    "when_to_use": "When celebrating vitality.",
    "when_not_to_use": "When practicality is key."
  }
];

async function transformAndImportBatch4() {
  console.log('🔄 IMPORTING FOURTH BATCH OF CORPUS ENTRIES');
  console.log('==========================================');
  
  try {
    // Get current corpus to check for duplicates
    const currentCorpus = getAllCorpusEntries();
    console.log(`📊 Current corpus: ${currentCorpus.length} entries`);
    console.log(`📥 Batch 4 entries to process: ${rawNewEntries.length} entries`);
    
    // Transform raw entries to match corpus schema
    const transformedEntries: RetrievalCorpusEntry[] = rawNewEntries.map(raw => ({
      campaign: raw.campaign,
      brand: raw.brand,
      year: raw.year,
      headline: raw.headline,
      rhetoricalDevices: [
        raw.rhetorical_device_visual,
        raw.rhetorical_device_verbal
      ].filter(device => device), // Remove any empty values
      rationale: raw.rationale,
      outcome: `Demonstrates ${raw.rhetorical_device_visual} and ${raw.rhetorical_device_verbal} techniques.`,
      whenToUse: raw.when_to_use,
      whenNotToUse: raw.when_not_to_use
    }));
    
    // Check for duplicates
    let duplicateCount = 0;
    let newEntriesCount = 0;
    
    for (const entry of transformedEntries) {
      const exists = currentCorpus.some(existing => 
        existing.headline === entry.headline && existing.campaign === entry.campaign
      );
      
      if (exists) {
        duplicateCount++;
        console.log(` Duplicate found: ${entry.campaign} - ${entry.brand}`);
      } else {
        newEntriesCount++;
      }
    }
    
    console.log(`\nBATCH 4 ANALYSIS:`);
    console.log(`  New entries: ${newEntriesCount}`);
    console.log(`  Duplicates: ${duplicateCount}`);
    
    if (newEntriesCount > 0) {
      // Import only non-duplicate entries
      const uniqueEntries = transformedEntries.filter(entry => 
        !currentCorpus.some(existing => 
          existing.headline === entry.headline && existing.campaign === entry.campaign
        )
      );
      
      console.log(`\n🔄 Importing ${uniqueEntries.length} unique entries...`);
      
      for (const entry of uniqueEntries) {
        const success = importCorpusEntries([entry]);
        if (success) {
          console.log(`Added: ${entry.campaign} - ${entry.brand} (${entry.year})`);
        } else {
          console.log(`Failed: ${entry.campaign} - ${entry.brand}`);
        }
      }
      
      // Final corpus count
      const finalCorpus = getAllCorpusEntries();
      console.log(`\n📊 FINAL CORPUS: ${finalCorpus.length} total entries`);
      
      return true;
    } else {
      console.log('No new entries to import (all duplicates)');
      return false;
    }
    
  } catch (error) {
    console.error('Error importing batch 4:', error);
    return false;
  }
}

transformAndImportBatch4();