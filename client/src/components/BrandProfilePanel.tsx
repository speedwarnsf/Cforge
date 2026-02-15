import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Trash2, ChevronDown, ChevronUp, Check, Edit2 } from 'lucide-react';
import { getBrandProfiles, saveBrandProfile, deleteBrandProfile, profileToBriefPrefix, BrandProfile } from '@/lib/brandProfiles';
import { useToast } from '@/hooks/use-toast';

interface BrandProfilePanelProps {
  onApplyProfile: (prefix: string, tone: string) => void;
}

export default function BrandProfilePanel({ onApplyProfile }: BrandProfilePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profiles, setProfiles] = useState<BrandProfile[]>(() => getBrandProfiles());
  const [isEditing, setIsEditing] = useState(false);
  const [editProfile, setEditProfile] = useState<BrandProfile | null>(null);
  const { toast } = useToast();

  const createNew = (): BrandProfile => ({
    id: `brand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    industry: '',
    brandVoice: '',
    targetAudience: '',
    keyMessages: '',
    tone: 'bold',
    avoidWords: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleSave = () => {
    if (!editProfile || !editProfile.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive', duration: 2000 });
      return;
    }
    saveBrandProfile(editProfile);
    setProfiles(getBrandProfiles());
    setIsEditing(false);
    setEditProfile(null);
    toast({ title: 'Profile saved', duration: 2000 });
  };

  const handleDelete = (id: string) => {
    deleteBrandProfile(id);
    setProfiles(getBrandProfiles());
    toast({ title: 'Profile removed', duration: 2000 });
  };

  const handleApply = (profile: BrandProfile) => {
    const prefix = profileToBriefPrefix(profile);
    onApplyProfile(prefix, profile.tone);
    toast({ title: `Applied: ${profile.name}`, description: 'Brand context added to brief', duration: 2000 });
  };

  return (
    <div className="border border-gray-700 bg-gray-800/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Brand Profiles</span>
          {profiles.length > 0 && (
            <Badge variant="secondary" className="bg-gray-800 text-gray-400 border-gray-700 text-[10px]">
              {profiles.length}
            </Badge>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {isOpen && (
        <div className="border-t border-gray-700 p-3 space-y-3">
          {/* Profile List */}
          {profiles.map(profile => (
            <div key={profile.id} className="border border-gray-700 p-3 bg-gray-900/50 group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-bold text-white">{profile.name}</h4>
                  <p className="text-[10px] text-gray-500 font-mono">{profile.industry}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditProfile(profile); setIsEditing(true); }}
                    className="p-1 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {profile.targetAudience && (
                <p className="text-xs text-gray-400 mb-2 line-clamp-1">Audience: {profile.targetAudience}</p>
              )}
              <Button
                size="sm"
                onClick={() => handleApply(profile)}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs h-7"
              >
                <Check className="w-3 h-3 mr-1.5" />
                Apply to Brief
              </Button>
            </div>
          ))}

          {/* Edit/Create Form */}
          {isEditing && editProfile ? (
            <div className="border border-blue-800/50 bg-blue-950/20 p-4 space-y-3">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono mb-3">
                {editProfile.createdAt === editProfile.updatedAt ? 'New Profile' : 'Edit Profile'}
              </h4>
              <Input
                placeholder="Brand / Client name"
                value={editProfile.name}
                onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white text-sm h-9"
              />
              <Input
                placeholder="Industry (e.g., fintech, fashion, healthcare)"
                value={editProfile.industry}
                onChange={e => setEditProfile({ ...editProfile, industry: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white text-sm h-9"
              />
              <Textarea
                placeholder="Brand voice (e.g., bold and irreverent, warm and approachable)"
                value={editProfile.brandVoice}
                onChange={e => setEditProfile({ ...editProfile, brandVoice: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white text-sm min-h-[60px] resize-none"
              />
              <Input
                placeholder="Target audience (e.g., Gen Z urban professionals)"
                value={editProfile.targetAudience}
                onChange={e => setEditProfile({ ...editProfile, targetAudience: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white text-sm h-9"
              />
              <Textarea
                placeholder="Key messages / positioning"
                value={editProfile.keyMessages}
                onChange={e => setEditProfile({ ...editProfile, keyMessages: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white text-sm min-h-[60px] resize-none"
              />
              <Input
                placeholder="Words/phrases to avoid"
                value={editProfile.avoidWords}
                onChange={e => setEditProfile({ ...editProfile, avoidWords: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white text-sm h-9"
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  Save Profile
                </Button>
                <Button onClick={() => { setIsEditing(false); setEditProfile(null); }} size="sm" variant="outline" className="border-gray-700 text-gray-400 bg-transparent hover:bg-gray-800 text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => { setEditProfile(createNew()); setIsEditing(true); }}
              variant="outline"
              size="sm"
              className="w-full border-dashed border-gray-700 text-gray-400 bg-transparent hover:bg-gray-800 text-xs"
            >
              <Plus className="w-3 h-3 mr-1.5" />
              New Brand Profile
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
