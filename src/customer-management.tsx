import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
	type ClassKitClient,
	type Customer,
	type CustomerMergeJsonValue,
	type CustomerMergeFieldResolutionsInput,
	type CustomerMergePreview,
	type CustomerMergeResolutionInput,
	type CustomerMergeSelection,
	type MergeCustomersResponse,
} from "@class-kit/react";
import { ArrowRight, Combine, Plus, RefreshCw, UserRoundCheck, UserRoundX, X } from "lucide-react";
import { CustomerMemberships } from "./customer-memberships";

type CustomerManagementProps = {
	client: ClassKitClient | null;
};

type CreateCustomerDraft = {
	displayName: string;
	contactEmail: string;
	phoneNumber: string;
	metadata: string;
};

type FieldDraft = {
	selection: CustomerMergeSelection;
	replacement: string;
};

type MergeResolutionDraft = {
	displayName: FieldDraft;
	contactEmail: FieldDraft;
	phoneNumber: FieldDraft;
	metadata: Record<string, FieldDraft>;
};

const emptyCreateDraft: CreateCustomerDraft = {
	displayName: "",
	contactEmail: "",
	phoneNumber: "",
	metadata: "{}",
};

export function CustomerManagement({ client }: CustomerManagementProps) {
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [showCreate, setShowCreate] = useState(false);
	const [showMerge, setShowMerge] = useState(false);

	const loadCustomers = useCallback(async () => {
		if (!client) return;
		setLoading(true);
		setError(null);
		try {
			const response = await client.management.customers.list({ limit: 100 });
			setCustomers(response.customers);
		} catch (caught) {
			setError(errorMessage(caught, "Could not load customers."));
		} finally {
			setLoading(false);
		}
	}, [client]);

	useEffect(() => {
		void loadCustomers();
	}, [loadCustomers]);

	const ghostCount = customers.filter((customer) => customer.identityStatus === "unlinked").length;
	const linkedCount = customers.length - ghostCount;

	return (
		<div className="customer-workspace">
			<section className="customer-workspace-head">
				<div>
					<p className="eyebrow">Customer operations</p>
					<h2>Customers receive services. Users receive access.</h2>
					<p>Create people who do not use the app, then merge their history into the matching linked customer after signup.</p>
				</div>
				<div className="customer-workspace-actions">
					<button className="mini-action" type="button" onClick={() => void loadCustomers()} disabled={loading}>
						<RefreshCw aria-hidden="true" /> Refresh
					</button>
					<button className="mini-action" type="button" onClick={() => setShowMerge(true)} disabled={ghostCount === 0 || linkedCount === 0}>
						<Combine aria-hidden="true" /> Merge customers
					</button>
					<button className="mini-action save" type="button" onClick={() => setShowCreate(true)}>
						<Plus aria-hidden="true" /> Create customer
					</button>
				</div>
			</section>

			<div className="customer-summary-grid">
				<CustomerMetric label="Total customers" value={customers.length} />
				<CustomerMetric label="Unlinked / manager-owned" value={ghostCount} />
				<CustomerMetric label="Linked to an identity" value={linkedCount} />
			</div>

			{message ? <p className="dashboard-success">{message}</p> : null}
			{error ? <p className="dashboard-error">{error}</p> : null}
			{loading ? <p className="dashboard-muted">Loading customers…</p> : null}
			{!loading && customers.length === 0 ? <p className="dashboard-muted">No customers exist for this product yet.</p> : null}

			{!loading && customers.length > 0 ? (
				<div className="customer-table-wrap">
					<table className="customer-table">
						<thead>
							<tr>
								<th>Customer</th>
								<th>Identity</th>
								<th>Contact</th>
								<th>Status</th>
								<th>Customer ID</th>
							</tr>
						</thead>
						<tbody>
							{customers.map((customer) => (
								<tr key={customer.customerId}>
									<td><strong>{customerLabel(customer)}</strong><small>{customerOriginLabel(customer.customerOrigin)}</small></td>
									<td><IdentityBadge customer={customer} /></td>
									<td><span>{customer.contactEmail ?? customer.phoneNumber ?? "—"}</span></td>
									<td><span className={`customer-status ${customer.status}`}>{customer.status}</span></td>
									<td><code title={customer.customerId}>{shortId(customer.customerId)}</code></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}

			<CustomerMemberships client={client} customers={customers} />

			{showCreate ? (
				<CreateCustomerDialog
					client={client}
					onClose={() => setShowCreate(false)}
					onCreated={async (customer) => {
						setShowCreate(false);
						setMessage(`Created ${customer.displayName} as an unlinked customer.`);
						await loadCustomers();
					}}
				/>
			) : null}

			{showMerge ? (
				<MergeCustomersDialog
					client={client}
					customers={customers}
					onClose={() => setShowMerge(false)}
					onMerged={async (result) => {
						setShowMerge(false);
						setMessage(`Merged the ghost history into ${result.customer.displayName}. Merge ${shortId(result.merge.mergeId)} completed.`);
						await loadCustomers();
					}}
				/>
			) : null}
		</div>
	);
}

function CustomerMetric({ label, value }: { label: string; value: number }) {
	return <div className="customer-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function IdentityBadge({ customer }: { customer: Customer }) {
	return customer.identityStatus === "linked" ? (
		<span className="customer-identity linked"><UserRoundCheck aria-hidden="true" /> Linked</span>
	) : (
		<span className="customer-identity ghost"><UserRoundX aria-hidden="true" /> Unlinked</span>
	);
}

function customerLabel(customer: Customer) {
	return customer.displayName?.trim() || customer.contactEmail || customer.phoneNumber || `Customer ${shortId(customer.customerId)}`;
}

function customerOriginLabel(origin: Customer["customerOrigin"]) {
	if (origin === "manager_created") return "Manager-created";
	if (origin === "identity_provisioned") return "Created at signup";
	return "Legacy customer";
}

function CreateCustomerDialog({
	client,
	onClose,
	onCreated,
}: {
	client: ClassKitClient | null;
	onClose: () => void;
	onCreated: (customer: Customer) => Promise<void>;
}) {
	const [draft, setDraft] = useState<CreateCustomerDraft>(emptyCreateDraft);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function createCustomer() {
		if (!client || !draft.displayName.trim()) return;
		setSaving(true);
		setError(null);
		try {
			const metadata = parseMetadataObject(draft.metadata);
			const response = await client.management.customers.create({
				displayName: draft.displayName.trim(),
				contactEmail: nullableText(draft.contactEmail),
				phoneNumber: nullableText(draft.phoneNumber),
				metadata,
			});
			await onCreated(response.customer);
		} catch (caught) {
			setError(errorMessage(caught, "Could not create the customer."));
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog title="Create an unlinked customer" subtitle="This person can receive memberships, registrations, attendance, and progress without an Auth identity." onClose={onClose}>
			<div className="dashboard-form-grid two-column">
				<Field label="Display name" value={draft.displayName} onChange={(displayName) => setDraft((current) => ({ ...current, displayName }))} required autoFocus />
				<Field label="Contact email (optional)" type="email" value={draft.contactEmail} onChange={(contactEmail) => setDraft((current) => ({ ...current, contactEmail }))} />
				<Field label="Phone number (optional)" type="tel" value={draft.phoneNumber} onChange={(phoneNumber) => setDraft((current) => ({ ...current, phoneNumber }))} />
				<label className="dashboard-field customer-field-wide">
					<span>Manager metadata (JSON object)</span>
					<textarea rows={5} value={draft.metadata} onChange={(event) => setDraft((current) => ({ ...current, metadata: event.target.value }))} disabled={saving} />
				</label>
			</div>
			{error ? <p className="dashboard-error">{error}</p> : null}
			<div className="dashboard-modal-actions">
				<button className="mini-action" type="button" onClick={onClose} disabled={saving}>Cancel</button>
				<button className="mini-action save" type="button" onClick={() => void createCustomer()} disabled={!client || saving || !draft.displayName.trim()}>
					<Plus aria-hidden="true" /> {saving ? "Creating…" : "Create customer"}
				</button>
			</div>
		</Dialog>
	);
}

function MergeCustomersDialog({
	client,
	customers,
	onClose,
	onMerged,
}: {
	client: ClassKitClient | null;
	customers: Customer[];
	onClose: () => void;
	onMerged: (result: MergeCustomersResponse) => Promise<void>;
}) {
	const ghosts = useMemo(() => customers.filter((customer) => customer.identityStatus === "unlinked" && customer.status === "active"), [customers]);
	const linked = useMemo(() => customers.filter((customer) => customer.identityStatus === "linked" && customer.status === "active"), [customers]);
	const [sourceCustomerId, setSourceCustomerId] = useState(ghosts[0]?.customerId ?? "");
	const [survivorCustomerId, setSurvivorCustomerId] = useState(linked[0]?.customerId ?? "");
	const [preview, setPreview] = useState<CustomerMergePreview | null>(null);
	const [resolutions, setResolutions] = useState<MergeResolutionDraft | null>(null);
	const [idempotencyKey, setIdempotencyKey] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function previewMerge() {
		if (!client || !sourceCustomerId || !survivorCustomerId) return;
		setLoading(true);
		setError(null);
		try {
			const response = await client.management.customers.previewMerge({ sourceCustomerId, survivorCustomerId });
			setPreview(response.mergePreview);
			setResolutions(createResolutionDraft(response.mergePreview));
			setIdempotencyKey(crypto.randomUUID());
		} catch (caught) {
			setError(errorMessage(caught, "Could not preview this merge."));
		} finally {
			setLoading(false);
		}
	}

	async function mergeCustomers() {
		if (!client || !preview || !resolutions || !idempotencyKey) return;
		setLoading(true);
		setError(null);
		try {
			const response = await client.management.customers.merge({
				sourceCustomerId: preview.source.customerId,
				survivorCustomerId: preview.survivor.customerId,
				previewToken: preview.previewToken,
				idempotencyKey,
				fieldResolutions: buildFieldResolutions(resolutions),
			});
			await onMerged(response);
		} catch (caught) {
			setError(errorMessage(caught, "Could not merge these customers. Refresh the preview before retrying if their data changed."));
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog title="Merge a ghost customer into a linked customer" subtitle="The linked customer survives. The ghost record and its service history are consolidated into it." onClose={onClose} wide>
			{!preview || !resolutions ? (
				<>
					<div className="customer-merge-picker">
						<CustomerSelect label="Ghost source" customers={ghosts} value={sourceCustomerId} onChange={setSourceCustomerId} />
						<ArrowRight aria-hidden="true" />
						<CustomerSelect label="Linked survivor" customers={linked} value={survivorCustomerId} onChange={setSurvivorCustomerId} />
					</div>
					<p className="customer-warning">Only an active unlinked customer can be merged into an active customer with a real Supabase identity.</p>
					{error ? <p className="dashboard-error">{error}</p> : null}
					<div className="dashboard-modal-actions">
						<button className="mini-action" type="button" onClick={onClose} disabled={loading}>Cancel</button>
						<button className="mini-action save" type="button" onClick={() => void previewMerge()} disabled={loading || !sourceCustomerId || !survivorCustomerId}>
							<Combine aria-hidden="true" /> {loading ? "Preparing preview…" : "Preview merge"}
						</button>
					</div>
				</>
			) : (
				<>
					<MergePreviewSummary preview={preview} />
					<MergeResolutionEditor preview={preview} resolutions={resolutions} onChange={setResolutions} />
					<p className="customer-warning critical"><strong>This cannot be undone.</strong> The ghost customer will stop being an active customer after its history is consolidated.</p>
					{error ? <p className="dashboard-error">{error}</p> : null}
					<div className="dashboard-modal-actions">
						<button className="mini-action" type="button" onClick={() => { setPreview(null); setResolutions(null); setIdempotencyKey(""); setError(null); }} disabled={loading}>Change customers</button>
						<button className="mini-action save" type="button" onClick={() => void mergeCustomers()} disabled={loading}>
							<Combine aria-hidden="true" /> {loading ? "Merging…" : "Confirm irreversible merge"}
						</button>
					</div>
				</>
			)}
		</Dialog>
	);
}

function CustomerSelect({ label, customers, value, onChange }: { label: string; customers: Customer[]; value: string; onChange: (value: string) => void }) {
	return (
		<label className="dashboard-field">
			<span>{label}</span>
			<select value={value} onChange={(event) => onChange(event.target.value)}>
				{customers.map((customer) => <option key={customer.customerId} value={customer.customerId}>{customer.displayName} · {shortId(customer.customerId)}</option>)}
			</select>
		</label>
	);
}

function MergePreviewSummary({ preview }: { preview: CustomerMergePreview }) {
	const membership = preview.membershipResolution;
	return (
		<div className="customer-merge-preview">
			<div className="customer-merge-parties">
				<CustomerParty title="Ghost source" customer={preview.source} />
				<ArrowRight aria-hidden="true" />
				<CustomerParty title="Linked survivor" customer={preview.survivor} />
			</div>
			<section className="customer-impact-grid">
				<CustomerImpact label="Membership grants moved" value={preview.movementCounts.membershipGrants} />
				<CustomerImpact label="Ledger entries moved" value={preview.movementCounts.membershipLedger} />
				<CustomerImpact label="Registrations moved" value={preview.registrations.movedCount} detail={`${preview.registrations.collisionCount} collisions resolved`} />
				<CustomerImpact label="Attendance records moved" value={preview.participants.movedCount} detail={`${preview.participants.collisionCount} collisions resolved`} />
			</section>
			<section className="customer-membership-resolution">
				<div>
					<strong>Membership resolution</strong>
					<span>{formatMembershipResolution(membership.resolution)}</span>
				</div>
				<div className="customer-membership-grants">
					<MembershipGrant label="Ghost membership" grant={membership.sourceGrant} />
					<MembershipGrant label="Linked membership" grant={membership.survivorGrant} />
				</div>
				{membership.sourceGrant && membership.survivorGrant ? (
					<p>The linked customer’s membership wins. The ghost membership remains recoverable from the merge details and ledger history.</p>
				) : null}
			</section>
			<small>Preview expires {new Date(preview.expiresAt).toLocaleString()}.</small>
		</div>
	);
}

function CustomerParty({ title, customer }: { title: string; customer: Customer }) {
	return <div><span>{title}</span><strong>{customer.displayName}</strong><small>{customer.contactEmail ?? customer.phoneNumber ?? shortId(customer.customerId)}</small></div>;
}

function CustomerImpact({ label, value, detail }: { label: string; value: number; detail?: string }) {
	return <div><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</div>;
}

function MembershipGrant({ label, grant }: { label: string; grant: CustomerMergePreview["membershipResolution"]["sourceGrant"] }) {
	return (
		<div>
			<span>{label}</span>
			{grant ? <><strong>{grant.membershipType.name}</strong><small>{grant.mode} · {formatStock(grant.remainingStock, grant.totalStock)}</small></> : <strong>None</strong>}
		</div>
	);
}

function MergeResolutionEditor({
	preview,
	resolutions,
	onChange,
}: {
	preview: CustomerMergePreview;
	resolutions: MergeResolutionDraft;
	onChange: (value: MergeResolutionDraft) => void;
}) {
	const comparisons = preview.fieldComparisons;
	return (
		<section className="customer-resolution-editor">
			<div>
				<h3>Choose the surviving customer details</h3>
				<p>Membership ownership is automatic. Profile and conflicting metadata remain an explicit manager decision.</p>
			</div>
			<ResolutionField label="Display name" source={comparisons.displayName.sourceValue} survivor={comparisons.displayName.survivorValue} allowed={comparisons.displayName.allowedSelections} draft={resolutions.displayName} onChange={(displayName) => onChange({ ...resolutions, displayName })} />
			<ResolutionField label="Contact email" source={comparisons.contactEmail.sourceValue} survivor={comparisons.contactEmail.survivorValue} allowed={comparisons.contactEmail.allowedSelections} draft={resolutions.contactEmail} onChange={(contactEmail) => onChange({ ...resolutions, contactEmail })} />
			<ResolutionField label="Phone number" source={comparisons.phoneNumber.sourceValue} survivor={comparisons.phoneNumber.survivorValue} allowed={comparisons.phoneNumber.allowedSelections} draft={resolutions.phoneNumber} onChange={(phoneNumber) => onChange({ ...resolutions, phoneNumber })} />
			{comparisons.metadata.conflicts.map((conflict) => (
				<ResolutionField
					key={conflict.key}
					label={`Metadata: ${conflict.key}`}
					source={conflict.source.present ? JSON.stringify(conflict.source.value) : "Not set"}
					survivor={conflict.survivor.present ? JSON.stringify(conflict.survivor.value) : "Not set"}
					allowed={conflict.allowedSelections}
					draft={resolutions.metadata[conflict.key]}
					onChange={(draft) => onChange({ ...resolutions, metadata: { ...resolutions.metadata, [conflict.key]: draft } })}
					jsonReplacement
				/>
			))}
			{comparisons.metadata.conflicts.length === 0 ? <p className="dashboard-muted">No metadata conflicts require a decision.</p> : null}
		</section>
	);
}

function ResolutionField({
	label,
	source,
	survivor,
	allowed,
	draft,
	onChange,
	jsonReplacement = false,
}: {
	label: string;
	source: string | null;
	survivor: string | null;
	allowed: CustomerMergeSelection[];
	draft: FieldDraft;
	onChange: (draft: FieldDraft) => void;
	jsonReplacement?: boolean;
}) {
	return (
		<div className="customer-resolution-row">
			<div><strong>{label}</strong><small>Ghost: {source ?? "Not set"}</small><small>Linked: {survivor ?? "Not set"}</small></div>
			<label className="dashboard-field">
				<span>Keep</span>
				<select value={draft.selection} onChange={(event) => onChange({ ...draft, selection: event.target.value as CustomerMergeSelection })}>
					{allowed.includes("survivor") ? <option value="survivor">Linked value</option> : null}
					{allowed.includes("source") ? <option value="source">Ghost value</option> : null}
					{allowed.includes("replacement") ? <option value="replacement">New replacement</option> : null}
				</select>
			</label>
			{draft.selection === "replacement" ? (
				<label className="dashboard-field">
					<span>{jsonReplacement ? "Replacement JSON value" : "Replacement value"}</span>
					<input value={draft.replacement} onChange={(event) => onChange({ ...draft, replacement: event.target.value })} />
				</label>
			) : null}
		</div>
	);
}

function Dialog({ title, subtitle, onClose, wide = false, children }: { title: string; subtitle: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
	return (
		<div className="dashboard-modal-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
			<section className={`dashboard-modal customer-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="customer-dialog-title">
				<div className="dashboard-modal-head">
					<div><h3 id="customer-dialog-title">{title}</h3><p>{subtitle}</p></div>
					<button type="button" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button>
				</div>
				{children}
			</section>
		</div>
	);
}

function Field({ label, value, onChange, type = "text", required = false, autoFocus = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; autoFocus?: boolean }) {
	return <label className="dashboard-field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} autoFocus={autoFocus} /></label>;
}

function createResolutionDraft(preview: CustomerMergePreview): MergeResolutionDraft {
	const field = (allowed: CustomerMergeSelection[]): FieldDraft => ({
		selection: allowed.includes("survivor") ? "survivor" : (allowed[0] ?? "source"),
		replacement: "",
	});
	return {
		displayName: field(preview.fieldComparisons.displayName.allowedSelections),
		contactEmail: field(preview.fieldComparisons.contactEmail.allowedSelections),
		phoneNumber: field(preview.fieldComparisons.phoneNumber.allowedSelections),
		metadata: Object.fromEntries(preview.fieldComparisons.metadata.conflicts.map((conflict) => [conflict.key, field(conflict.allowedSelections)])),
	};
}

function buildFieldResolutions(draft: MergeResolutionDraft): CustomerMergeFieldResolutionsInput {
	const scalar = (field: FieldDraft, nullable: boolean): CustomerMergeResolutionInput<string | null> => {
		if (field.selection !== "replacement") return { selection: field.selection };
		const value = field.replacement.trim();
		if (!nullable && !value) throw new Error("Display name replacement cannot be empty.");
		return { selection: "replacement", value: nullable ? nullableText(value) : value };
	};
	const metadata: Record<string, CustomerMergeResolutionInput<CustomerMergeJsonValue>> = Object.fromEntries(Object.entries(draft.metadata).map(([key, field]) => {
		if (field.selection !== "replacement") return [key, { selection: field.selection }];
		return [key, { selection: "replacement", value: JSON.parse(field.replacement) as CustomerMergeJsonValue }];
	}));
	return {
		displayName: scalar(draft.displayName, false),
		contactEmail: scalar(draft.contactEmail, true),
		phoneNumber: scalar(draft.phoneNumber, true),
		metadata: { conflicts: metadata },
	};
}

function parseMetadataObject(value: string): Record<string, unknown> {
	const parsed = JSON.parse(value || "{}");
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Metadata must be a JSON object.");
	return parsed as Record<string, unknown>;
}

function nullableText(value: string) {
	return value.trim() || null;
}

function shortId(value: string) {
	return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function formatStock(remaining: number | null, total: number | null) {
	if (total === null) return "Unlimited stock";
	return `${remaining ?? 0} of ${total} remaining`;
}

function formatMembershipResolution(value: CustomerMergePreview["membershipResolution"]["resolution"]) {
	return value.split("_").map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`).join(" ");
}

function errorMessage(error: unknown, fallback: string) {
	if (error instanceof SyntaxError) return "Enter valid JSON before continuing.";
	return error instanceof Error ? error.message : fallback;
}
