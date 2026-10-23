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
  mobile: '9876543210', mobileVerified: false, requiredUploaded: 1, requiredApproved: 0, requiredTotal: 3, completedAt: null,
  documents: [
    { code: 'ID_PROOF', label: 'Identity proof', hint: 'Aadhaar…', required: true,
      uploaded: { id: 'd1', fileName: 'id.pdf', contentType: 'application/pdf', sizeBytes: 2048, uploadedAt: new Date().toISOString(),
        reviewStatus: 'PENDING_REVIEW', reviewNote: null, reviewedAt: null } },
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

  it('approves and rejects a document through the admin endpoints, sending the reason', () => {
    service.approve('USER', 'u1', 'd1').subscribe();
    const a = http.expectOne(`${base}/subjects/USER/u1/documents/d1/approve`);
    expect(a.request.method).toBe('POST');
    a.flush({ success: true, data: view() });
    service.reject('CUSTOMER', 'c1', 'd2', 'Blurred').subscribe();
    const r = http.expectOne(`${base}/subjects/CUSTOMER/c1/documents/d2/reject`);
    expect(r.request.body).toEqual({ reason: 'Blurred' });
    r.flush({ success: true, data: view() });
  });
});

describe('KycChecklist', () => {
  function create(readOnly = false, reviewable = false, v = view()) {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const f = TestBed.createComponent(KycChecklist);
    f.componentRef.setInput('view', v);
    f.componentRef.setInput('readOnly', readOnly);
    f.componentRef.setInput('reviewable', reviewable);
    f.detectChanges();
    return f;
  }

  it('shows progress and each document; read-only has View/Download but no Upload', () => {
    const f = create(true);
    const text = f.nativeElement.textContent as string;
    expect(text).toContain('2 of 8 steps done');
    expect(text).toContain('id.pdf');
    expect(text).toContain('View');
    expect(f.nativeElement.querySelectorAll('input[type=file]').length).toBe(0);
    expect(text).not.toContain('Send code');
    expect(text).toContain('Waiting for review');
    expect(text).not.toContain('Approve');
  });

  it('gives the reviewer Approve and Reject, and shows the uploader why a document was rejected', () => {
    const f = create(true, true);
    const buttons = Array.from(f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).map((b) => b.textContent?.trim());
    expect(buttons.some((b) => b?.includes('Approve'))).toBe(true);
    expect(buttons.some((b) => b?.includes('Reject'))).toBe(true);
    TestBed.resetTestingModule();
    const rejected = view();
    rejected.documents[0].uploaded = { ...rejected.documents[0].uploaded!, reviewStatus: 'REJECTED', reviewNote: 'Name not readable' };
    const g = create(false, false, rejected);
    const text = g.nativeElement.textContent as string;
    expect(text).toContain('Rejected');
    expect(text).toContain('Name not readable');
    expect(text).toContain('upload a new file');
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
