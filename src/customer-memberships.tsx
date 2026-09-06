import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClassKitClient, ClassTemplate, Customer, MembershipMode, MembershipType } from "@class-kit/react";
import { RefreshCw, Save, TicketCheck } from "lucide-react";

export function CustomerMemberships({ client, customers }: { client: ClassKitClient | null; customers: Customer[] }) {
	const [types, setTypes] = useState<MembershipType[]>([]);
	const [templates, setTemplates] = useState<ClassTemplate[]>([]);
	const [name, setName] = useState("");
	const [mode, setMode] = useState<MembershipMode>("infinite");
	const [templateId, setTemplateId] = useState("");
	const [defaultStock, setDefaultStock] = useState("10");
	const [selectedTypeId, setSelectedTypeId] = useState("");
	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [bindingTemplateId, setBindingTemplateId] = useState("");
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const activeTypes = useMemo(() => types.filter((type) => type.status === "active"), [types]);
	const activeCustomers = useMemo(() => customers.filter((customer) => customer.status === "active"), [customers]);

	const load = useCallback(async () => {
		if (!client) return;
		setError(null);
		try {
			const [typeData, templateData] = await Promise.all([
				client.management.memberships.listTypes(),
				client.management.templates.list(),
			]);
			setTypes(typeData.membership_types);
			setTemplates(templateData.templates);
			setSelectedTypeId((current) => current || typeData.membership_types.find((type) => type.status === "active")?.id || "");
			setSelectedCustomerId((current) => current || activeCustomers[0]?.customerId || "");
		} catch (caught) {
			setError(errorMessage(caught, "Could not load memberships."));
		}
	}, [activeCustomers, client]);

	useEffect(() => {
		void load();
	}, [load]);

	const selectedType = types.find((type) => type.id === selectedTypeId) ?? null;

	useEffect(() => {
		setBindingTemplateId(selectedType?.template_id ?? "");
	}, [selectedType]);

	async function createType() {
		if (!client || !name.trim()) return;
		setSaving(true);
		setError(null);
		setMessage(null);
		try {
			const response = await client.management.memberships.createType({
				name: name.trim(),
				mode,
				templateId: templateId || null,
				defaultStock: mode === "stock" ? Number(defaultStock) : null,
			});
			setName("");
			setSelectedTypeId(response.membership_type.id);
			setMessage(`Created ${response.membership_type.name}.`);
			await load();
		} catch (caught) {
			setError(errorMessage(caught, "Could not create the membership type."));
		} finally {
			setSaving(false);
		}
	}

	async function updateBinding() {
		if (!client || !selectedType) return;
		setSaving(true);
		setError(null);
		setMessage(null);
		try {
			const response = await client.management.memberships.updateType({
				membershipTypeId: selectedType.id,
				templateId: bindingTemplateId || null,
			});
			setMessage(`${response.membership_type.name} is now ${response.membership_type.template_id ? "template-restricted" : "product-wide"}.`);
			await load();
		} catch (caught) {
			setError(errorMessage(caught, "Could not update the membership binding."));
		} finally {
			setSaving(false);
		}
	}

	async function grantMembership() {
		if (!client || !selectedType || !selectedCustomerId) return;
		setSaving(true);
		setError(null);
		setMessage(null);
		try {
			await client.management.memberships.grantToCustomer({
				customerId: selectedCustomerId,
				membershipTypeId: selectedType.id,
				totalStock: selectedType.mode === "stock" ? selectedType.default_stock : null,
			});
			const customer = activeCustomers.find((item) => item.customerId === selectedCustomerId);
			setMessage(`Granted ${selectedType.name} to ${customerLabel(customer)}.`);
		} catch (caught) {
			setError(errorMessage(caught, "Could not grant this membership."));
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="customer-service-lab">
			<div className="customer-workspace-head">
				<div>
					<p className="eyebrow"><TicketCheck aria-hidden="true" /> Membership eligibility</p>
					<h3>Create, bind, and grant memberships</h3>
					<p>A blank template is product-wide. A selected template restricts eligibility to matching classes.</p>
				</div>
				<button className="mini-action" type="button" onClick={() => void load()} disabled={saving}>
					<RefreshCw aria-hidden="true" /> Refresh
				</button>
			</div>

			<div className="customer-service-grid">
				<div className="customer-service-card">
					<h4>Create membership type</h4>
					<label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
					<label><span>Mode</span><select value={mode} onChange={(event) => setMode(event.target.value as MembershipMode)}><option value="infinite">Infinite</option><option value="stock">Stock</option></select></label>
					{mode === "stock" ? <label><span>Default stock</span><input type="number" min="1" value={defaultStock} onChange={(event) => setDefaultStock(event.target.value)} /></label> : null}
					<TemplateSelect label="Eligible template" value={templateId} templates={templates} onChange={setTemplateId} />
					<button className="mini-action save" type="button" onClick={() => void createType()} disabled={saving || !name.trim()}><Save aria-hidden="true" /> Create type</button>
				</div>

				<div className="customer-service-card">
					<h4>Bind or grant existing type</h4>
					<label><span>Membership type</span><select value={selectedTypeId} onChange={(event) => setSelectedTypeId(event.target.value)}><option value="">Choose type</option>{activeTypes.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label>
					<TemplateSelect label="Eligible template" value={bindingTemplateId} templates={templates} onChange={setBindingTemplateId} />
					<button className="mini-action" type="button" onClick={() => void updateBinding()} disabled={saving || !selectedType}><Save aria-hidden="true" /> Save binding</button>
					<label><span>Customer</span><select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}><option value="">Choose customer</option>{activeCustomers.map((customer) => <option value={customer.customerId} key={customer.customerId}>{customerLabel(customer)}</option>)}</select></label>
					<button className="mini-action save" type="button" onClick={() => void grantMembership()} disabled={saving || !selectedType || !selectedCustomerId}><TicketCheck aria-hidden="true" /> Grant membership</button>
				</div>
			</div>

			{message ? <p className="dashboard-success">{message}</p> : null}
			{error ? <p className="dashboard-error">{error}</p> : null}
			{activeTypes.length > 0 ? (
				<div className="customer-membership-list">
					{activeTypes.map((type) => <span key={type.id}><strong>{type.name}</strong> · {type.template_id ? templates.find((template) => template.id === type.template_id)?.name ?? type.template_id : "All templates"}</span>)}
				</div>
			) : null}
		</section>
	);
}

function TemplateSelect({ label, value, templates, onChange }: { label: string; value: string; templates: ClassTemplate[]; onChange: (value: string) => void }) {
	return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">All templates</option>{templates.filter((template) => template.status === "active").map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}</select></label>;
}

function customerLabel(customer: Customer | undefined) {
	return customer?.displayName?.trim() || customer?.contactEmail || customer?.phoneNumber || (customer ? `Customer ${customer.customerId.slice(0, 8)}` : "customer");
}

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}
