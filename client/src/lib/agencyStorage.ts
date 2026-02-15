// localStorage-based agency workspace management

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  addedAt: string;
}

export interface AgencyProfile {
  name: string;
  specialties: string[];
  teamMembers: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export type ConceptStatus = 'draft' | 'in-review' | 'client-ready' | 'approved' | 'archived';

export interface ConceptAssignment {
  conceptId: string;
  assigneeId: string;
  status: ConceptStatus;
  assignedAt: string;
  updatedAt: string;
  notes?: string;
}

export type ActivityType =
  | 'concept_generated'
  | 'concept_edited'
  | 'concept_assigned'
  | 'concept_unassigned'
  | 'status_changed'
  | 'concept_reviewed'
  | 'concept_favorited'
  | 'member_added'
  | 'member_removed'
  | 'agency_updated';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  actorId: string;       // team member id or 'system'
  actorName: string;
  conceptId?: string;
  conceptTitle?: string;
  detail: string;
  timestamp: string;
  meta?: Record<string, string>;
}

// ── Storage Keys ──

const AGENCY_KEY = 'cforge_agency_profile';
const ASSIGNMENTS_KEY = 'cforge_concept_assignments';
const ACTIVITY_KEY = 'cforge_activity_feed';
const ACTIVE_USER_KEY = 'cforge_active_user';
const MAX_ACTIVITY = 500;

// ── Agency Profile ──

