import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, X } from "lucide-react";

interface NavbarProps {
  onSearch?: (query: string) => void;
}

export default function Navbar({ onSearch }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, navigate] = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      if (onSearch) onSearch(searchQuery.trim());
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#141414]" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-4 md:px-12 py-4">
        <div className="flex items-center gap-8">
          <Link href="/">
            <span
              className="text-[#e50914] font-black text-2xl tracking-tight cursor-pointer select-none"
              data-testid="link-logo"
            >
              STREAMFLIX
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/">
              <span
                className={`text-sm cursor-pointer transition-colors ${
                  location === "/" ? "text-white font-medium" : "text-white/70 hover:text-white"
                }`}
                data-testid="link-home"
              >
                Home
              </span>
            </Link>
            <Link href="/browse">
              <span
                className={`text-sm cursor-pointer transition-colors ${
                  location.startsWith("/browse") ? "text-white font-medium" : "text-white/70 hover:text-white"
                }`}
                data-testid="link-browse"
              >
                Browse
              </span>
            </Link>
            <Link href="/addons">
              <span
                className={`text-sm cursor-pointer transition-colors ${
                  location.startsWith("/addons") ? "text-white font-medium" : "text-white/70 hover:text-white"
                }`}
                data-testid="link-addons"
              >
                Addons
              </span>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Titles, people, genres..."
                className="bg-black/80 border border-white/40 text-white placeholder-white/40 px-3 py-1.5 text-sm rounded w-48 md:w-64 outline-none focus:border-white/70"
                data-testid="input-search"
              />
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                className="text-white/70 hover:text-white"
                data-testid="button-close-search"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="text-white/70 hover:text-white transition-colors"
              data-testid="button-open-search"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
