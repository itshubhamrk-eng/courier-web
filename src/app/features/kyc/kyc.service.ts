import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/services/api.service';
import { API } from '@core/config/api-endpoints';
import { KycChannel, KycScope, KycSubjectType, KycSummary, KycView } from './kyc.models';

/** KYC API: own / branch KYC for the signed-in user, read-only review for the company administrator. */
@Injectable({ providedIn: 'root' })
export class KycService {
  private readonly api = inject(ApiService);

  view(scope: KycScope): Observable<KycView> { return this.api.get<KycView>(`${API.kyc}/${scope}`); }
  upload(scope: KycScope, documentType: string, file: File): Observable<KycView> {
    const body = new FormData();
    body.append('documentType', documentType);
    body.append('file', file);
    return this.api.post<KycView>(`${API.kyc}/${scope}/documents`, body);
  }
  remove(scope: KycScope, documentId: string): Observable<KycView> {
    return this.api.delete<KycView>(`${API.kyc}/${scope}/documents/${encodeURIComponent(documentId)}`);
  }
  file(scope: KycScope, documentId: string): Observable<Blob> {
    return this.api.getBlob(`${API.kyc}/${scope}/documents/${encodeURIComponent(documentId)}/file`);
  }
  sendCode(scope: KycScope, channel: KycChannel): Observable<KycView> {
    return this.api.post<KycView>(`${API.kyc}/${scope}/verify/${channel}/send`, {});
  }
  verify(scope: KycScope, channel: KycChannel, code: string): Observable<KycView> {
    return this.api.post<KycView>(`${API.kyc}/${scope}/verify/${channel}`, { code });
  }

  // ---- company administrator
  list(type: KycSubjectType): Observable<KycSummary[]> { return this.api.get<KycSummary[]>(`${API.kyc}/subjects`, { type }); }
  subject(type: KycSubjectType, id: string): Observable<KycView> {
    return this.api.get<KycView>(`${API.kyc}/subjects/${type}/${encodeURIComponent(id)}`);
  }
  approve(type: KycSubjectType, id: string, documentId: string): Observable<KycView> {
    return this.api.post<KycView>(`${API.kyc}/subjects/${type}/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/approve`, {});
  }
  reject(type: KycSubjectType, id: string, documentId: string, reason: string): Observable<KycView> {
    return this.api.post<KycView>(`${API.kyc}/subjects/${type}/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/reject`, { reason });
  }
  subjectFile(type: KycSubjectType, id: string, documentId: string): Observable<Blob> {
    return this.api.getBlob(`${API.kyc}/subjects/${type}/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/file`);
  }
}

/** Opens a downloaded document in a new tab (PDFs and images display; the object URL is released later). */
export function openBlob(blob: Blob, fileName: string, download = false): void {
  const url = URL.createObjectURL(blob);
  if (download) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  } else {
    window.open(url, '_blank', 'noopener');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
