import { useState, useEffect } from 'react';
import { formatFullName } from '../lib/utils';

/**
 * Custom hook to manage mention suggestion states on inputs or textareas.
 */
export default function useMentionAutocomplete(text, setText, inputRef, friends = []) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(-1);

  const checkMention = () => {
    if (!inputRef.current) return;

    const selectionStart = inputRef.current.selectionStart;
    const textBeforeCursor = text.slice(0, selectionStart);

    // Match '@' preceded by start of line or space, followed by word characters and spaces up to the cursor at the end of the line
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9._-][a-zA-Z0-9._-\s]*)?$/);

    if (match) {
      const hasLeadingSpace = /^\s/.test(match[0]);
      const actualIndex = match.index + (hasLeadingSpace ? 1 : 0);
      setQuery(match[1] || '');
      setMatchIndex(actualIndex);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setQuery('');
      setMatchIndex(-1);
    }
  };

  // Re-run whenever text changes
  useEffect(() => {
    checkMention();
  }, [text]);

  const handleSelect = (friend) => {
    if (!inputRef.current || matchIndex === -1) return;

    const selectionStart = inputRef.current.selectionStart;
    const start = text.slice(0, matchIndex); // Text before '@'
    const end = text.slice(selectionStart);   // Text after caret

    const insertion = `@[${formatFullName(friend)}](${friend._id}) `;
    const newText = start + insertion + end;

    setText(newText);
    setShowSuggestions(false);

    // Refocus and place cursor directly after the inserted mention
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = matchIndex + insertion.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const filteredFriends = friends.filter(friend => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return true; // Show all friends if query is empty or just spaces
    
    const usernameMatch = friend.username?.toLowerCase().includes(trimmedQuery);
    const fullName = `${friend.firstName || ''} ${friend.lastName || ''}`.toLowerCase();
    const nameMatch = fullName.includes(trimmedQuery);
    
    return usernameMatch || nameMatch;
  });

  return {
    showSuggestions: showSuggestions && filteredFriends.length > 0,
    query,
    filteredFriends,
    handleSelect,
    closeDropdown: () => setShowSuggestions(false),
    checkMention
  };
}
