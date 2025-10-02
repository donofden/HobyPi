(() => {
  'use strict';

  const BLANK_FRAME = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText);
    }
    return response.json();
  };

  const toArray = (target) => (Array.isArray(target) ? target : [target]).filter(Boolean);

  const elements = {
    timestamp: document.getElementById('timestamp-overlay'),
    autoRefreshToggle: document.getElementById('auto-refresh'),
    overlayToggle: document.getElementById('toggle-overlay'),
    focusButtons: document.querySelectorAll('button[data-focus-mode]'),
    focusManualGroup: document.getElementById('focus-manual'),
    focusPositionInput: document.getElementById('focus-position'),
    focusPositionValue: document.getElementById('focus-position-value'),
    focusApplyBtn: document.getElementById('btn-focus-apply'),
    zoomSlider: document.getElementById('zoom-slider'),
    zoomValue: document.getElementById('zoom-value'),
    zoomApplyBtn: document.getElementById('btn-zoom-apply'),
    metadataButton: document.getElementById('btn-fetch-metadata'),
    metadataView: document.getElementById('metadata-view'),
    aeCheckbox: document.getElementById('toggle-ae'),
    awbCheckbox: document.getElementById('toggle-awb'),
    exposureInput: document.getElementById('exposure-input'),
    gainInput: document.getElementById('gain-input'),
    applyQualityBtn: document.getElementById('btn-apply-quality'),
    manualQualityGroup: document.getElementById('manual-quality'),
  };

  let overlayEnabled = !!(elements.overlayToggle && elements.overlayToggle.checked);
  let timestampTimer = null;
  let autoRefresh = !!(elements.autoRefreshToggle ? elements.autoRefreshToggle.checked : true);
  let refreshTimer = null;

  const setLoadingState = (targets, isLoading) => {
    toArray(targets).forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      if (isLoading) {
        btn.classList.add('loading');
        if (!btn.hasAttribute('disabled')) {
          btn.dataset.prevDisabled = '0';
        } else if (!btn.dataset.prevDisabled) {
          btn.dataset.prevDisabled = '1';
        }
        btn.disabled = true;
      } else {
        btn.classList.remove('loading');
        if (btn.dataset.prevDisabled === '0') {
          btn.disabled = false;
        }
        delete btn.dataset.prevDisabled;
      }
    });
  };

  const withLoading = async (targets, fn) => {
    const buttonList = toArray(targets);
    setLoadingState(buttonList, true);
    try {
      return await fn();
    } finally {
      setLoadingState(buttonList, false);
    }
  };

  const updateTimestamp = () => {
    if (!overlayEnabled || !elements.timestamp) return;
    elements.timestamp.textContent = new Date().toLocaleString();
  };

  const startTimestampTimer = () => {
    if (!overlayEnabled || !elements.timestamp) return;
    if (timestampTimer) clearInterval(timestampTimer);
    updateTimestamp();
    timestampTimer = setInterval(updateTimestamp, 1000);
  };

  const stopTimestampTimer = () => {
    if (timestampTimer) {
      clearInterval(timestampTimer);
      timestampTimer = null;
    }
  };

  const updatePreviewCacheBust = () => {
    const img = document.getElementById('view');
    if (!img) return;
    const nextUrl = new URL('stream.mjpg', window.location.href);
    nextUrl.searchParams.set('_', Date.now().toString());
    img.src = nextUrl.toString();
  };

  const renderList = (selector, files, basePath, countId) => {
    const container = document.querySelector(selector);
    if (!container) return;
    if (!files.length) {
      container.innerHTML = '<small>None.</small>';
      if (countId) {
        const countEl = document.getElementById(countId);
        if (countEl) countEl.textContent = '0';
      }
      return;
    }

    const links = files
      .map((file) => `<li><a target="_blank" rel="noreferrer" href="${basePath}/${encodeURIComponent(file)}">${file}</a></li>`)
      .join('');

    let thumbMarkup = '';
    if (selector === '#snaps') {
      const thumbs = files
        .slice(-4)
        .reverse()
        .map((file) => `<a href="${basePath}/${encodeURIComponent(file)}" target="_blank" rel="noreferrer"><img class="thumb" src="${basePath}/${encodeURIComponent(file)}" alt="${file}"/></a>`)
        .join('');
      thumbMarkup = `<div class="thumb-grid">${thumbs}</div>`;
    } else if (selector === '#vids') {
      const thumbs = files
        .slice(-3)
        .reverse()
        .map((file) => `<video class="thumb" src="${basePath}/${encodeURIComponent(file)}#t=0.1" muted preload="metadata"></video>`)
        .join('');
      thumbMarkup = `<div class="thumb-grid">${thumbs}</div>`;
    }

    container.innerHTML = `${thumbMarkup}<ul>${links}</ul>`;
    if (countId) {
      const countEl = document.getElementById(countId);
      if (countEl) countEl.textContent = String(files.length);
    }
  };

  const updateButtonHighlights = (state) => {
    const setActive = (selector, active) => {
      document.querySelectorAll(selector).forEach((btn) => btn.classList.toggle('active', !!active));
    };

    setActive('[data-action="start"]', state.running);
    setActive('[data-action="pause"]', state.paused);
    setActive('[data-action="resume"]', state.running && !state.paused);
    setActive('[data-action="stop"]', !state.running);
    setActive('[data-flip="h"]', state.hflip);
    setActive('[data-flip="v"]', state.vflip);
    setActive('[data-record="start"]', state.recording.active);
    setActive('[data-record="stop"]', !state.recording.active);

    if (state.advanced && state.advanced.focus) {
      elements.focusButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.focusMode === state.advanced.focus.mode);
      });
    }
  };

  const updateFocusUI = (focusState) => {
    if (!focusState) return;
    const isManual = focusState.mode === 'manual';
    if (elements.focusManualGroup) {
      elements.focusManualGroup.classList.toggle('disabled', !isManual);
    }
    if (elements.focusPositionInput) {
      elements.focusPositionInput.disabled = !isManual;
      if (isManual && typeof focusState.lens_position === 'number') {
        elements.focusPositionInput.value = focusState.lens_position;
      }
      if (elements.focusPositionValue) {
        elements.focusPositionValue.textContent = Number(elements.focusPositionInput.value).toFixed(1);
      }
    }
    if (elements.focusApplyBtn) {
      elements.focusApplyBtn.disabled = !isManual;
    }
    elements.focusButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.focusMode === focusState.mode);
    });
  };

  const updateQualityUI = (qualityState) => {
    if (!qualityState) return;
    if (elements.aeCheckbox) {
      elements.aeCheckbox.checked = !!qualityState.ae;
    }
    if (elements.awbCheckbox) {
      elements.awbCheckbox.checked = !!qualityState.awb;
    }
    if (typeof qualityState.exposure === 'number' && elements.exposureInput) {
      elements.exposureInput.value = qualityState.exposure;
    }
    if (typeof qualityState.gain === 'number' && elements.gainInput) {
      elements.gainInput.value = Number(qualityState.gain).toFixed(2);
    }
    const manualDisabled = !!(elements.aeCheckbox && elements.aeCheckbox.checked);
    if (elements.manualQualityGroup) {
      elements.manualQualityGroup.classList.toggle('disabled', manualDisabled);
    }
    if (elements.exposureInput) elements.exposureInput.disabled = manualDisabled;
    if (elements.gainInput) elements.gainInput.disabled = manualDisabled;
    if (elements.applyQualityBtn) elements.applyQualityBtn.disabled = manualDisabled;
  };

  const updatePreviewOverlay = (state) => {
    const previewCard = document.querySelector('.card.preview');
    const img = document.getElementById('view');
    if (!previewCard || !img) return;

    previewCard.classList.toggle('stopped', !state.running);

    if (!state.running) {
      img.dataset.paused = '1';
      if (!img.src.startsWith('data:image')) {
        img.src = BLANK_FRAME;
      }
      if (overlayEnabled && elements.timestamp) {
        elements.timestamp.style.display = 'block';
        elements.timestamp.textContent = 'Stream stopped';
      }
      stopTimestampTimer();
    } else if (img.dataset.paused === '1') {
      updatePreviewCacheBust();
      delete img.dataset.paused;
      if (overlayEnabled && elements.timestamp) {
        elements.timestamp.style.display = 'block';
        startTimestampTimer();
      }
    } else if (overlayEnabled && elements.timestamp) {
      elements.timestamp.style.display = 'block';
      startTimestampTimer();
    }

    if (!overlayEnabled && elements.timestamp) {
      elements.timestamp.style.display = 'none';
      stopTimestampTimer();
    }
  };

  const refreshState = async () => {
    const state = await fetchJson('/api/state');

    const valueMap = {
      st_name: state.settings.name,
      st_run: String(state.running),
      st_pause: String(state.paused),
      st_rec: state.recording.active ? `on (${state.recording.file})` : 'off',
      st_flip: `h:${state.hflip ? 'on' : 'off'} v:${state.vflip ? 'on' : 'off'}`,
      st_cfg: `${state.config.width}x${state.config.height}@${state.config.fps} q=${state.config.quality}`,
      st_op: state.op.status,
    };

    Object.entries(valueMap).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });

    const widthInput = document.getElementById('w');
    const heightInput = document.getElementById('h');
    const fpsInput = document.getElementById('fps');
    const qualityInput = document.getElementById('q');
    if (widthInput) widthInput.value = state.config.width;
    if (heightInput) heightInput.value = state.config.height;
    if (fpsInput) fpsInput.value = state.config.fps;
    if (qualityInput) qualityInput.value = state.config.quality;

    updateButtonHighlights(state);
    updatePreviewOverlay(state);

    if (state.advanced) {
      if (state.advanced.focus) {
        updateFocusUI(state.advanced.focus);
      }
      if (state.advanced.zoom && elements.zoomSlider && elements.zoomValue) {
        elements.zoomSlider.value = state.advanced.zoom;
        elements.zoomValue.textContent = `${Number(state.advanced.zoom).toFixed(1)}×`;
      }
    }

    if (state.quality) {
      updateQualityUI(state.quality);
    }

    return state;
  };

  const refreshSnapshots = async () => {
    const data = await fetchJson('/api/snaps');
    renderList('#snaps', data.files, '/snapshots', 'count-snaps');
  };

  const refreshVideos = async () => {
    const data = await fetchJson('/api/videos');
    renderList('#vids', data.files, '/videos', 'count-vids');
  };

  const refreshLogs = async () => {
    const data = await fetchJson('/api/logs');
    const el = document.getElementById('logs');
    if (el) {
      el.textContent = data.lines.join('\n');
      el.scrollTop = el.scrollHeight;
    }
  };

  const callAction = (button) => withLoading(button, async () => {
    const action = button.dataset.action;
    await fetchJson(`/api/${action}`);
    if (action === 'start' || action === 'resume') {
      updatePreviewCacheBust();
    }
    await Promise.all([refreshState(), refreshLogs()]);
  });

  const toggleFlip = (button, mode) => withLoading(button, async () => {
    const state = await fetchJson('/api/state');
    let hflip = state.hflip;
    let vflip = state.vflip;
    if (mode === 'h') hflip = !hflip;
    else if (mode === 'v') vflip = !vflip;
    else {
      hflip = false;
      vflip = false;
    }
    await fetchJson(`/api/flip?h=${hflip ? 1 : 0}&v=${vflip ? 1 : 0}`);
    updatePreviewCacheBust();
    await Promise.all([refreshState(), refreshLogs()]);
  });

  const captureSnapshot = (button) => withLoading(button, async () => {
    try {
      await fetchJson('/api/snapshot');
    } catch (error) {
      alert(`Snapshot failed: ${error.message}`);
    }
    await Promise.all([refreshSnapshots(), refreshLogs()]);
  });

  const handleRecording = (button, command) => withLoading(button, async () => {
    try {
      await fetchJson(`/api/record?cmd=${encodeURIComponent(command)}`);
    } catch (error) {
      alert(`Recording failed: ${error.message}`);
    }
    await Promise.all([refreshState(), refreshVideos(), refreshLogs()]);
  });

  const clearSnapshots = (button) => withLoading(button, async () => {
    await fetchJson('/api/snaps/clear', { method: 'POST' });
    await Promise.all([refreshSnapshots(), refreshLogs()]);
  });

  const clearVideos = (button) => withLoading(button, async () => {
    await fetchJson('/api/videos/clear', { method: 'POST' });
    await Promise.all([refreshVideos(), refreshLogs()]);
  });

  const applyPreset = () => {
    const value = document.getElementById('preset')?.value;
    if (!value) return;
    const [wh, fps] = value.split('@');
    const [width, height] = wh.split('x');
    const widthInput = document.getElementById('w');
    const heightInput = document.getElementById('h');
    const fpsInput = document.getElementById('fps');
    if (widthInput) widthInput.value = width;
    if (heightInput) heightInput.value = height;
    if (fpsInput) fpsInput.value = fps;
  };

  const applyCustomConfig = (button) => withLoading(button, async () => {
    const width = Number(document.getElementById('w')?.value);
    const height = Number(document.getElementById('h')?.value);
    const fps = Number(document.getElementById('fps')?.value);
    const quality = Number(document.getElementById('q')?.value);
    await fetchJson(`/api/config?width=${width}&height=${height}&fps=${fps}&quality=${quality}`);
    updatePreviewCacheBust();
    await Promise.all([refreshState(), refreshLogs()]);
  });

  const updateFocus = (mode, button, lensPosition) => withLoading(button, async () => {
    const payload = { mode };
    if (mode === 'manual') {
      payload.lens_position = typeof lensPosition === 'number'
        ? lensPosition
        : Number(elements.focusPositionInput?.value ?? 0);
    }
    await fetchJson('/api/advanced/focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await refreshState();
  });

  const applyZoom = (button) => withLoading(button, async () => {
    const factor = Number(elements.zoomSlider?.value ?? 1);
    await fetchJson('/api/advanced/zoom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factor }),
    });
    await refreshState();
  });

  const fetchMetadata = (button) => withLoading(button, async () => {
    if (!elements.metadataView) return;
    try {
      const data = await fetchJson('/api/metadata');
      elements.metadataView.textContent = JSON.stringify(data.metadata, null, 2) || '-';
    } catch (error) {
      elements.metadataView.textContent = `Error: ${error.message}`;
    }
  });

  const applyQuality = (button) => withLoading(button, async () => {
    const payload = {
      ae: !!(elements.aeCheckbox && elements.aeCheckbox.checked),
      awb: !!(elements.awbCheckbox && elements.awbCheckbox.checked),
    };
    if (!payload.ae) {
      payload.exposure = Number(elements.exposureInput?.value ?? 0);
      payload.gain = Number(elements.gainInput?.value ?? 0);
    }
    await fetchJson('/api/advanced/exposure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await refreshState();
  });

  const scheduleAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (!autoRefresh) {
      return;
    }
    refreshTimer = setInterval(() => {
      refreshState().catch(() => {});
      refreshLogs().catch(() => {});
    }, 3000);
  };

  const bootstrap = async () => {
    const state = await refreshState();
    document.title = `${state.settings.name} – Pi Camera`;
    await Promise.all([refreshSnapshots(), refreshVideos(), refreshLogs()]);
    if (!state.running) {
      try {
        await fetchJson('/api/start');
      } catch (error) {
        console.warn('Auto-start failed', error);
      }
    }
    scheduleAutoRefresh();
  };

  document.querySelectorAll('button[data-action]').forEach((button) => {
    button.addEventListener('click', (event) => callAction(event.currentTarget));
  });

  document.querySelectorAll('button[data-flip]').forEach((button) => {
    button.addEventListener('click', (event) => toggleFlip(event.currentTarget, event.currentTarget.dataset.flip));
  });

  elements.focusButtons.forEach((button) => {
    button.addEventListener('click', (event) => updateFocus(event.currentTarget.dataset.focusMode, event.currentTarget));
  });

  if (elements.focusPositionInput && elements.focusPositionValue) {
    elements.focusPositionInput.addEventListener('input', () => {
      elements.focusPositionValue.textContent = Number(elements.focusPositionInput.value).toFixed(1);
    });
  }

  if (elements.focusApplyBtn) {
    elements.focusApplyBtn.addEventListener('click', (event) =>
      updateFocus('manual', event.currentTarget, Number(elements.focusPositionInput?.value ?? 0)),
    );
  }

  if (elements.zoomSlider && elements.zoomValue) {
    elements.zoomSlider.addEventListener('input', () => {
      elements.zoomValue.textContent = `${Number(elements.zoomSlider.value).toFixed(1)}×`;
    });
  }

  if (elements.zoomApplyBtn) {
    elements.zoomApplyBtn.addEventListener('click', (event) => applyZoom(event.currentTarget));
  }

  if (elements.metadataButton) {
    elements.metadataButton.addEventListener('click', (event) => fetchMetadata(event.currentTarget));
  }

  const snapshotBtn = document.getElementById('btn-snapshot');
  if (snapshotBtn) {
    snapshotBtn.addEventListener('click', (event) => captureSnapshot(event.currentTarget));
  }

  const clearSnapsBtn = document.getElementById('btn-clear-snaps');
  if (clearSnapsBtn) {
    clearSnapsBtn.addEventListener('click', (event) => clearSnapshots(event.currentTarget));
  }

  document.querySelectorAll('button[data-record]').forEach((button) => {
    button.addEventListener('click', (event) => handleRecording(event.currentTarget, event.currentTarget.dataset.record));
  });

  const clearVideosBtn = document.getElementById('btn-clear-videos');
  if (clearVideosBtn) {
    clearVideosBtn.addEventListener('click', (event) => clearVideos(event.currentTarget));
  }

  const presetSelect = document.getElementById('preset');
  if (presetSelect) {
    presetSelect.addEventListener('change', applyPreset);
  }

  const applyConfigBtn = document.getElementById('btn-apply-config');
  if (applyConfigBtn) {
    applyConfigBtn.addEventListener('click', (event) => applyCustomConfig(event.currentTarget));
  }

  const refreshLogsBtn = document.getElementById('btn-refresh-logs');
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', (event) => withLoading(event.currentTarget, () => refreshLogs()));
  }

  if (elements.aeCheckbox) {
    elements.aeCheckbox.addEventListener('change', () => {
      updateQualityUI({
        ae: elements.aeCheckbox.checked,
        awb: elements.awbCheckbox ? elements.awbCheckbox.checked : true,
        exposure: Number(elements.exposureInput?.value ?? 0),
        gain: Number(elements.gainInput?.value ?? 0),
      });
      applyQuality(null).catch((error) => console.error('Quality update failed', error));
    });
  }

  if (elements.awbCheckbox) {
    elements.awbCheckbox.addEventListener('change', () => {
      updateQualityUI({
        ae: elements.aeCheckbox ? elements.aeCheckbox.checked : true,
        awb: elements.awbCheckbox.checked,
        exposure: Number(elements.exposureInput?.value ?? 0),
        gain: Number(elements.gainInput?.value ?? 0),
      });
      applyQuality(null).catch((error) => console.error('Quality update failed', error));
    });
  }

  if (elements.applyQualityBtn) {
    elements.applyQualityBtn.addEventListener('click', (event) => applyQuality(event.currentTarget));
  }

  if (elements.overlayToggle) {
    elements.overlayToggle.addEventListener('change', (event) => {
      overlayEnabled = event.target.checked;
      if (overlayEnabled) {
        if (elements.timestamp) {
          elements.timestamp.style.display = 'block';
        }
        startTimestampTimer();
      } else {
        if (elements.timestamp) {
          elements.timestamp.style.display = 'none';
        }
        stopTimestampTimer();
      }
    });
  }

  if (elements.autoRefreshToggle) {
    elements.autoRefreshToggle.addEventListener('change', (event) => {
      autoRefresh = event.target.checked;
      if (autoRefresh) {
        refreshState().catch(() => {});
        refreshLogs().catch(() => {});
      }
      scheduleAutoRefresh();
    });
  }

  if (elements.focusPositionValue && elements.focusPositionInput) {
    elements.focusPositionValue.textContent = Number(elements.focusPositionInput.value).toFixed(1);
  }
  if (elements.zoomValue && elements.zoomSlider) {
    elements.zoomValue.textContent = `${Number(elements.zoomSlider.value).toFixed(1)}×`;
  }
  if (elements.metadataView) {
    elements.metadataView.textContent = '-';
  }
  if (overlayEnabled && elements.timestamp) {
    elements.timestamp.style.display = 'block';
    startTimestampTimer();
  }

  bootstrap().catch((error) => {
    console.error('Failed to bootstrap UI', error);
    alert(`Failed to load camera state: ${error.message}`);
  });
})();
