import isEqual from "lodash/isEqual";
import get from "lodash/get";

import {
  JsonDiff,
  IComparator,
  getWithJsonPath,
  hasWithJsonPath,
  JsonSet,
  JsonInsert,
  defaultJSONUpdateComparator,
  defualtJSONStopComparison,
} from "../src/jsonDiff";
import { JSONValue } from "../src/types";

describe("json diff check comparators", () => {
  it("defualtJSONStopComparison", () => {
    expect(defualtJSONStopComparison({}, { a: 1 }, "$")).toEqual(false);
    expect(defualtJSONStopComparison({}, [], "$")).toEqual(true);
    expect(defualtJSONStopComparison(1, { a: 1 }, "$")).toEqual(true);
    expect(defualtJSONStopComparison(1, "a", "$")).toEqual(true);
  });

  it("defaultJSONUpdateComparator", () => {
    const result1 = defaultJSONUpdateComparator({}, { a: 1 }, "$");
    expect(result1).toEqual({
      isChange: true,
      isStop: false,
    });

    const result2 = defaultJSONUpdateComparator({}, { a: 1 }, "$.a");
    expect(result2).toEqual({
      isChange: false, // '$.a' is an `add` not `update`
      isStop: true,
    });

    const result3 = defaultJSONUpdateComparator(
      { a: 0, b: 2 },
      { a: 1, b: [] },
      "$.a"
    );
    expect(result3).toEqual({
      isChange: true, // '$.a' update from 0 to 1
      isStop: true,
    });

    const result4 = defaultJSONUpdateComparator(
      { a: 0, b: 2 },
      { a: 1, b: [] },
      "$.b"
    );
    expect(result4).toEqual({
      isChange: true,  // '$.a' update from 2 to []
      isStop: true,
    });

    const result5 = defaultJSONUpdateComparator(
      { a: 0, b: 2 },
      { a: 1, b: [] },
      "$"
    );
    expect(result5).toEqual({
      isChange: true,
      isStop: false,
    });

    const result6 = defaultJSONUpdateComparator([1, 2], { a: 1, b: [] }, "$");
    expect(result6).toEqual({
      isChange: true, // update on '$'
      isStop: true,
    });

    const result7 = defaultJSONUpdateComparator([1, 2], [1, 22, 3], "$.[1]");
    expect(result7).toEqual({
      isChange: true,
      isStop: true,
    });

    const result8 = defaultJSONUpdateComparator([1, 2], [1, 22, 3], "$.[0]");
    expect(result8).toEqual({
      isChange: false,
      isStop: true,
    });
  });
});

