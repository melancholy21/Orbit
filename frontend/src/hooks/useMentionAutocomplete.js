import { useState, useEffect } from 'react';

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

    // Match '@' followed by word characters up to the cursor at the end of the line
    const match = textBeforeCursor.match(/@([a-zA-Z0-9._-]*)$/);

    if (match) {
      setQuery(match[1] || '');
      setMatchIndex(match.index);
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

    const insertion = `@${friend.username} `;
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

  const filteredFriends = friends.filter(friend =>
    friend.username?.toLowerCase().includes(query.toLowerCase())
  );

  return {
    showSuggestions: showSuggestions && filteredFriends.length > 0,
    query,
    filteredFriends,
    handleSelect,
    closeDropdown: () => setShowSuggestions(false),
    checkMention
  };
}
