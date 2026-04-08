"use client";

interface LockedCTAProps {
  communityName: string;
  onJoinCommunity?: () => void;
}

export default function LockedCTA({
  communityName,
  onJoinCommunity,
}: LockedCTAProps) {
  return (
    <div className="relative">
      <button
        disabled
        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-900/45"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Request to Join
      </button>
      <p className="mt-2 text-center text-[11px] text-coral-900/55">
        Join{" "}
        {onJoinCommunity ? (
          <button
            onClick={onJoinCommunity}
            className="font-semibold text-teal-700 hover:underline"
          >
            {communityName}
          </button>
        ) : (
          <span className="font-semibold text-teal-700">{communityName}</span>
        )}{" "}
        to request
      </p>
    </div>
  );
}
