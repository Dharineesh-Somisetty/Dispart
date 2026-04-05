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
        className="w-full py-2 text-sm text-gray-400 font-medium bg-gray-50 rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
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
      <p className="text-[10px] text-gray-400 text-center mt-1">
        Join{" "}
        {onJoinCommunity ? (
          <button
            onClick={onJoinCommunity}
            className="text-teal-600 font-medium hover:underline"
          >
            {communityName}
          </button>
        ) : (
          <span className="text-teal-600 font-medium">{communityName}</span>
        )}{" "}
        to request
      </p>
    </div>
  );
}
