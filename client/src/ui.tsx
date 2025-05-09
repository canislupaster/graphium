import { ComponentChildren, JSX, ComponentProps, createContext, ComponentChild, createElement, Ref } from "preact";
import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import { IconChevronDown, IconChevronUp, IconInfoCircleFilled, IconInfoTriangleFilled, IconLoader2, IconX } from "@tabler/icons-preact";
import { twMerge } from "tailwind-merge";
import { ArrowContainer, Popover, PopoverState } from "react-tiny-popover";
import { forwardRef } from "preact/compat";

export const textColor = {
	contrast: "dark:text-white text-black",
	sky: "dark:text-sky-400 text-sky-700",
	green: "dark:text-green-500 text-green-700",
	red: "dark:text-red-500 text-red-700",
	default: "dark:text-zinc-100 text-zinc-800 dark:disabled:text-gray-400 disabled:text-gray-500",
	link: "text-gray-700 dark:text-gray-200 underline-offset-2 transition-all hover:text-black dark:hover:text-gray-50 hover:bg-cyan-800/5 dark:hover:bg-cyan-100/5 cursor-pointer underline decoration-dashed decoration-1",
	blueLink: "dark:text-blue-200 text-sky-800",
	star: "dark:text-amber-400 text-amber-600",
	gray: "dark:text-gray-200 text-gray-700"
};

export const bgColor = {
	default: "dark:bg-zinc-800 bg-zinc-200 dark:disabled:bg-zinc-600",
	md: "dark:bg-zinc-850 bg-zinc-150 dark:disabled:bg-zinc-600",
	hover: "dark:hover:bg-zinc-700 hover:bg-zinc-150",
	secondary: "dark:bg-zinc-900 bg-zinc-150",
	green: "dark:enabled:bg-green-600 enabled:bg-green-400",
	sky: "dark:enabled:bg-sky-600 enabled:bg-sky-300",
	red: "dark:enabled:bg-red-800 enabled:bg-red-300",
	rose: "dark:enabled:bg-rose-900 enabled:bg-rose-300",
	highlight: "dark:bg-amber-600 bg-amber-200",
	restriction: "dark:bg-amber-900 bg-amber-100",
	divider: "dark:bg-zinc-500 bg-zinc-400",
	contrast: "dark:bg-white bg-black"
}

export const borderColor = {
	default: "border-zinc-300 dark:border-zinc-600 disabled:bg-zinc-300 aria-expanded:border-blue-500 data-[selected=true]:border-blue-500 outline-none",
	red: "border-red-400 dark:border-red-600",
	defaultInteractive: "focus:outline-none border-zinc-300 hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500 disabled:bg-zinc-300 aria-expanded:border-blue-500 focus:border-blue-500 active:border-blue-500 dark:focus:border-blue-500 dark:active:border-blue-500 data-[selected=true]:border-blue-500 outline-none",
};

export const containerDefault = `${textColor.default} ${bgColor.default} ${borderColor.default} rounded-md border-1`;
export const invalidInputStyle = `dark:invalid:bg-rose-900 invalid:bg-rose-400 dark:invalid:border-red-500 invalid:border-red-700`;
export const interactiveContainerDefault = `${textColor.default} ${bgColor.default} ${borderColor.defaultInteractive} ${invalidInputStyle} border-1`;


export type InputProps = {icon?: ComponentChildren, className?: string}&JSX.InputHTMLAttributes<HTMLInputElement>;
export function Input({className, icon, ...props}: InputProps) {
	return <div className={twMerge("relative", className)} >
		<input type="text" className={`w-full p-2 border-2 transition duration-300 rounded-lg ${icon ? "pl-11" : ""} ${interactiveContainerDefault}`} {...props} />
		{icon && <div className="absolute left-0 my-auto pl-3 top-0 bottom-0 flex flex-row items-center" >
			{icon}
		</div>}
	</div>;
}

export function HiddenInput({className, ...props}: JSX.InputHTMLAttributes<HTMLInputElement>&{className?: string}) {
	return <input className={twMerge(`bg-transparent border-0 outline-none border-b-2
		focus:outline-none focus:border-blue-500 transition duration-300 px-1 py-px`, borderColor.default, className)}
		{...props} />;
}

export function Textarea({className, children, ...props}: JSX.IntrinsicElements["textarea"]&{className?: string}) {
	return <textarea className={twMerge(interactiveContainerDefault, `w-full p-2 border-2 transition duration-300 rounded-lg resize-y max-h-60 min-h-24`, className)}
		rows={6} tabIndex={100} {...props} >
		{children}
	</textarea>
}

