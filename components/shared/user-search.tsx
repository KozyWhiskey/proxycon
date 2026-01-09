'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, UserPlus } from 'lucide-react';

export interface UserSearchResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface UserSearchProps {
  onSearch: (query: string) => Promise<UserSearchResult[]>;
  onSelect: (user: UserSearchResult) => Promise<void> | void;
  excludeIds?: string[];
  placeholder?: string;
  actionLabel?: string;
}

export function UserSearch({ 
  onSearch, 
  onSelect, 
  excludeIds = [], 
  placeholder = "Search by username or name...",
  actionLabel = "Add"
}: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await onSearch(value);
      setResults(data.filter(u => !excludeIds.includes(u.id)));
    } catch (error) {
      console.error(error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (user: UserSearchResult) => {
    startTransition(async () => {
      await onSelect(user);
      setResults(prev => prev.filter(r => r.id !== user.id));
    });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 h-11"
        />
      </div>
      
      {isSearching && (
         <div className="flex justify-center p-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
         </div>
      )}

      {results.length > 0 && (
        <div className="bg-zinc-950 border border-white/10 rounded-md overflow-hidden max-h-48 overflow-y-auto">
          {results.map((result) => (
            <div
              key={result.id}
              className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border border-white/10">
                  <AvatarImage src={result.avatar_url || undefined} />
                  <AvatarFallback className="bg-white/5 text-xs">{result.display_name?.[0] || result.username?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {result.display_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 font-mono">
                    @{result.username}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() => handleSelect(result)}
                className="h-8"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                {actionLabel}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
