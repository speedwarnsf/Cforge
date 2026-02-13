import fs from 'fs';

// Define all chunks
const chunk1 = [
  {
    "figure_name": "accismus",
    "definition": "A form of irony in which a person feigns indifference to or pretends to refuse something he or she desires."
  },
  {
    "figure_name": "adynaton",
    "definition": "A form of hyperbole in which the exaggeration is taken to a great extreme, so that it seems impossible."
  },
  {
    "figure_name": "alliteration",
    "definition": "Repetition of the same letter or sound within nearby words. Most often, repeated initial consonants."
  },
  {
    "figure_name": "anacoluthon",
    "definition": "A syntactic deviation and interruption within a sentence from one structure to another."
  },
  {
    "figure_name": "anadiplosis",
    "definition": "Repetition of the last word of one clause or sentence at the beginning of the next."
  },
  {
    "figure_name": "anaphora",
    "definition": "Repetition of the same word or phrase at the beginning of successive clauses or verses."
  },
  {
    "figure_name": "antanaclasis",
    "definition": "The repetition of a word or phrase to effect a different meaning."
  },
  {
    "figure_name": "anthimeria",
    "definition": "Substitution of one part of speech for another."
  },
  {
    "figure_name": "antiphrasis",
    "definition": "Irony of one word, often derisively through obvious contradiction."
  },
  {
    "figure_name": "antithesis",
    "definition": "Juxtaposition of contrasting words or ideas (often, although not always, in parallel structure)."
  }
];

const chunk2 = [
  {
    "figure_name": "antithesis",
    "definition": "Juxtaposition of contrasting ideas in balanced phrases.",
    "examples": [
      "It was the best of times, it was the worst of times."
    ],
    "sources": [
      "Quintilian 9.3.81"
    ]
  },
  {
    "figure_name": "apostrophe",
    "definition": "Turning aside to address an absent person or abstract idea.",
    "examples": [
      "O Death, where is thy sting?"
    ],
    "sources": [
      "Rhetorica ad Herennium 4.22.33"
    ]
  },
  {
    "figure_name": "asyndeton",
    "definition": "Omission of conjunctions between related clauses.",
    "examples": [
      "I came, I saw, I conquered."
    ],
    "sources": [
      "Quintilian 9.3.54"
    ]
  },
  {
    "figure_name": "catachresis",
    "definition": "An extravagant, strained metaphor.",
    "examples": [
      "He looked at the price and his pocketbook screamed."
    ],
    "sources": [
      "Quintilian 8.6.31"
    ]
  },
  {
    "figure_name": "commoratio",
    "definition": "Dwelling on a point by repeating it in different words.",
    "examples": [
      "He's a liar, a cheat, and a fraud."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.32.43"
    ]
  },
  {
    "figure_name": "conduplicatio",
    "definition": "Repetition of a key word over successive phrases or clauses.",
    "examples": [
      "Drugs don't just destroy their victims; they destroy entire families. Drugs take away dignity. Drugs ruin lives."
    ],
    "sources": [
      "Quintilian 9.3.67"
    ]
  },
  {
    "figure_name": "diacope",
    "definition": "Repetition of a word or phrase with intervening words.",
    "examples": [
      "The horror! Oh, the horror!"
    ],
    "sources": [
      "Quintilian 9.3.61"
    ]
  },
  {
    "figure_name": "ellipsis",
    "definition": "Omission of one or more words, which are assumed by the listener or reader.",
    "examples": [
      "You going to the party?"
    ],
    "sources": [
      "Rhetorica ad Herennium 4.22.31"
    ]
  },
  {
    "figure_name": "enthymeme",
    "definition": "An informally stated syllogism with an unstated premise.",
    "examples": [
      "He must be a good man, for he is a clergyman."
    ],
    "sources": [
      "Aristotle Rhetoric 1.2"
    ]
  },
  {
    "figure_name": "epanalepsis",
    "definition": "Repetition at the end of a clause of the word that occurred at the beginning.",
    "examples": [
      "Nothing can be created out of nothing."
    ],
    "sources": [
      "Quintilian 9.3.61"
    ]
  }
];

