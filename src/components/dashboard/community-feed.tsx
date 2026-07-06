'use client';

const ACTIVITIES = [
  { name: 'Sarah T.', action: 'Completed "Upper Body Strength"', time: '2 min ago', avatar: 'ST' },
  { name: 'Marcus R.', action: 'Hit a new PR: Bench Press 120kg', time: '15 min ago', avatar: 'MR' },
  { name: 'David K.', action: 'Completed "Endurance Run 10K"', time: '1 hour ago', avatar: 'DK' },
  { name: 'Alex M.', action: 'Logged 2,400 calories today', time: '2 hours ago', avatar: 'AM' },
  { name: 'Jessica L.', action: 'Completed "Leg Day Destroyer"', time: '3 hours ago', avatar: 'JL' },
];

export function CommunityFeed() {
  return (
    <div className="bg-[#141618] border border-[rgba(255,107,0,0.15)] rounded-xl p-6">
      <span className="text-[#FF6B00] font-label-bold text-xs uppercase tracking-widest">Community Feed</span>
      <div className="space-y-4 mt-4">
        {ACTIVITIES.map((activity, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#0066FF] flex items-center justify-center text-white font-bold text-xs shrink-0">
              {activity.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm">
                <span className="font-bold">{activity.name}</span>{' '}
                <span className="text-[#C4C7C7]">{activity.action}</span>
              </p>
              <p className="text-[#C4C7C7] text-xs mt-0.5 opacity-60">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
