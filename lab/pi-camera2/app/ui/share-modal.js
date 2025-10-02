(() => {
  'use strict';

  const modal = document.getElementById('share-modal');
  if (!modal) return;

  const toggle = (visible) => {
    modal.hidden = !visible;
    modal.setAttribute('aria-hidden', visible ? 'false' : 'true');
  };

  const linkField = modal.querySelector('[data-share-link]');
  const copyButton = modal.querySelector('[data-share-copy]');

  document.querySelectorAll('[data-share-open]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      if (linkField) {
        linkField.value = window.location.href;
        linkField.focus();
        linkField.select();
      }
      toggle(true);
    });
  });

  modal.querySelectorAll('[data-share-close]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      toggle(false);
    });
  });

  if (copyButton && linkField && navigator.clipboard) {
    copyButton.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await navigator.clipboard.writeText(linkField.value);
        copyButton.dataset.copied = '1';
        setTimeout(() => {
          delete copyButton.dataset.copied;
        }, 1500);
      } catch (error) {
        console.warn('Share copy failed', error);
      }
    });
  }
})();
