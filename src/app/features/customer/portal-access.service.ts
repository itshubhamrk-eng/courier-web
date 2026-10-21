import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { API } from '@core/config/api-endpoints';

/** Whether a business customer has a customer-portal sign-in, and its state. */
export interface PortalAccess {
  hasAccount: boolean;
  userId: string | null;
  email: string | null;
  /** PENDING until the activation link is used, then ACTIVE; DISABLED after access is switched off. */
  status: 'PENDING' | 'ACTIVE' | 'DISABLED' | string | null;
  lastLoginAt: string | null;
}

export interface GrantPortalAccessRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
}

/** `temporaryPassword` is returned once and never again. */
export interface PortalAccessGranted {
  userId: string;
  email: string;
  temporaryPassword: string;
  activationEmailSent: boolean;
}

/** /api/v1/customers/{id}/portal-access (COMPANY_ADMIN). */
@Injectable({ providedIn: 'root' })
export class PortalAccessService {
  private readonly api = inject(ApiService);

  private url(customerId: string): string {
    return `${API.customers}/${encodeURIComponent(customerId)}/portal-access`;
  }

  get(customerId: string) { return this.api.get<PortalAccess>(this.url(customerId)); }
  grant(customerId: string, body: GrantPortalAccessRequest) { return this.api.post<PortalAccessGranted>(this.url(customerId), body); }
  revoke(customerId: string) { return this.api.delete<PortalAccess>(this.url(customerId)); }
}