describe("json diff with default comparator", () => {
  it("get all changes in sample object", () => {
    const lhs = {
      foo: {
        bar: {
          a: ["a", "b"],
          b: 2,
          c: ["x", "y"],
          e: 100, // deleted
        },
      },
      buzz: "world",
    };

    const rhs = {
      foo: {
        bar: {
          a: ["a"], // index 1 ('b')  deleted
          b: 2, // unchanged
          c: ["x", { cc: 2 }, "z"], // 'z' added, 'y' updated
          d: "Hello, world!", // added
        },
      },
      buzz: "fizz", // updated
    };

    const changes = JsonDiff(lhs, rhs);
    expect(changes).toEqual({
      adds: [{ path: "$.foo.bar.c[2]", value: "z" }, { path: "$.foo.bar.d", value: "Hello, world!" }],
      deletes: [{ path: "$.foo.bar.a[1]", value: "b" }, { path: "$.foo.bar.e", value: 100 }],
      updates: [{ path: "$.foo.bar.c[1]", preValue: "y", value: { cc: 2 } }, { path: "$.buzz", preValue: "world", value: "fizz" }],
    });
  });

  it("get all changes in complicapte object", () => {
    const lhs2 = {
      foo: {
        bar: {
          a: ["a", "b"],
          b: 2,
          c: [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
            { id: 3, name: "c" },
          ],
          d: [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
            { id: 3, name: "c" },
          ],
          f: [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
            { id: 3, name: "c" },
          ],
        },
      },
      buzz: "world",
    };

    const rhs2 = {
      foo: {
        bar: {
          a: ["a", "b"],
          b: 2,
          c: [
            { id: 0, name: "a" }, // insert
            { id: 1, name: "a" },
            { id: 2, name: "b" },
            { id: 3, name: "c" },
          ],
          d: [
            { id: 1, name: "a" },
            // { id: 2, name: 'b' },  // delete
            { id: 3, name: "c" },
          ],
          f: [
            { id: 1, name: "a" },
            { id: 2, name: "bb" }, // update
            { id: 3, name: "c" },
          ],
        },
      },
      buzz: "world",
    };
    const changes = JsonDiff(lhs2, rhs2);
    expect(changes).toEqual({
      adds: [{ path: "$.foo.bar.c[0]", value: { id: 0, name: "a" } }],
      deletes: [{ path: "$.foo.bar.d[1]", value: { id: 2, name: "b" } }],
      updates: [{ path: "$.foo.bar.f[1].name", preValue: "b", value: "bb" }],
    });
  });

  it("get all changes in deep object", () => {
    const basic = {
      foo: {
        bar: [
          {
            id: 1,
            name: "a",
            items: [
              {
                id: 11,
                name: "a1",
              },
              {
                id: 12,
                name: "a2",
              },
            ],
          },
        ],
      },
      buzz: "world",
    };

    const insert1 = [
      {
        path: "foo.bar[0].items[0]",
        value: {
          id: 10,
          name: "a0",
        },
      },
    ];
    const object1 = JsonInsert(basic, insert1);

    const changes1 = JsonDiff(basic, object1);
    expect(changes1).toEqual({
      adds: [
        { path: "$.foo.bar[0].items[0]", value: { id: 10, name: "a0" } },
      ],
      deletes: [],
      updates: [],
    });

    const object2 = JsonSet(basic, insert1);
    const changes2 = JsonDiff(basic, object2);
    expect(changes2).toEqual({
      adds: [],
      deletes: [],
      updates: [
        { path: "$.foo.bar[0].items[0].id", preValue: 11, value: 10 },
        { path: "$.foo.bar[0].items[0].name", preValue: "a1", value: "a0" },
      ],
    });
  });

  it("get all changes in nested complex object", () => {
    const lhs = {
      organization: {
        id: "org123",
        departments: [
          {
            id: "dept1",
            name: "Engineering",
            teams: [
              {
                id: "team1",
                name: "Frontend",
                members: [
                  { id: 1, name: "Alice", role: "lead", skills: ["js", "react"] },
                  { id: 2, name: "Bob", role: "dev", skills: ["vue", "node"] },
                ],
                projects: {
                  active: [
                    { id: "p1", name: "Website", status: "ongoing" },
                    { id: "p2", name: "Mobile App", status: "planning" }
                  ],
                  archived: [
                    { id: "p3", name: "Legacy System", status: "completed" }
                  ]
                }
              },
              {
                id: "team2",
                name: "Backend",
                members: [
                  { id: 3, name: "Charlie", role: "lead", skills: ["java", "spring"] }
                ]
              }
            ]
          }
        ],
        settings: {
          notifications: true,
          theme: "light"
        }
      }
    };

    const rhs = {
      organization: {
        id: "org123",
        departments: [
          {
            id: "dept1",
            name: "Engineering & Design", // updated
            teams: [
              {
                id: "team1",
                name: "Frontend",
                members: [
                  { id: 1, name: "Alice", role: "lead", skills: ["js", "react", "typescript"] }, // added skill
                  // Bob removed
                  { id: 4, name: "Dave", role: "dev", skills: ["react", "node"] }, // added new member
                ],
                projects: {
                  active: [
                    { id: "p1", name: "Website Redesign", status: "ongoing" }, // name updated
                    { id: "p2", name: "Mobile App", status: "in-progress" }, // status updated
                    { id: "p4", name: "New Dashboard", status: "planning" } // added
                  ],
                  archived: [] // all removed
                }
              },
              {
                id: "team2",
                name: "Backend",
                members: [
                  { id: 3, name: "Charlie", role: "tech-lead", skills: ["java", "spring", "kubernetes"] } // role and skills updated
                ]
              }
            ]
          }
        ],
        settings: {
          notifications: true,
          theme: "dark", // updated
          newSetting: "enabled" // added
        }
      }
    };

    const changes = JsonDiff(lhs, rhs);
    console.log(changes);
    expect(changes).toEqual({
      adds: [
        { path: "$.organization.departments[0].teams[0].members[0].skills[2]", value: "typescript" },
        { path: "$.organization.departments[0].teams[0].projects.active[2]", value: { id: "p4", name: "New Dashboard", status: "planning" } },
        { path: "$.organization.departments[0].teams[1].members[0].skills[2]", value: "kubernetes" },
        { path: "$.organization.settings.newSetting", value: "enabled" }
      ],
      deletes: [
        { path: "$.organization.departments[0].teams[0].projects.archived[0]", value: { id: "p3", name: "Legacy System", status: "completed" } }
      ],
      updates: [
        { path: "$.organization.departments[0].name", preValue: "Engineering", value: "Engineering & Design" },
        { path: "$.organization.departments[0].teams[0].members[1].id", preValue: 2, value: 4 },
        { path: "$.organization.departments[0].teams[0].members[1].name", preValue: "Bob", value: "Dave" },
        { path: "$.organization.departments[0].teams[0].members[1].skills[0]", preValue: "vue", value: "react" },
        { path: "$.organization.departments[0].teams[0].projects.active[0].name", preValue: "Website", value: "Website Redesign" },
        { path: "$.organization.departments[0].teams[0].projects.active[1].status", preValue: "planning", value: "in-progress" },
        { path: "$.organization.departments[0].teams[1].members[0].role", preValue: "lead", value: "tech-lead" },
        { path: "$.organization.settings.theme", preValue: "light", value: "dark" }
      ]
    });
  });
});

