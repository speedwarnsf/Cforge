import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown, RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface ConceptLogEntry {
  id: string;
  prompt: string;
  response: string;
  tone: string;
  created_at: string;
  feedback_type: string | null;
  rhetorical_example?: {
    campaign_name: string;
    brand: string;
    year: string;
    headline: string;
  };
  professionalism_score?: number;
  clarity_score?: number;
  freshness_score?: number;
  critique?: string;
  flagged_for_review?: boolean;
  resonance_score?: number;
  audience_clarity_score?: number;
  vibe?: string;
  reflection?: string;
  low_audience_resonance?: boolean;
  awards_score?: number;
  award_potential?: string;
  jury_comment?: string;
  improvement_tip?: string;
  high_awards_potential?: boolean;
  iteration_number?: number;
  originality_confidence?: number;
  originality_feedback?: string;
  audience_resonance?: string;
  audience_feedback?: string;
  award_potential_level?: string;
  award_feedback?: string;
  relevance_score?: number;
  relevance_feedback?: string;
  passes_all_thresholds?: boolean;
  failed_criteria?: string[];
  final_status?: 'Passed' | 'Needs Review' | 'Failed';
}

export default function Review() {
  const [entries, setEntries] = useState<ConceptLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingFeedback, setProcessingFeedback] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch entries with null feedback_type
  const fetchPendingEntries = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pending-feedback');
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      } else {
        console.error('Failed to fetch pending entries');
      }
    } catch (error) {
      console.error('Error fetching pending entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEntries();
  }, []);

  // Handle feedback submission
  const handleFeedback = async (entryId: string, rating: 'more_like_this' | 'less_like_this') => {
    setProcessingFeedback(entryId);
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conceptId: entryId,
          rating: rating
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Remove entry from list with fade effect
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      
      toast({
        title: "Feedback Recorded",
        description: `Concept marked as "${rating.replace('_', ' ')}"`,
        duration: 2000,
      });

    } catch (error) {
      console.error('Failed to record feedback:', error);
      toast({
        title: "Error",
        description: "Failed to record feedback",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setProcessingFeedback(null);
    }
  };

  // Parse response content to extract headlines and visual description
  const parseConceptResponse = (response: string) => {
    const sections = response.split(/(\*\*[^*]+\*\*)/);
    let headlines: string[] = [];
    let visualDescription = '';
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const nextSection = sections[i + 1];
      
      if (section.includes('HEADLINE') || section.includes('TAGLINE')) {
        if (nextSection) {
          headlines = nextSection.trim().split('\n').filter(line => line.trim());
        }
      } else if (section.includes('VISUAL') || section.includes('CONCEPT')) {
        if (nextSection) {
          visualDescription = nextSection.trim().split('\n')[0] || '';
        }
      }
    }
    
    return { headlines, visualDescription };
  };

  // Detect duplicate headlines across all entries
  const getAllHeadlines = () => {
    const allHeadlines: { headline: string; entryId: string }[] = [];
    entries.forEach(entry => {
      const { headlines } = parseConceptResponse(entry.response);
      headlines.forEach(headline => {
        allHeadlines.push({ headline: headline.trim(), entryId: entry.id });
      });
    });
    return allHeadlines;
  };

  const getDuplicateHeadlines = () => {
    const allHeadlines = getAllHeadlines();
    const headlineCounts = allHeadlines.reduce((acc, { headline }) => {
      acc[headline] = (acc[headline] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.keys(headlineCounts).filter(headline => headlineCounts[headline] > 1);
  };

  const duplicateHeadlines = getDuplicateHeadlines();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading pending concepts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          {/* Back Button */}
          <div className="mb-4">
            <Link href="/">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Concept Forge
              </Button>
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Concept Review
          </h1>
          <p className="text-gray-600 mb-6">
            Review and provide feedback on generated concepts that need evaluation.
          </p>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-gray-100 px-4 py-2 rounded-none">
              <span className="text-gray-700 font-medium">{entries.length}</span>
              <span className="text-gray-500 ml-1">concepts pending review</span>
            </div>
            
            <Button
              onClick={fetchPendingEntries}
              variant="outline"
              size="sm"
              className="border-gray-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <ThumbsUp className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              All caught up!
            </h3>
            <p className="text-gray-500">
              No concepts are currently waiting for feedback.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {entries.map((entry) => {
              const { headlines, visualDescription } = parseConceptResponse(entry.response);
              const isProcessing = processingFeedback === entry.id;
              
              return (
                <div 
                  key={entry.id} 
                  className={`border rounded-none p-6 transition-all duration-300 ${
                    isProcessing ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                  } ${
                    entry.flagged_for_review && entry.low_audience_resonance 
                      ? 'border-red-400 bg-red-50' 
                      : entry.flagged_for_review 
                      ? 'border-yellow-400 bg-yellow-50' 
                      : entry.low_audience_resonance
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {entry.tone.charAt(0).toUpperCase() + entry.tone.slice(1)} Concept
                        </h3>
                        
                        {/* Low Originality Warning Badge */}
                        {entry.originality_confidence !== undefined && entry.originality_confidence < 70 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-none text-xs font-medium bg-red-100 text-red-800">
                            Low Originality
                          </span>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">
                          {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString()}
                        </span>
                        
                        {/* Originality Score */}
                        {entry.originality_confidence !== undefined && (
                          <span className="text-xs italic text-gray-500 block mt-1">
                            Originality Score: {entry.originality_confidence}%
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 italic">
                      "{entry.prompt}"
                    </p>
                  </div>

                  <div className="mb-4">
                    {headlines.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 mb-1">Headlines:</h4>
                        <div className="space-y-1">
                          {headlines.map((headline, index) => {
                            const cleanHeadline = headline.replace(/^[•\-\*\s]+/, '').trim();
                            const isDuplicate = duplicateHeadlines.includes(cleanHeadline);
                            
                            return (
                              <p 
                                key={index} 
                                className={`font-medium ${
                                  isDuplicate 
                                    ? 'text-red-700 bg-red-50 px-2 py-1 rounded-none border border-red-200' 
                                    : 'text-gray-700'
                                }`}
                              >
                                {cleanHeadline}
                                {isDuplicate && (
                                  <span className="ml-2 text-xs text-red-600 font-normal">
                                    (Duplicate)
                                  </span>
                                )}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {visualDescription && (
                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 mb-1">Visual Description:</h4>
                        <p className="text-gray-700">
                          {visualDescription}
                        </p>
                      </div>
                    )}

                    {!headlines.length && !visualDescription && (
                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 mb-1">Response:</h4>
                        <p className="text-gray-700 text-sm">
                          {entry.response.substring(0, 300)}
                          {entry.response.length > 300 && '...'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Rhetorical Example Display */}
                  {entry.rhetorical_example && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-none">
                      <h4 className="font-semibold text-blue-900 mb-2">Inspired by:</h4>
                      <p className="text-blue-800 text-sm">
                        <span className="font-medium">{entry.rhetorical_example.campaign_name}</span>
                        {' – '}
                        <span className="font-medium">{entry.rhetorical_example.brand}</span>
                        {entry.rhetorical_example.year && ` (${entry.rhetorical_example.year})`}
                      </p>
                      {entry.rhetorical_example.headline && (
                        <p className="text-blue-700 text-sm italic mt-1">
                          "{entry.rhetorical_example.headline}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Ad Quality Scores Display */}
                  {(entry.professionalism_score || entry.clarity_score || entry.freshness_score) && (
                    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-none">
                      <h4 className="font-semibold text-gray-900 mb-2">Quality Assessment:</h4>
                      <div className="grid grid-cols-3 gap-4 mb-2">
                        {entry.professionalism_score && (
                          <div className="text-center">
                            <div className={`text-lg font-bold ${entry.professionalism_score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.professionalism_score}
                            </div>
                            <div className="text-xs text-gray-600">Professional</div>
                          </div>
                        )}
                        {entry.clarity_score && (
                          <div className="text-center">
                            <div className={`text-lg font-bold ${entry.clarity_score >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                              {entry.clarity_score}
                            </div>
                            <div className="text-xs text-gray-600">Clarity</div>
                          </div>
                        )}
                        {entry.freshness_score && (
                          <div className="text-center">
                            <div className={`text-lg font-bold ${entry.freshness_score >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.freshness_score}
                            </div>
                            <div className="text-xs text-gray-600">Freshness</div>
                          </div>
                        )}
                      </div>
                      {entry.critique && (
                        <p className="text-gray-700 text-sm italic">
                          "{entry.critique}"
                        </p>
                      )}
                      {entry.flagged_for_review && (
                        <div className="mt-2 px-2 py-1 bg-yellow-100 border border-yellow-300 rounded-none text-yellow-800 text-xs font-medium">
                          Flagged for Review
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audience Empathy Display */}
                  {(entry.resonance_score || entry.audience_clarity_score || entry.vibe) && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-none">
                      <h4 className="font-semibold text-blue-900 mb-2">Audience Empathy:</h4>
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        {entry.resonance_score && (
                          <div className="text-center">
                            <div className={`text-lg font-bold ${entry.resonance_score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.resonance_score}
                            </div>
                            <div className="text-xs text-blue-700">Resonance</div>
                          </div>
                        )}
                        {entry.audience_clarity_score && (
                          <div className="text-center">
                            <div className={`text-lg font-bold ${entry.audience_clarity_score >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                              {entry.audience_clarity_score}
                            </div>
                            <div className="text-xs text-blue-700">Audience Clarity</div>
                          </div>
                        )}
                      </div>
                      {entry.vibe && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-blue-800">Vibe: </span>
                          <span className="text-sm text-blue-700 font-semibold">{entry.vibe}</span>
                        </div>
                      )}
                      {entry.reflection && (
                        <p className="text-blue-700 text-sm italic">
                          "{entry.reflection}"
                        </p>
                      )}
                      {entry.low_audience_resonance && (
                        <div className="mt-2 px-2 py-1 bg-red-100 border border-red-300 rounded-none text-red-800 text-xs font-medium">
                          Low Audience Resonance
                        </div>
                      )}
                    </div>
                  )}

                  {/* Awards Jury Display */}
                  {(entry.awards_score || entry.award_potential || entry.jury_comment) && (
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-none">
                      <h4 className="font-semibold text-purple-900 mb-2">Awards Jury Evaluation:</h4>
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        {entry.awards_score && (
                          <div className="text-center">
                            <div className={`text-lg font-bold ${
                              entry.awards_score >= 80 ? 'text-green-600' : 
                              entry.awards_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {entry.awards_score}
                            </div>
                            <div className="text-xs text-purple-700">Awards Score</div>
                          </div>
                        )}
                        {entry.award_potential && (
                          <div className="text-center">
                            <div className={`text-sm font-bold ${
                              entry.award_potential === 'High' ? 'text-green-600' : 
                              entry.award_potential === 'Moderate' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {entry.award_potential}
                            </div>
                            <div className="text-xs text-purple-700">Award Potential</div>
                          </div>
                        )}
                      </div>
                      {entry.jury_comment && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-purple-800">Jury Comment: </span>
                          <span className="text-sm text-purple-700 italic">"{entry.jury_comment}"</span>
                        </div>
                      )}
                      {entry.improvement_tip && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-purple-800">Improvement Tip: </span>
                          <span className="text-sm text-purple-700">{entry.improvement_tip}</span>
                        </div>
                      )}
                      {entry.high_awards_potential && (
                        <div className="mt-2 px-2 py-1 bg-green-100 border border-green-300 rounded-none text-green-800 text-xs font-medium">
                          High Awards Potential
                        </div>
                      )}
                    </div>
                  )}

                  {/* Iterative Refinement Display */}
                  {(entry.iteration_number || entry.final_status || entry.failed_criteria) && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-none">
                      <h4 className="font-semibold text-green-900 mb-2">Iterative Refinement Results:</h4>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        {entry.iteration_number && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {entry.iteration_number}
                            </div>
                            <div className="text-xs text-green-700">Iterations</div>
                          </div>
                        )}
                        {entry.originality_confidence && (
                          <div className="text-center">
                            <div className={`text-lg font-bold ${entry.originality_confidence >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.originality_confidence}
                            </div>
                            <div className="text-xs text-green-700">Originality</div>
                          </div>
                        )}
                        {entry.final_status && (
                          <div className="text-center">
                            <div className={`text-sm font-bold ${
                              entry.final_status === 'Passed' ? 'text-green-600' : 
                              entry.final_status === 'Needs Review' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {entry.final_status}
                            </div>
                            <div className="text-xs text-green-700">Final Status</div>
                          </div>
                        )}
                      </div>
                      
                      {/* Four Arbiter Results */}
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        {entry.audience_resonance && (
                          <div className="text-center p-2 bg-white rounded-none border">
                            <div className={`text-sm font-bold ${
                              entry.audience_resonance === 'High' ? 'text-green-600' : 
                              entry.audience_resonance === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {entry.audience_resonance}
                            </div>
                            <div className="text-xs text-green-700">Audience</div>
                          </div>
                        )}
                        {entry.award_potential_level && (
                          <div className="text-center p-2 bg-white rounded-none border">
                            <div className={`text-sm font-bold ${
                              entry.award_potential_level === 'High' ? 'text-green-600' : 
                              entry.award_potential_level === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {entry.award_potential_level}
                            </div>
                            <div className="text-xs text-green-700">Awards</div>
                          </div>
                        )}
                        {entry.relevance_score && (
                          <div className="text-center p-2 bg-white rounded-none border">
                            <div className={`text-sm font-bold ${entry.relevance_score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.relevance_score}
                            </div>
                            <div className="text-xs text-green-700">Relevance</div>
                          </div>
                        )}
                        {entry.passes_all_thresholds !== undefined && (
                          <div className="text-center p-2 bg-white rounded-none border">
                            <div className={`text-sm font-bold ${entry.passes_all_thresholds ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.passes_all_thresholds ? 'PASSED' : 'FAILED'}
                            </div>
                            <div className="text-xs text-green-700">Thresholds</div>
                          </div>
                        )}
                      </div>

                      {/* Failed Criteria */}
                      {entry.failed_criteria && entry.failed_criteria.length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-green-800">Failed Criteria: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.failed_criteria.map((criteria, index) => (
                              <span key={index} className="px-2 py-1 bg-red-100 border border-red-300 rounded-none text-red-800 text-xs">
                                {criteria}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback Messages */}
                      {entry.originality_feedback && (
                        <div className="text-xs text-green-700 mb-1">
                          <strong>Originality:</strong> {entry.originality_feedback}
                        </div>
                      )}
                      {entry.audience_feedback && (
                        <div className="text-xs text-green-700 mb-1">
                          <strong>Audience:</strong> {entry.audience_feedback}
                        </div>
                      )}
                      {entry.award_feedback && (
                        <div className="text-xs text-green-700">
                          <strong>Awards:</strong> {entry.award_feedback}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feedback Buttons */}
                  <div className="flex space-x-4 pt-4 border-t border-gray-200">
                    <Button
                      onClick={() => handleFeedback(entry.id, 'more_like_this')}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg"
                    >
                      <ThumbsUp className="w-5 h-5 mr-2" />
                      More Like This
                    </Button>
                    
                    <Button
                      onClick={() => handleFeedback(entry.id, 'less_like_this')}
                      disabled={isProcessing}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-lg"
                    >
                      <ThumbsDown className="w-5 h-5 mr-2" />
                      Less Like This
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}