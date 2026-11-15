import { expect, it } from "vitest";
import { transition } from "./machine";
import { registration } from "./fixtures";


it("resolves access before loading manager requests and discards old data on access changes", () => {
	for (const access of ["signed_out", "not_manager", "manager"] as const) {
		expect(transition({ step: "loading" }, { type: "access_resolved", access })).toEqual({ step: access === "manager" ? "loading" : access, busy: false, error: null });
	}
});

it("keeps requests in place until a successful decision is followed by refreshed lists", () => {
	const pending = [registration("r", "2026-11-01", "2026-11-17")];
	const ready = transition({ step:"loading" }, { type:"lists_loaded", pending, upcoming:[], history:[] });
	const saving = transition(ready, { type:"decision_started", id:"r" });
	expect(saving).toMatchObject({ step:"ready", pending, busy:true, decidingId:"r" });
	expect(transition(saving, { type:"decision_started", id:"r" })).toBe(saving);
	expect(transition(ready, { type:"decision_started", id:"missing" })).toBe(ready);
	const refreshing = transition(saving, { type:"decision_succeeded" });
	expect(refreshing).toMatchObject({ step:"ready", pending, busy:true });
	expect(transition(refreshing, { type:"lists_loaded", pending:[], upcoming:pending, history:[] })).toMatchObject({ step:"ready", pending:[], upcoming:pending, busy:false });
});

it("keeps a failed decision row and message, but routes read failures to the appropriate access state", () => {
	const pending = [registration("r", "2026-11-01", "2026-11-17")];
	const ready = transition({step:"loading"}, {type:"lists_loaded",pending,upcoming:[],history:[]});
	for (const [code, step] of [["forbidden","not_manager"],["unauthorized","signed_out"],["network","failed"]] as const) {
		const error = {code,message:"Backend message"};
		expect(transition(transition(ready,{type:"decision_started",id:"r"}),{type:"decision_failed",error})).toMatchObject({step:"ready",pending,busy:false,error});
		expect(transition({step:"loading"},{type:"load_failed",error})).toMatchObject({step,error,busy:false});
	}
	expect(transition({step:"failed",error:{code:"network",message:null}}, {type:"retry_requested"})).toEqual({step:"loading"});
});

it("ignores list and decision events outside their active states", () => {
	for (const step of ["signed_out","not_manager","failed"] as const) {
		const state = {step};
		for (const event of [{type:"lists_loaded",pending:[],upcoming:[],history:[]},{type:"decision_started",id:"r"},{type:"decision_failed",error:{code:"network",message:null}},{type:"decision_succeeded"}] as const) {
			expect(transition(state,event)).toBe(state);
		}
	}
});

it("locks authentication and sign-out until their result arrives, preserving errors", () => {
	const signedOut = {step:"signed_out" as const};
	const busy = transition(signedOut, {type:"auth_started"});
	expect(busy).toMatchObject({step:"signed_out",busy:true});
	expect(transition(busy,{type:"auth_started"})).toBe(busy);
	expect(transition(busy,{type:"auth_finished"})).toMatchObject({step:"signed_out",busy:false});
	expect(transition(busy,{type:"auth_failed",error:{code:"auth",message:"Wrong password"}})).toMatchObject({step:"signed_out",busy:false,error:{message:"Wrong password"}});
});

it("retains decision history through pending actions and replaces it only on a successful read", () => {
 const pending = [registration("pending", "2026-11-01", "2099-11-17")];
 const cancelled = { ...pending[0], id:"cancelled", status:"rejected" as const, registrationStatus:"cancelled" as const };
 const ready = transition({step:"loading"}, {type:"lists_loaded",pending,upcoming:[],history:[cancelled]});
 expect(ready).toMatchObject({step:"ready",history:[cancelled]});
 const saving = transition(ready,{type:"decision_started",id:"pending"});
 expect(saving).toMatchObject({history:[cancelled]});
 expect(transition(saving,{type:"decision_failed",error:{code:"network",message:null}})).toMatchObject({history:[cancelled]});
 expect(transition(saving,{type:"lists_loaded",pending:[],upcoming:[],history:[]})).toMatchObject({history:[],busy:false});
 expect(transition(ready,{type:"decision_started",id:"cancelled"})).toBe(ready);
 expect(transition(ready,{type:"access_resolved",access:"signed_out"})).toEqual({step:"signed_out",busy:false,error:null});
});
