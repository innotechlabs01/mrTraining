'use client';

const MESSAGES = [
  { coach: 'Marcus Sterling', initials: 'MS', message: 'Great session yesterday! Your squat form has improved significantly. Let\'s push the weight next week.', time: '10 min ago', isCoach: true },
  { coach: 'You', initials: 'ME', message: 'Thanks Marcus! Should I increase the sets on deadlifts too?', time: '5 min ago', isCoach: false },
  { coach: 'Marcus Sterling', initials: 'MS', message: 'Not yet — let\'s master the current volume first. Focus on eccentric control this week.', time: '2 min ago', isCoach: true },
];

export function CoachMessages() {
  return (
    <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-6 shadow-[0_0_20px_rgba(0,102,255,0.1)]">
      <span className="text-[#0066FF] font-label-bold text-xs uppercase tracking-widest">Coach Messages</span>
      <div className="space-y-4 mt-4">
        {MESSAGES.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.isCoach ? '' : 'flex-row-reverse'}`}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: msg.isCoach ? 'linear-gradient(135deg, #FF6B00, #FF6B0088)' : 'linear-gradient(135deg, #0066FF, #0066FF88)' }}>
              {msg.initials}
            </div>
            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.isCoach ? 'bg-[#0F0F0F] border border-[rgba(255,107,0,0.15)] text-white' : 'bg-[#FF6B00]/10 border border-[rgba(255,107,0,0.2)] text-white'}`}>
              <p>{msg.message}</p>
              <p className="text-[#C4C7C7] text-xs mt-1 opacity-60">{msg.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
