/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as comparison from "../comparison.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as depreciation from "../depreciation.js";
import type * as ev_provider from "../ev/provider.js";
import type * as ev_sync from "../ev/sync.js";
import type * as ev_syncAll from "../ev/syncAll.js";
import type * as ev_tessie from "../ev/tessie.js";
import type * as gasData from "../gasData.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_costCalc from "../lib/costCalc.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as myFunctions from "../myFunctions.js";
import type * as odometer from "../odometer.js";
import type * as settings from "../settings.js";
import type * as settingsActions from "../settingsActions.js";
import type * as syncLogs from "../syncLogs.js";
import type * as vehicles from "../vehicles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  comparison: typeof comparison;
  crons: typeof crons;
  dashboard: typeof dashboard;
  depreciation: typeof depreciation;
  "ev/provider": typeof ev_provider;
  "ev/sync": typeof ev_sync;
  "ev/syncAll": typeof ev_syncAll;
  "ev/tessie": typeof ev_tessie;
  gasData: typeof gasData;
  "lib/auth": typeof lib_auth;
  "lib/costCalc": typeof lib_costCalc;
  "lib/crypto": typeof lib_crypto;
  myFunctions: typeof myFunctions;
  odometer: typeof odometer;
  settings: typeof settings;
  settingsActions: typeof settingsActions;
  syncLogs: typeof syncLogs;
  vehicles: typeof vehicles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
