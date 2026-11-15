import type { ManagementRegistrationSummary } from "@class-kit/react";

export function registration(id: string, createdAt: string, startsAt: string): ManagementRegistrationSummary {
	return { id, classId: `slot-${id}`, customerId: `customer-${id}`, userId: null,
		status: "pending", registrationStatus: "pending", createdAt, updatedAt: createdAt,
		membershipGrantId: null, stockConsumed: 0, approvedAt: null, cancelledAt: null,
		cancelledByUserId: null, initiatedByUserId: null, approvedByUserId: null, registrationOrigin: "self",
		customer: { id: `customer-${id}`, userId: null, status: "active", displayName: "Dana", contactEmail: "dana@example.com", phoneNumber: "0501234567" },
		user: null, class: { id: `slot-${id}`, name: "Business website", startsAt, temporalStatus: "upcoming", registrationOpen: true } };
}
