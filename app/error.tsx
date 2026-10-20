'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="rounded-full bg-red-100 p-4 dark:bg-red-900">
                <svg className="h-8 w-8 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Fehler beim Laden der Daten
            </h1>
            <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
                {error.message || 'Die GitLab-Daten konnten nicht abgerufen werden. Bitte überprüfe die Verbindung und den Token.'}
            </p>
            <button
                onClick={reset}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
                Erneut versuchen
            </button>
        </div>
    );
}
