# JSON-Diff
[![JSON Diff CI](https://github.com/vellow/JSON-Diff/actions/workflows/main.yml/badge.svg)](https://github.com/vellow/JSON-Diff/actions/workflows/main.yml)
[![Coverage Status](https://coveralls.io/repos/github/vellow/JSON-Diff/badge.svg?branch=main)](https://coveralls.io/github/vellow/JSON-Diff?branch=main)

Finds changes between two object or array.

## Example
```
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
```
`lhs` is the original object, `rhs` is the latest object.

```
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
}

```
run `JsonDiff(lhs, rhs)` find out changes between `lhs` and `rhs`.

```
{
    adds: [
    { path: "$.organization.departments[0].teams[0].members[0].skills[2]", value: "typescript" },
    { path: "$.organization.departments[0].teams[0].members[1]", value: { id: 4, name: "Dave", role: "dev", skills: ["react", "node"] } },
    { path: "$.organization.departments[0].teams[0].projects.active[2]", value: { id: "p4", name: "New Dashboard", status: "planning" } },
    { path: "$.organization.settings.newSetting", value: "enabled" }
    ],
    deletes: [
    { path: "$.organization.departments[0].teams[0].members[1]", value: { id: 2, name: "Bob", role: "dev", skills: ["vue", "node"] } },
    { path: "$.organization.departments[0].teams[0].projects.archived[0]", value: { id: "p3", name: "Legacy System", status: "completed" } }
    ],
    updates: [
    { path: "$.organization.departments[0].name", preValue: "Engineering", value: "Engineering & Design" },
    { path: "$.organization.departments[0].teams[0].projects.active[0].name", preValue: "Website", value: "Website Redesign" },
    { path: "$.organization.departments[0].teams[0].projects.active[1].status", preValue: "planning", value: "in-progress" },
    { path: "$.organization.departments[0].teams[1].members[0].role", preValue: "lead", value: "tech-lead" },
    { path: "$.organization.departments[0].teams[1].members[0].skills[2]", value: "kubernetes" },
    { path: "$.organization.settings.theme", preValue: "light", value: "dark" }
    ]
}

```