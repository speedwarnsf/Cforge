// ================== PROMPT LOADER UTILITY ==================
// File: server/utils/promptLoader.ts

import fs from "fs";
import path from "path";

/**
 * Loads a prompt template from a .txt file and replaces variables.
 * 
 * Usage example:
 * const prompt = loadPrompt("generation.txt", { rhetoricalDevice: "anaphora", tone: "bold" });
 */
export function loadPrompt(filename: string, variables: Record<string, string>): string {
  const promptPath = path.resolve(process.cwd(), "prompts", filename);
  let template = fs.readFileSync(promptPath, "utf8");
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    template = template.split(placeholder).join(value);
  }
  return template;
}