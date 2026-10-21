import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@env/environment';
import { PortalAccessCard } from './portal-access-card';

const url = `${environment.apiBaseUrl}/customers/c1/portal-access`;
const none = { hasAccount: false, userId: null, email: null, status: null, lastLoginAt: null };

describe('PortalAccessCard', () => {
  let http: HttpTestingController;

  function create(access: object = none) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()] });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PortalAccessCard);
    fixture.componentRef.setInput('customerId', 'c1');
    fixture.componentRef.setInput('customerEmail', 'shop@example.com');
    fixture.detectChanges();
    http.expectOne(url).flush({ success: true, data: access });
    fixture.detectChanges();
    return fixture;
  }

  it('offers to grant access when the customer has none', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('no portal sign-in yet');
    expect(fixture.nativeElement.textContent).toContain('Grant portal access');
  });

  it('creates the account with the typed e-mail and shows the temporary password once', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    c.editing.set(true);
    expect(c.form.value.email).toBe('shop@example.com');

    c.grant();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'shop@example.com' });
    req.flush({ success: true, data: { userId: 'u1', email: 'shop@example.com', temporaryPassword: 'Tmp-Pass-123', activationEmailSent: true } });
    http.expectOne(url).flush({ success: true, data: { hasAccount: true, userId: 'u1', email: 'shop@example.com', status: 'PENDING', lastLoginAt: null } });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tmp-Pass-123');
    expect(fixture.nativeElement.textContent).toContain('activation e-mail has been sent');
  });

  it('says so when the activation e-mail could not be sent', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    c.editing.set(true);
    c.grant();
    http.expectOne(url).flush({ success: true, data: { userId: 'u1', email: 'shop@example.com', temporaryPassword: 'x', activationEmailSent: false } });
    http.expectOne(url).flush({ success: true, data: none });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('could not');
  });

  it('shows the server message when the account cannot be created', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    c.editing.set(true);
    c.grant();
    http.expectOne(url).flush({ message: 'Portal access is available only for an active business customer of this company.' },
      { status: 422, statusText: 'Unprocessable' });
    expect(c.error()).toContain('active business customer');
    expect(c.saving()).toBe(false);
  });

  it('shows an existing account\'s status', () => {
    const fixture = create({ hasAccount: true, userId: 'u1', email: 'shop@example.com', status: 'PENDING', lastLoginAt: null });
    expect(fixture.nativeElement.textContent).toContain('Waiting for the customer to activate');
    expect(fixture.nativeElement.textContent).toContain('Disable access');
  });
});