const chunk3 = [
  {
    "figure_name": "epanorthosis",
    "definition": "Immediate rephrasing of something said in order to correct or strengthen it.",
    "examples": [
      "I am angry—no, furious—with your behavior."
    ],
    "sources": [
      "Quintilian 9.3.62"
    ]
  },
  {
    "figure_name": "epistrophe",
    "definition": "Repetition of a word or phrase at the end of successive clauses.",
    "examples": [
      "See no evil, hear no evil, speak no evil."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.20.27"
    ]
  },
  {
    "figure_name": "hyperbaton",
    "definition": "Altering word order for emphasis.",
    "examples": [
      "This I must see."
    ],
    "sources": [
      "Quintilian 9.1.19"
    ]
  },
  {
    "figure_name": "hyperbole",
    "definition": "Exaggeration for emphasis or effect.",
    "examples": [
      "I've told you a million times."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.34.46"
    ]
  },
  {
    "figure_name": "hypophora",
    "definition": "Raising a question and immediately answering it.",
    "examples": [
      "What makes a king out of a slave? Courage!"
    ],
    "sources": [
      "Quintilian 9.2.7"
    ]
  },
  {
    "figure_name": "irony",
    "definition": "Expression that means the opposite of what it says.",
    "examples": [
      "Lovely weather we're having, as it pours rain."
    ],
    "sources": [
      "Quintilian 9.2.44"
    ]
  },
  {
    "figure_name": "litotes",
    "definition": "Deliberate understatement for effect.",
    "examples": [
      "It's no small feat."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.34.46"
    ]
  },
  {
    "figure_name": "metanoia",
    "definition": "Qualifying a statement by recalling it and expressing it in a better, milder, or stronger way.",
    "examples": [
      "You are the most beautiful woman in this town—no, in the entire world."
    ],
    "sources": [
      "Quintilian 9.3.62"
    ]
  },
  {
    "figure_name": "metaphor",
    "definition": "Implied comparison between two unlike things.",
    "examples": [
      "Time is a thief."
    ],
    "sources": [
      "Aristotle Poetics 21"
    ]
  },
  {
    "figure_name": "metonymy",
    "definition": "Reference to something or someone by naming one of its attributes.",
    "examples": [
      "The White House issued a statement."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.33.44"
    ]
  }
];

const chunk4 = [
  {
    "figure_name": "onomatopoeia",
    "definition": "Use of words whose sound suggests the sense.",
    "examples": [
      "The bees buzzed in the garden."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.34.46"
    ]
  },
  {
    "figure_name": "oxymoron",
    "definition": "Joining two contradictory terms.",
    "examples": [
      "Deafening silence."
    ],
    "sources": [
      "Quintilian 9.3.99"
    ]
  },
  {
    "figure_name": "paradox",
    "definition": "A statement that seems self-contradictory but reveals truth.",
    "examples": [
      "Less is more."
    ],
    "sources": [
      "Quintilian 9.2.44"
    ]
  },
  {
    "figure_name": "paralipsis",
    "definition": "Pretending to omit something by drawing attention to it.",
    "examples": [
      "I won't even mention his countless affairs."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.27.37"
    ]
  },
  {
    "figure_name": "parallelism",
    "definition": "Similarity of structure in a pair or series of related words, phrases, or clauses.",
    "examples": [
      "She likes cooking, jogging, and reading."
    ],
    "sources": [
      "Quintilian 9.3.18"
    ]
  },
  {
    "figure_name": "parenthesis",
    "definition": "Insertion of an aside or additional information into a sentence.",
    "examples": [
      "The governor—foolish and corrupt—was finally impeached."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.20.28"
    ]
  },
  {
    "figure_name": "periphrasis",
    "definition": "Substitution of a descriptive word or phrase for a proper name or vice versa.",
    "examples": [
      "The big man upstairs hears your prayers."
    ],
    "sources": [
      "Quintilian 8.6.42"
    ]
  },
  {
    "figure_name": "personification",
    "definition": "Attributing human qualities to nonhuman things.",
    "examples": [
      "The wind whispered through the trees."
    ],
    "sources": [
      "Quintilian 9.2.36"
    ]
  },
  {
    "figure_name": "pleonasm",
    "definition": "Use of more words than necessary to express an idea.",
    "examples": [
      "I saw it with my own eyes."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.36.48"
    ]
  },
  {
    "figure_name": "polyptoton",
    "definition": "Repetition of words derived from the same root.",
    "examples": [
      "No end to the ending of things."
    ],
    "sources": [
      "Quintilian 9.3.65"
    ]
  }
];

