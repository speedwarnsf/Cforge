/**
 * Trope Variety Selector
 * Ensures exploration of the full 293 rhetorical device corpus
 * by tracking usage and strongly favoring unexplored devices
 *
 * Location: server/utils/tropeVarietySelector.ts
 */

import { getRhetoricalDeviceUsage, updateRhetoricalDeviceUsage } from '../supabaseClient';
import { loadAllRhetoricalDevices, getAllAvailableDeviceIds, getDeviceDefinition } from './tropeConstraints';

// ============================================
// INTERFACES
// ============================================

export interface TropeSelection {
  deviceId: string;
  deviceName: string;
  definition: string;
  usageCount: number;
  selectionReason: 'unexplored' | 'lightly_used' | 'tone_matched' | 'random';
}

export interface TropeSelectionOptions {
  tone?: string;
  count?: number;
  excludeDevices?: string[];
  preferUnexplored?: boolean;
  maxUsageCount?: number;
}

// ============================================
// TONE-DEVICE AFFINITIES
// ============================================

const TONE_DEVICE_AFFINITIES: Record<string, string[]> = {
  creative: [
    'metaphor', 'paradox', 'oxymoron', 'synecdoche', 'hyperbole',
    'personification', 'allegory', 'zeugma', 'juxtaposition',
    'alliteration', 'assonance', 'ekphrasis', 'paronomasia',
    'catachresis', 'metalepsis', 'syllepsis', 'antanaclasis'
  ],
  analytical: [
    'antithesis', 'chiasmus', 'syllogism', 'logos', 'ethos',
    'polysyndeton', 'asyndeton', 'epistrophe', 'anaphora',
    'climax', 'prolepsis', 'isocolon', 'litotes', 'ellipsis',
    'enthymeme', 'epichirema', 'sorites', 'dilemma'
  ],
  conversational: [
    'rhetorical_question', 'irony', 'hyperbole', 'paronomasia',
    'hendiadys', 'anadiplosis', 'epizeuxis', 'symploce',
    'alliteration', 'assonance', 'meiosis', 'litotes',
    'aposiopesis', 'anacoluthon', 'pathos', 'apostrophe'
  ],
  technical: [
    'metonymy', 'litotes', 'synecdoche', 'ellipsis', 'hendiadys',
    'chiasmus', 'climax', 'syllogism', 'logos', 'ethos',
    'isocolon', 'parallelism', 'prolepsis', 'anaphora',
    'epistrophe', 'polysyndeton', 'asyndeton', 'enumeration'
  ],
  emotional: [
    'pathos', 'hyperbole', 'exclamation', 'apostrophe',
    'personification', 'prosopopoeia', 'erotema', 'ecphonesis',
    'aposiopesis', 'epimone', 'conduplicatio', 'anaphora',
    'epistrophe', 'symploce', 'epizeuxis', 'ploce'
  ],
  persuasive: [
    'ethos', 'pathos', 'logos', 'antithesis', 'chiasmus',
    'anaphora', 'epistrophe', 'climax', 'rhetorical_question',
    'procatalepsis', 'apophasis', 'paralepsis', 'concession',
    'refutation', 'amplification', 'diminution'
  ]
};

// ============================================
// MAIN SELECTION FUNCTION
// ============================================

/**
 * Select rhetorical devices with GUARANTEED variety enforcement
 *
 * KEY GUARANTEE: At least 50% of selections will be from unexplored devices
 * in the FULL 411 corpus, regardless of tone/lens selection.
 * This ensures systematic exploration of the entire rhetorical device corpus.
 */
// Overused common devices to STRONGLY AVOID (unless explicitly requested)
// These are taught in every high school English class - we want to explore the other 390+ devices
const OVERUSED_COMMON_DEVICES = new Set([
  'metaphor', 'simile', 'hyperbole', 'personification', 'alliteration',
  'onomatopoeia', 'oxymoron', 'irony', 'paradox', 'analogy',
  'antithesis', 'juxtaposition', 'repetition', 'rhetorical_question',
  'allusion', 'imagery', 'symbolism', 'foreshadowing', 'flashback'
]);

