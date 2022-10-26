export type JSONValue =
  | string
  | number
  | boolean
  | JSONObject
  | Array<JSONValue>;

export type JSONObject =
  | {
      [x: string]: JSONValue;
    }
  | Array<JSONValue>;