const chunk5 = [
  {
    "figure_name": "polysyndeton",
    "definition": "The repetition of conjunctions in close succession.",
    "examples": [
      "He ran and jumped and laughed for joy."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.25.34"
    ]
  },
  {
    "figure_name": "praeteritio",
    "definition": "Emphasizing something by professing to ignore it.",
    "examples": [
      "Not to mention the fact that you were late."
    ],
    "sources": [
      "Quintilian 9.2.44"
    ]
  },
  {
    "figure_name": "prolepsis",
    "definition": "Anticipating and answering objections in advance.",
    "examples": [
      "You might say this is impossible, but here is how it works..."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.24.33"
    ]
  },
  {
    "figure_name": "prosopopoeia",
    "definition": "Giving voice to inanimate objects or absent persons.",
    "examples": [
      "The walls have ears."
    ],
    "sources": [
      "Quintilian 9.2.29"
    ]
  },
  {
    "figure_name": "rhetorical question",
    "definition": "Asking a question not for the answer but to assert or deny something obliquely.",
    "examples": [
      "Who doesn't love freedom?"
    ],
    "sources": [
      "Quintilian 9.2.7"
    ]
  },
  {
    "figure_name": "simile",
    "definition": "Comparison using 'like' or 'as'.",
    "examples": [
      "Her smile was as bright as the sun."
    ],
    "sources": [
      "Quintilian 8.6.6"
    ]
  },
  {
    "figure_name": "symploce",
    "definition": "Combination of anaphora and epistrophe.",
    "examples": [
      "When there is talk of hatred, let us stand up and talk against it. When there is talk of violence, let us stand up and talk against it."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.25.35"
    ]
  },
  {
    "figure_name": "synecdoche",
    "definition": "Substitution of a part for the whole or the whole for a part.",
    "examples": [
      "All hands on deck."
    ],
    "sources": [
      "Quintilian 8.6.19"
    ]
  },
  {
    "figure_name": "tmesis",
    "definition": "Insertion of a word between parts of a compound word.",
    "examples": [
      "This is not Romeo, he's some other where."
    ],
    "sources": [
      "Quintilian 1.5.38"
    ]
  },
  {
    "figure_name": "zeugma",
    "definition": "A figure in which a word applies to multiple parts of the sentence.",
    "examples": [
      "She broke his car and his heart."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.33.44"
    ]
  }
];

const chunk6 = [
  {
    "figure_name": "tricolon",
    "definition": "A series of three parallel words, phrases, or clauses.",
    "examples": [
      "Veni, vidi, vici."
    ],
    "sources": [
      "Quintilian 9.3.72"
    ]
  },
  {
    "figure_name": "antanaclasis",
    "definition": "Repetition of a word in two different senses.",
    "examples": [
      "Your argument is sound... all sound."
    ],
    "sources": [
      "Quintilian 9.3.67"
    ]
  },
  {
    "figure_name": "antimetabole",
    "definition": "Repetition of words in successive clauses, in reverse grammatical order.",
    "examples": [
      "When the going gets tough, the tough get going."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.28.39"
    ]
  },
  {
    "figure_name": "aposiopesis",
    "definition": "Breaking off suddenly in speech.",
    "examples": [
      "I will have revenge on you, I swear by—"
    ],
    "sources": [
      "Quintilian 9.2.54"
    ]
  },
  {
    "figure_name": "asyndeton",
    "definition": "Omission of conjunctions between clauses.",
    "examples": [
      "I came, I saw, I conquered."
    ],
    "sources": [
      "Rhetorica ad Herennium 4.25.34"
    ]
  },
  {
    "figure_name": "chiasmus",
    "definition": "Two corresponding pairs arranged in inverted order.",
    "examples": [
      "Never let a fool kiss you or a kiss fool you."
    ],
    "sources": [
      "Quintilian 9.3.61"
    ]
  },
  {
    "figure_name": "ellipsis",
    "definition": "Omission of a word easily understood in context.",
    "examples": [
      "Fire when ready."
    ],
    "sources": [
      "Quintilian 9.2.54"
    ]
  },
  {
    "figure_name": "epimone",
    "definition": "Frequent repetition of a phrase or question to dwell on a point.",
    "examples": [
      "And you, Brutus? You too, Brutus?"
    ],
    "sources": [
      "Quintilian 9.3.50"
    ]
  },
  {
    "figure_name": "hypophora",
    "definition": "Raising a question and immediately answering it.",
    "examples": [
      "What makes a king out of a slave? Courage!"
    ],
    "sources": [
      "Rhetorica ad Herennium 4.25.34"
    ]
  },
  {
    "figure_name": "litotes",
    "definition": "Deliberate understatement, often using double negatives.",
    "examples": [
      "He's not exactly a rocket scientist."
    ],
    "sources": [
      "Quintilian 8.6.31"
    ]
  }
];

// Merge all chunks
const merged = [
  ...chunk1,
  ...chunk2,
  ...chunk3,
  ...chunk4,
  ...chunk5,
  ...chunk6
];

// Save merged dataset
fs.writeFileSync('./data/rhetorical_figures_dataset.json', JSON.stringify(merged, null, 2));
console.log(`Merged complete: ${merged.length} records saved to data/rhetorical_figures_dataset.json`);

// Create deduped version
const deduped = Array.from(
  new Map(merged.map(item => [item.figure_name, item])).values()
);
fs.writeFileSync('./data/rhetorical_figures_dataset_deduped.json', JSON.stringify(deduped, null, 2));
console.log(`Deduped complete: ${deduped.length} unique records saved to data/rhetorical_figures_dataset_deduped.json`);

// Show some statistics
console.log('\n📊 Dataset Statistics:');
console.log(`Total records: ${merged.length}`);
console.log(`Unique figures: ${deduped.length}`);
console.log(`Duplicates removed: ${merged.length - deduped.length}`);

// Show sample of figures
console.log('\nSample figures:');
deduped.slice(0, 5).forEach(fig => {
  console.log(`- ${fig.figure_name}: ${fig.definition.substring(0, 50)}...`);
});