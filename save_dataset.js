import fs from "fs";

// Placeholder for the dataset - you'll paste the actual JSON array here
const dataset = [
  // PASTE YOUR BIG JSON ARRAY HERE
];

fs.writeFileSync("./rhetorical_figures_full_dataset.json", JSON.stringify(dataset, null, 2));
console.log("✅ rhetorical_figures_full_dataset.json created successfully.");
console.log(`📊 Dataset contains ${dataset.length} records`);