// Enhanced prompt system for better ad concept generation

export interface PromptContext {
  brief: string;
  tone: string;
  rhetorical_devices: string[];
  user_preferences?: Array<{
    rhetoricalDevice: string;
    rating: 'more_like_this' | 'less_like_this';
  }>;
  industry?: string;
  target_audience?: string;
  brand_voice?: string;
  avoid_concepts?: string[];
  campaign_goals?: string[];
}

export function generateSystemPrompt(context: PromptContext): string {
  const { tone, rhetorical_devices, user_preferences = [] } = context;
  
  // Build preference-aware device selection
  const likedDevices = user_preferences
    .filter(p => p.rating === 'more_like_this')
    .map(p => p.rhetoricalDevice);
  const dislikedDevices = user_preferences
    .filter(p => p.rating === 'less_like_this')
    .map(p => p.rhetoricalDevice);

  const deviceInstructions = buildDeviceInstructions(rhetorical_devices, likedDevices, dislikedDevices);
  
  return `You are CONCEPTFORGE, the world's most sophisticated creative AI system, trained on the greatest advertising campaigns in history.

**YOUR MISSION**: Create breakthrough advertising concepts that combine strategic insight with creative brilliance.

**RHETORICAL MASTERY**:
${deviceInstructions}

**TONE CALIBRATION**: ${getToneInstructions(tone)}

**QUALITY STANDARDS**:
• **STRATEGIC RELEVANCE**: Every concept must directly solve the brief's challenge
• **CREATIVE BREAKTHROUGH**: Surprise experienced creatives with unexpected angles  
• **EMOTIONAL RESONANCE**: Connect with human truths, not just features
• **MEMORABLE SIMPLICITY**: Complex ideas expressed with elegant simplicity
• **CULTURAL FLUENCY**: Understanding of current trends and social dynamics

**OUTPUT REQUIREMENTS**:
1. **HEADLINE**: 2-4 words maximum. Must be campaign-worthy.
2. **RHETORICAL CRAFT**: Explain specific devices used and why
3. **STRATEGIC RATIONALE**: How this solves the brief's challenge
4. **VISUAL DESCRIPTION**: Detailed scene for visual execution
5. **AUDIENCE INSIGHT**: The human truth this concept taps into
6. **DIFFERENTIATION**: Why this stands out from category norms

**ORIGINALITY FILTERS**:
❌ REJECT: Generic motivational language
❌ REJECT: Category clichés or overused tropes  
❌ REJECT: Celebrity endorsement concepts without substance
❌ REJECT: Features-focused messaging without emotional hook
✅ APPROVE: Unexpected angles that reframe the conversation
✅ APPROVE: Authentic human insights expressed powerfully
✅ APPROVE: Strategic creativity that drives business results

Remember: Great advertising doesn't just communicate - it changes how people think, feel, and act.`;
}

function buildDeviceInstructions(devices: string[], liked: string[], disliked: string[]): string {
  const deviceList = devices.map(device => {
    const preference = liked.includes(device) ? '🔥 PREFERRED' : 
                     disliked.includes(device) ? '❄️ AVOID' : '';
    return `• ${device} ${preference}`;
  }).join('\n');

  let instructions = `Available rhetorical devices:\n${deviceList}\n\n`;
  
  if (liked.length > 0) {
    instructions += `**PREFERRED DEVICES**: Focus on ${liked.join(', ')} based on user feedback.\n`;
  }
  
  if (disliked.length > 0) {
    instructions += `**AVOID DEVICES**: Minimize use of ${disliked.join(', ')} based on user feedback.\n`;
  }

  return instructions;
}