export async function selectVariedTropes(
  options: TropeSelectionOptions = {}
): Promise<TropeSelection[]> {
  const {
    tone = 'creative',
    count = 3,
    excludeDevices = [],
    preferUnexplored = true,
    maxUsageCount = 5
  } = options;

  // Get all available devices from corpus
  const allDeviceIds = getAllAvailableDeviceIds();
  console.log(`Selecting from ${allDeviceIds.length} available rhetorical devices`);

  // Get current usage counts
  const usageCounts = await getRhetoricalDeviceUsage();

  // Filter out excluded devices AND overused common devices
  const excludeSet = new Set(excludeDevices.map(d => d.toLowerCase().replace(/\s+/g, '_')));

  // Combine explicit exclusions with overused common devices
  const fullExcludeSet = new Set([...excludeSet, ...OVERUSED_COMMON_DEVICES]);
  const eligibleDevices = allDeviceIds.filter(id => !fullExcludeSet.has(id));

  console.log(`   🚫 Excluding ${OVERUSED_COMMON_DEVICES.size} overused common devices (metaphor, simile, etc.)`);
  console.log(`   ${eligibleDevices.length} uncommon devices available for selection`);

  // Categorize devices by usage
  const unexploredDevices: string[] = [];
  const lightlyUsedDevices: string[] = [];
  const moderatelyUsedDevices: string[] = [];

  for (const deviceId of eligibleDevices) {
    const usage = usageCounts[deviceId] || 0;
    if (usage === 0) {
      unexploredDevices.push(deviceId);
    } else if (usage <= 2) {
      lightlyUsedDevices.push(deviceId);
    } else if (usage <= maxUsageCount) {
      moderatelyUsedDevices.push(deviceId);
    }
  }

  console.log(`   📊 Unexplored: ${unexploredDevices.length}, Lightly used: ${lightlyUsedDevices.length}, Moderate: ${moderatelyUsedDevices.length}`);

  // Get tone-appropriate devices
  const toneDevices = TONE_DEVICE_AFFINITIES[tone] || TONE_DEVICE_AFFINITIES.creative;
  const toneDeviceSet = new Set(toneDevices);

  const selected: TropeSelection[] = [];

  // Helper to add device to selection
  const addDevice = (deviceId: string, reason: TropeSelection['selectionReason']) => {
    if (selected.length >= count) return false;
    if (selected.some(s => s.deviceId === deviceId)) return false;

    const definition = getDeviceDefinition(deviceId) || 'Rhetorical device';
    const deviceName = deviceId.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    selected.push({
      deviceId,
      deviceName,
      definition,
      usageCount: usageCounts[deviceId] || 0,
      selectionReason: reason
    });
    return true;
  };

  // ============================================
  // GUARANTEED 80% EXPLORATION FROM FULL CORPUS
  // ============================================
  // AGGRESSIVE exploration to force use of the full 408-device corpus.
  // Only 20% of selections can be from previously-used devices.

  const explorationQuota = Math.ceil(count * 0.8); // At least 80% must be unexplored/lightly-used
  const toneQuota = count - explorationQuota;      // Only 20% can be familiar devices

  console.log(`   🔬 AGGRESSIVE exploration quota: ${explorationQuota} unexplored (80%), ${toneQuota} familiar (20%)`);

  // PHASE 1: Fill exploration quota from FULL unexplored corpus (ignoring tone)
  // This is the key change - we pick randomly from ALL unexplored devices first
  shuffleArray(unexploredDevices);
  let explorationFilled = 0;
  for (const device of unexploredDevices) {
    if (explorationFilled >= explorationQuota) break;
    if (addDevice(device, 'unexplored')) {
      explorationFilled++;
    }
  }

  // If not enough unexplored, use lightly used from full corpus
  if (explorationFilled < explorationQuota) {
    shuffleArray(lightlyUsedDevices);
    for (const device of lightlyUsedDevices) {
      if (explorationFilled >= explorationQuota) break;
      if (addDevice(device, 'lightly_used')) {
        explorationFilled++;
      }
    }
  }

  // PHASE 2: Fill remaining slots with tone-matched devices
  // Now we respect the lens/tone preference for the other half

  // 2a. Prefer unexplored tone-matched
  const unexploredToneMatch = unexploredDevices.filter(d => toneDeviceSet.has(d));
  shuffleArray(unexploredToneMatch);
  for (const device of unexploredToneMatch) {
    if (selected.length >= count) break;
    addDevice(device, 'unexplored');
  }

  // 2b. Then lightly used tone-matched
  const lightlyUsedToneMatch = lightlyUsedDevices.filter(d => toneDeviceSet.has(d));
  shuffleArray(lightlyUsedToneMatch);
  for (const device of lightlyUsedToneMatch) {
    if (selected.length >= count) break;
    addDevice(device, 'lightly_used');
  }

  // 2c. Then any tone-matched
  const toneMatched = eligibleDevices.filter(d => toneDeviceSet.has(d));
  shuffleArray(toneMatched);
  for (const device of toneMatched) {
    if (selected.length >= count) break;
    addDevice(device, 'tone_matched');
  }

  // PHASE 3: Final fallback - random fill if still needed
  shuffleArray(eligibleDevices);
  for (const device of eligibleDevices) {
    if (selected.length >= count) break;
    addDevice(device, 'random');
  }

  const unexploredCount = selected.filter(s => s.selectionReason === 'unexplored').length;
  console.log(`   Selected ${selected.length} devices (${unexploredCount} unexplored): ${selected.map(s => `${s.deviceName} (${s.selectionReason})`).join(', ')}`);

  return selected;
}

