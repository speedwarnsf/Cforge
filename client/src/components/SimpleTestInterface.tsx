import React from 'react';

export default function SimpleTestInterface() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">CONCEPT FORGE V4 - INTERFACE TEST</h1>
      
      {/* Feature Highlights */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="text-center">
          <h4 className="text-lg font-semibold mb-2">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Your personalized brainstorm partner
            </span>
          </h4>
          <p className="text-gray-400">Workshop fresh ideas that remain true to your creative voice.</p>
        </div>
        
        <div className="text-center">
          <h4 className="text-lg font-semibold mb-2">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Your research co-pilot
            </span>
          </h4>
          <p className="text-gray-400">Discover concepts with data-driven insights from hundreds of campaigns.</p>
        </div>
        
        <div className="text-center">
          <h4 className="text-lg font-semibold mb-2">
            <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Your bank for the best ideas
            </span>
          </h4>
          <p className="text-gray-400">Save unlimited ideas. Come back anytime to build your next hit.</p>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="flex gap-4 mb-8">
        <button className="px-6 py-3 bg-blue-600 text-white">Single Concept</button>
        <button className="px-6 py-3 bg-gray-800 text-white">Multi-Variant</button>
      </div>

      {/* Generate Button */}
      <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-none text-xl font-bold">
        Generate Concepts
      </button>

      {/* Analysis Tools */}
      <div className="mt-12">
        <h3 className="text-2xl font-bold mb-6">
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Where Ideas Become Top Performers
          </span>
        </h3>
        <div className="flex gap-8">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Image Analysis</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Cliché Detection</span>
          </label>
        </div>
      </div>
    </div>
  );
}