export type ButtonProps = JSX.HTMLAttributes<HTMLButtonElement>&{
	icon?: ComponentChildren, disabled?: boolean, className?: string
};

export function Button({className, disabled, icon, ...props}: ButtonProps) {
	return <button disabled={disabled} className={twMerge("flex flex-row justify-center gap-1.5 px-4 py-1.5 items-center rounded-xl group", interactiveContainerDefault, icon ? "pl-3" : "", className)} {...props} >
		{icon}
		{props.children}
	</button>;
}

export const IconButton = ({className, icon, disabled, ...props}: {icon?: ComponentChildren, disabled?: boolean, className?: string}&JSX.IntrinsicElements["button"]) =>
	<button className={twMerge("rounded-full p-2 flex items-center justify-center", interactiveContainerDefault, className)} disabled={disabled} {...props} >
		{icon}
	</button>;

export function Anchor({className,children,...props}: JSX.AnchorHTMLAttributes<HTMLAnchorElement>) {
	const classN = twMerge(
	`text-gray-600 dark:text-gray-300 inline-flex flex-row align-baseline items-baseline gap-1 underline decoration-dashed decoration-1
		underline-offset-2 transition-all hover:text-black dark:hover:text-gray-50 hover:bg-cyan-100/5 cursor-pointer`,
		className as string
	);

	return <a className={classN} {...props} >{children}</a>;
}

export const LinkButton = ({className, icon, ...props}:
	JSX.AnchorHTMLAttributes<HTMLAnchorElement>&{icon?: ComponentChildren, className?: string}
) =>
	<a className={twMerge('flex flex-row gap-2 px-3 py-1.5 items-center rounded-xl text-sm',interactiveContainerDefault,className)} rel="noopener noreferrer" {...props} >
		{icon &&
			<span className="inline-block h-4 w-auto" >{icon}</span> }
		{props.children}
	</a>;

export const ThemeSpinner = ({className,size}: {className?: string, size?: "sm"|"md"|"lg"}) =>
	<IconLoader2 size={{sm: 24, md: 36, lg: 72}[size ?? "md"]}
		className={twMerge(`animate-spin stroke-${{sm: 1, md: 2, lg: 3}[size ?? "md"]
			} dark:stroke-white stroke-blue-600`, className)} />;

export const Loading = (props: ComponentProps<typeof ThemeSpinner>) =>
	<div className="h-full w-full flex item-center justify-center py-16 px-20" >
		<ThemeSpinner size="lg" {...props} />
	</div>;

export const chipColors = {
	red: "dark:bg-red-600 dark:border-red-400 bg-red-400 border-red-200",
	green: "dark:bg-green-600 dark:border-green-400 bg-green-400 border-green-200",
	blue: "dark:border-cyan-400 dark:bg-sky-600 border-cyan-200 bg-sky-400",
	gray: "dark:border-gray-300 dark:bg-gray-600 border-gray-100 bg-gray-300",
	purple: "dark:bg-purple-600 dark:border-purple-300 bg-purple-400 border-purple-300",
	teal: "dark:bg-[#64919b] dark:border-[#67cce0] bg-[#aedbe8] border-[#95e6fc]",
};

export const chipColorKeys = Object.keys(chipColors) as (keyof typeof chipColors)[];

export const Chip = ({className, color, ...props}: JSX.HTMLAttributes<HTMLSpanElement>&{
	color?: keyof typeof chipColors, className?: string
}) =>
	<span className={twMerge("inline-block text-xs px-2 py-1 rounded-lg border-solid border whitespace-nowrap", chipColors[color ?? "gray"], className)}
		{...props} >{props.children}</span>;

export function capitalize(s: string) {
	const noCap = ["of", "a", "an", "the", "in"];
	return s.split(/\s+/g).filter(x=>x.length>0).map((x,i)=>{
		if (i>0 && noCap.includes(x)) return x;
		return `${x[0].toUpperCase()}${x.slice(1)}`;
	}).join(" ");
}

