'use client';

const footerColumns = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'Integrations', 'Changelog'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'API Reference', 'Blog', 'Community'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Contact', 'Status'],
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
  },
];

export function FooterSection() {
  return (
    <footer className="py-16 bg-slate-50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              UX
            </div>
            <span className="text-sm font-semibold text-slate-700">UI/UX Pro Max</span>
          </div>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} UI/UX Pro Max. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
