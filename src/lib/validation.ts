// Input validation and sanitization utilities

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

export interface YearValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: number;
}

/**
 * Validates and sanitizes MonkeyType username
 */
export function validateMonkeyTypeUsername(username: string): ValidationResult {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }

  // Trim whitespace
  const trimmed = username.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Username cannot be empty' };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Username must be 50 characters or less' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Username must be at least 2 characters' };
  }

  // Allow only alphanumeric characters, hyphens, underscores, and dots
  const usernameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, periods, hyphens, and underscores' };
  }

  // Prevent common injection patterns
  const forbiddenPatterns = [
    /^\$/, // MongoDB operators
    /javascript:/i, // JavaScript URLs
    /<script/i, // Script tags
    /\.\./,  // Path traversal
    /null/i, // Null bytes
    /union/i, // SQL injection patterns
    /select/i,
    /drop/i,
    /delete/i,
    /insert/i,
    /update/i
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: 'Username contains invalid characters' };
    }
  }

  return { isValid: true, sanitized: trimmed };
}

/**
 * Validates typing category
 */
export function validateCategory(category: string): ValidationResult {
  if (!category || typeof category !== 'string') {
    return { isValid: false, error: 'Category is required' };
  }

  const validCategories = ['15s', '30s', '60s', '120s'];
  const sanitized = category.trim().toLowerCase();

  if (!validCategories.includes(sanitized)) {
    return { isValid: false, error: 'Invalid category. Must be one of: ' + validCategories.join(', ') };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates and sanitizes pagination parameters
 */
export function validatePagination(page?: string, limit?: string): {
  isValid: boolean;
  error?: string;
  page: number;
  limit: number;
} {
  let pageNum = 1;
  let limitNum = 20;

  // Validate page
  if (page) {
    const parsedPage = parseInt(page, 10);
    if (isNaN(parsedPage) || parsedPage < 1 || parsedPage > 10000) {
      return { isValid: false, error: 'Page must be a number between 1 and 10000', page: 1, limit: 20 };
    }
    pageNum = parsedPage;
  }

  // Validate limit
  if (limit) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return { isValid: false, error: 'Limit must be a number between 1 and 100', page: pageNum, limit: 20 };
    }
    limitNum = parsedLimit;
  }

  return { isValid: true, page: pageNum, limit: limitNum };
}

/**
 * Sanitizes string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>'"&]/g, (match) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match];
    });
}

/**
 * Validates Discord ID format
 */
export function validateDiscordId(discordId: string): ValidationResult {
  if (!discordId || typeof discordId !== 'string') {
    return { isValid: false, error: 'Discord ID is required' };
  }

  // Discord IDs are numeric strings, typically 17-19 digits
  const discordIdRegex = /^\d{17,19}$/;
  if (!discordIdRegex.test(discordId)) {
    return { isValid: false, error: 'Invalid Discord ID format' };
  }

  return { isValid: true, sanitized: discordId };
}

/**
 * Validates and sanitizes branch input
 */
export function validateBranch(branch?: string): ValidationResult {
  if (!branch) {
    return { isValid: true, sanitized: undefined };
  }

  if (typeof branch !== 'string') {
    return { isValid: false, error: 'Branch must be a string' };
  }

  const validBranches = ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'CHE', 'BT', 'TE', 'AE', 'IE', 'IPE'];
  const sanitized = branch.trim().toUpperCase();

  if (!validBranches.includes(sanitized)) {
    return { isValid: false, error: 'Invalid branch. Must be one of: ' + validBranches.join(', ') };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates year input
 */
export function validateYear(year?: string | number): YearValidationResult {
  if (!year) {
    return { isValid: true, sanitized: undefined };
  }

  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;

  if (isNaN(yearNum) || yearNum < 1 || yearNum > 4) {
    return { isValid: false, error: 'Year must be between 1 and 4' };
  }

  return { isValid: true, sanitized: yearNum };
}

/**
 * Prevents NoSQL injection by removing MongoDB operators
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function sanitizeMongoQuery(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeMongoQuery);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Remove keys that start with $ (MongoDB operators)
    if (key.startsWith('$')) {
      continue;
    }

    // Recursively sanitize nested objects
    sanitized[key] = sanitizeMongoQuery(value);
  }

  return sanitized;
}

/**
 * Validates search query input
 */
export function validateSearchQuery(query?: string): ValidationResult {
  if (!query || typeof query !== 'string') {
    return { isValid: false, error: 'Search query is required' };
  }

  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Search query must be at least 2 characters long' };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Search query must be 50 characters or less' };
  }

  // Prevent obvious injection attempts
  const forbiddenPatterns = [
    /^\$/, // MongoDB operators
    /javascript:/i, // JavaScript URLs
    /<script/i, // Script tags
    /\.\./,  // Path traversal
    /null/i, // Null bytes
    /union.*select/i, // SQL injection patterns
    /drop.*table/i,
    /delete.*from/i,
    /insert.*into/i,
    /update.*set/i
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: 'Search query contains invalid characters' };
    }
  }

  return { isValid: true, sanitized: trimmed };
} 