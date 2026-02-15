import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Plus, Trash2, Download, Share2, Copy, Check,
  ChevronDown, ChevronUp, FolderOpen, FileText, Link2, X,
  Search, Filter, Clock, LayoutGrid, ExternalLink
} from 'lucide-react';
import {
  getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign,
  addConceptToCampaign, removeConceptFromCampaign, getCampaignConcepts,
  generateShareLink, revokeShareLink, getCampaignStats,
  type Campaign, type CampaignBrief, type CampaignStatus
} from '@/lib/campaignStorage';
import { getConceptHistory, type StoredConcept } from '@/lib/conceptStorage';
import { exportCampaignAsPDF } from '@/lib/campaignExport';
import ArbiterScoreViz from '@/components/ArbiterScoreViz';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useToast } from '@/hooks/use-toast';

const STATUS_OPTIONS: { value: CampaignStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'DRAFT', color: 'text-gray-400 border-gray-600' },
  { value: 'in-progress', label: 'IN PROGRESS', color: 'text-blue-400 border-blue-600' },
  { value: 'review', label: 'REVIEW', color: 'text-amber-400 border-amber-600' },
  { value: 'approved', label: 'APPROVED', color: 'text-green-400 border-green-600' },
  { value: 'archived', label: 'ARCHIVED', color: 'text-gray-500 border-gray-700' },
];

// ─── Campaign List (overview) ────────────────────────────────────────

