export type KycSubjectType = 'USER' | 'BRANCH' | 'CUSTOMER';
export type KycStatus = 'PENDING' | 'UNDER_REVIEW' | 'COMPLETE';
export type KycReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type KycChannel = 'email' | 'mobile';
/** `me` = the signed-in user's own KYC, `branch` = their branch's (branch managers). */
export type KycScope = 'me' | 'branch';

export interface KycUploaded {
  id: string; fileName: string; contentType: string; sizeBytes: number; uploadedAt: string;
  reviewStatus: KycReviewStatus; reviewNote: string | null; reviewedAt: string | null;
}
export interface KycSlot { code: string; label: string; hint: string; required: boolean; uploaded: KycUploaded | null; }

export interface KycView {
  subjectType: KycSubjectType;
  subjectId: string;
  subjectName: string;
  status: KycStatus;
  email: string | null;
  emailVerified: boolean;
  mobile: string | null;
  mobileVerified: boolean;
  requiredUploaded: number;
  requiredApproved: number;
  requiredTotal: number;
  documents: KycSlot[];
  completedAt: string | null;
}

export interface KycSummary {
  subjectType: KycSubjectType;
  subjectId: string;
  subjectName: string;
  status: KycStatus;
  emailVerified: boolean;
  mobileVerified: boolean;
  requiredUploaded: number;
  requiredApproved: number;
  requiredTotal: number;
  awaitingReview: number;
  updatedAt: string;
  completedAt: string | null;
}

export const KYC_TYPE_LABELS: Record<KycSubjectType, string> = { USER: 'Users', BRANCH: 'Branches', CUSTOMER: 'Business customers' };

export const KYC_STATUS_LABELS: Record<KycStatus, string> = { PENDING: 'Pending', UNDER_REVIEW: 'Under review', COMPLETE: 'Complete' };
export const REVIEW_LABELS: Record<KycReviewStatus, string> = { PENDING_REVIEW: 'Waiting for review', APPROVED: 'Approved', REJECTED: 'Rejected' };