describe("json diff with customize comparator", () => {
  const basic = {
    foo: {
      bar: {
        a: ["a", "b"],
        b: 2,
        c: [
          { id: 1, name: "a" },
          { id: 2, name: "b" },
          { id: 3, name: "c" },
        ],
        d: [
          { id: 1, name: "a" },
          { id: 2, name: "b" },
          { id: 3, name: "c" },
        ],
        f: [
          { id: 1, name: "a" },
          { id: 2, name: "b" },
          { id: 3, name: "c" },
        ],
      },
    },
    buzz: "world",
  };
  it("get insertion/updates in list", () => {
    // A customize comparator, if two object has same id, they are same.
    const myComparator: IComparator = (
      json1: JSONValue,
      json2: JSONValue,
      path: string
    ) => {
      if (
        hasWithJsonPath(json1, `${path}.id`) &&
        hasWithJsonPath(json2, `${path}.id`)
      ) {
        const isChange = !isEqual(
          getWithJsonPath(json1, `${path}.id`),
          getWithJsonPath(json2, `${path}.id`)
        );
        const isStop =
          isChange || defualtJSONStopComparison(json1, json2, path);
        return { isChange, isStop };
      } else {
        return defaultJSONUpdateComparator(json1, json2, path);
      }
    };

    const insert1 = [
      {
        path: "foo.bar.c[0]",
        value: { id: 11, name: "x" },
      },
      {
        path: "foo.bar.d[1]",
        value: { id: 11, name: "x" },
      },
    ];
    const list1 = JsonInsert(basic, insert1);
    const changes1 = JsonDiff(basic, list1);
    expect(changes1).toEqual({
      adds: [
        { path: "$.foo.bar.c[0]", value: { id: 11, name: "x" } },
        { path: "$.foo.bar.d[1]", value: { id: 11, name: "x" } },
      ],
      deletes: [],
      updates: [],
    });


    const insert2 = [
      {
        path: "foo.bar.c[1]",
        value: { id: 22, name: "xbb" }, // id updated, count as a change
      },
      {
        path: "foo.bar.c[0]",
        value: { id: 1, name: "x" }, // id not updated, not count as a change
      },
    ];
    const list2 = JsonSet(basic, insert2);
    const changes2 = JsonDiff(basic, list2, myComparator);
    expect(changes2).toEqual({
      adds: [],
      deletes: [],
      updates: [
        {
          path: "$.foo.bar.c[1]",
          preValue: { id: 2, name: "b" },
          value: { id: 22, name: "xbb" },
        },
      ],
    });
  });
});