function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(getCampaigns());
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [, setLocation] = useLocation();

  const refresh = () => setCampaigns(getCampaigns());

  const handleCreate = () => {
    if (!newName.trim()) return;
    const c = createCampaign(newName.trim(), newDesc.trim());
    setNewName('');
    setNewDesc('');
    setShowNew(false);
    refresh();
    setLocation(`/campaigns/${c.id}`);
  };

  const handleDelete = (id: string) => {
    deleteCampaign(id);
    refresh();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-gray-800 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">Campaigns</h1>
              <p className="text-xs text-gray-500 mt-1 tracking-wide">Organize concepts under named campaigns</p>
            </div>
          </div>
          <Button
            onClick={() => setShowNew(!showNew)}
            className="bg-white text-black hover:bg-gray-200 font-bold text-xs tracking-widest uppercase px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* New campaign form */}
        {showNew && (
          <div className="border border-gray-800 p-6 mb-8 bg-gray-950">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Create Campaign</h3>
            <Input
              placeholder="Campaign name (e.g., Q2 HIV Prevention)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white mb-3"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <Textarea
              placeholder="Description (optional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white mb-4 h-20 resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!newName.trim()} className="bg-white text-black hover:bg-gray-200 font-bold text-xs">
                Create
              </Button>
              <Button variant="ghost" onClick={() => setShowNew(false)} className="text-gray-400 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Campaign cards */}
        {campaigns.length === 0 && !showNew ? (
          <div className="text-center py-24">
            <FolderOpen className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">No campaigns yet. Create one to start organizing concepts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map(campaign => {
              const stats = getCampaignStats(campaign);
              const statusOpt = STATUS_OPTIONS.find(s => s.value === campaign.status) || STATUS_OPTIONS[0];
              return (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <div className="group border border-gray-800 hover:border-gray-600 bg-gray-950 p-5 cursor-pointer transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-black text-white tracking-tight uppercase">{campaign.name}</h3>
                      <span className={`text-[10px] font-mono tracking-widest border px-2 py-0.5 ${statusOpt.color}`}>
                        {statusOpt.label}
                      </span>
                    </div>
                    {campaign.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-[10px] font-mono text-gray-600 tracking-wide">
                      <span>{stats.total} concept{stats.total !== 1 ? 's' : ''}</span>
                      {stats.byStatus.passed > 0 && <span className="text-green-600">{stats.byStatus.passed} passed</span>}
                      {stats.byStatus.failed > 0 && <span className="text-red-600">{stats.byStatus.failed} failed</span>}
                    </div>
                    <p className="text-[10px] text-gray-700 font-mono mt-3">
                      {new Date(campaign.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campaign Detail ─────────────────────────────────────────────────

function CampaignBriefEditor({ campaign, onUpdate }: { campaign: Campaign; onUpdate: (c: Campaign) => void }) {
  const [brief, setBrief] = useState<CampaignBrief>(campaign.brief);
  const [dirty, setDirty] = useState(false);

  const handleChange = (field: keyof CampaignBrief, value: string) => {
    setBrief(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    const updated = updateCampaign(campaign.id, { brief });
    if (updated) onUpdate(updated);
    setDirty(false);
  };

  const fields: { key: keyof CampaignBrief; label: string; placeholder: string; multiline?: boolean; full?: boolean }[] = [
    { key: 'objective', label: 'Objective', placeholder: 'What is the campaign trying to achieve?' },
    { key: 'targetAudience', label: 'Target Audience', placeholder: 'Who are we talking to?' },
    { key: 'keyMessage', label: 'Key Message', placeholder: 'The single most important takeaway', full: true },
    { key: 'tone', label: 'Tone / Voice', placeholder: 'e.g., Bold and direct, Empathetic, Youth-forward' },
    { key: 'mandatories', label: 'Mandatories', placeholder: 'Legal requirements, brand guidelines, must-include elements' },
    { key: 'additionalNotes', label: 'Additional Notes', placeholder: 'Any other context for concept generation', multiline: true, full: true },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Campaign Brief</h3>
        {dirty && (
          <Button onClick={handleSave} size="sm" className="bg-white text-black hover:bg-gray-200 font-bold text-xs">
            Save Brief
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(f => (
          <div key={f.key} className={f.full ? 'md:col-span-2' : ''}>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">{f.label}</label>
            {f.multiline ? (
              <Textarea
                value={brief[f.key]}
                onChange={e => handleChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="bg-gray-900 border-gray-700 text-white text-sm h-24 resize-none"
              />
            ) : (
              <Input
                value={brief[f.key]}
                onChange={e => handleChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="bg-gray-900 border-gray-700 text-white text-sm"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConceptPicker({ campaignId, existingIds, onAdd, onClose }: {
  campaignId: string;
  existingIds: Set<string>;
  onAdd: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const allConcepts = useMemo(() => getConceptHistory(), []);
  const filtered = useMemo(() => {
    const available = allConcepts.filter(c => !existingIds.has(c.id));
    if (!search.trim()) return available.slice(0, 50);
    const q = search.toLowerCase();
    return available.filter(c =>
      c.headlines.some(h => h.toLowerCase().includes(q)) ||
      c.prompt.toLowerCase().includes(q) ||
      c.rhetoricalDevice.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [allConcepts, existingIds, search]);

  return (
    <div className="border border-gray-700 bg-gray-950 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Add Concepts from Gallery</h4>
        <button onClick={onClose} className="p-1 hover:bg-gray-800"><X className="w-4 h-4 text-gray-500" /></button>
      </div>
      <Input
        placeholder="Search concepts..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="bg-gray-900 border-gray-700 text-white text-sm mb-3"
        autoFocus
      />
      <div className="max-h-64 overflow-y-auto space-y-1">
        {filtered.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">No concepts found</p>
        )}
        {filtered.map(c => (
          <div
            key={c.id}
            className="flex items-center justify-between p-2 hover:bg-gray-900 cursor-pointer transition-colors"
            onClick={() => onAdd(c.id)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{c.headlines[0] || 'Untitled'}</p>
              <p className="text-[10px] text-gray-500 truncate">{c.prompt}</p>
            </div>
            <Plus className="w-4 h-4 text-gray-500 shrink-0 ml-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SharePanel({ campaign, onUpdate }: { campaign: Campaign; onUpdate: (c: Campaign) => void }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerate = () => {
    const link = generateShareLink(campaign.id);
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Share link copied', description: 'Link copied to clipboard.' });
    });
    // Refresh campaign data
    const updated = getCampaign(campaign.id);
    if (updated) onUpdate(updated);
  };

  const handleRevoke = () => {
    revokeShareLink(campaign.id);
    const updated = getCampaign(campaign.id);
    if (updated) onUpdate(updated);
    toast({ title: 'Share link revoked' });
  };

  const shareUrl = campaign.shareToken ? `${window.location.origin}/campaigns/share/${campaign.shareToken}` : '';

  return (
    <div className="border border-gray-800 p-4 bg-gray-950">
      <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Share Campaign</h4>
      {campaign.shareToken ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="bg-gray-900 border-gray-700 text-white text-xs font-mono flex-1"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="bg-gray-800 text-white hover:bg-gray-700 text-xs shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <button
            onClick={handleRevoke}
            className="text-[10px] text-red-500 hover:text-red-400 font-mono tracking-wide"
          >
            Revoke link
          </button>
        </div>
      ) : (
        <Button
          onClick={handleGenerate}
          className="bg-white text-black hover:bg-gray-200 font-bold text-xs"
        >
          <Link2 className="w-3.5 h-3.5 mr-2" />
          Generate Share Link
        </Button>
      )}
    </div>
  );
}

function CampaignDetail({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<Campaign | undefined>(getCampaign(campaignId));
  const [concepts, setConcepts] = useState<StoredConcept[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'concepts' | 'brief' | 'share'>('concepts');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const refreshConcepts = useCallback(() => {
    if (campaign) {
      setConcepts(getCampaignConcepts(campaign.id));
    }
  }, [campaign?.id]);

  useEffect(() => { refreshConcepts(); }, [refreshConcepts]);

  if (!campaign) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Campaign not found</p>
          <Link href="/campaigns"><Button variant="ghost" className="text-gray-400">Back to Campaigns</Button></Link>
        </div>
      </div>
    );
  }

  const handleStatusChange = (status: CampaignStatus) => {
    const updated = updateCampaign(campaign.id, { status });
    if (updated) setCampaign(updated);
  };

  const handleAddConcept = (conceptId: string) => {
    addConceptToCampaign(campaign.id, conceptId);
    const updated = getCampaign(campaign.id);
    if (updated) setCampaign(updated);
    refreshConcepts();
  };

  const handleRemoveConcept = (conceptId: string) => {
    removeConceptFromCampaign(campaign.id, conceptId);
    const updated = getCampaign(campaign.id);
    if (updated) setCampaign(updated);
    refreshConcepts();
  };

  const handleExport = () => {
    if (concepts.length === 0) {
      toast({ title: 'No concepts to export', description: 'Add concepts to this campaign first.' });
      return;
    }
    exportCampaignAsPDF(campaign, concepts);
    toast({ title: 'Campaign deck exported' });
  };

  const handleDeleteCampaign = () => {
    deleteCampaign(campaign.id);
    setLocation('/campaigns');
  };

  const handleSaveName = () => {
    if (nameInput.trim()) {
      const updated = updateCampaign(campaign.id, { name: nameInput.trim() });
      if (updated) setCampaign(updated);
    }
    setEditingName(false);
  };

  const existingIds = new Set(campaign.conceptIds);
  const statusOpt = STATUS_OPTIONS.find(s => s.value === campaign.status) || STATUS_OPTIONS[0];

  const tabs = [
    { key: 'concepts' as const, label: 'Concepts', count: concepts.length },
    { key: 'brief' as const, label: 'Brief' },
    { key: 'share' as const, label: 'Share' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Link href="/campaigns">
            <button className="p-2 hover:bg-gray-800 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <Input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                className="bg-gray-900 border-gray-700 text-white text-xl font-black"
                autoFocus
              />
            ) : (
              <h1
                className="text-2xl font-black tracking-tight uppercase cursor-pointer hover:text-gray-300 transition-colors"
                onClick={() => { setEditingName(true); setNameInput(campaign.name); }}
              >
                {campaign.name}
              </h1>
            )}
          </div>
        </div>

        {/* Status + actions bar */}
        <div className="flex items-center gap-3 mb-8 ml-12 flex-wrap">
          {/* Status selector */}
          <div className="flex gap-1">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => handleStatusChange(s.value)}
                className={`text-[10px] font-mono tracking-widest border px-2 py-0.5 transition-all ${
                  campaign.status === s.value ? s.color + ' bg-gray-900' : 'text-gray-700 border-gray-800 hover:border-gray-600'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <Button onClick={handleExport} variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Deck
          </Button>
          <button onClick={handleDeleteCampaign} className="text-[10px] text-gray-600 hover:text-red-400 font-mono tracking-wide transition-colors">
            Delete
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-800 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'text-white border-white'
                  : 'text-gray-600 border-transparent hover:text-gray-400'
              }`}
            >
              {tab.label}
              {'count' in tab && tab.count !== undefined ? (
                <span className="ml-2 text-[10px] text-gray-600 font-mono">{tab.count}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'concepts' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">
                {concepts.length === 0 ? 'No concepts added yet.' : `${concepts.length} concept${concepts.length !== 1 ? 's' : ''} in this campaign`}
              </p>
              <Button
                onClick={() => setShowPicker(!showPicker)}
                size="sm"
                className="bg-gray-800 text-white hover:bg-gray-700 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Concept
              </Button>
            </div>

            {showPicker && (
              <div className="mb-4">
                <ConceptPicker
                  campaignId={campaign.id}
                  existingIds={existingIds}
                  onAdd={handleAddConcept}
                  onClose={() => setShowPicker(false)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {concepts.map(c => (
                <div key={c.id} className="border border-gray-800 bg-gray-950 p-5 group relative">
                  <button
                    onClick={() => handleRemoveConcept(c.id)}
                    className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-800 transition-all"
                    title="Remove from campaign"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
                  </button>
                  <h3 className="text-sm font-black text-white tracking-tight mb-1 pr-6">
                    {c.headlines[0] || 'Untitled'}
                  </h3>
                  {c.tagline && (
                    <p className="text-xs text-cyan-400 italic mb-2 line-clamp-1">{c.tagline}</p>
                  )}
                  <Badge variant="secondary" className="bg-gray-800 text-gray-400 border-gray-700 text-[10px] uppercase tracking-widest font-mono mb-3">
                    {c.rhetoricalDevice}
                  </Badge>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.prompt}</p>
                  <ErrorBoundary compact label="scores">
                    <ArbiterScoreViz
                      originalityScore={c.originalityScore}
                      professionalismScore={c.professionalismScore}
                      clarityScore={c.clarityScore}
                      freshnessScore={c.freshnessScore}
                      resonanceScore={c.resonanceScore}
                      awardsScore={c.awardsScore}
                      finalStatus={c.finalStatus}
                      compact
                    />
                  </ErrorBoundary>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'brief' && (
          <CampaignBriefEditor campaign={campaign} onUpdate={setCampaign} />
        )}

        {activeTab === 'share' && (
          <SharePanel campaign={campaign} onUpdate={setCampaign} />
        )}
      </div>
    </div>
  );
}

// ─── Shared Campaign View (public share link) ───────────────────────

function SharedCampaignView({ shareToken }: { shareToken: string }) {
  const [campaign, setCampaign] = useState<Campaign | undefined>();
  const [concepts, setConcepts] = useState<StoredConcept[]>([]);

  useEffect(() => {
    // Import dynamically to avoid circular deps
    const { getCampaignByShareToken, getCampaignConcepts } = require('@/lib/campaignStorage');
    const c = getCampaignByShareToken(shareToken);
    if (c) {
      setCampaign(c);
      setConcepts(getCampaignConcepts(c.id));
    }
  }, [shareToken]);

  if (!campaign) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Campaign not found or link expired.</p>
          <Link href="/"><Button variant="ghost" className="text-gray-400 text-xs">Go to Concept Forge</Button></Link>
        </div>
      </div>
    );
  }

  const brief = campaign.brief;
  const hasBrief = brief.objective || brief.targetAudience || brief.keyMessage;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <p className="text-[10px] font-mono text-gray-600 tracking-widest uppercase mb-2">Shared Campaign</p>
          <h1 className="text-3xl font-black tracking-tight uppercase">{campaign.name}</h1>
          {campaign.description && <p className="text-sm text-gray-500 mt-2">{campaign.description}</p>}
          <span className={`inline-block mt-3 text-[10px] font-mono tracking-widest border px-2 py-0.5 ${
            STATUS_OPTIONS.find(s => s.value === campaign.status)?.color || 'text-gray-400 border-gray-600'
          }`}>
            {campaign.status.toUpperCase()}
          </span>
        </div>

        {hasBrief && (
          <div className="border border-gray-800 p-6 mb-8 bg-gray-950">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Campaign Brief</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brief.objective && (
                <div><label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Objective</label><p className="text-sm text-gray-300">{brief.objective}</p></div>
              )}
              {brief.targetAudience && (
                <div><label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Target Audience</label><p className="text-sm text-gray-300">{brief.targetAudience}</p></div>
              )}
              {brief.keyMessage && (
                <div className="md:col-span-2"><label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Key Message</label><p className="text-sm text-gray-300">{brief.keyMessage}</p></div>
              )}
              {brief.tone && (
                <div><label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Tone</label><p className="text-sm text-gray-300">{brief.tone}</p></div>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 mb-4">{concepts.length} concept{concepts.length !== 1 ? 's' : ''}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {concepts.map(c => (
            <div key={c.id} className="border border-gray-800 bg-gray-950 p-5">
              <h3 className="text-sm font-black text-white tracking-tight mb-1">{c.headlines[0] || 'Untitled'}</h3>
              {c.tagline && <p className="text-xs text-cyan-400 italic mb-2 line-clamp-1">{c.tagline}</p>}
              <Badge variant="secondary" className="bg-gray-800 text-gray-400 border-gray-700 text-[10px] uppercase tracking-widest font-mono mb-3">
                {c.rhetoricalDevice}
              </Badge>
              {c.bodyCopy && <p className="text-xs text-gray-400 line-clamp-3 mb-2">{c.bodyCopy}</p>}
              {c.visualDescription && (
                <div className="border-l-2 border-gray-700 pl-3 mb-2">
                  <p className="text-[10px] text-gray-500 italic">{c.visualDescription}</p>
                </div>
              )}
              <ErrorBoundary compact label="scores">
                <ArbiterScoreViz
                  originalityScore={c.originalityScore}
                  professionalismScore={c.professionalismScore}
                  clarityScore={c.clarityScore}
                  freshnessScore={c.freshnessScore}
                  resonanceScore={c.resonanceScore}
                  awardsScore={c.awardsScore}
                  finalStatus={c.finalStatus}
                  compact
                />
              </ErrorBoundary>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-[10px] font-mono text-gray-700 tracking-widest">CONCEPT FORGE | thecforge.com</p>
        </div>
      </div>
    </div>
  );
}

// ─── Router ──────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [matchDetail, paramsDetail] = useRoute('/campaigns/:id');
  const [matchShare, paramsShare] = useRoute('/campaigns/share/:token');

  if (matchShare && paramsShare?.token) {
    return <SharedCampaignView shareToken={paramsShare.token} />;
  }

  if (matchDetail && paramsDetail?.id && paramsDetail.id !== 'share') {
    return <CampaignDetail campaignId={paramsDetail.id} />;
  }

  return <CampaignList />;
}
