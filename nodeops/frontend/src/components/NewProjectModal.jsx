import React, { useState } from 'react';
import { X, GitBranch, Layers, Plus } from 'lucide-react';
import useAppStore from '../stores/appStore';
import useDataStore from '../stores/dataStore';
import { showToast } from './Toast';

export default function NewProjectModal() {
  const { setModal } = useAppStore();
  const { addProject } = useDataStore();

  const [name,      setName]      = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [desc,      setDesc]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [errors,    setErrors]    = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim())                         e.name = 'Project name is required';
    else if (!/^[a-z0-9_-]+$/i.test(name))   e.name = 'Only letters, numbers, hyphens, underscores';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      setLoading(true);
      setErrors({});
      await addProject({
        name:       name.trim(),
        github_url: githubUrl.trim() || undefined,
        description: desc.trim()    || undefined,
      });
      showToast(`Project "${name}" created`, 'success');
      setModal(null);
    } catch (err) {
      showToast(`Create failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
    >
      <div className="relative w-full max-w-md bg-surface-1 border border-surface-3 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-3">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-accent" />
            <span className="font-mono font-semibold text-sm text-[#ccccee]">New Project</span>
          </div>
          <button
            onClick={() => setModal(null)}
            className="text-[#555570] hover:text-[#ccccee] transition-colors p-1"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block font-mono text-[10px] text-[#444460] uppercase tracking-widest mb-1.5">
              project name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
              autoFocus
              className={`
                w-full bg-surface-0 border text-[12px] font-mono text-[#aaaacc]
                px-3 py-2 focus:outline-none placeholder-[#333344] transition-colors
                ${errors.name ? 'border-warn/50' : 'border-surface-3 focus:border-accent/40'}
              `}
            />
            {errors.name && (
              <p className="mt-1 font-mono text-[10px] text-warn">{errors.name}</p>
            )}
          </div>

          {/* GitHub URL */}
          <div>
            <label className="block font-mono text-[10px] text-[#444460] uppercase tracking-widest mb-1.5">
              github url
            </label>
            <div className="flex items-center border border-surface-3 focus-within:border-accent/40 bg-surface-0 transition-colors">
              <span className="px-2 text-[#444460]">
                <GitBranch size={12} />
              </span>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="flex-1 bg-transparent text-[12px] font-mono text-[#9999bb] py-2 pr-3 focus:outline-none placeholder-[#333344]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-mono text-[10px] text-[#444460] uppercase tracking-widest mb-1.5">
              description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="What does this project do?"
              className="w-full bg-surface-0 border border-surface-3 focus:border-accent/40 text-[12px] font-mono text-[#9999bb] px-3 py-2 resize-none focus:outline-none placeholder-[#333344] transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent/10 border border-accent/30 text-accent font-mono text-[12px] hover:bg-accent/20 transition-colors disabled:opacity-40"
            >
              <Plus size={12} />
              {loading ? 'Creating…' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="px-4 py-2 border border-surface-3 text-[#555570] font-mono text-[12px] hover:bg-surface-3 hover:text-[#9999bb] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
