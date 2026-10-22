import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@env/environment';
import { KycService } from './kyc.service';
import { KycChecklist } from './kyc-checklist';
import { KycView } from './kyc.models';

const base = `${environment.apiBaseUrl}/kyc`;
const view = (over: Partial<KycView> = {}): KycView => ({
  subjectType: 'USER', subjectId: 'u1', subjectName: 'Asha', status: 'PENDING', email: 'a@b.in', emailVerified: true,
  mobile: '9876543210', mobileVerified: false, requiredUploaded: 1, requiredTotal: 3, completedAt: null,
  documents: [
    { code: 'ID_PROOF', label: 'Identity proof', hint: 'Aadhaar…', required: true,
      uploaded: { id: 'd1', fileName: 'id.pdf', contentType: 'application/pdf', sizeBytes: 2048, uploadedAt: new Date().toISOString() } },
    { code: 'PHOTO', label: 'Photograph', hint: 'Recent photo', required: true, uploaded: null }
  ], ...over
});

describe('KycService', () => {
  let http: HttpTestingController;
  let service: KycService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(KycService);
  });
  afterEach(() => http.verify());

  it('uses the scope in every own-KYC call and sends uploads as multipart', () => {
    service.view('branch').subscribe();
    http.expectOne(`${base}/branch`).flush({ success: true, data: view() });
    service.upload('me', 'PHOTO', new File([new Uint8Array([1])], 'p.png', { type: 'image/png' })).subscribe();
    const up = http.expectOne(`${base}/me/documents`);
    expect(up.request.method).toBe('POST');
    expect((up.request.body as FormData).get('documentType')).toBe('PHOTO');
    up.flush({ success: true, data: view() });
    service.verify('me', 'mobile', '123456').subscribe();
    const v = http.expectOne(`${base}/me/verify/mobile`);
    expect(v.request.body).toEqual({ code: '123456' });
    v.flush({ success: true, data: view() });
  });

  it('reads another subject only through the admin endpoints', () => {
    service.list('CUSTOMER').subscribe();
    http.expectOne((r) => r.url === `${base}/subjects` && r.params.get('type') === 'CUSTOMER').flush({ success: true, data: [] });
    service.subjectFile('BRANCH', 'b1', 'd1').subscribe();
    const f = http.expectOne(`${base}/subjects/BRANCH/b1/documents/d1/file`);
    expect(f.request.responseType).toBe('blob');
    f.flush(new Blob(['x']));
  });
});

describe('KycChecklist', () => {
  function create(readOnly = false) {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const f = TestBed.createComponent(KycChecklist);
    f.componentRef.setInput('view', view());
    f.componentRef.setInput('readOnly', readOnly);
    f.detectChanges();
    return f;
  }

  it('shows progress and each document; read-only has View/Download but no Upload', () => {
    const f = create(true);
    const text = f.nativeElement.textContent as string;
    expect(text).toContain('2 of 5 steps done');
    expect(text).toContain('id.pdf');
    expect(text).toContain('View');
    expect(f.nativeElement.querySelectorAll('input[type=file]').length).toBe(0);
    expect(text).not.toContain('Send code');
  });

  it('refuses a file of another type or over 5 MB without emitting', () => {
    const f = create();
    const c = f.componentInstance as unknown as { pick(s: unknown, e: Event): void };
    const emitted: unknown[] = [];
    f.componentInstance.upload.subscribe((e) => emitted.push(e));
    const slot = view().documents[1];
    c.pick(slot, { target: { files: [new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })], value: '' } } as unknown as Event);
    c.pick(slot, { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' })], value: '' } } as unknown as Event);
    expect(emitted).toEqual([]);
    c.pick(slot, { target: { files: [new File([new Uint8Array(10)], 'ok.pdf', { type: 'application/pdf' })], value: '' } } as unknown as Event);
    expect(emitted.length).toBe(1);
  });
});
