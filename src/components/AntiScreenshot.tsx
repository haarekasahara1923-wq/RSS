'use client'
import { useEffect } from 'react'

export function AntiScreenshot() {
  useEffect(() => {
    // Disable right click
    const disableRightClick = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', disableRightClick);

    // Copying and keyboard shortcuts for screenshots
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        alert('Screenshots are disabled for security reasons.');
        e.preventDefault();
      }

      // Mac screenshot shortcuts: Cmd + Shift + 3, 4, 5
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
      }
      
      // Windows Snipping tool: Win + Shift + S
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
      }

      // Cmd+C or Ctrl+C to prevent copying if needed
      // if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      //   e.preventDefault();
      // }
    };
    
    document.addEventListener('keydown', handleKeyDown);

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'PrintScreen') {
            navigator.clipboard.writeText('');
        }
    };
    document.addEventListener('keyup', handleKeyUp);

    // Black screen / blur when window loses focus (preventing background screenshots / snipping tool overlays sometimes)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.style.filter = 'blur(10px) brightness(0)';
      } else {
        document.body.style.filter = 'none';
      }
    };
    
    const handleBlur = () => {
        document.body.style.filter = 'blur(10px) brightness(0)';
    };

    const handleFocus = () => {
        document.body.style.filter = 'none';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.body.style.filter = 'none';
    };
  }, []);

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      /* Prevent text selection and image dragging */
      body {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      img {
        -webkit-user-drag: none;
      }
    `}} />
  );
}
