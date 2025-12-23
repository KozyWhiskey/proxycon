'use client';

import { ManaSymbol } from '@/components/ui/mana-symbol';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Fragment } from 'react';

interface RichTextDisplayProps {
  text: string | null | undefined;
  className?: string;
}

// Common MTG keywords to highlight
const KEYWORDS: Record<string, string> = {
  'Deathtouch': 'Any amount of damage this deals to a creature is enough to destroy it.',
  'Defender': 'This creature can\'t attack.',
  'Double strike': 'This creature deals both first-strike and regular combat damage.',
  'Enchant': 'This card must be attached to a...',
  'Equip': 'Attach to target creature you control. Equip only as a sorcery.',
  'First strike': 'This creature deals combat damage before creatures without first strike.',
  'Flash': 'You may cast this spell any time you could cast an instant.',
  'Flying': 'This creature can\'t be blocked except by creatures with flying or reach.',
  'Haste': 'This creature can attack and {T} as soon as it comes under your control.',
  'Hexproof': 'This permanent can\'t be the target of spells or abilities your opponents control.',
  'Indestructible': 'Effects that say "destroy" don\'t destroy this permanent. An indestructible creature isn\'t destroyed by lethal damage.',
  'Lifelink': 'Damage dealt by this creature also causes you to gain that much life.',
  'Menace': 'This creature can\'t be blocked except by two or more creatures.',
  'Protection': 'This can\'t be blocked, targeted, dealt damage, or enchanted by anything having the specified quality.',
  'Reach': 'This creature can block creatures with flying.',
  'Trample': 'This creature can deal excess combat damage to the player or planeswalker it\'s attacking.',
  'Vigilance': 'Attacking doesn\'t cause this creature to tap.',
  'Ward': 'Whenever this permanent becomes the target of a spell or ability an opponent controls, counter it unless that player pays the cost.',
  'Scry': 'Look at the top X cards of your library. You may put any number of them on the bottom of your library and the rest on top in any order.',
  'Surveil': 'Look at the top X cards of your library. You may put any number of them into your graveyard and the rest on top in any order.',
  'Mill': 'Put the top cards of your library into your graveyard.',
};

export function RichTextDisplay({ text, className = '' }: RichTextDisplayProps) {
  if (!text) return null;

  // Split text by newlines first to handle paragraphs
  const paragraphs = text.split('\n');

  const renderSegment = (segment: string, keyPrefix: string) => {
    // 1. Split by mana symbols first
    const manaParts = segment.split(/(\{[^}]+\})/g);

    return manaParts.map((part, index) => {
      const key = `${keyPrefix}-${index}`;

      // Check if it's a mana symbol
      if (part.match(/^\{[^}]+\}$/)) {
        return <ManaSymbol key={key} symbol={part} size={14} className="mx-0.5 align-middle" />;
      }

      // 2. If it's text, split by keywords
      // Create regex from keywords keys
      // Sort by length desc to match "Double strike" before "Strike" (if "Strike" existed)
      const keywordKeys = Object.keys(KEYWORDS).sort((a, b) => b.length - a.length);
      const keywordRegex = new RegExp(`\b(${keywordKeys.join('|')})\b`, 'gi'); // Case-insensitive, word boundaries

      const textParts = part.split(keywordRegex);

      return (
        <span key={key}>
          {textParts.map((subPart, subIndex) => {
            const subKey = `${key}-${subIndex}`;
            
            // Check if this part matches a keyword (case-insensitive check)
            const matchedKey = keywordKeys.find(k => k.toLowerCase() === subPart.toLowerCase());

            if (matchedKey) {
              return (
                <Tooltip key={subKey}>
                  <TooltipTrigger asChild>
                    <span className="cursor-help border-b border-dotted border-white/30 hover:border-primary/50 transition-colors">
                      {subPart}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{KEYWORDS[matchedKey]}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <span key={subKey}>{subPart}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      <TooltipProvider delayDuration={300}>
        {paragraphs.map((p, i) => (
          <p key={`p-${i}`} className={p ? '' : 'h-2'}>
            {renderSegment(p, `p-${i}`)}
          </p>
        ))}
      </TooltipProvider>
    </div>
  );
}