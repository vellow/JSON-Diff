export type JSONValue =
  | string
  | number
  | undefined
  | boolean
  | JSONObject
  | Array<JSONValue>;

export type JSONObject =
  | {
      [x: string]: JSONValue;
    }
  | Array<JSONValue>;
