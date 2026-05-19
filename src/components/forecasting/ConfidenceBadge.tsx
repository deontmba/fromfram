import React from 'react';

export function ConfidenceBadge({ score }: { score: number }) {
  let color = "bg-red-100 text-red-800 border-red-200";
  let showTooltip = true;
  
  const percentage = Math.round(score * 100);

  if (percentage >= 80) {
    color = "bg-green-100 text-green-800 border-green-200";
    showTooltip = false;
  } else if (percentage >= 60) {
    color = "bg-yellow-100 text-yellow-800 border-yellow-200";
    showTooltip = percentage < 70;
  }

  return (
    <div className="relative group inline-flex items-center">
      <span className={`px-2 py-0.5 text-xs font-medium border rounded-full ${color}`}>
        {percentage}%
      </span>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10 text-center">
          Data historis masih sedikit, akurasi akan meningkat seiring waktu.
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}
