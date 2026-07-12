/**
 * Local Privacy Scrubber
 * Intercepts and masks sensitive patterns in the composed context
 * before it is injected into any external AI platform.
 */

const SENSITIVE_PATTERNS = [
  // OpenAI API Keys (including project and legacy keys)
  { regex: /sk-(?:proj-|ant-)?[a-zA-Z0-9_-]{20,}/g, replacement: "[MASKED_OPENAI_KEY]" },
  
  // Anthropic API Keys
  { regex: /sk-ant-api03-[a-zA-Z0-9-_]{90,}/g, replacement: "[MASKED_ANTHROPIC_KEY]" },

  // AWS Access Key IDs
  { regex: /\b(AKIA|A3T|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/g, replacement: "[MASKED_AWS_KEY]" },

  // Google Cloud / GCP API Keys (heuristic)
  { regex: /\bAIza[0-9A-Za-z-_]{35}\b/g, replacement: "[MASKED_GCP_KEY]" },

  // GitHub Personal Access Tokens
  { regex: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b/g, replacement: "[MASKED_GITHUB_TOKEN]" },

  // Slack Tokens
  { regex: /\bxox[baprs]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}\b/g, replacement: "[MASKED_SLACK_TOKEN]" },

  // Stripe API Keys
  { regex: /\b(sk|rk)_(test|live)_[0-9a-zA-Z]{24}\b/g, replacement: "[MASKED_STRIPE_KEY]" },

  // Credit Card Numbers (13-19 digits, possibly separated by spaces or dashes)
  { regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g, replacement: "[MASKED_CREDIT_CARD]" },

  // Social Security Numbers (SSN - US)
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[MASKED_SSN]" },

  // Private Keys (RSA, DSA, EC, OPENSSH)
  { regex: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |)PRIVATE KEY-----[\s\S]*?-----END (?:RSA |DSA |EC |OPENSSH |)PRIVATE KEY-----/g, replacement: "[MASKED_PRIVATE_KEY]" },

  // Passwords explicitly written in config-like formats (e.g., password="secret", pwd: 'my_pass')
  { 
    regex: /(password|pwd|secret|passphrase|token)\s*[:=]\s*(["']?)([^"'\s,;]+)\2/gi, 
    replacement: "$1=\"[MASKED_PASSWORD]\"",
    type: "PASSWORD"
  },

  // Standard Email Addresses
  { regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, replacement: "[MASKED_EMAIL]" },
];

export interface ScrubResult {
  scrubbedText: string;
  detections: string[];
}

/**
 * Runs a string through a dictionary of regex patterns to mask sensitive data.
 * @param text The raw string (e.g. final formatted context prompt)
 * @returns The scrubbed string safe for injection
 */
export function scrubText(text: string): string {
  return scrubAndReport(text).scrubbedText;
}

/**
 * Scrubs a string and returns a detailed report of what was masked.
 */
export function scrubAndReport(text: string): ScrubResult {
  if (!text) return { scrubbedText: text, detections: [] };
  
  let scrubbed = text;
  const detections: string[] = [];
  
  for (const pattern of SENSITIVE_PATTERNS) {
    const matches = scrubbed.match(pattern.regex);
    if (matches && matches.length > 0) {
      const type = (pattern as any).type || pattern.replacement.replace(/\[|\]/g, '').replace('MASKED_', '');
      detections.push(`${matches.length}x ${type}`);
      scrubbed = scrubbed.replace(pattern.regex, pattern.replacement);
    }
  }
  
  return { scrubbedText: scrubbed, detections };
}
