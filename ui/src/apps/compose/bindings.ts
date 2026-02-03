// Binding resolution utilities for compose_ui

/**
 * Resolves template bindings in a string or object.
 * Bindings use the syntax {{variable.property}}
 * 
 * @example
 * const values = { repo: { owner: "github", name: "mcp-server" } };
 * resolveBindings("{{repo.owner}}", values) // Returns "github"
 * resolveBindings({ owner: "{{repo.owner}}" }, values) // Returns { owner: "github" }
 */

const BINDING_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Check if a string contains binding expressions
 */
export function hasBindings(value: unknown): boolean {
  if (typeof value !== "string") return false;
  // Use a new regex each time to avoid lastIndex issues
  return /\{\{([^}]+)\}\}/.test(value);
}

/**
 * Get the value at a path in an object
 * @example getPath({ user: { name: "John" } }, "user.name") => "John"
 */
function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Resolve a single binding expression like "repo.owner"
 */
function resolveBinding(expression: string, values: Record<string, unknown>): unknown {
  const trimmed = expression.trim();
  return getPath(values, trimmed);
}

/**
 * Resolve all bindings in a string
 * Returns the resolved value, or the original string if no bindings found
 */
export function resolveString(template: string, values: Record<string, unknown>): unknown {
  // If the entire string is a single binding, return the resolved value directly
  // This preserves types (objects, numbers, etc.)
  const fullMatch = template.match(/^\{\{([^}]+)\}\}$/);
  if (fullMatch) {
    const resolved = resolveBinding(fullMatch[1], values);
    return resolved !== undefined ? resolved : template;
  }

  // Otherwise, replace all bindings in the string
  return template.replace(BINDING_PATTERN, (match, expression) => {
    const resolved = resolveBinding(expression, values);
    if (resolved === undefined || resolved === null) {
      return match; // Keep original if not found
    }
    if (typeof resolved === "object") {
      return JSON.stringify(resolved);
    }
    return String(resolved);
  });
}

/**
 * Recursively resolve bindings in an object or array
 */
export function resolveBindings<T>(
  value: T,
  values: Record<string, unknown>
): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return resolveString(value, values) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveBindings(item, values)) as T;
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveBindings(val, values);
    }
    return result as T;
  }

  return value;
}

/**
 * Check if all bindings in a value can be resolved
 * Returns list of unresolved binding paths
 */
export function getUnresolvedBindings(
  value: unknown,
  values: Record<string, unknown>
): string[] {
  const unresolved: string[] = [];

  function check(val: unknown): void {
    if (typeof val === "string") {
      const matches = val.matchAll(BINDING_PATTERN);
      for (const match of matches) {
        const path = match[1].trim();
        if (getPath(values, path) === undefined) {
          unresolved.push(path);
        }
      }
    } else if (Array.isArray(val)) {
      val.forEach(check);
    } else if (val !== null && typeof val === "object") {
      Object.values(val).forEach(check);
    }
  }

  check(value);
  return unresolved;
}
