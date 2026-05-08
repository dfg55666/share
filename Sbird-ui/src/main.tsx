import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './ui/styles/index.scss';
import { ErrorBoundary } from './ui/ErrorBoundary';

const WorkbenchRuntimePage = React.lazy(() =>
  import('./features/workbench').then((m) => ({ default: m.WorkbenchRuntimePage }))
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <React.Suspense fallback={<div style={{ padding: 40, color: '#888' }}>加载中...</div>}>
          <Routes>
            <Route path="/*" element={<WorkbenchRuntimePage />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
