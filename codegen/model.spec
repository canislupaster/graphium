type BackendErrorKind = "Busy"|"Other"

type BackendError = {
	kind: BackendErrorKind,
	extra: string
}

type XD = A { 
	value: int
} | B {
	value2: int
}