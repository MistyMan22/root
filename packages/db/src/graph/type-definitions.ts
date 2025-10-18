import { z } from "zod";

export const elementTypes = {
  todo: {
    id: "todo",
    schema: z.object({
      title: z.string().max(256),
      completed: z.boolean().default(false),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      completionDate: z
        .string()
        .default(() => new Date().toISOString())
        .transform((str) => new Date(str)),
    }),
    parentTypes: [],
  },
  object: {
    id: "object",
    schema: z.object({
      name: z.string().max(256),
      description: z.string(),
    }),
  },
  goal: {
    id: "goal",
    schema: z.object({
      title: z.string().max(256),
      description: z.string(),
      state: z.array(
        z.object({
          name: z.string().max(256),
          description: z.string(),
          value: z.string(),
          unit: z.string(),
        }),
      ),
    }),
  },
  actor: {
    id: "actor",
    schema: z.object({
      name: z.string().max(256),
      description: z.string(),
    }),
  },
  person: {
    id: "person",
    schema: z.object({
      name: z.string().max(256),
      description: z.string(),
    }),
    parentTypes: ["actor", "object"],
  },
  taskList: {
    id: "taskList",
    schema: z.object({
      name: z.string().max(256),
      description: z.string(),
    }),
    parentTypes: [],
  },
  goalList: {
    id: "goalList",
    schema: z.object({
      name: z.string().max(256),
      description: z.string(),
    }),
    parentTypes: [],
  },
  objectList: {
    id: "objectList",
    schema: z.object({
      name: z.string().max(256),
      description: z.string(),
    }),
    parentTypes: [],
  },
} as const;

export const linkTypes = {
  taskGoal: {
    id: "taskGoal",
    fromType: "task",
    toType: "goal",
    schema: z.object({}),
    parentTypes: [],
  },
  subTask: {
    id: "subTask",
    fromType: "task",
    toType: "task",
    schema: z.object({
      statement: z.string().default("is a sub-task of"),
    }),
    parentTypes: [],
  },
  goalObject: {
    id: "goalObject",
    fromType: "goal",
    toType: "object",
    schema: z.object({
      stateChange: z.object({
        state: z.string(),
        value: z.string(),
        unit: z.string(),
      }),
    }),
    parentTypes: [],
  },
  objectComponent: {
    id: "objectComponent",
    fromType: "object",
    toType: "object",
    schema: z.object({
      statement: z.string().default("is a component of"),
    }),
    parentTypes: [],
  },
  taskActor: {
    id: "taskActor",
    fromType: "actor",
    toType: "task",
    schema: z.object({
      statement: z.string().default("is responsible for"),
    }),
    parentTypes: [],
  },
  taskToList: {
    id: "taskToList",
    fromType: "task",
    toType: "taskList",
    schema: z.object({
      order: z.number(),
    }),
    parentTypes: [],
  },
  goalToList: {
    id: "goalToList",
    fromType: "goal",
    toType: "goalList",
    schema: z.object({
      order: z.number(),
    }),
    parentTypes: [],
  },
  objectToList: {
    id: "objectToList",
    fromType: "object",
    toType: "objectList",
    schema: z.object({
      order: z.number(),
    }),
    parentTypes: [],
  },
} as const;

// Type utilities derived from the Zod schemas above
export type ElementTypeId = keyof typeof elementTypes;

export type ElementDataById = {
  [K in ElementTypeId]: z.infer<(typeof elementTypes)[K]["schema"]>;
};

// Input variants support defaults and pre-transform inputs
export type ElementInputDataById = {
  [K in ElementTypeId]: z.input<(typeof elementTypes)[K]["schema"]>;
};
