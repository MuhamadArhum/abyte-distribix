import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="panel-head" style={{ marginBottom: 18, background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
      <div>
        <div className="section-title">{title}</div>
        {description && (
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
