const promptText = "HIV Stops With Me of New York State is updating its annual creative. We need an exciting campaign that is bold and sexy and allows the models to look their best but still has some NYC edge to it. The focus should be on 'self love', 'staying in treatment' and leading a bold unapologetic life.";

(async () => {
  console.log("Initiating end-to-end concept generation test...");

  const start = Date.now();

  const response = await fetch("http://localhost:5000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: promptText,
      tone: "creative",
      conceptCount: 1,
      includeCliches: false,
      deepScan: true
    })
  });

  const data = await response.json();

  const duration = ((Date.now() - start) / 1000).toFixed(2);

  const retrievalBlock = data.content?.match(/Retrieved Reference[\s\S]*?(?=\n\n|$)/g)?.join("\n\n") || "None found";

  console.log("\nTest Complete");
  console.log("============================");

  console.log(`\nConcept Forge V3 – End-to-End System Test Audit
Date: ${new Date().toISOString().slice(0,10)}

Test Prompt:
HIV Stops With Me of New York State is updating its annual creative. We need an exciting campaign that is bold and sexy and allows the models to look their best but still has some NYC edge to it. The focus should be on 'self love', 'staying in treatment' and leading a bold unapologetic life.

Test Parameters:
- Tone: Creative
- Concept Count: 1
- Include Clichés: False
- Deep Scan: True

Retrieval References:
${retrievalBlock}

✍️ Generated Concept Preview:
${(data.content || "").substring(0, 500)}...

⏱️ Performance Metrics:
- Duration: ${duration} seconds
- Token Usage: ${data.tokens || "N/A"}
- Processing Time Reported by API: ${data.processingTime || "N/A"}

💰 Estimated Cost:
- Calculated via OpenAI dashboard if needed

📊 Observations:
- Retrieval references correctly injected: [Yes/No]
- Output formatting intact: [Yes/No]
- Rhetorical devices preserved: [Yes/No]
- Unicode/formatting artifacts: [Any issues?]
- Relevance to brief: [Subjective assessment]

Result:
[PASS / NEEDS IMPROVEMENT]

🔍 Follow-Up Actions:
- [Add any notes here]

End of Audit.
`);

})();