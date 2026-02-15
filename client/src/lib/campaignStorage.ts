// localStorage-based campaign management

import type { StoredConcept } from './conceptStorage';
import { getConceptHistory } from './conceptStorage';

export interface CampaignBrief {
  objective: string;
  targetAudience: string;
  keyMessage: string;
  tone: string;
  mandatories: string;
  additionalNotes: string;
}

export type CampaignStatus = 'draft' | 'in-progress' | 'review' | 'approved' | 'archived';

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  brief: CampaignBrief;
  conceptIds: string[];
  createdAt: string;
  updatedAt: string;
  shareToken?: string;
}

const CAMPAIGNS_KEY = 'cforge_campaigns';

function generateId(): string {
  return `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateShareToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function getCampaigns(): Campaign[] {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCampaigns(campaigns: Campaign[]): void {
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function getCampaign(id: string): Campaign | undefined {
  return getCampaigns().find(c => c.id === id);
}

export function createCampaign(name: string, description: string = ''): Campaign {
  const campaigns = getCampaigns();
  const campaign: Campaign = {
    id: generateId(),
    name,
    description,
    status: 'draft',
    brief: {
      objective: '',
      targetAudience: '',
      keyMessage: '',
      tone: '',
      mandatories: '',
      additionalNotes: '',
    },
    conceptIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  campaigns.unshift(campaign);
  saveCampaigns(campaigns);
  return campaign;
}

export function updateCampaign(id: string, updates: Partial<Campaign>): Campaign | undefined {
  const campaigns = getCampaigns();
  const idx = campaigns.findIndex(c => c.id === id);
  if (idx === -1) return undefined;
  campaigns[idx] = { ...campaigns[idx], ...updates, updatedAt: new Date().toISOString() };
  saveCampaigns(campaigns);
  return campaigns[idx];
}

export function deleteCampaign(id: string): void {
  const campaigns = getCampaigns().filter(c => c.id !== id);
  saveCampaigns(campaigns);
}

export function addConceptToCampaign(campaignId: string, conceptId: string): void {
  const campaigns = getCampaigns();
  const campaign = campaigns.find(c => c.id === campaignId);
  if (campaign && !campaign.conceptIds.includes(conceptId)) {
    campaign.conceptIds.push(conceptId);
    campaign.updatedAt = new Date().toISOString();
    saveCampaigns(campaigns);
  }
}

export function removeConceptFromCampaign(campaignId: string, conceptId: string): void {
  const campaigns = getCampaigns();
  const campaign = campaigns.find(c => c.id === campaignId);
  if (campaign) {
    campaign.conceptIds = campaign.conceptIds.filter(id => id !== conceptId);
    campaign.updatedAt = new Date().toISOString();
    saveCampaigns(campaigns);
  }
}

export function getCampaignConcepts(campaignId: string): StoredConcept[] {
  const campaign = getCampaign(campaignId);
  if (!campaign) return [];
  const allConcepts = getConceptHistory();
  const idSet = new Set(campaign.conceptIds);
  return allConcepts.filter(c => idSet.has(c.id));
}

export function generateShareLink(campaignId: string): string {
  const campaigns = getCampaigns();
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) return '';
  if (!campaign.shareToken) {
    campaign.shareToken = generateShareToken();
    campaign.updatedAt = new Date().toISOString();
    saveCampaigns(campaigns);
  }
  return `${window.location.origin}/campaigns/share/${campaign.shareToken}`;
}

export function getCampaignByShareToken(token: string): Campaign | undefined {
  return getCampaigns().find(c => c.shareToken === token);
}

export function revokeShareLink(campaignId: string): void {
  const campaigns = getCampaigns();
  const campaign = campaigns.find(c => c.id === campaignId);
  if (campaign) {
    delete campaign.shareToken;
    campaign.updatedAt = new Date().toISOString();
    saveCampaigns(campaigns);
  }
}

export function getCampaignStats(campaign: Campaign): { total: number; byStatus: Record<string, number> } {
  const concepts = getCampaignConcepts(campaign.id);
  const byStatus: Record<string, number> = { passed: 0, failed: 0, unscored: 0 };
  concepts.forEach(c => {
    if (c.finalStatus === 'APPROVED') byStatus.passed++;
    else if (c.finalStatus === 'REJECTED') byStatus.failed++;
    else byStatus.unscored++;
  });
  return { total: concepts.length, byStatus };
}