export const Alert = ({title, txt, bad, className}: {
	title?: ComponentChildren, txt: ComponentChildren,
	bad?: boolean, className?: string
}) =>
	<div className={twMerge(`border ${bad ? `${bgColor.red} ${borderColor.red}` : `${bgColor.default} ${borderColor.default}`} p-2 px-4 rounded-md flex flex-row gap-2`, className)} >
		<div className={`flex-shrink-0 ${title ? "mt-1" : ""}`} >
			{bad ? <IconInfoTriangleFilled /> : <IconInfoCircleFilled />}
		</div>
		<div>
			{title && <h2 className="font-bold font-display text-lg" >{title}</h2>}
			<div>{txt}</div>
		</div>
	</div>;

export const Divider = ({className, contrast}: {className?: string, contrast?: boolean}) =>
	<span className={twMerge(`w-full h-px shrink-0 ${
			contrast ? "dark:bg-zinc-400 bg-zinc-500" : "dark:bg-zinc-600 bg-zinc-300"
		} my-2`, className)} />;

export const Card = ({className, children, ...props}:
	JSX.HTMLAttributes<HTMLDivElement>&{className?: string}
) =>
	<div className={twMerge(`flex flex-col gap-1 rounded-md p-2 border-1
		dark:border-zinc-600 shadow-md dark:shadow-black shadow-white/20 border-zinc-300`,
		bgColor.md, className)} {...props} >
		{children}
	</div>;

export function MoreButton({children, className, act: hide, down}: {
	act: ()=>void, children?: ComponentChildren, className?: string, down?: boolean
}) {
	return <div className={twMerge("flex flex-col w-full items-center", className)} >
		<button onClick={hide} className={`flex flex-col items-center cursor-pointer transition ${down ? "hover:translate-y-1" : "hover:-translate-y-1"}`} >
			{down ? <>{children}<IconChevronDown /></>
				: <><IconChevronUp />{children}</>}
		</button>
	</div>
}

export const fadeGradient = {
	default: "from-transparent dark:to-neutral-950 to-zinc-100",
	primary: "from-transparent dark:to-zinc-800 to-zinc-200",
	secondary: "from-transparent dark:to-zinc-900 to-zinc-150"
};

// export function ShowMore({children, className, maxh, forceShowMore, inContainer}: {
// 	children: ComponentChildren, className?: string, maxh?: string,
// 	forceShowMore?: boolean, inContainer?: "primary"|"secondary"
// }) {
// 	const [showMore, setShowMore] = useState<boolean|null>(false);
// 	const inner = useRef<HTMLDivElement>(null), ref=useRef<HTMLDivElement>(null);

// 	useEffect(()=>{
// 		const a=inner.current!, b=ref.current!;
// 		const check = () => {
// 			const disableShowMore = !forceShowMore && a.scrollHeight<=b.clientHeight+100;
// 			setShowMore(showMore=>disableShowMore ? null : (showMore ?? false));
// 		};

// 		const observer = new ResizeObserver(check);
// 		observer.observe(a); observer.observe(b);
// 		return ()=>observer.disconnect();
// 	}, [forceShowMore]);

// 	const expanded = showMore==null || showMore==true || forceShowMore;

// 	return <div className={className} >
// 		<Collapse isOpened >
// 			<div ref={ref} className={`relative ${expanded ? "" : "max-h-52 overflow-y-hidden"}`} style={{maxHeight: expanded ? undefined : maxh}}>
// 				<div ref={inner} className={expanded ? "overflow-y-auto max-h-dvh" : ""} >
// 					{children}
// 				</div>

// 				{!expanded && <div className="absolute bottom-0 left-0 right-0 z-40" >
// 					<MoreButton act={()=>setShowMore(true)} down >
// 						Show more
// 					</MoreButton>
// 				</div>}

// 				{!expanded &&
// 					<div className={`absolute bottom-0 h-14 max-h-full bg-gradient-to-b z-20 left-0 right-0 ${fadeGradient[inContainer ?? "default"]}`} />}
// 			</div>

// 			{showMore && <MoreButton act={()=>{
// 				ref.current?.scrollIntoView({block: "start", behavior: "smooth"});
// 				setShowMore(false)
// 			}} className="pt-2" >
// 				Show less
// 			</MoreButton>}
// 		</Collapse>
// 	</div>;
// }

