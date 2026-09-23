// Runs before the app so the first paint already has the right theme: dark unless the visitor chose light.
try { document.documentElement.setAttribute('data-theme', localStorage.getItem('tw-theme') === 'light' ? 'light' : 'dark') } catch (e) { document.documentElement.setAttribute('data-theme', 'dark') }
