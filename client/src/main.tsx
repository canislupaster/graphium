import { createContext, Suspense, use, useEffect, useState } from "react";
import { theme, variableResolver } from "./theme";
import { Alert, Button, Center, Container, Loader, LoadingOverlay, MantineProvider, Modal, Stack, Text, Title } from "@mantine/core";
import { createRoot, Root } from "react-dom/client";
import { useDisclosure } from "@mantine/hooks";
import { IconExclamationCircleFilled } from "@tabler/icons-react";
import { ErrorBoundary, useErrorBoundary } from "react-error-boundary";
import { Backend } from "../generated/backend";

function ErrorPage({error: err, resetErrorBoundary: reset}: {
	error: Error, resetErrorBoundary: ()=>void
}) {

	const [open, handlers] = useDisclosure(true);
	const title = err?.name ?? "Unknown error";
	const msg = err?.message ?? "An error occurred.";

	return <>
		<Modal centered opened={open}
			styles={{
				overlay: {zIndex: 1000},
				inner: {zIndex: 1001}
			}}
			onClose={handlers.close}
			title={title} withCloseButton >
			<Text>{msg}</Text>
			<Button onClick={()=>reset()} mt="sm" >Retry</Button>
		</Modal>

		<Alert variant="light" color="red" title={title} icon={<IconExclamationCircleFilled/>} >
			<Text>{msg}</Text>
			<Button onClick={()=>reset()} mt="sm" >Retry</Button>
		</Alert>
	</>;
}

function WASMApp({prom}: {prom: Promise<Backend>}) {
	const wasm = use(prom);
	return <>
		<Text>hi {wasm.isDeleted() ? "a" : "b"}</Text>
	</>;
}

function App() {
	const emptyProm = new Promise<Backend>(()=>{});
	const [prom, setProm] = useState<Promise<Backend>>();
	useEffect(()=>{
		if (!prom) setProm((async ()=> {
			const mod = await import(/* @vite-ignore */ new URL("/wasm/backend.mjs", window.location.href).href) as typeof import("../generated/backend");
			return new (await mod.default()).Backend();
		})());
	}, [prom]);

	return <MantineProvider forceColorScheme="dark" theme={theme} cssVariablesResolver={variableResolver} >
		<Container py="lg" pt="xl" >
			<ErrorBoundary FallbackComponent={ErrorPage} onReset={()=>setProm(undefined)} >
				<Suspense fallback={
					<Stack align="center" >
						<Loader/>
						<Text>Loading WebAssembly...</Text>
					</Stack>
				} >
					<WASMApp prom={prom ?? emptyProm} />
				</Suspense>
			</ErrorBoundary>
		</Container>
	</MantineProvider>;
}

console.log("rendering react app");
declare global {
	interface Window {
		appRoot?: Root;
	}
}

document.addEventListener("DOMContentLoaded", ()=>{
	if (!window.appRoot)
		window.appRoot = createRoot(document.getElementById("app")!);
	window.appRoot.render(<App/>);
});