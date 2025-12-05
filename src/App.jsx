import React, { useEffect, useRef, useState } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

function App() {
  const [step, setStep] = useState(1);
  const [isDark, setIsDark] = useState(true);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [fileInfo, setFileInfo] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageElement, setImageElement] = useState(null);

  // Editing controls
  const [cropX, setCropX] = useState(50); // 0–100
  const [cropY, setCropY] = useState(50); // 0–100
  const [cropZoom, setCropZoom] = useState(100); // 50–200
  const [brightness, setBrightness] = useState(1); // 0.5–1.5
  const [contrast, setContrast] = useState(1); // 0.5–1.5
  const [filter, setFilter] = useState('none'); // none | grayscale | sepia
  const [removeBg, setRemoveBg] = useState(true);
  const [overlayText, setOverlayText] = useState('');

  const [emojiSize, setEmojiSize] = useState(128);
  const [emojiDataUrl, setEmojiDataUrl] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  const [gallery, setGallery] = useState([]);

  const previewCanvasRef = useRef(null);
  const emojiCanvasRef = useRef(null);

  // Load gallery on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('emojiGallery');
      if (stored) {
        setGallery(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    // Load from shareable URL hash if present
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#img=')) {
      try {
        const encoded = window.location.hash.slice(5);
        const dataUrl = decodeURIComponent(encoded);
        setEmojiDataUrl(dataUrl);
        setStep(3);
      } catch {
        // ignore
      }
    }
  }, []);

  // Persist gallery
  useEffect(() => {
    try {
      localStorage.setItem('emojiGallery', JSON.stringify(gallery));
    } catch {
      // ignore
    }
  }, [gallery]);

  // Load HTMLImageElement when imageUrl changes
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);
      setStep(2);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Re-render preview canvas when edits change
  useEffect(() => {
    if (!imageElement || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    canvas.width = 256;
    canvas.height = 256;
    renderToCanvas(canvas, true); // apply bg removal for live preview
  }, [imageElement, cropX, cropY, cropZoom, brightness, contrast, filter, removeBg, overlayText]);

  const clearMessages = () => {
    setError('');
    setMessage('');
  };

  const handleFiles = (files) => {
    clearMessages();
    const file = files && files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Use PNG or JPG.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Max 10 MB.');
      return;
    }

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    setImageUrl(objectUrl);
    setEmojiDataUrl('');
    setShareUrl('');
    setOverlayText('');
  };

  const handleFileInputChange = (e) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const renderToCanvas = (canvas, applyBackgroundRemoval = false) => {
    if (!imageElement || !canvas) return;

    const ctx = canvas.getContext('2d');
    const size = Math.min(canvas.width, canvas.height);
    const img = imageElement;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const minSide = Math.min(img.width, img.height);
    const zoomFactor = cropZoom / 100;
    const cropWidth = minSide / zoomFactor;
    const cropHeight = minSide / zoomFactor;

    const maxOffsetX = img.width - cropWidth;
    const maxOffsetY = img.height - cropHeight;
    const sx = Math.max(0, Math.min(maxOffsetX, (cropX / 100) * maxOffsetX));
    const sy = Math.max(0, Math.min(maxOffsetY, (cropY / 100) * maxOffsetY));

    ctx.save();
    let filterString = `brightness(${brightness}) contrast(${contrast})`;
    if (filter === 'grayscale') filterString += ' grayscale(1)';
    if (filter === 'sepia') filterString += ' sepia(1)';
    ctx.filter = filterString;

    ctx.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, size, size);
    ctx.restore();

    if (applyBackgroundRemoval && removeBg) {
      applySimpleBackgroundRemoval(canvas);
    }

    if (overlayText) {
      ctx.save();
      ctx.font = `${Math.floor(size * 0.2)}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = size * 0.04;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.fillStyle = 'white';
      const x = size / 2;
      const y = size - size * 0.05;
      ctx.strokeText(overlayText, x, y);
      ctx.fillText(overlayText, x, y);
      ctx.restore();
    }
  };

  const applySimpleBackgroundRemoval = (canvas) => {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Use top-left pixel as "background" sample
    const baseR = data[0];
    const baseG = data[1];
    const baseB = data[2];
    const tolerance = 30;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (
        Math.abs(r - baseR) <= tolerance &&
        Math.abs(g - baseG) <= tolerance &&
        Math.abs(b - baseB) <= tolerance
      ) {
        data[i + 3] = 0; // transparent
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const handleGenerateEmoji = () => {
    clearMessages();
    if (!imageElement || !emojiCanvasRef.current) {
      setError('Upload and edit a logo first.');
      return;
    }
    const canvas = emojiCanvasRef.current;
    canvas.width = emojiSize;
    canvas.height = emojiSize;
    renderToCanvas(canvas, true);
    const dataUrl = canvas.toDataURL('image/png');
    setEmojiDataUrl(dataUrl);
    setMessage('Emoji generated.');
    setStep(3);
  };

  const handleDownloadPng = () => {
    clearMessages();
    if (!emojiDataUrl) {
      setError('Generate an emoji first.');
      return;
    }
    const a = document.createElement('a');
    a.href = emojiDataUrl;
    a.download = 'logo-emoji.png';
    a.click();
  };

  const handleCopyToClipboard = async () => {
    clearMessages();
    if (!emojiDataUrl) {
      setError('Generate an emoji first.');
      return;
    }
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const res = await fetch(emojiDataUrl);
        const blob = await res.blob();
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        setMessage('Emoji image copied to clipboard.');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(emojiDataUrl);
        setMessage('Emoji data URL copied to clipboard.');
      } else {
        setError('Clipboard API not supported in this browser.');
      }
    } catch {
      setError('Unable to copy to clipboard.');
    }
  };

  const handleGenerateShareLink = async () => {
    clearMessages();
    if (!emojiDataUrl) {
      setError('Generate an emoji first.');
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}#img=${encodeURIComponent(
      emojiDataUrl
    )}`;
    setShareUrl(url);
    setMessage('Shareable link generated.');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My custom logo emoji',
          text: 'Check out this custom emoji I created.',
          url,
        });
      } catch {
        // user may cancel; ignore
      }
    }
  };

  const handleSaveToGallery = () => {
    clearMessages();
    if (!emojiDataUrl) {
      setError('Generate an emoji first.');
      return;
    }
    const item = {
      id: Date.now(),
      dataUrl: emojiDataUrl,
      createdAt: new Date().toISOString(),
      size: emojiSize,
    };
    setGallery((prev) => [item, ...prev].slice(0, 24));
    setMessage('Saved to gallery.');
  };

  const handleUseFromGallery = (dataUrl) => {
    setEmojiDataUrl(dataUrl);
    setStep(3);
  };

  const currentThemeClass = isDark ? 'theme-dark' : 'theme-light';

  return (
    <div className={`app ${currentThemeClass}`}>
      <header className="app-header">
        <div className="header-left">
          <div className="logo-mark">🔧</div>
          <div>
            <h1 className="app-title">Logo → Emoji Converter</h1>
            <p className="app-subtitle">Turn any logo screenshot into a custom emoji-ready image.</p>
          </div>
        </div>
        <div className="header-right">
          <button
            className="btn ghost"
            type="button"
            onClick={() => setIsDark((v) => !v)}
          >
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <StepIndicator currentStep={step} />

        {error && <div className="banner banner-error">{error}</div>}
        {message && <div className="banner banner-success">{message}</div>}

        <section className="content-grid">
          {step === 1 && (
            <section className="card">
              <h2 className="card-title">1. Upload or Capture Logo</h2>
              <p className="card-description">
                Upload a logo screenshot, drag and drop it here, or use your camera on mobile devices.
              </p>

              <div
                className="upload-dropzone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <p className="drop-title">Drag &amp; drop logo image here</p>
                <p className="drop-subtitle">PNG or JPG, up to 10 MB</p>
                <div className="upload-actions">
                  <label className="btn primary">
                    Choose file
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <label className="btn ghost camera-label">
                    Use camera
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {fileInfo && (
                <div className="file-info">
                  <div className="file-row">
                    <span className="file-label">File:</span>
                    <span>{fileInfo.name}</span>
                  </div>
                  <div className="file-row">
                    <span className="file-label">Size:</span>
                    <span>{(fileInfo.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="file-row">
                    <span className="file-label">Type:</span>
                    <span>{fileInfo.type}</span>
                  </div>
                </div>
              )}

              <div className="step-footer">
                <button
                  className="btn secondary"
                  type="button"
                  disabled={!imageElement}
                  onClick={() => setStep(2)}
                >
                  Next: Edit logo
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <>
              <section className="card">
                <h2 className="card-title">2. Edit Logo</h2>
                <p className="card-description">
                  Adjust crop, background, brightness, and filters to create a clean emoji base.
                </p>

                <div className="preview-wrapper">
                  <canvas
                    ref={previewCanvasRef}
                    className="preview-canvas"
                  />
                </div>

                {!imageElement && (
                  <p className="placeholder-text">
                    Upload a logo first on step 1.
                  </p>
                )}

                <div className="step-footer">
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    disabled={!imageElement}
                    onClick={() => setStep(3)}
                  >
                    Skip to preview
                  </button>
                  <button
                    className="btn primary"
                    type="button"
                    disabled={!imageElement}
                    onClick={handleGenerateEmoji}
                  >
                    Generate emoji
                  </button>
                </div>
              </section>

              <section className="card controls-card">
                <h3 className="card-title">Editing Controls</h3>

                <div className="control-group">
                  <label className="control-label">
                    Crop horizontal
                    <span className="control-value">{cropX}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={cropX}
                    onChange={(e) => setCropX(Number(e.target.value))}
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">
                    Crop vertical
                    <span className="control-value">{cropY}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={cropY}
                    onChange={(e) => setCropY(Number(e.target.value))}
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">
                    Zoom
                    <span className="control-value">{cropZoom}%</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">
                    Brightness
                    <span className="control-value">{brightness.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">
                    Contrast
                    <span className="control-value">{contrast.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">Filter</label>
                  <div className="filter-row">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="none">None</option>
                      <option value="grayscale">Grayscale</option>
                      <option value="sepia">Sepia</option>
                    </select>
                  </div>
                </div>

                <div className="control-group horizontal">
                  <label className="control-label">Remove background</label>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={removeBg}
                      onChange={(e) => setRemoveBg(e.target.checked)}
                    />
                    <span className="slider" />
                  </label>
                </div>

                <div className="control-group">
                  <label className="control-label">Overlay text (optional)</label>
                  <input
                    type="text"
                    placeholder="Add short text like 'VIP' or initials"
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value.slice(0, 8))}
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">Emoji size</label>
                  <div className="size-buttons">
                    {[64, 128, 256, 512].map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={`chip ${emojiSize === size ? 'chip-active' : ''}`}
                        onClick={() => setEmojiSize(size)}
                      >
                        {size}×{size}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {step === 3 && (
            <>
              <section className="card">
                <h2 className="card-title">3. Emoji Preview</h2>
                <p className="card-description">
                  Preview your emoji and see how it will look inside a text message bubble.
                </p>

                <div className="emoji-preview-layout">
                  <div className="emoji-preview-main">
                    {emojiDataUrl ? (
                      <img
                        src={emojiDataUrl}
                        alt="Generated emoji"
                        className="emoji-preview-image"
                      />
                    ) : (
                      <div className="placeholder-text">
                        No emoji generated yet. Use step 2 to generate one.
                      </div>
                    )}
                  </div>

                  <div className="chat-preview">
                    <div className="chat-screen">
                      <div className="chat-header">
                        <span className="chat-dot" />
                        <span className="chat-dot" />
                        <span className="chat-dot" />
                      </div>
                      <div className="chat-body">
                        <div className="chat-bubble incoming">
                          Hey, check out this new logo emoji.
                        </div>
                        {emojiDataUrl && (
                          <div className="chat-bubble outgoing emoji-bubble">
                            <img
                              src={emojiDataUrl}
                              alt="Emoji in message"
                              className="chat-emoji"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="step-footer">
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => setStep(2)}
                  >
                    Back to edit
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => setStep(4)}
                    disabled={!emojiDataUrl}
                  >
                    Next: Export
                  </button>
                </div>
              </section>

              <section className="card">
                <h3 className="card-title">Emoji actions</h3>
                <p className="card-description">
                  Quickly download or copy your emoji without leaving the preview step.
                </p>
                <div className="button-row">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={handleDownloadPng}
                  >
                    Download PNG
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={handleCopyToClipboard}
                  >
                    Copy to clipboard
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={handleSaveToGallery}
                  >
                    Save to gallery
                  </button>
                </div>
              </section>
            </>
          )}

          {step === 4 && (
            <>
              <section className="card">
                <h2 className="card-title">4. Export & Share</h2>
                <p className="card-description">
                  Download a transparent PNG, copy to clipboard, or generate a shareable link.
                </p>

                <div className="export-actions">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={handleDownloadPng}
                  >
                    Download PNG
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={handleCopyToClipboard}
                  >
                    Copy to clipboard
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={handleGenerateShareLink}
                  >
                    Generate shareable link
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={handleSaveToGallery}
                  >
                    Save to gallery
                  </button>
                </div>

                {shareUrl && (
                  <div className="share-link">
                    <label>Shareable link (current session):</label>
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                )}

                <div className="step-footer">
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => setStep(3)}
                  >
                    Back to preview
                  </button>
                </div>
              </section>

              <section className="card">
                <h3 className="card-title">Emoji Gallery (local)</h3>
                <p className="card-description">
                  Saved emojis are stored in your browser only. Click one to reuse it.
                </p>
                {gallery.length === 0 ? (
                  <p className="placeholder-text">
                    No emojis in your gallery yet. Save one from steps 3 or 4.
                  </p>
                ) : (
                  <div className="gallery-grid">
                    {gallery.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="gallery-item"
                        onClick={() => handleUseFromGallery(item.dataUrl)}
                      >
                        <img
                          src={item.dataUrl}
                          alt="Saved emoji"
                          className="gallery-image"
                        />
                        <span className="gallery-meta">
                          {item.size}×{item.size}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </main>

      {/* Hidden canvas used for final emoji generation */}
      <canvas
        ref={emojiCanvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
}

function StepIndicator({ currentStep }) {
  const steps = [
    { id: 1, label: 'Upload' },
    { id: 2, label: 'Edit' },
    { id: 3, label: 'Preview' },
    { id: 4, label: 'Export' },
  ];
  return (
    <nav className="stepper">
      {steps.map((step) => {
        const isActive = step.id === currentStep;
        const isComplete = step.id < currentStep;
        return (
          <div
            key={step.id}
            className={`step ${isActive ? 'step-active' : ''} ${
              isComplete ? 'step-complete' : ''
            }`}
          >
            <div className="step-circle">
              {isComplete ? '✓' : step.id}
            </div>
            <div className="step-label">{step.label}</div>
          </div>
        );
      })}
    </nav>
  );
}

export default App;
