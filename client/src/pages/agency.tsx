import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Plus, Trash2, X, Users, Activity, Settings,
  ChevronRight, UserPlus, Clock, CheckCircle2, AlertCircle,
  FileText, User, Briefcase
} from 'lucide-react';
import {
  getAgencyProfile, saveAgencyProfile, createAgencyProfile,
  addTeamMember, removeTeamMember, updateTeamMember,
  getAssignments, assignConcept, unassignConcept,
  updateConceptStatus, getAssignmentForConcept, getAssignmentsForMember,
  getActivityFeed, setActiveUser, getActiveUserId, getActiveUserName,
  logActivity, formatStatus, statusColor, STATUS_FLOW,
  type AgencyProfile, type TeamMember, type ConceptStatus, type ConceptAssignment,
  type ActivityEntry
} from '@/lib/agencyStorage';
import { getConceptHistory, type StoredConcept } from '@/lib/conceptStorage';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useToast } from '@/hooks/use-toast';

// ── Tab type ──
type TabId = 'profile' | 'assignments' | 'activity';

// ── Agency Setup (first-time) ──

function AgencySetup({ onComplete }: { onComplete: () => void }) {
  const [name, setName] = useState('');
  const [specialties, setSpecialties] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    const specs = specialties.split(',').map(s => s.trim()).filter(Boolean);
    createAgencyProfile(name.trim(), specs);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-lg w-full px-6">
        <h1 className="text-3xl font-black tracking-tight uppercase mb-2">Agency Setup</h1>
        <p className="text-sm text-gray-500 mb-8">Configure your agency workspace for team collaboration.</p>

        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Agency Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Forge Creative"
              className="bg-gray-900 border-gray-700 text-white rounded-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Specialties (comma-separated)</label>
            <Input
              value={specialties}
              onChange={e => setSpecialties(e.target.value)}
              placeholder="e.g. Brand Strategy, Digital Campaigns, Copywriting"
              className="bg-gray-900 border-gray-700 text-white rounded-none"
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full bg-white text-black hover:bg-gray-200 font-bold text-xs tracking-widest uppercase rounded-none"
          >
            Create Agency Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Tab ──

function ProfileTab({ profile, refresh }: { profile: AgencyProfile; refresh: () => void }) {
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [agencyName, setAgencyName] = useState(profile.name);
  const [specInput, setSpecInput] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const activeUserId = getActiveUserId();

  const handleSaveName = () => {
    if (!agencyName.trim()) return;
    profile.name = agencyName.trim();
    saveAgencyProfile(profile);
    setEditingName(false);
    logActivity({ type: 'agency_updated', actorId: getActiveUserId(), actorName: getActiveUserName(), detail: `Renamed agency to "${agencyName.trim()}"` });
    refresh();
  };

  const handleAddSpecialty = () => {
    if (!specInput.trim()) return;
    profile.specialties.push(specInput.trim());
    saveAgencyProfile(profile);
    setSpecInput('');
    refresh();
  };

  const handleRemoveSpecialty = (idx: number) => {
    profile.specialties.splice(idx, 1);
    saveAgencyProfile(profile);
    refresh();
  };

  const handleAddMember = () => {
    if (!newMemberName.trim() || !newMemberRole.trim()) return;
    addTeamMember(newMemberName.trim(), newMemberRole.trim());
    setNewMemberName('');
    setNewMemberRole('');
    setShowAddMember(false);
    refresh();
    toast({ title: 'Team member added' });
  };

  const handleRemoveMember = (id: string) => {
    removeTeamMember(id);
    refresh();
    toast({ title: 'Team member removed' });
  };

  const handleSetActive = (id: string) => {
    setActiveUser(id);
    refresh();
    toast({ title: `Switched to ${profile.teamMembers.find(m => m.id === id)?.name}` });
  };

  return (
    <div className="space-y-8">
      {/* Agency Info */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Briefcase className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-black uppercase tracking-tight">Agency Info</h2>
        </div>
        <div className="border border-gray-800 p-4 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 block mb-1">Name</label>
            {editingName ? (
              <div className="flex gap-2">
                <Input value={agencyName} onChange={e => setAgencyName(e.target.value)} className="bg-gray-900 border-gray-700 text-white rounded-none flex-1" />
                <Button onClick={handleSaveName} className="bg-white text-black hover:bg-gray-200 rounded-none text-xs font-bold">Save</Button>
                <Button onClick={() => { setEditingName(false); setAgencyName(profile.name); }} variant="outline" className="rounded-none border-gray-700 text-xs">Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{profile.name}</span>
                <button onClick={() => setEditingName(true)} className="text-xs text-gray-500 hover:text-white uppercase tracking-wide">Edit</button>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 block mb-2">Specialties</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.specialties.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs border border-gray-700 px-3 py-1 text-gray-300">
                  {s}
                  <button onClick={() => handleRemoveSpecialty(i)} className="text-gray-600 hover:text-red-400 ml-1"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={specInput} onChange={e => setSpecInput(e.target.value)} placeholder="Add specialty" className="bg-gray-900 border-gray-700 text-white rounded-none text-sm flex-1" onKeyDown={e => e.key === 'Enter' && handleAddSpecialty()} />
              <Button onClick={handleAddSpecialty} variant="outline" className="rounded-none border-gray-700 text-xs">Add</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-black uppercase tracking-tight">Team Members</h2>
            <span className="text-xs text-gray-600">({profile.teamMembers.length})</span>
          </div>
          <Button onClick={() => setShowAddMember(!showAddMember)} variant="outline" className="rounded-none border-gray-700 text-xs font-bold uppercase tracking-wide">
            <UserPlus className="w-3 h-3 mr-2" />Add Member
          </Button>
        </div>

        {showAddMember && (
          <div className="border border-gray-800 p-4 mb-4 space-y-3">
            <Input value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="Name" className="bg-gray-900 border-gray-700 text-white rounded-none" />
            <Input value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} placeholder="Role (e.g. Creative Director)" className="bg-gray-900 border-gray-700 text-white rounded-none" />
            <div className="flex gap-2">
              <Button onClick={handleAddMember} disabled={!newMemberName.trim() || !newMemberRole.trim()} className="bg-white text-black hover:bg-gray-200 rounded-none text-xs font-bold">Add</Button>
              <Button onClick={() => setShowAddMember(false)} variant="outline" className="rounded-none border-gray-700 text-xs">Cancel</Button>
            </div>
          </div>
        )}

        {profile.teamMembers.length === 0 ? (
          <div className="border border-dashed border-gray-800 p-8 text-center text-gray-600 text-sm">
            No team members yet. Add your first team member to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {profile.teamMembers.map(member => (
              <div key={member.id} className={`border p-3 flex items-center justify-between ${activeUserId === member.id ? 'border-white bg-gray-900' : 'border-gray-800'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.role}</div>
                  </div>
                  {activeUserId === member.id && (
                    <span className="text-[10px] uppercase tracking-widest text-green-500 font-bold ml-2">Active</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {activeUserId !== member.id && (
                    <button onClick={() => handleSetActive(member.id)} className="text-xs text-gray-500 hover:text-white uppercase tracking-wide px-2 py-1 border border-gray-800 hover:border-gray-600">
                      Switch To
                    </button>
                  )}
                  <button onClick={() => handleRemoveMember(member.id)} className="text-gray-600 hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Assignments Tab ──

function AssignmentsTab({ profile, refresh }: { profile: AgencyProfile; refresh: () => void }) {
  const { toast } = useToast();
  const concepts = useMemo(() => getConceptHistory(), []);
  const assignments = useMemo(() => getAssignments(), []);
  const [filter, setFilter] = useState<'all' | ConceptStatus>('all');
  const [assigningConceptId, setAssigningConceptId] = useState<string | null>(null);

  const enriched = useMemo(() => {
    return concepts.map(c => {
      const assignment = assignments.find(a => a.conceptId === c.id);
      const assignee = assignment ? profile.teamMembers.find(m => m.id === assignment.assigneeId) : null;
      return { concept: c, assignment, assignee };
    }).filter(item => {
      if (filter === 'all') return true;
      return item.assignment?.status === filter;
    });
  }, [concepts, assignments, filter, profile.teamMembers]);

  const handleAssign = (conceptId: string, memberId: string, title: string) => {
    assignConcept(conceptId, memberId, title);
    setAssigningConceptId(null);
    refresh();
    toast({ title: 'Concept assigned' });
  };

  const handleUnassign = (conceptId: string, title: string) => {
    unassignConcept(conceptId, title);
    refresh();
    toast({ title: 'Concept unassigned' });
  };

  const handleStatusChange = (conceptId: string, status: ConceptStatus, title: string) => {
    updateConceptStatus(conceptId, status, title);
    refresh();
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: concepts.length };
    STATUS_FLOW.forEach(s => { counts[s] = 0; });
    assignments.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return counts;
  }, [concepts, assignments]);

  return (
    <div className="space-y-6">
      {/* Status filter bar */}
      <div className="flex gap-2 flex-wrap">
        {(['all', ...STATUS_FLOW] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border transition-colors ${
              filter === s ? 'border-white text-white' : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            {s === 'all' ? 'ALL' : formatStatus(s)} ({statusCounts[s] || 0})
          </button>
        ))}
      </div>

      {/* Concepts list */}
      {enriched.length === 0 ? (
        <div className="border border-dashed border-gray-800 p-8 text-center text-gray-600 text-sm">
          {filter === 'all' ? 'No concepts generated yet. Create concepts from the home page first.' : `No concepts with status "${formatStatus(filter)}".`}
        </div>
      ) : (
        <div className="space-y-2">
          {enriched.map(({ concept, assignment, assignee }) => {
            const title = concept.headlines?.[0] || 'Untitled';
            return (
              <div key={concept.id} className="border border-gray-800 p-4 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{concept.prompt?.slice(0, 80)}{(concept.prompt?.length || 0) > 80 ? '...' : ''}</div>
                    <div className="flex items-center gap-3 mt-2">
                      {assignment ? (
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border ${statusColor(assignment.status)}`}>
                          {formatStatus(assignment.status)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600 uppercase tracking-widest">Unassigned</span>
                      )}
                      {assignee && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <User className="w-3 h-3" />{assignee.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status progression */}
                    {assignment && (
                      <select
                        value={assignment.status}
                        onChange={e => handleStatusChange(concept.id, e.target.value as ConceptStatus, title)}
                        className="bg-gray-900 border border-gray-700 text-white text-[10px] uppercase tracking-wide px-2 py-1 rounded-none appearance-none cursor-pointer"
                      >
                        {STATUS_FLOW.map(s => (
                          <option key={s} value={s}>{formatStatus(s)}</option>
                        ))}
                      </select>
                    )}

                    {/* Assign / Unassign */}
                    {assigningConceptId === concept.id ? (
                      <div className="flex items-center gap-1">
                        {profile.teamMembers.map(m => (
                          <button
                            key={m.id}
                            onClick={() => handleAssign(concept.id, m.id, title)}
                            className="text-[10px] border border-gray-700 px-2 py-1 hover:border-white hover:text-white text-gray-400 transition-colors"
                            title={m.role}
                          >
                            {m.name}
                          </button>
                        ))}
                        <button onClick={() => setAssigningConceptId(null)} className="text-gray-600 hover:text-white p-1"><X className="w-3 h-3" /></button>
                      </div>
                    ) : assignment ? (
                      <button onClick={() => handleUnassign(concept.id, title)} className="text-[10px] text-gray-600 hover:text-red-400 uppercase tracking-wide">
                        Unassign
                      </button>
                    ) : (
                      <button
                        onClick={() => setAssigningConceptId(concept.id)}
                        className="text-[10px] text-gray-500 hover:text-white uppercase tracking-wide border border-gray-800 hover:border-gray-600 px-2 py-1"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Activity Tab ──

function ActivityTab() {
  const [limit, setLimit] = useState(30);
  const feed = useMemo(() => getActivityFeed(limit), [limit]);

  const iconForType = (type: string) => {
    switch (type) {
      case 'concept_assigned': return <User className="w-3.5 h-3.5 text-blue-400" />;
      case 'status_changed': return <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />;
      case 'member_added': return <UserPlus className="w-3.5 h-3.5 text-green-400" />;
      case 'member_removed': return <Trash2 className="w-3.5 h-3.5 text-red-400" />;
      case 'concept_generated': return <FileText className="w-3.5 h-3.5 text-purple-400" />;
      case 'agency_updated': return <Settings className="w-3.5 h-3.5 text-gray-400" />;
      default: return <Activity className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  const timeAgo = (ts: string): string => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-4">
      {feed.length === 0 ? (
        <div className="border border-dashed border-gray-800 p-8 text-center text-gray-600 text-sm">
          No activity yet. Actions will appear here as your team works.
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {feed.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-gray-900">
                <div className="mt-0.5">{iconForType(entry.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-300">{entry.detail}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    {entry.actorName} -- {timeAgo(entry.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {feed.length >= limit && (
            <button onClick={() => setLimit(l => l + 30)} className="text-xs text-gray-500 hover:text-white uppercase tracking-wide">
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Page ──

function AgencyWorkspace() {
  const [profile, setProfile] = useState(getAgencyProfile);
  const [tab, setTab] = useState<TabId>('profile');
  const [, setTick] = useState(0);
  const refresh = useCallback(() => {
    setProfile(getAgencyProfile());
    setTick(t => t + 1);
  }, []);

  if (!profile) {
    return <AgencySetup onComplete={refresh} />;
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile & Team', icon: <Users className="w-4 h-4" /> },
    { id: 'assignments', label: 'Assignments', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity Feed', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-gray-800 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">{profile.name}</h1>
              <p className="text-xs text-gray-500 mt-1 tracking-wide">Agency Workspace</p>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            Active: <span className="text-gray-400 font-bold">{getActiveUserName()}</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 border-b border-gray-800">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                tab === t.id ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'profile' && <ProfileTab profile={profile} refresh={refresh} />}
        {tab === 'assignments' && <AssignmentsTab profile={profile} refresh={refresh} />}
        {tab === 'activity' && <ActivityTab />}
      </div>
    </div>
  );
}

export default function AgencyPage() {
  return (
    <ErrorBoundary>
      <AgencyWorkspace />
    </ErrorBoundary>
  );
}
