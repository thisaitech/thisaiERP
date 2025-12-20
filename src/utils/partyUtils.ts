
import { Party } from '../types';

export const getPartyName = (party: Party | null | undefined): string => {
  if (!party) {
    return 'Unknown';
  }
  return party.name || party.displayName || party.companyName || party.customerName || party.partyName || party.fullName || party.businessName || 'Unknown';
};
