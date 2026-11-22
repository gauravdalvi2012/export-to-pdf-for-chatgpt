export interface ProgressIndicator {
  progressHost: HTMLElement;
  showProgress: (label: string, fraction: number, description?: string) => void;
  checkCancelled: () => void;
  remove: () => void;
}

export function createProgressIndicator(): ProgressIndicator {
  const progressHost = document.createElement('div');
  progressHost.id = 'chatpdf-export-progress';
  progressHost.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483647;' +
    'width:300px;max-width:calc(100vw - 36px);font-family:Arial,Helvetica,sans-serif;';
  const progressShadow = progressHost.attachShadow({mode:'closed'});
  progressShadow.innerHTML = `<style>
    *{box-sizing:border-box}
    .panel{background:#20242b;color:#f7f8fa;padding:15px 16px 12px;border:1px solid #50596a;
      border-radius:12px;box-shadow:0 8px 26px #0007;font:13px/1.4 Arial,sans-serif}
    .top{display:flex;align-items:center;justify-content:space-between;gap:9px}
    .title{font-weight:700;font-size:13px}.stage{margin:9px 0 6px;color:#cbd5e1;font-size:12px}
    .track{height:5px;background:#4b5563;border-radius:5px;overflow:hidden}
    .bar{height:100%;width:0%;background:#93c5fd;transition:width .22s ease}
    .info{font-size:11px;color:#cbd5e1;margin-top:9px}
    button{border:1px solid #718096;color:#f8fafc;border-radius:6px;background:#313c49;
      padding:5px 9px;cursor:pointer;font:11px Arial,sans-serif}
    button:hover{background:#4d5d6f}
  </style><div class="panel" role="status" aria-live="polite">
    <div class="top"><span class="title">Exporting ChatGPT conversation</span>
      <button type="button" id="cancel">Cancel</button></div>
    <div class="stage" id="stage">Preparing conversation scan…</div>
    <div class="track"><div class="bar" id="bar"></div></div>
    <div class="info" id="info">Checking loaded messages</div>
  </div>`;
  document.body.appendChild(progressHost);
  const progressStage = progressShadow.getElementById('stage') as HTMLElement;
  const progressBar = progressShadow.getElementById('bar') as HTMLElement;
  const progressInfo = progressShadow.getElementById('info') as HTMLElement;
  let scanCancelled = false;
  progressShadow.getElementById('cancel')?.addEventListener('click', () => {
    scanCancelled = true;
    if (progressStage) progressStage.textContent = 'Cancelling export…';
  });

  function checkCancelled(): void {
    if (scanCancelled) throw new Error('Export cancelled.');
  }

  function showProgress(label: string, fraction: number, description?: string): void {
    if (progressHost && progressHost.isConnected) {
      if (progressStage) progressStage.textContent = label;
      if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, Math.round(fraction * 100)))}%`;
      if (description && progressInfo) progressInfo.textContent = description;
    }
  }

  function remove(): void {
    progressHost?.remove();
  }

  return {
    progressHost,
    showProgress,
    checkCancelled,
    remove
  };
}
