// Client/Brand Profile System - localStorage-based

export interface BrandProfile {
  id: string;
  name: string;
  industry: string;
  brandVoice: string;
  targetAudience: string;
  keyMessages: string;
  tone: string;
  avoidWords: string;
  createdAt: string;
  updatedAt: string;
}

const PROFILES_KEY = 'cforge_brand_profiles';

export function getBrandProfiles(): BrandProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBrandProfile(profile: BrandProfile): void {
  const profiles = getBrandProfiles();
  const idx = profiles.findIndex(p => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = { ...profile, updatedAt: new Date().toISOString() };
  } else {
    profiles.unshift(profile);
  }
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function deleteBrandProfile(id: string): void {
  const profiles = getBrandProfiles().filter(p => p.id !== id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function profileToBriefPrefix(profile: BrandProfile): string {
  const parts: string[] = [];
  if (profile.industry) parts.push(`Industry: ${profile.industry}.`);
  if (profile.targetAudience) parts.push(`Target audience: ${profile.targetAudience}.`);
  if (profile.brandVoice) parts.push(`Brand voice: ${profile.brandVoice}.`);
  if (profile.keyMessages) parts.push(`Key messages: ${profile.keyMessages}.`);
  if (profile.avoidWords) parts.push(`Avoid: ${profile.avoidWords}.`);
  return parts.join(' ');
}
