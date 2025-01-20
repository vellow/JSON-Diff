import has from "lodash/has";
import get from "lodash/get";
import isEqual from "lodash/isEqual";

import {
  JsonInsert,
  JsonSet,
  IComparator,
  IJSONChangeUpdate,
} from "../src/jsonDiff";
import {
  ListDiff,
  deconstructChangesInListUpdateChanges,
} from "../src/listDiff";
import { JSONValue } from "../src/types";

describe("list diff basic function", () => {
  it("should deconstruct changes", () => {
    const changes1: IJSONChangeUpdate[] = [
      {
        path: "[0].name",
        preValue: "a",
        value: "x",
      },
    ];

    const dechanges1 = deconstructChangesInListUpdateChanges(changes1);
    expect(dechanges1).toEqual({
      updates: changes1,
      adds: [],
      deletes: [],
    });

    const changes2: IJSONChangeUpdate[] = [
      {
        path: "[0]",
        preValue: {
          id: 1,
          name: "a",
        },
        value: {
          id: 1,
          name: "x", // name change from 'a' -> 'x'
        },
      },
      {
        path: "[1]",
        preValue: {
          id: 2,
          name: "b",
        },
        value: {
          id: 2,
          name: "x", // name change from 'b' -> 'x'
        },
      },
    ];

    const dechanges2 = deconstructChangesInListUpdateChanges(changes2);
    expect(dechanges2).toEqual({
      updates: [
        {
          path: "[0].name",
          preValue: "a",
          value: "x",
        },
        {
          path: "[1].name",
          preValue: "b",
          value: "x",
        },
      ],
      adds: [],
      deletes: [],
    });

    const changes3: IJSONChangeUpdate[] = [
      {
        path: "[0]",
        preValue: {
          id: 1,
          name: "a", // deleted
        },
        value: {
          id: 1,
        },
      },
    ];

    const dechanges3 = deconstructChangesInListUpdateChanges(changes3);
    expect(dechanges3).toEqual({
      updates: [],
      adds: [],
      deletes: [
        {
          path: "[0].name",
          value: "a",
        },
      ],
    });

    const changes4: IJSONChangeUpdate[] = [
      {
        path: "[0]",
        preValue: {
          id: 1,
          name: "a", // updated
        },
        value: {
          id: 1,
          name: "x",
          desc: "ha", // add
        },
      },
    ];

    const dechanges4 = deconstructChangesInListUpdateChanges(changes4);
    expect(dechanges4).toEqual({
      updates: [
        {
          path: "[0].name",
          preValue: "a",
          value: "x",
        },
      ],
      adds: [{ path: "[0].desc", value: "ha" }],
      deletes: [],
    });


    const changes5: IJSONChangeUpdate[] = [
      {
        path: "[0]",
        preValue: {
          id: 1,
          name: "a",
        },
        value: "x",
      },
    ];

    const dechanges5 = deconstructChangesInListUpdateChanges(changes5);
    expect(dechanges5).toEqual({
      updates: changes5,
      adds: [],
      deletes: [],
    });
  });
});

