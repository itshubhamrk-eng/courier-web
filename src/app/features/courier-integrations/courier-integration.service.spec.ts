import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@env/environment';
import { CourierIntegrationService } from './courier-integration.service';

describe('CourierIntegrationService', () => {
  const base = `${environment.apiBaseUrl}/courier-integrations`;
  let service: CourierIntegrationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CourierIntegrationService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CourierIntegrationService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists with GET', () => {
    service.list().subscribe();
    const r = http.expectOne(base);
    expect(r.request.method).toBe('GET');
    r.flush({ success: true, data: [] });
  });

  it('saves with PUT to the courier code, sending only the typed values', () => {
    service.save('SHIPROCKET', { enabled: true, values: { email: 'a@b.test' } }).subscribe();
    const r = http.expectOne(`${base}/SHIPROCKET`);
    expect(r.request.method).toBe('PUT');
    expect(r.request.body).toEqual({ enabled: true, values: { email: 'a@b.test' } });
    r.flush({ success: true, data: {} });
  });

  it('tests with POST and disconnects with DELETE', () => {
    service.test('DELHIVERY').subscribe();
    const t = http.expectOne(`${base}/DELHIVERY/test`);
    expect(t.request.method).toBe('POST');
    t.flush({ success: true, data: {} });
    service.disconnect('DELHIVERY').subscribe();
    const d = http.expectOne(`${base}/DELHIVERY`);
    expect(d.request.method).toBe('DELETE');
    d.flush({ success: true, data: {} });
  });
});
