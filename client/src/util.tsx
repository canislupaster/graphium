export function listener<E extends HTMLElement, K extends keyof HTMLElementEventMap>(
	elem: E,
	handler: {type: K|K[], f: (this: Element, event: HTMLElementEventMap[K]) => void}
) {
	const typeArr = Array.isArray(handler.type) ? handler.type : [handler.type];
	for (const ty of typeArr) elem.addEventListener(ty, handler.f);
	return { [Symbol.dispose]() {
		for (const ty of typeArr) elem.removeEventListener(ty, handler.f);
	} };
}