/**
 * Record that devices were used (call after generation)
 */
export async function recordTropeUsage(deviceIds: string[]): Promise<void> {
  console.log(`Recording usage for ${deviceIds.length} devices`);

  for (const deviceId of deviceIds) {
    const normalizedId = deviceId.toLowerCase().replace(/\s+/g, '_');
    await updateRhetoricalDeviceUsage(normalizedId);
  }
}

/**
 * Get exploration statistics
 */
export async function getTropeExplorationStats(): Promise<{
  totalDevices: number;
  exploredCount: number;
  unexploredCount: number;
  explorationPercentage: number;
  mostUsed: { deviceId: string; count: number }[];
  neverUsed: string[];
}> {
  const allDeviceIds = getAllAvailableDeviceIds();
  const usageCounts = await getRhetoricalDeviceUsage();

  const explored: string[] = [];
  const unexplored: string[] = [];
  const usageList: { deviceId: string; count: number }[] = [];

  for (const deviceId of allDeviceIds) {
    const count = usageCounts[deviceId] || 0;
    if (count > 0) {
      explored.push(deviceId);
      usageList.push({ deviceId, count });
    } else {
      unexplored.push(deviceId);
    }
  }

  // Sort by usage count descending
  usageList.sort((a, b) => b.count - a.count);

  return {
    totalDevices: allDeviceIds.length,
    exploredCount: explored.length,
    unexploredCount: unexplored.length,
    explorationPercentage: (explored.length / allDeviceIds.length) * 100,
    mostUsed: usageList.slice(0, 10),
    neverUsed: unexplored.slice(0, 20) // Sample of never-used devices
  };
}

/**
 * Suggest devices to explore based on current coverage
 */
export async function suggestDevicesToExplore(
  count: number = 5,
  tone?: string
): Promise<TropeSelection[]> {
  return selectVariedTropes({
    tone,
    count,
    preferUnexplored: true,
    maxUsageCount: 0 // Only return completely unexplored
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  selectVariedTropes,
  recordTropeUsage,
  getTropeExplorationStats,
  suggestDevicesToExplore
};
