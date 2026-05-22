import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Wifi } from 'lucide-react';

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateJobPostModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    company: '', role_title: '', description: '', location: '',
    is_remote: false, has_bonus: false, referral_bonus: '', job_url: '', tags: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSubmitting(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const { error } = await supabase.from('posts').insert({
        author_id: user.id,
        company: form.company.trim(),
        role_title: form.role_title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        is_remote: form.is_remote,
        has_bonus: form.has_bonus,
        referral_bonus: form.has_bonus ? form.referral_bonus.trim() : '',
        job_url: form.job_url.trim(),
        tags,
      });
      if (error) throw error;
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-lg font-bold text-white">Post a Job Opening</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Company *</label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Google" required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Role Title *</label>
              <input value={form.role_title} onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))} placeholder="e.g. Software Engineer" required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the role and why candidates should apply..." required rows={4}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Location</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. San Francisco, CA"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition" />
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, is_remote: !f.is_remote }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition ${form.is_remote ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
              <Wifi size={14} />Remote
            </button>
          </div>

          <div className="border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Referral Bonus</label>
              <button type="button" onClick={() => setForm(f => ({ ...f, has_bonus: !f.has_bonus }))}
                className={`relative w-10 rounded-full transition-colors ${form.has_bonus ? 'bg-blue-500' : 'bg-gray-700'}`} style={{ height: '22px' }}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.has_bonus ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            {form.has_bonus && (
              <input value={form.referral_bonus} onChange={e => setForm(f => ({ ...f, referral_bonus: e.target.value }))} placeholder="e.g. $5,000 paid after 90 days"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Job URL</label>
            <input value={form.job_url} onChange={e => setForm(f => ({ ...f, job_url: e.target.value }))} placeholder="https://jobs.company.com/role" type="url"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Tags</label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="React, TypeScript, Senior (comma separated)"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition" />
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl py-3 text-sm transition">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition">
              {submitting ? 'Posting...' : 'Post Opening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
