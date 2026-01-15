import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PasswordGateProps {
  children: React.ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('concept-forge-auth') === 'true'
  );
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple password check - you can change this
    if (password === 'forge2025') {
      setIsAuthenticated(true);
      localStorage.setItem('concept-forge-auth', 'true');
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800 border-gray-300 rounded-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white tracking-wide">
            CONCEPT FORGE
          </CardTitle>
          <p className="text-slate-400 text-sm">Enter password to access</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white rounded-none"
              />
              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full bg-white text-slate-900 hover:bg-gray-100 rounded-none font-bold tracking-wide"
            >
              ACCESS
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}