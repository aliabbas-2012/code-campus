'use client';

interface RunButtonProps {
  disabled: boolean;
  isRunning: boolean;
  onRun: () => void;
}

export function RunButton({ disabled, isRunning, onRun }: RunButtonProps): React.ReactNode {
  return (
    <button
      type="button"
      onClick={onRun}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isRunning ? (
        <>
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Running…
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
          Run
        </>
      )}
    </button>
  );
}
