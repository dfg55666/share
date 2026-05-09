import React, { useState } from 'react';
import { X, Play, Terminal, ChevronDown } from 'lucide-react';
import useAppStore from '../stores/appStore';
import useDataStore from '../stores/dataStore';
import { showToast } from './Toast';

const MODES = [
  { value: 'auto',    label: 'auto',    desc: 'Runs multiple loops automatically' },
  { value: 'oneshot', label: 'oneshot', desc: 'Executes a single loop then stops' },
];

export default function NewTaskModal() {
  const { setModal, selectedNode } = useAppStore();
  const { projects, createTask, startTask } = useDataStore();

  // Derive project from currently selected node
  const defaultProject = selectedNode?.project || (projects[0]?.name || projects[0] || '');

  const [project,  setProject]  = useState(defaultProject);
  const [mode,     setMode]     = useState('auto');
  const [maxLoops, setMaxLoops] = useState(5);
  const [message,  setMessage]  = useState('');
  const [autoStart, setAutoStart] = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!project.trim())  e.project = 'Select a project';
    if (!message.trim())  e.message = 'Message / prompt is required';
    if (mode === 'auto' && (maxLoops < 1 || maxLoops > 100))
      e.maxLoops = 'Must be between 1 and 100';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      setLoading(true);
      setErrors({});

      const res = await createTask({
        project:   project.trim(),
        mode,
        message:   message.trim(),
        max_loops: mode === 'auto' ? Number(maxLoops) : 1,
      });

      const taskId = res?.data?.task_id || res?.task_id || res?.data?.id || res?.id;

      if (autoStart && taskId) {
        try {
          await startTask(project, taskId);
          showToast(`Task created & started`, 'success');
        } catch (startErr) {
          showToast(`Task created but start failed: ${startErr.message}`, 'info');
        }
      } else {
        showToast(`Task created`, 'success');
      }

      setModal(null);
    } catch (err) {
      showToast(`Create failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const projectList = projects.map((p) => p.name || p);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
    >
      <div
        className="relative w-full max-w-lg bg-surface-1 border border-surface-3 shadow-2xl animate-fade-in flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-accent" />
            <span className="font-mono font-semibold text-sm text-[#ccccee]">New Task</span>
          </div>
          <button
            onClick={() => setModal(null)}
            className="text-[#555570] hover:text-[#ccccee] transition-colors p-1"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1">

          {/* Project */}
          <div>
            <label className="block font-mono text-[10px] text-[#444460] uppercase tracking-widest mb-1.5">
              project *
            </label>
            {projectList.length > 0 ? (
              <div className="relative">
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className={`
                    w-full appearance-none bg-surface-0 border text-[12px] font-mono text-[#aaaacc]
                    px-3 py-2 pr-8 focus:outline-none transition-colors
                    ${errors.project ? 'border-warn/50' : 'border-surface-3 focus:border-accent/40'}
                  `}
                >
                  {projectList.map((p) => (
                    <option key={p} value={p} style={{ background: '#12121a' }}>{p}</option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#444460] pointer-events-none"
                />
              </div>
            ) : (
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="project-name"
                className={`
                  w-full bg-surface-0 border text-[12px] font-mono text-[#aaaacc]
                  px-3 py-2 focus:outline-none placeholder-[#333344] transition-colors
                  ${errors.project ? 'border-warn/50' : 'border-surface-3 focus:border-accent/40'}
                `}
              />
            )}
            {errors.project && (
              <p className="mt-1 font-mono text-[10px] text-warn">{errors.project}</p>
            )}
          </div>

          {/* Mode + Max loops */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] text-[#444460] uppercase tracking-widest mb-1.5">
                mode
              </label>
              <div className="flex flex-col gap-1">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    className={`
                      flex items-center gap-2 px-3 py-2 text-left border transition-colors
                      font-mono text-[11px]
                      ${mode === m.value
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-surface-3 bg-surface-0 text-[#666680] hover:border-surface-4 hover:text-[#9999bb]'}
                    `}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: mode === m.value ? '#00d4aa' : '#333344' }}
                    />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'auto' && (
              <div>
                <label className="block font-mono text-[10px] text-[#444460] uppercase tracking-widest mb-1.5">
                  max loops
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxLoops}
                  onChange={(e) => setMaxLoops(e.target.value)}
                  className={`
                    w-full bg-surface-0 border text-[12px] font-mono text-[#aaaacc]
                    px-3 py-2 focus:outline-none transition-colors
                    ${errors.maxLoops ? 'border-warn/50' : 'border-surface-3 focus:border-accent/40'}
                  `}
                />
                {errors.maxLoops && (
                  <p className="mt-1 font-mono text-[10px] text-warn">{errors.maxLoops}</p>
                )}
                <p className="mt-1 font-mono text-[10px] text-[#333344]">
                  {MODES.find((m2) => m2.value === mode)?.desc}
                </p>
              </div>
            )}
          </div>

          {/* Message — the main field */}
          <div className="flex-1">
            <label className="block font-mono text-[10px] text-[#444460] uppercase tracking-widest mb-1.5">
              prompt / message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Describe what you want the agent to do each loop.

Example:
- Check the repository for open issues
- Generate a fix and open a pull request
- Stop when all critical issues are resolved"
              autoFocus
              className={`
                w-full bg-surface-0 border text-[12px] font-mono text-[#aaaacc]
                px-3 py-2.5 resize-none focus:outline-none placeholder-[#333344] leading-relaxed transition-colors
                ${errors.message ? 'border-warn/50' : 'border-surface-3 focus:border-accent/40'}
              `}
            />
            {errors.message && (
              <p className="mt-1 font-mono text-[10px] text-warn">{errors.message}</p>
            )}
          </div>

          {/* Auto-start toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => setAutoStart((v) => !v)}
              className={`
                w-8 h-4 relative transition-colors
                ${autoStart ? 'bg-accent/30 border-accent/40' : 'bg-surface-3 border-surface-4'}
                border
              `}
            >
              <span
                className={`
                  absolute top-0.5 w-3 h-3 transition-all
                  ${autoStart ? 'left-4 bg-accent' : 'left-0.5 bg-[#555570]'}
                `}
              />
            </div>
            <span className="font-mono text-[11px] text-[#666680]">
              Start task immediately after creation
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 flex-shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent/10 border border-accent/30 text-accent font-mono text-[12px] hover:bg-accent/20 transition-colors disabled:opacity-40"
            >
              <Play size={12} />
              {loading ? 'Creating…' : autoStart ? 'Create & Start' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="px-4 py-2.5 border border-surface-3 text-[#555570] font-mono text-[12px] hover:bg-surface-3 hover:text-[#9999bb] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
