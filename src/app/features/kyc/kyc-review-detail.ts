import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbService } from '@core/services/breadcrumb.service';
import { NotificationService } from '@core/services/notification.service';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiLoader } from '@shared/components/ui-loader/ui-loader';
import { apiMessage } from '@features/communication/api-error';
import { KycChecklist } from './kyc-checklist';
import { KycService, openBlob } from './kyc.service';
import { KYC_TYPE_LABELS, KycSlot, KycSubjectType, KycView } from './kyc.models';

/** Company administrator: one user's, branch's or business customer's KYC, read-only, with document View/Download. */
@Component({
  selector: 'app-kyc-review-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiCard, UiLoader, KycChecklist],
  template: `
    <div class="page">
      <a class="back" routerLink="/kyc/review">← KYC Review</a>
      <app-card>
        @if (error()) {
          <p class="err" role="alert">{{ error() }}</p>
        } @else if (view(); as v) {
          <app-kyc-checklist [view]="v" [readOnly]="true" (open)="open($event.slot, $event.download)" />
        } @else {
          <app-loader [minHeight]="220" caption="Loading…" />
        }
      </app-card>
    </div>
  `,
  styles: [`.back { font:600 14px var(--font-sans); color:var(--brand-700); text-decoration:none; } .err { color:var(--danger); }`]
})
export class KycReviewDetail implements OnInit {
  readonly type = input.required<KycSubjectType>();
  readonly id = input.required<string>();
  private readonly kyc = inject(KycService);
  private readonly notify = inject(NotificationService);
  private readonly breadcrumb = inject(BreadcrumbService);
  readonly view = signal<KycView | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.kyc.subject(this.type(), this.id()).subscribe({
      next: (v) => {
        this.view.set(v);
        this.breadcrumb.set([{ label: 'Administration' }, { label: 'KYC Review', route: '/kyc/review' },
          { label: KYC_TYPE_LABELS[v.subjectType] }, { label: v.subjectName }]);
      },
      error: (e) => this.error.set(apiMessage(e, 'Could not load this KYC.'))
    });
  }

  open(slot: KycSlot, download: boolean): void {
    const u = slot.uploaded;
    if (!u) return;
    this.kyc.subjectFile(this.type(), this.id(), u.id).subscribe({
      next: (b) => openBlob(b, u.fileName, download),
      error: (e) => this.notify.error(apiMessage(e, 'Could not open the document.'))
    });
  }
}