export function getAgencyProfile(): AgencyProfile | null {
  try {
    const raw = localStorage.getItem(AGENCY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAgencyProfile(profile: AgencyProfile): void {
  profile.updatedAt = new Date().toISOString();
  localStorage.setItem(AGENCY_KEY, JSON.stringify(profile));
}

export function createAgencyProfile(name: string, specialties: string[]): AgencyProfile {
  const profile: AgencyProfile = {
    name,
    specialties,
    teamMembers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveAgencyProfile(profile);
  return profile;
}

// ── Team Members ──

export function addTeamMember(name: string, role: string, email?: string): TeamMember {
  const profile = getAgencyProfile();
  if (!profile) throw new Error('No agency profile');
  const member: TeamMember = {
    id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    role,
    email,
    addedAt: new Date().toISOString(),
  };
  profile.teamMembers.push(member);
  saveAgencyProfile(profile);
  logActivity({
    type: 'member_added',
    actorId: getActiveUserId(),
    actorName: getActiveUserName(),
    detail: `Added ${name} (${role}) to the team`,
  });
  return member;
}

export function removeTeamMember(memberId: string): void {
  const profile = getAgencyProfile();
  if (!profile) return;
  const member = profile.teamMembers.find(m => m.id === memberId);
  profile.teamMembers = profile.teamMembers.filter(m => m.id !== memberId);
  saveAgencyProfile(profile);
  // Remove their assignments
  const assignments = getAssignments().filter(a => a.assigneeId !== memberId);
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  if (member) {
    logActivity({
      type: 'member_removed',
      actorId: getActiveUserId(),
      actorName: getActiveUserName(),
      detail: `Removed ${member.name} from the team`,
    });
  }
}

export function updateTeamMember(memberId: string, updates: Partial<Pick<TeamMember, 'name' | 'role' | 'email'>>): void {
  const profile = getAgencyProfile();
  if (!profile) return;
  const member = profile.teamMembers.find(m => m.id === memberId);
  if (member) {
    Object.assign(member, updates);
    saveAgencyProfile(profile);
  }
}

// ── Active User (who is "logged in" locally) ──

export function getActiveUserId(): string {
  return localStorage.getItem(ACTIVE_USER_KEY) || 'system';
}

export function getActiveUserName(): string {
  const id = getActiveUserId();
  if (id === 'system') return 'System';
  const profile = getAgencyProfile();
  const member = profile?.teamMembers.find(m => m.id === id);
  return member?.name || 'Unknown';
}

export function setActiveUser(memberId: string): void {
  localStorage.setItem(ACTIVE_USER_KEY, memberId);
}

// ── Concept Assignments ──

export function getAssignments(): ConceptAssignment[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAssignments(assignments: ConceptAssignment[]): void {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

export function assignConcept(conceptId: string, assigneeId: string, conceptTitle?: string): ConceptAssignment {
  const assignments = getAssignments();
  // Remove existing assignment for this concept
  const filtered = assignments.filter(a => a.conceptId !== conceptId);
  const assignment: ConceptAssignment = {
    conceptId,
    assigneeId,
    status: 'draft',
    assignedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  filtered.push(assignment);
  saveAssignments(filtered);

  const profile = getAgencyProfile();
  const assignee = profile?.teamMembers.find(m => m.id === assigneeId);
  logActivity({
    type: 'concept_assigned',
    actorId: getActiveUserId(),
    actorName: getActiveUserName(),
    conceptId,
    conceptTitle,
    detail: `Assigned "${conceptTitle || conceptId}" to ${assignee?.name || 'unknown'}`,
  });
  return assignment;
}

export function unassignConcept(conceptId: string, conceptTitle?: string): void {
  const assignments = getAssignments().filter(a => a.conceptId !== conceptId);
  saveAssignments(assignments);
  logActivity({
    type: 'concept_unassigned',
    actorId: getActiveUserId(),
    actorName: getActiveUserName(),
    conceptId,
    conceptTitle,
    detail: `Unassigned "${conceptTitle || conceptId}"`,
  });
}

export function getAssignmentForConcept(conceptId: string): ConceptAssignment | undefined {
  return getAssignments().find(a => a.conceptId === conceptId);
}

export function getAssignmentsForMember(memberId: string): ConceptAssignment[] {
  return getAssignments().filter(a => a.assigneeId === memberId);
}

export function updateConceptStatus(conceptId: string, status: ConceptStatus, conceptTitle?: string): void {
  const assignments = getAssignments();
  const assignment = assignments.find(a => a.conceptId === conceptId);
  if (assignment) {
    const oldStatus = assignment.status;
    assignment.status = status;
    assignment.updatedAt = new Date().toISOString();
    saveAssignments(assignments);
    logActivity({
      type: 'status_changed',
      actorId: getActiveUserId(),
      actorName: getActiveUserName(),
      conceptId,
      conceptTitle,
      detail: `Changed "${conceptTitle || conceptId}" from ${formatStatus(oldStatus)} to ${formatStatus(status)}`,
      meta: { oldStatus, newStatus: status },
    });
  }
}

export function updateAssignmentNotes(conceptId: string, notes: string): void {
  const assignments = getAssignments();
  const assignment = assignments.find(a => a.conceptId === conceptId);
  if (assignment) {
    assignment.notes = notes;
    assignment.updatedAt = new Date().toISOString();
    saveAssignments(assignments);
  }
}

// ── Activity Feed ──

export function getActivityFeed(limit = 50): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    const all: ActivityEntry[] = raw ? JSON.parse(raw) : [];
    return all.slice(0, limit);
  } catch {
    return [];
  }
}

export function logActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>): void {
  const feed = getActivityFeed(MAX_ACTIVITY);
  const full: ActivityEntry = {
    ...entry,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  feed.unshift(full);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(feed.slice(0, MAX_ACTIVITY)));
}

export function clearActivityFeed(): void {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify([]));
}

// ── Helpers ──

export const STATUS_FLOW: ConceptStatus[] = ['draft', 'in-review', 'client-ready', 'approved', 'archived'];

export function formatStatus(status: ConceptStatus): string {
  const map: Record<ConceptStatus, string> = {
    'draft': 'DRAFT',
    'in-review': 'IN REVIEW',
    'client-ready': 'CLIENT READY',
    'approved': 'APPROVED',
    'archived': 'ARCHIVED',
  };
  return map[status] || status.toUpperCase();
}

export function statusColor(status: ConceptStatus): string {
  const map: Record<ConceptStatus, string> = {
    'draft': 'text-gray-400 border-gray-600 bg-gray-900',
    'in-review': 'text-amber-400 border-amber-600 bg-amber-950',
    'client-ready': 'text-blue-400 border-blue-600 bg-blue-950',
    'approved': 'text-green-400 border-green-600 bg-green-950',
    'archived': 'text-gray-500 border-gray-700 bg-gray-900',
  };
  return map[status] || '';
}
