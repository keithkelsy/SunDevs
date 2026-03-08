/**
 * Event source — tracks where the event originated.
 * Useful for debugging and auditing: was this triggered by
 * an API call, a background worker, or a UI action?
 */
export enum TimelineEventSource {
  API = 'api',
  WORKER = 'worker',
  UI = 'ui',
}
