import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Sync all EV vehicles daily at 3am UTC
crons.daily('sync-ev-vehicles', { hourUTC: 3, minuteUTC: 0 }, internal.ev.syncAll.run);

export default crons;
