/**
 * Sign in with Hive: Hive's public setup. None of it is secret (the public key
 * only checks passes, it can't make them), so it lives here, not in Netlify.
 * The env vars of the same names override these if set.
 */

/** This app's id in Hive's catalog (Fridge-Board src/config/catalog.js). Passes are made for it. */
export const HIVE_APP_ID = 'learnleaf';

/** Where Hive lives. The page only trusts messages from here. */
export const HIVE_ORIGIN = 'https://hive.flyingdoublemranch.com';
/** Hive's earlier address, still accepted while open copies catch up. */
export const HIVE_OLD_ORIGINS = ['https://fridge-board-7u23.netlify.app'];

/** Checks Hive passes. Matches HIVE_SIGNING_KEY in Hive's Netlify settings. */
export const HIVE_PUBLIC_KEY = 'MCowBQYDK2VwAyEAD+9fPYhGN9ftY8MGu8oQZdgfSMZL7coC6pZ812weWVE=';
