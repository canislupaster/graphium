type BackendErrorKind = "Busy"|"Other"

type BackendError = {
	kind: BackendErrorKind,
	extra: string
}

type XD = A { 
	value: string
} | B {
	value2: int[]
} | C {
	value2: int[5]
}

type Um = {
	xd: int[10]
}