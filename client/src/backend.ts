import { useEffect } from "preact/hooks";
import {MainModule, ToClient} from "../generated/backend";

export type Handler = { [T in ToClient["type"]]: {
	type: T, f: (x: ToClient&{type: T})=>void
} }[ToClient["type"]];

export class Backend extends DisposableStack {
	// takes ownership of module
	constructor(public mod: MainModule) {
		super();
		mod._init();

		(mod as unknown as {
			jsHandleMessage: (msg: number)=>void
		}).jsHandleMessage = (msg)=>this.handler(msg);

		this.defer(()=>{
			console.log("destroying backend...");
			mod._deinit();
		});
	}
	
	subscriptions = new Map<ToClient["type"], Set<(x: unknown)=>void>>();
	subscribe(handler: Handler) {
		const cur = this.subscriptions.get(handler.type) ?? new Set();
		const casted = handler.f as (x: unknown)=>void;
		cur.add(casted);
		this.subscriptions.set(handler.type, cur);
		return { [Symbol.dispose]: ()=>cur.delete(casted) };
	}

	handler(ptr: number) {
		if (ptr==0) console.error("uninitialized message");
		const msg = this.mod.ToClient.deserialize({ current: ptr });
		console.debug("received", msg);
		this.subscriptions.get(msg.type)?.forEach((x)=>x(msg));
	}
	
	send(msg: ConstructorParameters<typeof this.mod.ToBackend>[0]) {
		const to = new this.mod.ToBackend(msg);
		console.debug("sending", to);
		const size = to.serialization_size();
		const ptr = this.mod._malloc(size);
		to.serialize({ current: ptr });
		this.mod._handle_message(ptr);
	}
}

export function useSubscription(backend: Backend, handler: Handler, deps?: unknown[]) {
	useEffect(()=>{
		const sub = backend.subscribe(handler);
		return ()=>{ sub[Symbol.dispose](); }
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [backend, handler, ...(deps ?? [])]);
}
