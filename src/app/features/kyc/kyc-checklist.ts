import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { KycChannel, KycSlot, KycView } from './kyc.models';

const TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const KYC_MAX_BYTES = 5 * 1024 * 1024;

/**
 * One KYC checklist: progress, e-mail and mobile verification, and one row per document. Used for the signed-in
 * user's own KYC, their branch's, and (read-only) the company administrator's review. All actions are emitted; the
 * page calls the API.
 */
@Component({
  selector: 'app-kyc-checklist',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, FormsModule, MatIconModule, UiButton],
  template: `
    @let v = view();
    <section class="kyc">
      <header class="kyc__head">
        <div>
          <h2>{{ v.subjectName }}</h2>
          <p class="muted">{{ v.status === 'COMPLETE' ? 'KYC complete' : 'Upload the documents below and verify your e-mail and mobile.' }}</p>
        </div>
        <span class="badge" [class.badge--ok]="v.status === 'COMPLETE'" [class.badge--warn]="v.status !== 'COMPLETE'">
          <mat-icon>{{ v.status === 'COMPLETE' ? 'verified' : 'pending' }}</mat-icon>{{ v.status === 'COMPLETE' ? 'Complete' : 'Pending' }}
        </span>
      </header>

      <div class="progress" role="progressbar" [attr.aria-valuenow]="done()" [attr.aria-valuemax]="total()">
        <span [style.width.%]="total() ? (done() / total()) * 100 : 0"></span>
      </div>
      <p class="muted small">{{ done() }} of {{ total() }} steps done</p>

      <h3>Contact verification</h3>
      <div class="rows">
        @for (c of channels; track c.key) {
          <div class="row">
            <mat-icon class="row__icon" [class.ok]="verified(c.key)">{{ verified(c.key) ? 'check_circle' : c.icon }}</mat-icon>
            <div class="row__main">
              <strong>{{ c.label }}</strong>
              <span class="muted">{{ (c.key === 'email' ? v.email : v.mobile) || 'Not on record' }}</span>
            </div>
            @if (verified(c.key)) {
              <span class="badge badge--ok">Verified</span>
            } @else if (!readOnly()) {
              @if (codeSent()[c.key]) {
                <input class="code" inputmode="numeric" maxlength="6" placeholder="6-digit code" [attr.aria-label]="c.label + ' code'"
                       [ngModel]="codes()[c.key]" (ngModelChange)="setCode(c.key, $event)" />
                <app-button [loading]="busy() === c.key + ':verify'" [disabled]="(codes()[c.key] || '').length !== 6"
                            (pressed)="verify.emit({ channel: c.key, code: codes()[c.key] })">Verify</app-button>
                <app-button variant="text" [loading]="busy() === c.key + ':send'" (pressed)="sendCode(c.key)">Resend</app-button>
              } @else {
                <app-button variant="stroked" icon="send" [loading]="busy() === c.key + ':send'"
                            [disabled]="!(c.key === 'email' ? v.email : v.mobile)" (pressed)="sendCode(c.key)">Send code</app-button>
              }
            } @else {
              <span class="badge">Not verified</span>
            }
          </div>
        }
      </div>

      <h3>Documents</h3>
      <div class="rows">
        @for (d of v.documents; track d.code) {
          <div class="row">
            <mat-icon class="row__icon" [class.ok]="!!d.uploaded">{{ d.uploaded ? 'task' : 'upload_file' }}</mat-icon>
            <div class="row__main">
              <strong>{{ d.label }} @if (!d.required) { <em class="muted">(optional)</em> }</strong>
              @if (d.uploaded; as u) {
                <span class="muted">{{ u.fileName }} · {{ u.sizeBytes / 1024 | number: '1.0-0' }} KB · {{ u.uploadedAt | date: 'medium' }}</span>
              } @else {
                <span class="muted">{{ d.hint }}</span>
              }
            </div>
            <div class="row__actions">
              @if (d.uploaded; as u) {
                <app-button variant="stroked" icon="visibility" (pressed)="open.emit({ slot: d, download: false })">View</app-button>
                <app-button variant="text" icon="download" (pressed)="open.emit({ slot: d, download: true })">Download</app-button>
              }
              @if (!readOnly()) {
                <app-button [variant]="d.uploaded ? 'text' : 'primary'" icon="upload" [loading]="busy() === d.code"
                            (pressed)="picker.click()">{{ d.uploaded ? 'Replace' : 'Upload' }}</app-button>
                @if (d.uploaded; as u) { <app-button variant="text" (pressed)="remove.emit(u.id)">Remove</app-button> }
                <input #picker type="file" hidden accept="application/pdf,image/jpeg,image/png" (change)="pick(d, $event)"
                       [attr.aria-label]="'Choose ' + d.label" />
              }
            </div>
          </div>
        }
      </div>
      @if (fileError()) { <p class="err" role="alert">{{ fileError() }}</p> }
      <p class="muted small">PDF, JPEG or PNG, up to 5 MB each.</p>
    </section>
  `,
  styles: [`
    .kyc { display:flex; flex-direction:column; gap:10px; }
    .kyc__head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .kyc__head h2 { margin:0; font:700 20px var(--font-display); }
    h3 { margin:14px 0 2px; font:700 13px var(--font-sans); letter-spacing:.08em; text-transform:uppercase; color:var(--content-muted); }
    .muted { color:var(--content-muted); } .small { font-size:12px; margin:0; }
    .badge { display:inline-flex; align-items:center; gap:6px; padding:3px 12px; border-radius:999px; font:700 12px var(--font-sans);
      background:var(--neutral-bg); color:var(--neutral); white-space:nowrap; }
    .badge mat-icon { font-size:16px; width:16px; height:16px; }
    .badge--ok { background:var(--success-bg); color:var(--success); }
    .badge--warn { background:var(--warning-bg); color:var(--warning); }
    .progress { height:8px; border-radius:999px; background:var(--surface-muted); overflow:hidden; }
    .progress span { display:block; height:100%; background:var(--occpl-gradient-button, var(--brand-600)); transition:width .3s; }
    .rows { display:flex; flex-direction:column; border:1px solid var(--surface-border); border-radius:var(--r-card); overflow:hidden; }
    .row { display:flex; align-items:center; gap:14px; padding:12px 16px; border-top:1px solid var(--surface-border); flex-wrap:wrap; }
    .row:first-child { border-top:0; }
    .row__icon { color:var(--content-muted); } .row__icon.ok { color:var(--success); }
    .row__main { flex:1; min-width:12rem; display:flex; flex-direction:column; gap:2px; font-size:14px; }
    .row__main em { font-style:normal; font-weight:500; }
    .row__actions { display:flex; gap:6px; flex-wrap:wrap; }
    .code { width:9rem; height:42px; padding:0 12px; border:1px solid var(--surface-border); border-radius:var(--r-field);
      font:700 16px var(--font-sans); letter-spacing:.2em; background:var(--surface); color:var(--content-fg); }
    .err { color:var(--danger); font:500 13px var(--font-sans); margin:0; }
  `]
})
export class KycChecklist {
  readonly view = input.required<KycView>();
  readonly readOnly = input(false);
  /** Which action is in flight: a document code, or "email:send" / "mobile:verify" etc. */
  readonly busy = input<string | null>(null);

