/**
 * dsh-workspace-groups — host half.
 *
 * The feature is entirely client-side (the sidebar browser lives in the web
 * client), so the host entry only logs its identity and keeps the Loader entry
 * valid. Everything the plugin needs is provided by the client bundle.
 */

export const name = 'workspace-groups'
export const inject = []

export function apply(ctx) {
  ctx.logger?.info?.('[dsh-workspace-groups] host half loaded')
}
