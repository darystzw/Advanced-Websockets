import { z } from 'zod';

export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

const coercedPositiveInteger = z.coerce.number().int().positive();
const coercedNonNegativeInteger = z.coerce.number().int().nonnegative();

export const listMatchesQuerySchema = z.object({
  limit: coercedPositiveInteger.max(100).optional(),
});

export const matchIdParamSchema = z.object({
  id: coercedPositiveInteger,
});

const isoDateString = z.string().refine((val) => {
  const date = new Date(val);
  return !isNaN(date.getTime()) && val === date.toISOString();
}, {
  message: 'Invalid ISO date string',
});

export const createMatchSchema = z.object({
  sport: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  startTime: isoDateString,
  endTime: isoDateString,
  homeScore: coercedNonNegativeInteger.optional(),
  awayScore: coercedNonNegativeInteger.optional(),
}).superRefine((data, ctx) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  if (end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endTime must be chronologically after startTime',
      path: ['endTime'],
    });
  }
});

export const updateScoreSchema = z.object({
  homeScore: coercedNonNegativeInteger,
  awayScore: coercedNonNegativeInteger,
});
