import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ThumbsUp, ThumbsDown, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface SharedConcept {
  id: string;
  headline: string;
  tagline?: string;
  bodyCopy?: string;
  visualDescription?: string;
  rhetoricalDevice: string;
  tags?: string[];
}

interface FeedbackEntry {
  conceptId: string;
  rating: 'up' | 'down' | null;
  comment: string;
}

export default function FeedbackPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [concepts, setConcepts] = useState<SharedConcept[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<Map<string, FeedbackEntry>>(new Map());
  const [reviewerName, setReviewerName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load shared concepts from URL hash
  useEffect(() => {
    try {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const decoded = JSON.parse(atob(hash));
        setConcepts(decoded.concepts || []);
        setSessionName(decoded.name || 'Concept Review');
        const initial = new Map<string, FeedbackEntry>();
        (decoded.concepts || []).forEach((c: SharedConcept) => {
          initial.set(c.id, { conceptId: c.id, rating: null, comment: '' });
        });
        setFeedback(initial);
      }
    } catch {
      // Invalid data
    }
    setLoading(false);
  }, []);

  const concept = concepts[currentIndex];

  const setRating = (rating: 'up' | 'down') => {
    if (!concept) return;
    setFeedback(prev => {
      const next = new Map(prev);
      const entry = next.get(concept.id) || { conceptId: concept.id, rating: null, comment: '' };
      entry.rating = entry.rating === rating ? null : rating;
      next.set(concept.id, entry);
      return next;
    });
  };

  const setComment = (comment: string) => {
    if (!concept) return;
    setFeedback(prev => {
      const next = new Map(prev);
      const entry = next.get(concept.id) || { conceptId: concept.id, rating: null, comment: '' };
      entry.comment = comment;
      next.set(concept.id, entry);
      return next;
    });
  };

  const handleSubmit = () => {
    // Store feedback in localStorage for the creator to retrieve
    const feedbackData = {
      reviewer: reviewerName || 'Anonymous',
      timestamp: new Date().toISOString(),
      sessionName,
      entries: Array.from(feedback.values()),
    };
    
    // Save to localStorage under a feedback key
    const existingRaw = localStorage.getItem('cforge_client_feedback');
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    existing.push(feedbackData);
    localStorage.setItem('cforge_client_feedback', JSON.stringify(existing));

    setSubmitted(true);
    toast({ title: 'Feedback submitted', description: 'Thank you for your review.' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-500 font-mono text-sm">Loading...</div>
      </div>
    );
  }

  if (concepts.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black mb-4">No Concepts Found</h1>
          <p className="text-gray-500 text-sm mb-6">This feedback link may be invalid or expired.</p>
          <Button variant="outline" className="border-gray-700 text-gray-300 bg-transparent" onClick={() => setLocation('/')}>
            Go to Concept Forge
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-black mb-4">Thank You</h1>
          <p className="text-gray-400 mb-2">Your feedback has been recorded.</p>
          <div className="mt-8 space-y-3">
            {Array.from(feedback.values()).map(entry => {
              const c = concepts.find(cc => cc.id === entry.conceptId);
              return (
                <div key={entry.conceptId} className="flex items-center gap-3 text-sm text-left border border-gray-800 p-3">
                  <span className="text-lg">
                    {entry.rating === 'up' ? <ThumbsUp className="w-4 h-4 text-green-400" /> : entry.rating === 'down' ? <ThumbsDown className="w-4 h-4 text-red-400" /> : <span className="text-gray-600">--</span>}
                  </span>
                  <span className="text-white font-bold truncate flex-1">{c?.headline || 'Concept'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const currentFeedback = feedback.get(concept.id) || { conceptId: concept.id, rating: null, comment: '' };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black uppercase tracking-widest">{sessionName}</h1>
            <p className="text-[10px] font-mono text-gray-500 mt-0.5">
              Concept {currentIndex + 1} of {concepts.length} -- Review and provide feedback
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Your name (optional)"
              value={reviewerName}
              onChange={e => setReviewerName(e.target.value)}
              className="w-48 h-8 text-xs bg-gray-900 border-gray-700 text-white placeholder-gray-600"
            />
          </div>
        </div>
      </header>

      {/* Concept display */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Tags */}
        {concept.tags && concept.tags.length > 0 && (
          <div className="flex gap-2 mb-4">
            {concept.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-gray-500 border border-gray-800">
                {tag}
              </span>
            ))}
          </div>
        )}

        <h2 className="text-4xl md:text-5xl font-black leading-tight mb-3">
          {concept.headline}
        </h2>
        {concept.tagline && (
          <p className="text-xl text-cyan-400 italic mb-8">{concept.tagline}</p>
        )}

        <div className="inline-block border border-white/20 px-3 py-1 text-[10px] font-mono uppercase tracking-[2px] text-white/40 mb-8">
          {concept.rhetoricalDevice}
        </div>

        {concept.bodyCopy && (
          <div className="mb-8">
            <div className="text-[9px] font-mono uppercase tracking-[2px] text-gray-600 mb-2">Body Copy</div>
            <p className="text-base text-gray-300 leading-relaxed">{concept.bodyCopy}</p>
          </div>
        )}

        {concept.visualDescription && (
          <div className="border-l-2 border-gray-800 pl-5 mb-10">
            <div className="text-[9px] font-mono uppercase tracking-[2px] text-gray-600 mb-2">Visual Direction</div>
            <p className="text-sm text-gray-500 italic">{concept.visualDescription}</p>
          </div>
        )}

        {/* Feedback section */}
        <div className="border-t border-gray-800 pt-8 mt-8">
          <div className="text-[10px] font-mono uppercase tracking-[2px] text-gray-500 mb-4">Your Feedback</div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setRating('up')}
              className={`flex items-center gap-2 px-6 py-3 border transition-all ${
                currentFeedback.rating === 'up'
                  ? 'border-green-500 bg-green-950/50 text-green-400'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500'
              }`}
            >
              <ThumbsUp className="w-5 h-5" />
              <span className="text-sm font-bold">Approve</span>
            </button>
            <button
              onClick={() => setRating('down')}
              className={`flex items-center gap-2 px-6 py-3 border transition-all ${
                currentFeedback.rating === 'down'
                  ? 'border-red-500 bg-red-950/50 text-red-400'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500'
              }`}
            >
              <ThumbsDown className="w-5 h-5" />
              <span className="text-sm font-bold">Needs Work</span>
            </button>
          </div>

          <Textarea
            placeholder="Additional comments or notes..."
            value={currentFeedback.comment}
            onChange={e => setComment(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 text-sm h-24 resize-none mb-6"
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="border-gray-700 text-gray-400 bg-transparent hover:bg-gray-800 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>

          {/* Progress dots */}
          <div className="flex gap-1.5">
            {concepts.map((c, i) => {
              const fb = feedback.get(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2.5 h-2.5 transition-all ${
                    i === currentIndex
                      ? 'bg-white'
                      : fb?.rating === 'up'
                      ? 'bg-green-600'
                      : fb?.rating === 'down'
                      ? 'bg-red-600'
                      : 'bg-gray-700'
                  }`}
                />
              );
            })}
          </div>

          {currentIndex < concepts.length - 1 ? (
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(prev => Math.min(concepts.length - 1, prev + 1))}
              className="border-gray-700 text-gray-400 bg-transparent hover:bg-gray-800"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="bg-white text-black font-bold hover:bg-gray-200"
            >
              <Send className="w-4 h-4 mr-2" /> Submit Feedback
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