type TextVariants = "big"|"lg"|"md"|"dim"|"bold"|"normal"|"err"|"sm"|"smbold";
export function Text({className, children, v, ...props}:
	JSX.HTMLAttributes<HTMLSpanElement>&JSX.HTMLAttributes<HTMLHeadingElement>
	&JSX.HTMLAttributes<HTMLParagraphElement>&{v?: TextVariants, className?: string}
) {
	switch (v) {
		case "big": return <h1 className={twMerge("md:text-3xl text-2xl font-display font-black", textColor.contrast, className)} {...props} >{children}</h1>;
		case "bold": return <b className={twMerge("text-lg font-display font-extrabold", textColor.contrast, className)} {...props} >{children}</b>;
		case "smbold": return <b className={twMerge("text-sm font-display font-bold text-gray-700 dark:text-gray-300", className)} {...props} >{children}</b>;
		case "md": return <h3 className={twMerge("text-xl font-display font-bold", textColor.contrast, className)} {...props} >{children}</h3>;
		case "lg": return <h3 className={twMerge("text-xl font-display font-extrabold", textColor.contrast, className)} {...props} >{children}</h3>;
		case "dim": return <span className={twMerge("text-sm text-gray-500 dark:text-gray-400", className)} {...props} >{children}</span>;
		case "sm": return <p className={twMerge("text-sm text-gray-800 dark:text-gray-200", className)} {...props} >{children}</p>;
		case "err": return <span className={twMerge("text-red-500", className)} {...props} >{children}</span>;
		default: return <p className={className} {...props} >{children}</p>;
	}
}

//not very accessible 🤡
export function Modal({bad, open, onClose, title, children, className, ...props}: {
	bad?: boolean, open: boolean, onClose?: ()=>void, title?: ComponentChildren,
	children?: ComponentChildren, className?: string
}&JSX.HTMLAttributes<HTMLDivElement>) {
	return <div className={`fixed left-0 top-0 bottom-0 right-0 z-40 bg-black/30 opacity-0 transition-opacity duration-1000 flex flex-col md:pt-40 pt-10 px-10 md:px-40 items-center`}
		style={{opacity: open ? 1 : 0, pointerEvents: open ? undefined : "none"}}
		>
		<div className={twMerge(`${bad ? `${bgColor.red} ${borderColor.red}` : `${bgColor.default} ${borderColor.default}`} rounded-md p-5 container flex items-stretch flex-col relative max-h-[calc(min(50rem,70dvh))] overflow-auto`, className)} {...props} >
			{onClose && <IconButton icon={<IconX />}
				className={`absolute top-3 right-2 z-30 [:not(:hover)]:theme:bg-transparent [:not(:hover)]:border-transparent`}
				onClick={()=>onClose()} />}
			{title && <>
				<Text v="big">{title}</Text>
				<Divider contrast={bad} />
			</>}
			{children}
		</div>

		<div className="fixed left-0 right-0 top-0 bottom-0 -z-10" onClick={()=>onClose?.()} />
	</div>;
}

const PopupCountCtx = createContext({count: 0, incCount(this: void): number {return 0;}});

export function cloneRef<T>(...refs: (Ref<T>|undefined)[]): (x: T|null)=>void {
	return x=>{
		for (const r of refs) {
			if (typeof r == "function") r(x);
			else if (r!=null) r.current=x;
		}
	};
}

