import './App.css';
import { useEffect, useRef, useState } from 'react';
import { Renderer, type GlideCanvasHandle } from './lib/GlideCanvas';
import { GlideCanvas } from './lib/GlideCanvas';
import { useLocalStorageBlob } from './showcase/localStorageBlobHook';

type Tab = (typeof Tab)[keyof typeof Tab];
const Tab = Object.freeze({
  Canvas: 'canvas',
  Img: 'img',
  Html: 'html',
} as const);
const TabValues: Tab[] = Object.values(Tab);

const TabComponentMap: Record<Tab, Renderer> = {
  [Tab.Canvas]: Renderer.Canvas,
  [Tab.Img]: Renderer.Image,
  [Tab.Html]: Renderer.Html,
} as const;

const TabLabel: Record<Tab, string> = {
  [Tab.Canvas]: 'Canvas',
  [Tab.Img]: 'Image',
  [Tab.Html]: 'html',
} as const;

type Theme = (typeof Theme)[keyof typeof Theme];
const Theme = Object.freeze({
  Light: 'light',
  Dark: 'dark',
  Auto: 'auto',
} as const);

const themeOptions: { value: Theme; label: string }[] = [
  { value: Theme.Auto, label: 'Auto' },
  { value: Theme.Light, label: 'Light' },
  { value: Theme.Dark, label: 'Dark' },
];

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('theme');
  if (saved === Theme.Light || saved === Theme.Dark || saved === Theme.Auto)
    return saved;
  return Theme.Auto;
}

function App() {
  const [tab, setTab] = useState<Tab>('canvas');
  const [file, setFile] = useLocalStorageBlob<File | null>('file', null);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [themeOpen, setThemeOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<GlideCanvasHandle>(null);

  useEffect(() => {
    if (theme === Theme.Auto) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  async function upload(next: File | null) {
    setFile(next);
  }

  function updateTab(tab: Tab) {
    setTab(tab);
  }

  return (
    <>
      <div className="toolbar toolbar--tabs">
        {TabValues.map((t) => (
          <button
            key={`tab-button-${t}`}
            className={`tab${t === tab ? ' tab--active' : ''}`}
            onClick={() => updateTab(t)}>
            {TabLabel[t]}
          </button>
        ))}
      </div>

      <div className="toolbar-row">
        <div className="toolbar toolbar--controls">
          <button
            className="icon-btn"
            title="Zoom in"
            onClick={() => handleRef.current?.zoomIn()}>
            +
          </button>
          <button
            className="icon-btn"
            title="Zoom out"
            onClick={() => handleRef.current?.zoomOut()}>
            −
          </button>
          <span className="divider" />
          <button onClick={() => handleRef.current?.center()}>Center</button>
          <button onClick={() => handleRef.current?.fit()}>Fit</button>
          <span className="divider" />
          <label className="upload-btn">
            Upload
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              onChange={(e) => upload(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            onClick={() => {
              uploadRef.current!.value = '';
              upload(null);
            }}>
            ✕
          </button>
        </div>

        <div className="toolbar toolbar--theme">
          <div className="dropdown" ref={themeRef}>
            <button
              className="dropdown-trigger"
              aria-haspopup="listbox"
              aria-expanded={themeOpen}
              onClick={() => setThemeOpen((o) => !o)}>
              <span className="dropdown-value">
                <ThemeIcon theme={theme} />
                <span className="dropdown-label">
                  {themeOptions.find((o) => o.value === theme)?.label}
                </span>
              </span>
              <svg
                className="dropdown-caret"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {themeOpen && (
              <ul className="dropdown-menu" role="listbox">
                {themeOptions.map((opt) => (
                  <li key={opt.value} role="none">
                    <button
                      role="option"
                      aria-selected={theme === opt.value}
                      className={`dropdown-item${
                        theme === opt.value ? ' dropdown-item--active' : ''
                      }`}
                      onClick={() => {
                        setTheme(opt.value);
                        setThemeOpen(false);
                      }}>
                      <ThemeIcon theme={opt.value} />
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div style={{ width: '100dvw', height: '100dvh', overflow: 'hidden' }}>
        <GlideCanvas
          ref={handleRef}
          renderer={TabComponentMap[tab]}
          image={file}
        />
      </div>
    </>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (theme === Theme.Light) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    );
  }
  if (theme === Theme.Dark) {
    return (
      <svg {...common}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export default App;
