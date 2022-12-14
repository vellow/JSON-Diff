/**
 * visitor function used by JsonWalk
 * @param path jsonPath string
 * @param value current node value
 * @return boolean, true to stop walk deep
 */

import { JSONValue } from "./types";

export type VisitorFunc = {
  (path: string, value: JSONValue): boolean;
};

/**
 *
 * @param path jsonPath string
 * @param value current node value
 * @param visitor
 */

export const JsonWalk = (
  path: string,
  value: JSONValue,
  visitor: VisitorFunc
) => {
  const stop = visitor(path, value);
  if (stop === true) return;

  // extract array
  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      JsonWalk(`${path}[${index}]`, child, visitor);
    });

    // extract object
  } else if (typeof value === "object" && value) {
    Object.keys(value).forEach((key) => {
      JsonWalk(`${path}.${key}`, value[key], visitor);
    });
  }
};
