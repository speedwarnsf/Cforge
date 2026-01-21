/**
 * Trope Variety Selector
 * Ensures exploration of the full 411 rhetorical device corpus
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
 * Select rhetorical devices with strong variety enforcement
 * Prioritizes unexplored devices from the full 411 corpus
 */
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
  console.log(`🎭 Selecting from ${allDeviceIds.length} available rhetorical devices`);

  // Get current usage counts
  const usageCounts = await getRhetoricalDeviceUsage();

  // Filter out excluded devices
  const excludeSet = new Set(excludeDevices.map(d => d.toLowerCase().replace(/\s+/g, '_')));
  const eligibleDevices = allDeviceIds.filter(id => !excludeSet.has(id));

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

  // Build selection with priority:
  // 1. Unexplored devices that match tone
  // 2. Any unexplored devices
  // 3. Lightly used devices that match tone
  // 4. Any lightly used devices
  // 5. Random from moderately used
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

  if (preferUnexplored) {
    // 1. Unexplored + tone match
    const unexploredToneMatch = unexploredDevices.filter(d => toneDeviceSet.has(d));
    shuffleArray(unexploredToneMatch);
    for (const device of unexploredToneMatch) {
      if (!addDevice(device, 'unexplored')) break;
    }

    // 2. Any unexplored
    shuffleArray(unexploredDevices);
    for (const device of unexploredDevices) {
      if (!addDevice(device, 'unexplored')) break;
    }

    // 3. Lightly used + tone match
    const lightlyUsedToneMatch = lightlyUsedDevices.filter(d => toneDeviceSet.has(d));
    shuffleArray(lightlyUsedToneMatch);
    for (const device of lightlyUsedToneMatch) {
      if (!addDevice(device, 'lightly_used')) break;
    }

    // 4. Any lightly used
    shuffleArray(lightlyUsedDevices);
    for (const device of lightlyUsedDevices) {
      if (!addDevice(device, 'lightly_used')) break;
    }
  }

  // 5. Tone-matched from any usage level
  const toneMatched = eligibleDevices.filter(d => toneDeviceSet.has(d));
  shuffleArray(toneMatched);
  for (const device of toneMatched) {
    if (!addDevice(device, 'tone_matched')) break;
  }

  // 6. Random fill if still needed
  shuffleArray(moderatelyUsedDevices);
  for (const device of moderatelyUsedDevices) {
    if (!addDevice(device, 'random')) break;
  }

  // Final random fill from all eligible
  shuffleArray(eligibleDevices);
  for (const device of eligibleDevices) {
    if (!addDevice(device, 'random')) break;
  }

  console.log(`   ✅ Selected ${selected.length} devices: ${selected.map(s => `${s.deviceName} (${s.selectionReason})`).join(', ')}`);

  return selected;
}

/**
 * Record that devices were used (call after generation)
 */
export async function recordTropeUsage(deviceIds: string[]): Promise<void> {
  console.log(`📝 Recording usage for ${deviceIds.length} devices`);

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
