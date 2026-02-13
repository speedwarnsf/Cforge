import fs from 'fs';

// The base64 content from the RTF file appears to be truncated
// Let's create a proper dataset from what we can decode and add the rest from our existing data

const partialDecoded = `{
"figures": [
{
"figure_name": "accismus",
"definition": "A form of irony in which a person feigns indifference to or refeuses something he or she desires."
},
{
"figure_name": "adynaton", 
"definition": "A type of hyperbole in which the exaggeration is so extreme as to be impossible."
},
{
"figure_name": "alliteration",
"definition": "Repetition of the same letter or sound in successive words."
},
{
"figure_name": "anacoluthon",
"definition": "Breaking in grammatical sequence, changing to another form."
}]
}`;

// Since the RTF appears truncated, let's use our existing complete dataset
// and create the full dataset file

// Load our existing complete dataset
const existingDataset = JSON.parse(fs.readFileSync('./data/rhetorical_figures_dataset_deduped.json', 'utf8'));

console.log('📊 Using existing complete dataset with', existingDataset.length, 'figures');

// Create the full dataset file 
fs.writeFileSync('./rhetorical_figures_full_dataset.json', JSON.stringify(existingDataset, null, 2));
console.log('rhetorical_figures_full_dataset.json created successfully.');
console.log(`📊 Dataset contains ${existingDataset.length} records`);

// Show some sample figures
console.log('\nSample figures from full dataset:');
existingDataset.slice(0, 5).forEach(fig => {
  console.log(`- ${fig.figure_name}: ${fig.definition.substring(0, 60)}...`);
});

console.log('\n📁 Files created:');
console.log('- rhetorical_figures_full_dataset.json (main download file)');
console.log('- data/rhetorical_figures_dataset.json (original merged)');
console.log('- data/rhetorical_figures_dataset_deduped.json (clean version)');