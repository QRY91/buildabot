interface HeaderProps {
  viewMode: 'chat' | 'graph';
  onViewModeChange: (mode: 'chat' | 'graph') => void;
}

export function Header({ viewMode, onViewModeChange }: HeaderProps) {
  return (
    <div style={{
      padding: '12px 24px',
      borderBottom: '1px solid #333',
      backgroundColor: '#1e1e1e',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <h1 style={{
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff',
      }}>
        BuildABot
      </h1>

      <div style={{
        display: 'flex',
        gap: '8px',
        backgroundColor: '#0f0f0f',
        padding: '4px',
        borderRadius: '8px',
      }}>
        <button
          onClick={() => onViewModeChange('chat')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'chat' ? '#2563eb' : 'transparent',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
          }}
        >
          Chat View
        </button>
        <button
          onClick={() => onViewModeChange('graph')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'graph' ? '#2563eb' : 'transparent',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
          }}
        >
          Graph View
        </button>
      </div>
    </div>
  );
}
