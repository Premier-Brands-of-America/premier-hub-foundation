/**
 * Art Request routing — pure logic mapping a chosen customer to the owning
 * creative manager (who becomes project lead) and computing email recipients.
 *
 * Rules (from the brief, §1.4):
 *  1. Single-owner customer  → that manager auto-becomes lead.
 *  2. Multi-owner customer   → requester must pick; chosen manager becomes lead.
 *  3. Art Lead is CC'd by default on every request, EXCEPT when the assigned
 *     manager IS the Art Lead (no duplicate CC).
 */
import {
  type ManagerId,
  MANAGERS,
  ownersFor,
  resolveManagerEmail,
  resolveArtLeadEmail,
} from "@/config/artOwnership";

export interface RouteResult {
  /** Owning manager(s) for the customer. */
  owners: ManagerId[];
  /** True when the customer has >1 owner and the requester must choose. */
  requiresManagerSelection: boolean;
  /** The resolved project lead, or null if selection is still required. */
  lead: ManagerId | null;
  /** True when the customer is not present in the ownership matrix. */
  unknownCustomer: boolean;
}

/**
 * Resolve routing for a request.
 * @param customer       chosen customer/brand display name
 * @param selectedManager optional manager id chosen by the requester (used for
 *                        multi-owner customers)
 */
export function routeRequest(
  customer: string,
  selectedManager?: ManagerId | null,
): RouteResult {
  const owners = ownersFor(customer);
  const unknownCustomer = owners.length === 0;
  const requiresManagerSelection = owners.length > 1;

  let lead: ManagerId | null = null;
  if (owners.length === 1) {
    lead = owners[0];
  } else if (requiresManagerSelection && selectedManager) {
    // Only honor a selection that is actually a valid owner of this customer.
    lead = owners.includes(selectedManager) ? selectedManager : null;
  }

  return { owners, requiresManagerSelection, lead, unknownCustomer };
}

export interface Recipients {
  /** Primary recipient — the assigned manager / project lead. */
  to: string[];
  /** CC — the Art Lead, unless the lead already is the Art Lead. */
  cc: string[];
}

/**
 * Pure recipient computation — CC the Art Lead by default, unless the lead's
 * inbox IS the Art Lead's (no duplicate CC). Exported for direct unit testing.
 */
export function computeRecipients(
  leadEmail: string,
  artLeadEmail: string,
): Recipients {
  const sameInbox =
    leadEmail.trim().toLowerCase() === artLeadEmail.trim().toLowerCase();
  return {
    to: [leadEmail],
    cc: sameInbox ? [] : [artLeadEmail],
  };
}

/**
 * Compute email recipients for a routed request using the configured
 * manager + Art-Lead identities.
 */
export function resolveRecipients(lead: ManagerId): Recipients {
  return computeRecipients(resolveManagerEmail(lead), resolveArtLeadEmail());
}

/** Human-readable manager name for UI. */
export function managerName(id: ManagerId): string {
  return MANAGERS[id].name;
}
