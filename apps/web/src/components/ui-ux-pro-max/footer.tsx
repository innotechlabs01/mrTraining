'use client';

const footerColumns = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'Integrations', 'Changelog', 'Roadmap'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'API Reference', 'Blog', 'Community', 'Support'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Contact', 'Press kit', 'Status'],
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'DPA'],
  },
];

export function FooterSection() {
  return (
    <footer className="py-16 bg-white border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                UX
              </div>
              <span className="text-sm font-bold text-slate-900">UI/UX Pro Max</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              The unified platform for design review, code inspection, and version control.
            </p>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-slate-900 mb-4 uppercase tracking-widest">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} UI/UX Pro Max. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Twitter</a>
            <span className="text-slate-300">·</span>
            <a href="#" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">GitHub</a>
            <span className="text-slate-300">·</span>
            <a href="#" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">LinkedIn</a>
            <span className="text-slate-300">·</span>
            <a href="#" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Slack</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
