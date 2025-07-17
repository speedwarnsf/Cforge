/**
 * Import new corpus entries from attached file
 * Transform format to match existing corpus schema
 */

import { importCorpusEntries, getAllCorpusEntries, type RetrievalCorpusEntry } from './server/utils/retrievalCorpusManager.js';
import * as fs from 'fs';

// Raw data from attached file
const rawNewEntries = [
  {
    "campaign": "Beyond the Label",
    "brand": "Levi's",
    "year": 2018,
    "headline": "Threads of Truth",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "zeugma",
    "rationale": "Uses clothing labels as metaphors for identity and social categories.",
    "when_to_use": "When challenging stereotypes.",
    "when_not_to_use": "When the audience may feel defensive about labels."
  },
  {
    "campaign": "A City of Light",
    "brand": "IKEA",
    "year": 2015,
    "headline": "Illuminate Home",
    "rhetorical_device_visual": "metonymy",
    "rhetorical_device_verbal": "antithesis",
    "rationale": "Contrasts cold cityscapes with warm interior lighting.",
    "when_to_use": "When promoting cozy atmospheres.",
    "when_not_to_use": "When minimalism is the brand aesthetic."
  },
  {
    "campaign": "Reclaim the Streets",
    "brand": "Puma",
    "year": 2017,
    "headline": "Unleash Asphalt",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "ellipsis",
    "rationale": "Gives the street agency, suggesting liberation.",
    "when_to_use": "When targeting youth culture.",
    "when_not_to_use": "When communicating luxury."
  },
  {
    "campaign": "Little Giants",
    "brand": "Lego",
    "year": 2014,
    "headline": "Tiny Titans",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "alliteration",
    "rationale": "Amplifies small creations to heroic scale.",
    "when_to_use": "When encouraging imagination.",
    "when_not_to_use": "When realism is central."
  },
  {
    "campaign": "Unbreakable Bond",
    "brand": "Elmer's Glue",
    "year": 2013,
    "headline": "Stick Forever",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "paralipsis",
    "rationale": "Symbolizes commitment through adhesive imagery.",
    "when_to_use": "When highlighting reliability.",
    "when_not_to_use": "When separation is desired."
  },
  {
    "campaign": "Clean Slate",
    "brand": "Mr. Clean",
    "year": 2016,
    "headline": "Erase Yesterday",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "synecdoche",
    "rationale": "Transforms cleaning into temporal renewal.",
    "when_to_use": "When promoting fresh starts.",
    "when_not_to_use": "When nostalgia is valued."
  },
  {
    "campaign": "Fresh to Death",
    "brand": "Old Spice",
    "year": 2019,
    "headline": "Lethally Clean",
    "rhetorical_device_visual": "irony",
    "rhetorical_device_verbal": "oxymoron",
    "rationale": "Combines humor with exaggeration.",
    "when_to_use": "When appealing to irreverent humor.",
    "when_not_to_use": "When seriousness is required."
  },
  {
    "campaign": "Digital Roots",
    "brand": "Google",
    "year": 2020,
    "headline": "Plant Connection",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "metaphor",
    "rationale": "Frames tech as natural growth.",
    "when_to_use": "When demystifying technology.",
    "when_not_to_use": "When emphasizing technical complexity."
  },
  {
    "campaign": "Edge of Now",
    "brand": "Samsung",
    "year": 2018,
    "headline": "Tomorrow's Touch",
    "rhetorical_device_visual": "juxtaposition",
    "rhetorical_device_verbal": "anaphora",
    "rationale": "Contrasts old tools with modern interfaces.",
    "when_to_use": "When showing innovation.",
    "when_not_to_use": "When heritage is core."
  },
  {
    "campaign": "No Ordinary Ride",
    "brand": "Jeep",
    "year": 2015,
    "headline": "Go Beyond",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Elevates travel to an odyssey.",
    "when_to_use": "When inspiring adventure.",
    "when_not_to_use": "When practicality is focus."
  },
  {
    "campaign": "The Quiet Revolution",
    "brand": "Tesla",
    "year": 2016,
    "headline": "Silence Roars",
    "rhetorical_device_visual": "paradox",
    "rhetorical_device_verbal": "oxymoron",
    "rationale": "Uses silence as power.",
    "when_to_use": "When emphasizing disruption.",
    "when_not_to_use": "When conformity is valued."
  },
  {
    "campaign": "Flavor Nation",
    "brand": "Lay's",
    "year": 2014,
    "headline": "Taste United",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "synecdoche",
    "rationale": "Presents flavors as citizens.",
    "when_to_use": "When unifying diverse options.",
    "when_not_to_use": "When singular focus is required."
  },
  {
    "campaign": "Power Within",
    "brand": "Duracell",
    "year": 2013,
    "headline": "Unseen Force",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "ellipsis",
    "rationale": "Highlights invisible energy.",
    "when_to_use": "When focusing on longevity.",
    "when_not_to_use": "When transparency is needed."
  },
  {
    "campaign": "Brighter Futures",
    "brand": "UNICEF",
    "year": 2017,
    "headline": "Light Lives",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "zeugma",
    "rationale": "Uses illumination as hope.",
    "when_to_use": "When driving donations.",
    "when_not_to_use": "When celebrating current success."
  },
  {
    "campaign": "Heartbeats",
    "brand": "Fitbit",
    "year": 2018,
    "headline": "Count On",
    "rhetorical_device_visual": "metonymy",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Uses counting as trust.",
    "when_to_use": "When promoting accountability.",
    "when_not_to_use": "When relaxation is key."
  },
  {
    "campaign": "Living Ink",
    "brand": "Sharpie",
    "year": 2015,
    "headline": "Mark Forever",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "alliteration",
    "rationale": "Immortalizes writing.",
    "when_to_use": "When celebrating creativity.",
    "when_not_to_use": "When erasability is needed."
  },
  {
    "campaign": "Frictionless",
    "brand": "PayPal",
    "year": 2019,
    "headline": "Touch Freedom",
    "rhetorical_device_visual": "juxtaposition",
    "rhetorical_device_verbal": "metaphor",
    "rationale": "Equates payment with liberation.",
    "when_to_use": "When emphasizing ease.",
    "when_not_to_use": "When discussing security."
  },
  {
    "campaign": "Time Travelers",
    "brand": "Rolex",
    "year": 2016,
    "headline": "Wear Eternity",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Links watch to immortality.",
    "when_to_use": "When promoting legacy.",
    "when_not_to_use": "When affordability is key."
  },
  {
    "campaign": "Mindful Moves",
    "brand": "Headspace",
    "year": 2017,
    "headline": "Breathe Change",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Breath as transformation.",
    "when_to_use": "When inspiring calm.",
    "when_not_to_use": "When urgency is needed."
  },
  {
    "campaign": "Unseen Heroes",
    "brand": "3M",
    "year": 2018,
    "headline": "Invisible Strength",
    "rhetorical_device_visual": "metonymy",
    "rhetorical_device_verbal": "oxymoron",
    "rationale": "Showcases hidden utility.",
    "when_to_use": "When celebrating behind-the-scenes work.",
    "when_not_to_use": "When visibility is desired."
  },
  {
    "campaign": "Roots Run Deep",
    "brand": "Timberland",
    "year": 2013,
    "headline": "Stand Firm",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Trees as resilience.",
    "when_to_use": "When underscoring durability.",
    "when_not_to_use": "When promoting change."
  },
  {
    "campaign": "Second Skin",
    "brand": "Under Armour",
    "year": 2016,
    "headline": "Become Faster",
    "rhetorical_device_visual": "metaphor",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Clothing as transformation.",
    "when_to_use": "When promoting performance.",
    "when_not_to_use": "When comfort is focus."
  },
  {
    "campaign": "Voice of Change",
    "brand": "Twitter",
    "year": 2019,
    "headline": "Speak Loud",
    "rhetorical_device_visual": "personification",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Platform as amplifier.",
    "when_to_use": "When championing activism.",
    "when_not_to_use": "When neutrality is needed."
  },
  {
    "campaign": "Infinite Canvas",
    "brand": "Adobe",
    "year": 2014,
    "headline": "Create Endlessly",
    "rhetorical_device_visual": "hyperbole",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Unbounded creativity.",
    "when_to_use": "When inspiring professionals.",
    "when_not_to_use": "When constraints are necessary."
  },
  {
    "campaign": "Stay Human",
    "brand": "Benetton",
    "year": 2015,
    "headline": "Wear Kindness",
    "rhetorical_device_visual": "symbolism",
    "rhetorical_device_verbal": "imperative",
    "rationale": "Clothing as values.",
    "when_to_use": "When promoting social causes.",
    "when_not_to_use": "When neutrality is preferred."
  }
];

async function transformAndImportNewEntries() {
  console.log('🔄 IMPORTING NEW CORPUS ENTRIES');
  console.log('===============================');
  
  try {
    // Get current corpus to check for duplicates
    const currentCorpus = getAllCorpusEntries();
    console.log(`📊 Current corpus: ${currentCorpus.length} entries`);
    console.log(`📥 New entries to process: ${rawNewEntries.length} entries`);
    
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
    
    console.log(`\n📈 IMPORT ANALYSIS:`);
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
    console.error('❌ Error importing new entries:', error);
    return false;
  }
}

transformAndImportNewEntries();