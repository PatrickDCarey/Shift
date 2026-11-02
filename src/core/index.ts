/**
 * src/core public barrel: shared types plus every lane's published functions
 * (CoreApi in contracts/lanes.ts). Scenes, UI, FX, audio and net import the
 * core only through this file or `./types`. Owner: tech-lead.
 */
export * from './types';
export * from './sim';
export * from './motion';
export * from './level';
