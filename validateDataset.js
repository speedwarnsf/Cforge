import fs from "fs";

const datasetPath = "./data/rhetorical_figures_dataset.json";

function validateDataset(jsonData) {
  if (!Array.isArray(jsonData)) {
    throw new Error("Dataset must be an array.");
  }
  jsonData.forEach((entry, index) => {
    if (!entry.figure_name || !entry.definition) {
      throw new Error(`Record ${index + 1} is missing figure_name or definition.`);
    }
  });
  console.log(`Loaded ${jsonData.length} figures successfully.`);
}

// Load and validate
try {
  const rawData = fs.readFileSync(datasetPath, "utf-8");
  const jsonData = JSON.parse(rawData);
  validateDataset(jsonData);
} catch (err) {
  console.error("Error loading dataset:", err);
}