  readonly upload = output<{ slot: KycSlot; file: File }>();
  readonly remove = output<string>();
  readonly send = output<KycChannel>();
  readonly verify = output<{ channel: KycChannel; code: string }>();
  readonly open = output<{ slot: KycSlot; download: boolean }>();

  protected readonly channels: { key: KycChannel; label: string; icon: string }[] = [
    { key: 'email', label: 'E-mail address', icon: 'mail' },
    { key: 'mobile', label: 'Mobile number', icon: 'smartphone' }
  ];
  protected readonly codeSent = signal<Record<string, boolean>>({});
  protected readonly codes = signal<Record<string, string>>({});
  protected readonly fileError = signal<string | null>(null);

  protected done(): number {
    const v = this.view();
    return v.requiredUploaded + (v.emailVerified ? 1 : 0) + (v.mobileVerified ? 1 : 0);
  }
  protected total(): number { return this.view().requiredTotal + 2; }
  protected verified(c: KycChannel): boolean { return c === 'email' ? this.view().emailVerified : this.view().mobileVerified; }

  protected setCode(c: KycChannel, value: string): void {
    this.codes.update((m) => ({ ...m, [c]: String(value ?? '').replace(/\D/g, '').slice(0, 6) }));
  }

  protected sendCode(c: KycChannel): void {
    this.codeSent.update((m) => ({ ...m, [c]: true }));
    this.send.emit(c);
  }

  protected pick(slot: KycSlot, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) { this.fileError.set('Upload a PDF, JPEG or PNG file.'); return; }
    if (file.size > KYC_MAX_BYTES) { this.fileError.set('The file is larger than 5 MB. Upload a smaller scan or photo.'); return; }
    this.fileError.set(null);
    this.upload.emit({ slot, file });
  }
}
