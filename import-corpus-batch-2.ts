/**
 * Import second batch of new corpus entries
 * Transform format to match existing corpus schema
 */

import { importCorpusEntries, getAllCorpusEntries, type RetrievalCorpusEntry } from './server/utils/retrievalCorpusManager.js';

// Second batch of raw data from attached file
const rawNewEntries = [
  {
    "campaign": "Open Horizons",
    "brand": "Airbnb",
    "year": 2017,
    "headline": "Stay Curious",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Travel as personal growth.",
    "when_to_use": "When inspiring exploration.",
    "when_not_to_use": "When focusing on luxury."
  },
  {
    "campaign": "Limitless Sound",
    "brand": "Bose",
    "year": 2019,
    "headline": "Hear Infinity",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Elevates audio to boundlessness.",
    "when_to_use": "When promoting premium quality.",
    "when_not_to_use": "When practicality is key."
  },
  {
    "campaign": "Shape Tomorrow",
    "brand": "Intel",
    "year": 2018,
    "headline": "Invent Forward",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Technology as progress.",
    "when_to_use": "When highlighting innovation.",
    "when_not_to_use": "When tradition is central."
  },
  {
    "campaign": "True Grit",
    "brand": "Carhartt",
    "year": 2016,
    "headline": "Endure More",
    "rhetorical_device_visual": "metonymy",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Workwear as resilience.",
    "when_to_use": "When celebrating toughness.",
    "when_not_to_use": "When ease is focus."
  },
  {
    "campaign": "Spark Joy",
    "brand": "KonMari",
    "year": 2019,
    "headline": "Keep Magic",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Decluttering as enchantment.",
    "when_to_use": "When promoting minimalism.",
    "when_not_to_use": "When excess is celebrated."
  },
  {
    "campaign": "Digital Sanctuary",
    "brand": "Dropbox",
    "year": 2017,
    "headline": "Store Peace",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Storage as tranquility.",
    "when_to_use": "When emphasizing security.",
    "when_not_to_use": "When transparency is focus."
  },
  {
    "campaign": "Dream Awake",
    "brand": "Tempur-Pedic",
    "year": 2016,
    "headline": "Sleep Boldly",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Rest as empowerment.",
    "when_to_use": "When luxury is key.",
    "when_not_to_use": "When economy is focus."
  },
  {
    "campaign": "Urban Myth",
    "brand": "Adidas",
    "year": 2018,
    "headline": "Run Legends",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Running as heroism.",
    "when_to_use": "When inspiring performance.",
    "when_not_to_use": "When authenticity is needed."
  },
  {
    "campaign": "Refined Chaos",
    "brand": "Diesel",
    "year": 2015,
    "headline": "Live Wild",
    "rhetorical_device_visual": "juxtaposition",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Contrasts polish and rebellion.",
    "when_to_use": "When targeting youth.",
    "when_not_to_use": "When elegance is focus."
  },
  {
    "campaign": "Hidden Depths",
    "brand": "Patagonia",
    "year": 2014,
    "headline": "Explore Beneath",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Nature as discovery.",
    "when_to_use": "When promoting adventure.",
    "when_not_to_use": "When indoor living is focus."
  },
  {
    "campaign": "Rhythm Nation",
    "brand": "Beats by Dre",
    "year": 2016,
    "headline": "Feel Sound",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Sound as physical sensation.",
    "when_to_use": "When highlighting immersion.",
    "when_not_to_use": "When discussing analysis."
  },
  {
    "campaign": "World in Motion",
    "brand": "National Geographic",
    "year": 2017,
    "headline": "See Beyond",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Photography as window to truth.",
    "when_to_use": "When educating audiences.",
    "when_not_to_use": "When simplicity is needed."
  },
  {
    "campaign": "Unseen Forces",
    "brand": "Dyson",
    "year": 2019,
    "headline": "Defy Gravity",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Technology as magic.",
    "when_to_use": "When emphasizing innovation.",
    "when_not_to_use": "When familiarity is valued."
  },
  {
    "campaign": "Roots Reimagined",
    "brand": "Whole Foods",
    "year": 2016,
    "headline": "Grow Different",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Food as culture.",
    "when_to_use": "When promoting health.",
    "when_not_to_use": "When indulgence is focus."
  },
  {
    "campaign": "Soundtrack of Life",
    "brand": "Spotify",
    "year": 2017,
    "headline": "Play Memory",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Music as nostalgia.",
    "when_to_use": "When celebrating emotion.",
    "when_not_to_use": "When neutrality is focus."
  },
  {
    "campaign": "Timeless Style",
    "brand": "Ralph Lauren",
    "year": 2018,
    "headline": "Dress Forever",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Clothing as permanence.",
    "when_to_use": "When highlighting legacy.",
    "when_not_to_use": "When trendiness is focus."
  },
  {
    "campaign": "Invisible Power",
    "brand": "Energizer",
    "year": 2019,
    "headline": "Last Longer",
    "rhetorical_device_visual": "metonymy",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Battery as endurance.",
    "when_to_use": "When emphasizing longevity.",
    "when_not_to_use": "When speed is focus."
  },
  {
    "campaign": "Blank Canvas",
    "brand": "Apple",
    "year": 2015,
    "headline": "Imagine More",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Device as creativity.",
    "when_to_use": "When inspiring possibility.",
    "when_not_to_use": "When focusing on specs."
  },
  {
    "campaign": "Parallel Lives",
    "brand": "Facebook",
    "year": 2014,
    "headline": "Connect Always",
    "rhetorical_device_visual": "juxtaposition",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Digital as real life.",
    "when_to_use": "When emphasizing relationships.",
    "when_not_to_use": "When discussing privacy."
  },
  {
    "campaign": "Hidden Sparks",
    "brand": "Zippo",
    "year": 2015,
    "headline": "Ignite Instantly",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Lighter as inspiration.",
    "when_to_use": "When celebrating spontaneity.",
    "when_not_to_use": "When safety is concern."
  },
  {
    "campaign": "Inner Fire",
    "brand": "Red Bull",
    "year": 2016,
    "headline": "Awaken Power",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Energy drink as awakening.",
    "when_to_use": "When inspiring action.",
    "when_not_to_use": "When calm is focus."
  },
  {
    "campaign": "Silent Revolution",
    "brand": "Toyota",
    "year": 2017,
    "headline": "Drive Change",
    "rhetorical_device_visual": "paradox",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Hybrid as disruption.",
    "when_to_use": "When showcasing innovation.",
    "when_not_to_use": "When tradition is valued."
  },
  {
    "campaign": "Bold Moves",
    "brand": "Ford",
    "year": 2018,
    "headline": "Go Fearless",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Car as courage.",
    "when_to_use": "When targeting ambition.",
    "when_not_to_use": "When caution is focus."
  },
  {
    "campaign": "Taste of Tomorrow",
    "brand": "Impossible Foods",
    "year": 2019,
    "headline": "Eat Future",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Plant-based as progress.",
    "when_to_use": "When promoting innovation.",
    "when_not_to_use": "When tradition is central."
  },
  {
    "campaign": "Color Outside",
    "brand": "Crayola",
    "year": 2015,
    "headline": "Draw Freedom",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Art as liberation.",
    "when_to_use": "When inspiring children.",
    "when_not_to_use": "When structure is needed."
  }
];

async function transformAndImportBatch2() {
  console.log('🔄 IMPORTING SECOND BATCH OF CORPUS ENTRIES');
  console.log('============================================');
  
  try {
    // Get current corpus to check for duplicates
    const currentCorpus = getAllCorpusEntries();
    console.log(`📊 Current corpus: ${currentCorpus.length} entries`);
    console.log(`📥 Batch 2 entries to process: ${rawNewEntries.length} entries`);
    
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
        console.log(`⚠️  Duplicate found: ${entry.campaign} - ${entry.brand}`);
      } else {
        newEntriesCount++;
      }
    }
    
    console.log(`\n📈 BATCH 2 ANALYSIS:`);
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
          console.log(`✅ Added: ${entry.campaign} - ${entry.brand} (${entry.year})`);
        } else {
          console.log(`❌ Failed: ${entry.campaign} - ${entry.brand}`);
        }
      }
      
      // Final corpus count
      const finalCorpus = getAllCorpusEntries();
      console.log(`\n📊 FINAL CORPUS: ${finalCorpus.length} total entries`);
      
      return true;
    } else {
      console.log('💡 No new entries to import (all duplicates)');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error importing batch 2:', error);
    return false;
  }
}

transformAndImportBatch2();