//opens in modal if already in tooltip...
export const AppTooltip = forwardRef(({
	content, children, placement, className, onOpenChange,
	noClick, noHover, ...props
}: {
	content: ComponentChild,
	placement?: ComponentProps<typeof Popover>["positions"],
	onOpenChange?: (x: boolean)=>void,
	noClick?: boolean, noHover?: boolean,
	className?: string
}&Omit<JSX.HTMLAttributes<HTMLDivElement>,"content">, ref)=>{
	const [open, setOpen] = useState(false);
	const [reallyOpen, setReallyOpen] = useState<number|null>(null);
	const {count, incCount} = useContext(PopupCountCtx);
	
	const unInteract = useCallback((p: PointerEvent) => {
		if (p.pointerType=="mouse") setOpen(false);
	}, [setOpen]);

	const interact = useCallback((p: PointerEvent) => {
		if (p.pointerType=="mouse") setOpen(true);
	}, [setOpen]);

	const isOpen = reallyOpen==count;

	useEffect(()=>{
		let tm: NodeJS.Timeout;
		if (open) tm = setTimeout(()=>setReallyOpen(incCount()), 200);
		else tm = setTimeout(() => setReallyOpen(null), 500);
		return ()=>clearTimeout(tm);
	}, [incCount, open]);

	useEffect(()=>{
		onOpenChange?.(isOpen);
	}, [isOpen, onOpenChange])

	const targetRef = useRef<HTMLDivElement>(null);
	
	useEffect(()=>{
		const noCb = ()=>{};
		const cbs = [
			["pointerenter", noHover ? noCb : interact],
			["pointerleave", noHover ? noCb : unInteract],
			["click", noClick ? noCb : (ev: PointerEvent)=>{
				if (!reallyOpen) { setOpen(true); setReallyOpen(incCount()); }
				else { setOpen(false); setReallyOpen(null); }
				ev.stopPropagation();
			}]
		] as const;
		
		const elem = targetRef.current!;
		for (const [k,v] of cbs) elem.addEventListener(k, v as ()=>void);
		return ()=>{
			for (const [k,v] of cbs) elem.removeEventListener(k, v as ()=>void);
		};
	}, [incCount, interact, isOpen, noClick, noHover, reallyOpen, unInteract]);

	return <Popover
		ref={cloneRef(targetRef, ref)}
		onClickOutside={()=>setOpen(false)}
		positions={placement ?? ['top', 'right', 'left', 'bottom']}
		padding={5}
		content={({position, childRect, popoverRect}: PopoverState) => {
			if (!position) return <></>;
			const c = position[0];
			const borderClass = {
				r: `border-r-zinc-300! dark:border-r-zinc-600!`,
				l: `border-l-zinc-300! dark:border-l-zinc-600!`,
				t: `border-t-zinc-300! dark:border-t-zinc-600!`,
				b: `border-b-zinc-300! dark:border-b-zinc-600!`
			}[c];

			return <ArrowContainer position={position}
				childRect={childRect}
				popoverRect={popoverRect}
				arrowClassName={borderClass}
				arrowSize={7} arrowColor="" >
				<div className={twMerge(`${containerDefault} p-2 py-1`, className)}
					onPointerEnter={interact} onPointerLeave={unInteract} {...props} >
					{content}
				</div>
			</ArrowContainer>;
		}}
		containerClassName={`max-w-96`}
		isOpen={isOpen} >
		{children}
	</Popover>;
});

export type DropdownPart = ({type: "txt", txt?: ComponentChildren}
	| { type: "act", name?: ComponentChildren, act: ()=>void,
			disabled?: boolean, active?: boolean })&{key?: string|number};

export function Dropdown({parts, trigger, onOpenChange}: {
	trigger?: ComponentChildren, parts: DropdownPart[], onOpenChange?: (x:boolean)=>void
}) {
	const { incCount } = useContext(PopupCountCtx);

	//these components are fucked up w/ preact and props don't merge properly with container element
	return <AppTooltip onOpenChange={onOpenChange}
		content={<div className="rounded-md dark:bg-zinc-900 bg-zinc-100 dark:border-gray-800 border-zinc-300 px-0 py-0 max-w-60 overflow-y-auto justify-start max-h-[min(90dvh,30rem)]" >
			{parts.map((x,i) => {
				if (x.type=="act") {
					return <Button key={x.key ?? i} disabled={x.disabled}
						className={`m-0 dark:border-zinc-700 border-zinc-300 border-b-0.5 border-t-0.5 rounded-none first:rounded-t-md last:rounded-b-md dark:hover:bg-zinc-700 hover:bg-zinc-300 w-full ${
							x.active ? "dark:bg-zinc-950 bg-zinc-200" : ""
						}`}
						onClick={() => {
							x.act();
							incCount();
						}} >{x.name}</Button>;
				}

					return <div key={x.key ?? i}
						className="flex flex-row justify-start gap-4 p-2 dark:bg-zinc-900 bg-zinc-100 items-center border m-0 dark:border-zinc-700 border-zinc-300 border-t-0 first:border-t rounded-none first:rounded-t-md last:rounded-b-md w-full" >
						{x.txt}
					</div>;
				})}
			</div>} >
		{trigger}
	</AppTooltip>;
}

export type Theme = "light"|"dark";
export const ThemeContext = createContext<{
	theme: Theme, setTheme:(x: Theme)=>void
}>(undefined as never)
export const useTheme = ()=>useContext(ThemeContext).theme;

export function Container({children, className, ...props}: {
	children?: ComponentChildren, className?: string
}&JSX.HTMLAttributes<HTMLDivElement>) {
	const theme = useContext(ThemeContext);
	useEffect(() => {
		const html = document.getElementsByTagName("html")[0];
		html.classList.add(theme.theme);
		return () => html.classList.remove(theme.theme);
	}, [theme]);

	const [count, setCount] = useState(0);
	const incCount = useCallback(()=>{
		let r: number;
		setCount(x=>{return r=x+1;}); // look away child
		return r!;
	}, [setCount]);

	return <PopupCountCtx.Provider value={{count, incCount}} >
		<div className={twMerge("font-body dark:text-gray-100 dark:bg-neutral-950 text-gray-950 bg-neutral-100 min-h-dvh", className)}
			{...props} >
			{children}
		</div>
	</PopupCountCtx.Provider>;
}
	
