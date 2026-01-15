import { Link } from "wouter";

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 bg-white">

      {children}
    </div>
  );
}