describe("list diff", () => {
  it("get changes in number list", () => {
    // update
    const changes1 = ListDiff([1, 2, 3], [1, 2, 4]);
    expect(changes1).toEqual({
      updates: [
        {
          path: "[2]",
          preValue: 3,
          value: 4,
        },
      ],
      adds: [],
      deletes: [],
    });

    // add
    const changes2 = ListDiff([1, 2, 3], [1, 2, 3, 4]);
    expect(changes2).toEqual({
      updates: [],
      adds: [{ path: "[3]", value: 4 }],
      deletes: [],
    });

    const changes21 = ListDiff([1, 2, 3], [0, 1, 2, 3]);
    expect(changes21).toEqual({
      updates: [],
      adds: [{ path: "[0]", value: 0 }],
      deletes: [],
    });


    // delete
    const changes3 = ListDiff([1, 2, 3], [1, 2]);
    expect(changes3).toEqual({
      updates: [],
      adds: [],
      deletes: [{ path: "[2]", value: 3 }],
    });

    const changes31 = ListDiff([1, 2, 3], [2, 3]);
    expect(changes31).toEqual({
      updates: [],
      adds: [],
      deletes: [{ path: "[0]", value: 1 }],
    });

    // multiple change
    const changes4 = ListDiff([1, 2, 3], [1, 22, 3, 4]);
    expect(changes4).toEqual({
      updates: [{ path: "[1]", preValue: 2, value: 22 }],
      adds: [{ path: "[3]", value: 4 }],
      deletes: [],
    });


    const changes41 = ListDiff([1, 2, 3], [0, 1, 22, 3]);
    // TODO: find shortest change path.
    // Current { adds: [0],[2];  deletes: [1] }. count as 3 step
    // Suppose { adds: [0]; updates: [1] }.      count as 2 step
    expect(changes41.deletes.length).toEqual(1);
    // expect(changes41.updates.length).toEqual(1);
    // expect(changes41.adds.length).toEqual(0);
    const changes42 = ListDiff([1, 2, 3], [22, 3]);
    // TODO: find shortest change path.
    // Current { updates: [0] `1->22`;  deletes: [1] `2` }.
    // Suppose { updates: [1] `2->22`;  deletes: [0] `1` }. `2->22` seems more natrual
    expect(changes42.deletes.length).toEqual(1);
    expect(changes42.updates.length).toEqual(1);
    expect(changes42.adds.length).toEqual(0);
  });

  it("get changes in object list", () => {
    const base = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
      { id: 3, name: "c" },
    ];

    // insert at list start
    const list1 = JsonInsert(base, [
      {
        path: "[0]",
        value: { id: 0, name: "x" },
      },
    ]) as JSONValue[];
    const changes1 = ListDiff(base, list1);
    expect(changes1).toEqual({
      updates: [],
      adds: [{ path: "[0]", value: { id: 0, name: "x" } }],
      deletes: [],
    });

    // insert at list middle
    const list11 = JsonInsert(base, [
      {
        path: "[1]",
        value: { id: 0, name: "x" },
      },
    ]) as JSONValue[];
    const changes11 = ListDiff(base, list11);
    expect(changes11).toEqual({
      updates: [],
      adds: [{ path: "[1]", value: { id: 0, name: "x" } }],
      deletes: [],
    });

    // insert at list end
    const list12 = JsonInsert(base, [
      {
        path: "[3]",
        value: { id: 0, name: "x" },
      },
    ]) as JSONValue[];
    const changes12 = ListDiff(base, list12);
    expect(changes12).toEqual({
      updates: [],
      adds: [{ path: "[3]", value: { id: 0, name: "x" } }],
      deletes: [],
    });

    // update list item
    const list2 = JsonSet(base, [
      {
        path: "[1]",
        value: { id: 2, name: "x" },
      },
    ]) as JSONValue[];
    const changes2 = ListDiff(base, list2);
    expect(changes2).toEqual({
      updates: [{ path: "[1].name", preValue: "b", value: "x" }],
      adds: [],
      deletes: [],
    });

    const list21 = JsonSet(base, [
      {
        path: "[0]",
        value: { id: 1, name: "x1" }, // name change from 'a' -> 'x1'
      },
      {
        path: "[1].name",
        value: "x2", // name change from 'b' -> 'x2'
      },
    ]) as JSONValue[];
    const changes21 = ListDiff(base, list21);
    expect(changes21).toEqual({
      updates: [
        { path: "[0].name", preValue: "a", value: "x1" },
        { path: "[1].name", preValue: "b", value: "x2" },
      ],
      adds: [],
      deletes: [],
    });

    // multiple changes, add + update
    let list3 = JsonSet(base, [
      {
        path: "[1]",
        value: { id: 2, name: "x1" }, // name change from 'a' -> 'x1'
      },
    ]);
    list3 = JsonInsert(list3, [
      {
        path: "[3]",
        value: { id: 0, name: "x3" },
      },
    ]) as JSONValue[];
    const changes3 = ListDiff(base, list3);
    expect(changes3).toEqual({
      updates: [{ path: "[1].name", preValue: "b", value: "x1" }],
      adds: [{ path: "[3]", value: { id: 0, name: "x3" } }],
      deletes: [],
    });

  });

  it("get changes in object list with a comparator", () => {
    // A customize comparator, if two object has same id, they are same.
    const myComparator: IComparator = (item1: JSONValue, item2: JSONValue) => {
      let isChange;
      if (has(item1, "id") && has(item2, "id")) {
        isChange = !isEqual(get(item1, "id"), get(item2, "id"));
      } else {
        isChange = isEqual(item1, item2);
      }
      const isStop = isChange;

      return { isStop, isChange };
    };

    const base = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
      { id: 3, name: "c" },
    ];

    // insert at list start
    const list1 = JsonInsert(base, [
      {
        path: "[0]",
        value: { id: 0, name: "x" },
      },
    ]) as JSONValue[];
    const changes1 = ListDiff(base, list1, myComparator);
    expect(changes1).toEqual({
      updates: [],
      adds: [{ path: "[0]", value: { id: 0, name: "x" } }],
      deletes: [],
    });

    // insert at list middle
    const list11 = JsonInsert(base, [
      {
        path: "[1]",
        value: { id: 0, name: "x" },
      },
    ]) as JSONValue[];
    const changes11 = ListDiff(base, list11, myComparator);
    expect(changes11).toEqual({
      updates: [],
      adds: [{ path: "[1]", value: { id: 0, name: "x" } }],
      deletes: [],
    });

    // insert at list end
    const list12 = JsonInsert(base, [
      {
        path: "[3]",
        value: { id: 0, name: "x" },
      },
    ]) as JSONValue[];
    const changes12 = ListDiff(base, list12, myComparator);
    expect(changes12).toEqual({
      updates: [],
      adds: [{ path: "[3]", value: { id: 0, name: "x" } }],
      deletes: [],
    });

    // update list item
    const list2 = JsonSet(base, [
      {
        path: "[1]",
        value: { id: 2, name: "x" }, // update name
      },
    ]) as JSONValue[];
    const changes2 = ListDiff(base, list2, myComparator);
    expect(changes2).toEqual({
      updates: [],
      adds: [],
      deletes: [],
    });

    const list21 = JsonSet(base, [
      {
        path: "[0]",
        value: { id: 11, name: "x1" }, // update id
      },
      {
        path: "[1]",
        value: { id: 2, name: "x2" }, // only update name
      },
    ]) as JSONValue[];
    const changes21 = ListDiff(base, list21, myComparator);
    expect(changes21).toEqual({
      updates: [{ path: "[0]", preValue: { id: 1, name: "a" }, value: { id: 11, name: "x1" } }],
      adds: [],
      deletes: [],
    });

    // multiple changes, add + update
    let list3 = JsonSet(base, [
      {
        path: "[0]",
        value: { id: 1, name: "x" }, // name 'a'->'x'
      },
      {
        path: "[1]",
        value: { id: 22, name: "x" }, // name 'b'->'x', id 2->22
      },
    ]);
    list3 = JsonInsert(list3, [
      {
        path: "[3]",
        value: { id: 4, name: "x3" },
      },
    ]) as JSONValue[];

    const changes3 = ListDiff(base, list3, myComparator);
    expect(changes3).toEqual({
      updates: [{ path: "[1]", preValue: { id: 2, name: "b" }, value: { id: 22, name: "x" } }],
      adds: [{ path: "[3]", value: { id: 4, name: "x3" } }],
      deletes: [],
    });
  });
});
