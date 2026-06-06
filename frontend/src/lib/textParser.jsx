import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Parses post/comment content and returns a React Node array where
 * URLs and @username mentions are converted to active links.
 */
export function formatText(text) {
  if (!text || typeof text !== 'string') return text;

  // Combined regex to capture URLs, Markdown mentions (@[username](userId)), and legacy @username mentions
  const regex = /((?:https?:\/\/[^\s]+|www\.[^\s]+)|@\[[^\]]+\]\([a-fA-F0-9]{24}\)|@(?:[a-zA-Z0-9._-]+))/gi;

  const parts = text.split(regex);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    // 1. Full URLs
    if (part.match(/^https?:\/\//i)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 hover:underline font-medium break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    // 2. www. prefixed URLs
    if (part.match(/^www\./i)) {
      return (
        <a
          key={index}
          href={`https://${part}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 hover:underline font-medium break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }

    // 3. Markdown Mentions: @[username](userId)
    if (part.startsWith('@[') && part.includes('](')) {
      const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const username = match[1];
        const userId = match[2];
        return (
          <Link
            key={index}
            to={`/profile/${userId}`}
            className="text-blue-400 hover:text-blue-300 hover:underline font-bold"
            onClick={(e) => e.stopPropagation()}
          >
            @{username}
          </Link>
        );
      }
    }

    // 4. Legacy Mentions: @username
    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <Link
          key={index}
          to={`/profile/${username}`}
          className="text-blue-400 hover:text-blue-300 hover:underline font-bold"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }

    // 5. Plain text
    return part;
  });
}
