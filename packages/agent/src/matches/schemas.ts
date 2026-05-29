import { z } from "zod";

/** Wraps any API-Football response: { get, parameters, errors, results, response } */
export const envelopeSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    get: z.string().optional(),
    parameters: z.record(z.unknown()).optional(),
    errors: z.union([z.array(z.unknown()), z.record(z.unknown())]).optional(),
    results: z.number().optional(),
    paging: z.unknown().optional(),
    response: z.array(item),
  });

export const teamSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  logo: z.string().nullable().optional(),
  winner: z.boolean().nullable().optional(),
});

export const fixtureStatusSchema = z.object({
  long: z.string(),
  short: z.string(),
  elapsed: z.number().int().nullable(),
  extra: z.number().int().nullable().optional(),
});

export const scoreRawSchema = z.object({
  home: z.number().int().nullable(),
  away: z.number().int().nullable(),
});

export const eventRawSchema = z.object({
  time: z.object({
    elapsed: z.number().int().nullable(),
    extra: z.number().int().nullable().optional(),
  }),
  team: teamSchema,
  player: z.object({ id: z.number().int().nullable(), name: z.string().nullable() }).nullable(),
  assist: z
    .object({ id: z.number().int().nullable(), name: z.string().nullable() })
    .nullable()
    .optional(),
  type: z.string(),
  detail: z.string(),
  comments: z.string().nullable().optional(),
});

export const fixtureItemSchema = z.object({
  fixture: z.object({
    id: z.number().int(),
    referee: z.string().nullable().optional(),
    timezone: z.string().optional(),
    date: z.string().optional(),
    timestamp: z.number().optional(),
    status: fixtureStatusSchema,
  }),
  league: z.unknown().optional(),
  teams: z.object({
    home: teamSchema,
    away: teamSchema,
  }),
  goals: scoreRawSchema,
  score: z.object({
    halftime: scoreRawSchema,
    fulltime: scoreRawSchema,
    extratime: scoreRawSchema,
    penalty: scoreRawSchema,
  }),
  events: z.array(eventRawSchema).optional().default([]),
});

export const fixtureResponseSchema = envelopeSchema(fixtureItemSchema);

export const statisticValueSchema = z.union([z.number(), z.string(), z.null()]);

export const statisticItemSchema = z.object({
  team: teamSchema,
  statistics: z.array(
    z.object({
      type: z.string(),
      value: statisticValueSchema,
    })
  ),
});

export const statisticsResponseSchema = envelopeSchema(statisticItemSchema);

export const eventsOnlyResponseSchema = envelopeSchema(eventRawSchema);

export type RawFixtureResponse = z.infer<typeof fixtureResponseSchema>;
export type RawStatsResponse = z.infer<typeof statisticsResponseSchema>;
export type RawEventsResponse = z.infer<typeof eventsOnlyResponseSchema>;
export type RawFixtureItem = z.infer<typeof fixtureItemSchema>;
export type RawStatItem = z.infer<typeof statisticItemSchema>;
export type RawEvent = z.infer<typeof eventRawSchema>;
