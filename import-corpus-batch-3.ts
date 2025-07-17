/**
 * Import third batch of new corpus entries
 * Transform format to match existing corpus schema
 */

import { importCorpusEntries, getAllCorpusEntries, type RetrievalCorpusEntry } from './server/utils/retrievalCorpusManager.js';

// Third batch of raw data from attached file
const rawNewEntries = [
  {
    "campaign": "Parallel Futures",
    "brand": "Microsoft",
    "year": 2017,
    "headline": "Code Tomorrow",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Software as destiny shaping.",
    "when_to_use": "When inspiring builders.",
    "when_not_to_use": "When focusing on current products."
  },
  {
    "campaign": "Silent Strength",
    "brand": "Subaru",
    "year": 2016,
    "headline": "Endure Quietly",
    "rhetorical_device_visual": "paradox",
    "rhetorical_device_verbal": "adverbial emphasis",
    "rationale": "Car as resilient yet subtle.",
    "when_to_use": "When promoting reliability.",
    "when_not_to_use": "When luxury is focus."
  },
  {
    "campaign": "Breath of Fresh",
    "brand": "Brita",
    "year": 2015,
    "headline": "Drink Clarity",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Water as enlightenment.",
    "when_to_use": "When highlighting purity.",
    "when_not_to_use": "When discussing cost."
  },
  {
    "campaign": "Forever Forward",
    "brand": "FedEx",
    "year": 2018,
    "headline": "Deliver Future",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Logistics as progress.",
    "when_to_use": "When focusing on innovation.",
    "when_not_to_use": "When stability is focus."
  },
  {
    "campaign": "Living Light",
    "brand": "Philips Hue",
    "year": 2019,
    "headline": "Color Life",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Lighting as mood-shaping.",
    "when_to_use": "When emphasizing emotion.",
    "when_not_to_use": "When utility is focus."
  },
  {
    "campaign": "Taste Elevated",
    "brand": "Sriracha",
    "year": 2016,
    "headline": "Spice Heights",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "noun-as-verb",
    "rationale": "Heat as altitude.",
    "when_to_use": "When celebrating intensity.",
    "when_not_to_use": "When mildness is preferred."
  },
  {
    "campaign": "Infinite Motion",
    "brand": "Peloton",
    "year": 2018,
    "headline": "Ride Eternity",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Exercise as timelessness.",
    "when_to_use": "When inspiring commitment.",
    "when_not_to_use": "When leisure is focus."
  },
  {
    "campaign": "Echoes",
    "brand": "Sonos",
    "year": 2015,
    "headline": "Fill Silence",
    "rhetorical_device_visual": "paradox",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Sound as presence.",
    "when_to_use": "When emphasizing immersion.",
    "when_not_to_use": "When simplicity is needed."
  },
  {
    "campaign": "Beyond Limits",
    "brand": "GoPro",
    "year": 2016,
    "headline": "Record Fearless",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Adventure as necessity.",
    "when_to_use": "When promoting action.",
    "when_not_to_use": "When safety is concern."
  },
  {
    "campaign": "Grow Bold",
    "brand": "John Deere",
    "year": 2014,
    "headline": "Harvest Bravery",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "noun-as-verb",
    "rationale": "Farming as courage.",
    "when_to_use": "When celebrating legacy.",
    "when_not_to_use": "When modernity is focus."
  },
  {
    "campaign": "Boundless Imagination",
    "brand": "Disney",
    "year": 2017,
    "headline": "Dream Wider",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "comparative",
    "rationale": "Fantasy as expansiveness.",
    "when_to_use": "When inspiring wonder.",
    "when_not_to_use": "When realism is needed."
  },
  {
    "campaign": "Core Strength",
    "brand": "Nike",
    "year": 2018,
    "headline": "Train Deeper",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "comparative",
    "rationale": "Fitness as self-discovery.",
    "when_to_use": "When emphasizing growth.",
    "when_not_to_use": "When promoting ease."
  },
  {
    "campaign": "Unlock Potential",
    "brand": "MasterCard",
    "year": 2015,
    "headline": "Buy Freedom",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Purchase as liberation.",
    "when_to_use": "When promoting empowerment.",
    "when_not_to_use": "When minimalism is key."
  },
  {
    "campaign": "Parallel Tastes",
    "brand": "Ben & Jerry's",
    "year": 2014,
    "headline": "Scoop Harmony",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Flavors as community.",
    "when_to_use": "When celebrating diversity.",
    "when_not_to_use": "When singular focus is needed."
  },
  {
    "campaign": "Timeless Drive",
    "brand": "Mercedes-Benz",
    "year": 2017,
    "headline": "Command Time",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Luxury as control.",
    "when_to_use": "When highlighting heritage.",
    "when_not_to_use": "When affordability is key."
  },
  {
    "campaign": "Inside Out",
    "brand": "TOMS",
    "year": 2016,
    "headline": "Wear Change",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Shoes as activism.",
    "when_to_use": "When emphasizing purpose.",
    "when_not_to_use": "When neutrality is desired."
  },
  {
    "campaign": "Future Proof",
    "brand": "IBM",
    "year": 2015,
    "headline": "Think Ahead",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Technology as insurance.",
    "when_to_use": "When promoting security.",
    "when_not_to_use": "When simplicity is focus."
  },
  {
    "campaign": "Urban Echo",
    "brand": "Urban Outfitters",
    "year": 2014,
    "headline": "Wear Now",
    "rhetorical_device_visual": "juxtaposition",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Style as immediacy.",
    "when_to_use": "When targeting youth.",
    "when_not_to_use": "When heritage is focus."
  },
  {
    "campaign": "Bright Tomorrow",
    "brand": "SolarCity",
    "year": 2017,
    "headline": "Power Future",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Energy as optimism.",
    "when_to_use": "When inspiring change.",
    "when_not_to_use": "When status quo is valued."
  },
  {
    "campaign": "True Colors",
    "brand": "Pantone",
    "year": 2015,
    "headline": "Match Life",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Color as identity.",
    "when_to_use": "When celebrating individuality.",
    "when_not_to_use": "When uniformity is needed."
  },
  {
    "campaign": "Silent Witness",
    "brand": "Canon",
    "year": 2016,
    "headline": "Capture Truth",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Camera as observer.",
    "when_to_use": "When focusing on authenticity.",
    "when_not_to_use": "When stylization is desired."
  },
  {
    "campaign": "Endless Summer",
    "brand": "Corona",
    "year": 2018,
    "headline": "Taste Escape",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Beer as vacation.",
    "when_to_use": "When promoting relaxation.",
    "when_not_to_use": "When productivity is focus."
  },
  {
    "campaign": "Sustainable Steps",
    "brand": "Allbirds",
    "year": 2019,
    "headline": "Walk Lightly",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Shoes as ethics.",
    "when_to_use": "When highlighting responsibility.",
    "when_not_to_use": "When performance is primary."
  }
];

async function transformAndImportBatch3() {
  console.log('🔄 IMPORTING THIRD BATCH OF CORPUS ENTRIES');
  console.log('==========================================');
  
  try {
    // Get current corpus to check for duplicates
    const currentCorpus = getAllCorpusEntries();
    console.log(`📊 Current corpus: ${currentCorpus.length} entries`);
    console.log(`📥 Batch 3 entries to process: ${rawNewEntries.length} entries`);
    
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
    
    console.log(`\n📈 BATCH 3 ANALYSIS:`);
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
    console.error('❌ Error importing batch 3:', error);
    return false;
  }
}

transformAndImportBatch3();