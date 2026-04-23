import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const currentOption = themeOptions.find(opt => opt.value === theme) || themeOptions[2];
  const Icon = currentOption.icon;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          border: '1px solid var(--border-color, #e5e7eb)',
          background: 'var(--card-bg, white)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          color: 'var(--text-main, #374151)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--hover-bg, #f3f4f6)';
          e.currentTarget.style.color = 'var(--primary-blue, #2563EB)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--card-bg, white)';
          e.currentTarget.style.color = 'var(--text-main, #374151)';
        }}
        title={`Theme: ${currentOption.label} (${resolvedTheme})`}
      >
        <Icon size={18} color="currentColor" strokeWidth={1.5} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '160px',
            background: 'var(--card-bg, white)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.12))',
            border: '1px solid var(--border-color, #e5e7eb)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          <div style={{ padding: '6px' }}>
            {themeOptions.map((option) => {
              const OptionIcon = option.icon;
              const isActive = theme === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? 'var(--primary-light, #eff6ff)' : 'transparent',
                    color: isActive ? 'var(--primary, #2563EB)' : 'var(--text-primary, #374151)',
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--hover-bg, #f3f4f6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <OptionIcon size={16} color="currentColor" strokeWidth={1.5} />
                    {option.label}
                  </span>
                  {isActive && <Check size={14} color="currentColor" strokeWidth={2} />}
                </button>
              );
            })}
          </div>

          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid var(--border-color, #e5e7eb)',
              fontSize: '11px',
              color: 'var(--text-muted, #9ca3af)',
              textAlign: 'center',
            }}
          >
            Active: {resolvedTheme === 'dark' ? 'Dark' : 'Light'} mode
          </div>
        </div>
      )}

      <style>{
        `
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `
      }</style>
    </div>
  );
}
