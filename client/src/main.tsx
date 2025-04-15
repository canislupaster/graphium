import "disposablestack/auto";

import { render } from "preact";
import { Graphics } from "./webgl";
import { Alert, AppTooltip, bgColor, borderColor, Button, Container, containerDefault, debounce, Divider, ErrorPage, IconButton, interactiveContainerDefault, Modal, Text, Theme, ThemeContext, ThemeSpinner, useAsyncEffect, useTheme } from "./ui";
import { useCallback, useEffect, useErrorBoundary, useMemo, useRef, useState } from "preact/hooks";
import { IconChevronLeft, IconGripVertical, IconX } from "@tabler/icons-preact";
import { BackendError, MainModule } from "../generated/backend";
import { Graph } from "./graph";
import { Backend, Handler, useSubscription } from "./backend";
import React from "preact/compat";

const themeKey = "theme";

function WASMGraph({backend}: {backend: Backend}) {
	const ref = useRef<HTMLDivElement>(null);
	const [graph, setGraph] = useState<Graph>();

	const [errors, setErrors] = useState<BackendError[]>([]);
	const [showErrors, setShowErrors] = useState(false);
	
	useSubscription(backend, {
		type: backend.mod.ToClient.BackendError,
		f({value}) {
			setErrors(errs=>showErrors ? [...errs, value] : [value]);
			setShowErrors(true);
		}
	}, [showErrors]);

	useEffect(()=>{
		const g = new Graph(ref.current!, backend);
		setGraph(g);
		console.log("graph initialized", g);
		
		return ()=>{
			g[Symbol.dispose]();
			setGraph(undefined);
		};
	}, [backend]);

	const minSideBarWidth = 300;
	const [collapsed, setCollapsed] = useState(false);

	const onGrip = useRef(false);
	const gripRef = useRef<HTMLDivElement>(null);
	const sideBarRef = useRef<HTMLDivElement>(null);

	const resize = useCallback((w: number) => {
		const noTransition = !collapsed && w>=minSideBarWidth;
		const classList = sideBarRef.current!.classList;

		if (noTransition) {
			classList.remove("transition-all");
			classList.add("transition-none");
		} else {
			classList.remove("transition-none");
			classList.add("transition-all");
		}

		if (w<minSideBarWidth) {
			sideBarRef.current!.style.width="0px";
			setCollapsed(true);
		} else {
			sideBarRef.current!.style.width=`${w}px`;
			setCollapsed(false);
		}

		localStorage.setItem("sidebarWidth", w.toString());
	}, [collapsed]);

	useEffect(()=>{
		const root = document.querySelector("html")!;

		if (sideBarRef.current!.style.width=="") {
			let defaultWidth = window.innerWidth*0.2;

			const it = localStorage.getItem("sidebarWidth");
			if (it) defaultWidth=Number.parseInt(it, 10);

			resize(defaultWidth);
		}

		const move = (ev: PointerEvent)=>{
			if (!onGrip.current) return;

			root.style.userSelect="none";
			const container = gripRef.current!.parentElement!;
			const grip = gripRef.current!;

			const w = container.getBoundingClientRect().left
				+ container.clientWidth - ev.clientX - grip.clientWidth/2;
			resize(w);
		};

		const up = ()=>{
			root.style.userSelect="auto";
			onGrip.current=false;
		};

		document.addEventListener("pointermove", move);
		document.addEventListener("pointerup", up);
		return ()=>{
			document.removeEventListener("pointermove", move);
			document.removeEventListener("pointerup", up);
		};
	}, [collapsed, resize]);

	useAsyncEffect(async ()=>{
		if (!graph) return;
		await graph.render();
	}, [graph]);

	return <div className="grid h-dvh grid-rows-[auto_auto] w-dvw grid-cols-[auto_auto_auto]" >
		<Modal bad open={showErrors} title={errors.length>1 ? `${errors.length} errors occurred`
			: errors.length==1 ? errors[0].message : "An error occurred"}
			onClose={()=>setShowErrors(false)} >

			{errors.length==1 ? <>
				<p>That's unfortunate.</p>
				<Text v="dim" >Details: {errors[0].extra}</Text>
			</> : errors.map((err,i)=><React.Fragment key={i} >
				<Text v="bold" >{err.message}</Text>
				{err.extra && <Text v="dim" >{err.extra}</Text>}
				{i<errors.length-1 && <Divider contrast />}
			</React.Fragment>)}
		</Modal>

		<div className={`py-2 px-4 ${bgColor.secondary} col-span-3 ${borderColor.default} border-b-1 flex flex-row gap-2 items-center`} >
			<img src={useTheme()=="dark" ? "/logolight.svg" : "/logodark.svg"} className="w-10" />
			<Text v="big" className="pt-1" >Graphium</Text>
		</div>
		<div ref={ref} className="overflow-hidden" />
		<AppTooltip content="Resize sidebar" placement="left" noClick ref={gripRef} >
			<div className={`${bgColor.secondary} ${bgColor.hover} ${borderColor.default}
					border-l-1
					flex flex-col items-center justify-center ${collapsed ? "cursor-pointer" : "cursor-ew-resize"}`}
				onPointerDown={()=>{
					if (collapsed) resize(minSideBarWidth+40);
					else onGrip.current=true;
				}} >
				{collapsed ? <IconChevronLeft /> : <IconGripVertical />}
			</div>
		</AppTooltip>
		<div className={`${bgColor.secondary} overflow-auto max-h-full duration-500`}
			ref={sideBarRef} >
			
			<div className="p-4" >
				<Text v="big" >sidebar</Text>
				<Text>{"a bc def".repeat(4000)}</Text>
			</div>
		</div>
	</div>;
}

const modPromise = (async ()=>{
	const mod = await import(/* @vite-ignore */ new URL("/wasm/backend.mjs", window.location.href).href) as typeof import("../generated/backend");
	return await mod.default();
})();

function WASMGraphLoader() {
	const [backend, setBackend] = useState<Backend|null>();

	useAsyncEffect(async ()=>{
		const b = new Backend(await modPromise);
		console.log("backend initialized", b);
		setBackend(b);

		return ()=>{
			console.log("de-initializing backend", b);
			b[Symbol.dispose]();
			setBackend(null);
		};
	}, []);

	return backend
		? <WASMGraph backend={backend} />
		: <div className="flex flex-col w-full items-center pt-[30dvh] gap-5 mx-5" >
			<ThemeSpinner size="lg" />
			<Text v="big" >Loading WebAssembly...</Text>
		</div>;
}

function App({theme}: {theme: Theme}) {
	const [newTheme, setTheme] = useState(theme);
	useEffect(()=>{
		if (theme!=newTheme) localStorage.setItem(themeKey, newTheme);
	}, [newTheme, theme]);
	const themeCtx = useMemo(()=>({ theme, setTheme }), [theme, setTheme]);

	const [err, resetError] = useErrorBoundary((err,info)=>{
		console.error(err,info);
	}) as [Error|undefined|null, ()=>void];

	return <ThemeContext.Provider value={themeCtx} ><Container>
		{err ? <ErrorPage error={err} retry={resetError} /> : <WASMGraphLoader />}
	</Container></ThemeContext.Provider>;
}

document.addEventListener("DOMContentLoaded", ()=>{
	const initialTheme = localStorage.getItem(themeKey) as Theme
		?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

	render(<App theme={initialTheme} />, document.body);
});