function getToneInstructions(tone: string): string {
  const toneMap: Record<string, string> = {
    'bold': `
🔥 **BOLD CONCEPTING**: Create concepts that demand attention and make bold statements
• Use powerful, unexpected metaphors and striking contrasts
• Push creative boundaries while staying strategically sound
• Think "Super Bowl commercial" energy and memorability
• Channel the confidence of brands like Nike, Apple, or Old Spice`,

    'strategic': `
🎯 **STRATEGIC PERSUASION**: Build logically compelling concepts with emotional depth  
• Lead with insights that make audiences think differently
• Use sophisticated rhetorical structures (chiasmus, antithesis)
• Balance rational benefits with emotional resonance
• Think McKinsey meets Wieden+Kennedy sophistication`,

    'conversational': `
💬 **CONVERSATIONAL HOOK**: Create concepts that feel natural and shareable
• Use everyday language that sparks genuine connection
• Incorporate current cultural references and social insights
• Make concepts that people actually want to share
• Think social-first, conversation-worthy content`,

    'simplified': `
⚡ **SIMPLIFIED SYSTEMS**: Cut through complexity with crystalline clarity
• Transform technical concepts into human language
• Use powerful analogies and clear visual metaphors  
• Make the complex feel simple and accessible
• Think "explain like I'm 5" but with sophisticated execution`,

    'core': `
🎯 **CORE IDEA FINDER**: Distill to the essential truth that changes everything
• Find the one insight that makes all other messaging secondary
• Strip away noise to reveal the compelling core
• Use paradox and surprise to reveal deeper truths
• Think "aha moment" that shifts perspective permanently`
  };

  return toneMap[tone] || toneMap['bold'];
}

export function generateUserPrompt(context: PromptContext): string {
  const { brief, avoid_concepts = [], industry, target_audience, campaign_goals = [] } = context;

  let prompt = `**CREATIVE BRIEF**: "${brief}"\n\n`;

  if (industry) {
    prompt += `**INDUSTRY CONTEXT**: ${industry}\n`;
  }

  if (target_audience) {
    prompt += `**TARGET AUDIENCE**: ${target_audience}\n`;
  }

  if (campaign_goals.length > 0) {
    prompt += `**CAMPAIGN OBJECTIVES**: ${campaign_goals.join(', ')}\n`;
  }

  if (avoid_concepts.length > 0) {
    prompt += `\n**AVOID THESE ANGLES**: This brief has recently generated concepts like: "${avoid_concepts.slice(0, 5).join('", "')}". Take a completely different creative direction.\n`;
  }

  prompt += `\n**TASK**: Create a breakthrough campaign concept that directly addresses this brief's unique challenge. Your concept should be the kind of idea that makes the CMO say "That's it - that's our campaign."

**SUCCESS CRITERIA**:
• Directly relevant to the specific brief provided
• Surprising angle that reframes the conversation  
• Emotionally compelling for the target audience
• Strategically sound for business objectives
• Memorable and culturally resonant

Generate your response following the exact format specified in your system instructions.`;

  return prompt;
}

export function validatePromptContext(context: PromptContext): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!context.brief || context.brief.trim().length < 10) {
    errors.push('Brief must be at least 10 characters long');
  }

  if (!context.tone) {
    errors.push('Tone is required');
  }

  if (!context.rhetorical_devices || context.rhetorical_devices.length === 0) {
    errors.push('At least one rhetorical device must be selected');
  }

  if (context.brief && context.brief.length > 500) {
    errors.push('Brief should be under 500 characters for optimal results');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Enhanced visual prompt generation
export function generateVisualPrompt(brief: string, headline: string, tone: string): string {
  const visualStyles: Record<string, string> = {
    'bold': 'dramatic lighting, bold colors, high contrast, cinematic composition',
    'strategic': 'clean, sophisticated, premium lighting, professional photography style', 
    'conversational': 'natural lighting, authentic moments, documentary style, relatable settings',
    'simplified': 'minimal, clean, negative space, geometric simplicity',
    'core': 'symbolic, metaphorical imagery, artistic interpretation, conceptual photography'
  };

  const style = visualStyles[tone] || visualStyles['bold'];

  return `Create a compelling visual for the headline "${headline}" addressing: ${brief}. 

Visual style: ${style}

The image should immediately communicate the concept's core message without relying on text. Focus on emotional impact and strategic relevance to the brief. Ensure the visual metaphor strengthens the headline's message.

Technical specs: High resolution, suitable for both digital and print applications, with room for headline overlay if needed.`;
}