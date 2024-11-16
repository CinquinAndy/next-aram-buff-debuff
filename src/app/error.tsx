'use client'

export default function Error({
	error,
	reset,
}: {
	error: Error
	reset: () => void
}) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
			<div className="text-center">
				<h2 className="mb-4 text-2xl font-bold">Something went wrong!</h2>
				<p className="mb-4 text-red-600">{error.message}</p>
				<button
					onClick={reset}
					className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
				>
					Try again
				</button>
			</div>
		</div>
	)
}