export const toSearchString = (x: string) => x.toLowerCase().replace(/[^a-z0-9\n]/g, "");

export function useMediaQuery(q: MediaQueryList|string|null, init: boolean=false) {
	const [x, set] = useState(init);

	useEffect(() => {
		if (q==null) return;

		const mq = typeof q=="string" ? window.matchMedia(q) : q;
		const cb = () => set(mq.matches);
		mq.addEventListener("change", cb);
		set(mq.matches);
		return ()=>mq.removeEventListener("change",cb);
	}, [q]);

	return x;
}

const queries: Record<"md"|"lg",MediaQueryList|null> = {md:null, lg:null};

export const useMd = () => {
	try {
		if (queries.md==null)
			queries.md = window.matchMedia("(min-width: 768px)");
	} catch {}

	return useMediaQuery(queries.md);
};

export const useLg = () => {
	try {
		if (queries.lg==null)
			queries.lg = window.matchMedia("(min-width: 1024px)");
	} catch {}

	return useMediaQuery(queries.lg);
};

export function debounce(debounceMs: number): (f: ()=>void)=>void {
	let ts: NodeJS.Timeout|null = null;
	return (f) => {
		if (ts!=null) clearTimeout(ts);
		ts=setTimeout(()=>f(), debounceMs);
	};
}

export function useDebounce<T>(f: ()=>T, debounceMs: number): T {
	const [v, setV] = useState(f);
	useEffect(()=>{
		const ts = setTimeout(()=>setV(f()), debounceMs);
		return () => clearTimeout(ts);
	}, [f, debounceMs]);
	return v;
}

export function ErrorPage({error, retry}: {error?: Error, retry?: ()=>void}) {
	return <div className="flex flex-col items-center gap-10 h-full py-10 justify-center mx-5" >
		<IconInfoTriangleFilled size={70} className="fill-red-500" />
		<div className="flex flex-col gap-2 max-w-md" >
			<Text v="big" >An error occurred</Text>
			<p>
				It{"'"}s never too late to try again. {!retry && "Refresh the page."}
			</p>

			{retry && <Button onClick={()=>retry()} >Retry</Button>}

			{error?.message && <Text v="sm" >Details: {error.message}</Text>} 
		</div>
	</div>
}

export function withTimeout<T extends unknown[], R>(f: (...args: T)=>Promise<R>, timeout: number): typeof f {
	return (...args) => Promise.race([
		new Promise<never>((_,rej) => setTimeout(()=>rej(new Error("Timed out")), timeout)),
		f(...args)
	]);
}

export function useAsync<T extends unknown[], R>(f: (...args: T)=>Promise<R>, opts?: {
	propagateError?: boolean,
}): {
	run: (...args: T)=>void,
	loading: boolean,
	error: Error|null,
	result: R|null
} {
	const [state, setState] = useState<{
		loading: boolean, error: Error|null, result: R|null
	}>({
		loading: false, error: null, result: null
	});
	
	const propError = opts?.propagateError ?? true;
	useEffect(()=>{
		if (propError && state.error) throw state.error;
	}, [state.error, propError])

	return {
		run(...args) {
			if (!state.loading) {
				setState(s=>({...s, loading: true}));

				f(...args).then(res=>{
					setState(s=>({...s, result: res}));
				}, err=>{
					setState(s=>({...s, error: err instanceof Error ? err : new Error("Unknown error")}));
				}).finally(()=>{
					setState(s=>({...s, loading: false}));
				});
			}
		},
		...state
	};
}

export function useAsyncEffect(f: ()=>Promise<void|(()=>void)>, deps: unknown[]) {
	const oldV = useRef<()=>void>(null);
	const x = useAsync(async ()=>{
		const v = await f();
		oldV.current?.();
		if (v) oldV.current=v;
	});

	useEffect(()=>()=>{
		oldV.current?.();
		oldV.current=null;
	}, []);

	const changed = useRef(false);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(()=>{changed.current=true;}, deps);

	useEffect(()=>{
		if (!x.loading && changed.current) {
			changed.current=false;
			x.run();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [...deps, x.loading]);
}
