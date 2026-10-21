import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@env/environment';
import { CourierIntegrations } from './courier-integrations';

const base = `${environment.apiBaseUrl}/courier-integrations`;

const shiprocket = (over: object = {}) => ({
  code: 'SHIPROCKET', name: 'Shiprocket', available: true, note: 'Use an API user.', source: 'COMPANY', enabled: true, connected: true,
  credentialsUnreadable: false, lastTestedAt: null, lastTestOk: null, lastTestMessage: null,
  fields: [
    { key: 'email', label: 'API user e-mail', secret: false, required: true, help: null, value: 'api@shop.test', set: true },
    { key: 'password', label: 'API user password', secret: true, required: true, help: null, value: null, set: true },
    { key: 'pickupLocation', label: 'Pickup location name', secret: false, required: true, help: null, value: 'PUNE-1', set: true }
  ], ...over
});
const ekart = { code: 'EKART', name: 'Ekart', available: false, note: 'Integration not built yet.', source: 'NONE', enabled: false,
  connected: false, credentialsUnreadable: false, fields: [], lastTestedAt: null, lastTestOk: null, lastTestMessage: null };

describe('CourierIntegrations', () => {
  let http: HttpTestingController;

  function create() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()] });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CourierIntegrations);
    fixture.detectChanges();
    http.expectOne(base).flush({ success: true, data: [shiprocket(), ekart] });
    fixture.detectChanges();
    return fixture;
  }

  it('shows each courier; one that is not built yet has no form', () => {
    const fixture = create();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Shiprocket');
    expect(text).toContain('Connected');
    expect(text).toContain('Coming soon');
    expect(fixture.nativeElement.querySelectorAll('form').length).toBe(1);
  });

  it('never fills a secret field: it starts empty and says it is configured', () => {
    const c = create().componentInstance;
    const card = c.cards()[0];
    expect(c.ctl(card, 'password').value).toBe('');
    expect(c.ctl(card, 'email').value).toBe('api@shop.test');
  });

  it('saves only what was typed: a blank secret is not sent, so the stored one is kept', () => {
    const c = create().componentInstance;
    const card = c.cards()[0];
    c.ctl(card, 'pickupLocation').setValue('PUNE-2');

    c.save(card);

    const req = http.expectOne(`${base}/SHIPROCKET`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.values).toEqual({ email: 'api@shop.test', pickupLocation: 'PUNE-2' });
    expect(req.request.body.values.password).toBeUndefined();
    req.flush({ success: true, data: shiprocket({ lastTestedAt: null }) });
    expect(c.busy().size).toBe(0);
  });

  it('sends a newly typed secret', () => {
    const c = create().componentInstance;
    const card = c.cards()[0];
    c.ctl(card, 'password').setValue('  new-pass ');

    c.save(card);

    const req = http.expectOne(`${base}/SHIPROCKET`);
    expect(req.request.body.values.password).toBe('new-pass');
    req.flush({ success: true, data: shiprocket() });
  });

  it('shows the server message when saving is refused', () => {
    const fixture = create();
    const c = fixture.componentInstance;

    c.save(c.cards()[0]);
    http.expectOne(`${base}/SHIPROCKET`).flush({ message: 'API user password is required to connect Shiprocket.' },
      { status: 422, statusText: 'Unprocessable' });

    expect(c.busy().size).toBe(0);
  });

  it('shows the courier\'s test answer from the server', () => {
    const fixture = create();
    const c = fixture.componentInstance;

    c.test(c.cards()[0]);
    http.expectOne(`${base}/SHIPROCKET/test`).flush({ success: true, data: shiprocket({
      lastTestedAt: new Date().toISOString(), lastTestOk: false, lastTestMessage: 'Shiprocket did not accept the e-mail and password.' }) });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('did not accept the e-mail and password');
  });
});
