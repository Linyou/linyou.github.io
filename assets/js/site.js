// Progressive enhancement only: every section is readable without this file.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Nav: hairline once the page scrolls, mobile menu, current section */
  const nav = document.querySelector('[data-nav]');
  const sentinel = document.querySelector('.nav-sentinel');
  if (nav && sentinel) {
    new IntersectionObserver(([entry]) => {
      nav.classList.toggle('is-scrolled', !entry.isIntersecting);
    }).observe(sentinel);
  }

  const toggle = nav && nav.querySelector('[data-nav-toggle]');
  if (toggle) {
    const icon = toggle.querySelector('.ph');
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? (toggle.dataset.labelClose || 'Close menu') : (toggle.dataset.labelOpen || 'Open menu'));
      icon.classList.toggle('ph-list', !open);
      icon.classList.toggle('ph-x', open);
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  const navLinks = new Map();
  document.querySelectorAll('.nav-links a[href^="#"]').forEach((a) => navLinks.set(a.getAttribute('href').slice(1), a));
  if (navLinks.size) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = navLinks.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach((l) => l.removeAttribute('aria-current'));
          link.setAttribute('aria-current', 'true');
        } else if (link.hasAttribute('aria-current')) {
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });
  }

  /* Reveal on scroll */
  const revealables = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach((el) => revealObserver.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

  /* Videos: play only while on screen, never under reduced motion, always pausable */
  document.querySelectorAll('video[data-autoplay]').forEach((video) => {
    const button = video.parentElement.querySelector('[data-video-toggle]');
    const icon = button && button.querySelector('.ph');
    let userPaused = reduceMotion.matches;
    let onScreen = false;

    const sync = () => {
      if (!button) return;
      const playing = !video.paused;
      button.setAttribute('aria-label', playing ? (button.dataset.labelPause || 'Pause video') : (button.dataset.labelPlay || 'Play video'));
      icon.classList.toggle('ph-pause', playing);
      icon.classList.toggle('ph-play', !playing);
    };
    const play = () => {
      const p = video.play();
      if (p && p.catch) p.catch(() => sync());
    };

    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();

    if (button) {
      button.addEventListener('click', () => {
        if (video.paused) {
          userPaused = false;
          play();
        } else {
          userPaused = true;
          video.pause();
        }
      });
    }

    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen && !userPaused) play();
      else if (!onScreen && !video.paused) video.pause();
    }, { threshold: 0.35 }).observe(video);
  });

  /* Demo reels: each clip plays once, then the reel rolls on to the next,
     reversing at either end. Paused off screen and under reduced motion. */
  document.querySelectorAll('[data-reel]').forEach((reel) => {
    const track = reel.querySelector('.reel-track');
    const slides = [...track.children];
    const videos = slides.map((slide) => slide.querySelector('video'));
    const dotsWrap = reel.querySelector('.reel-dots');
    const button = reel.querySelector('[data-video-toggle]');
    const icon = button.querySelector('.ph');
    const label = reel.dataset.reelLabel || 'Example %1 of %2';
    let index = 0;
    let dir = 1;
    let userPaused = reduceMotion.matches;
    let onScreen = false;
    let frame = 0;

    const current = () => videos[index];
    const sync = () => {
      const playing = !current().paused;
      button.setAttribute('aria-label', playing ? (button.dataset.labelPause || 'Pause video') : (button.dataset.labelPlay || 'Play video'));
      icon.classList.toggle('ph-pause', playing);
      icon.classList.toggle('ph-play', !playing);
    };
    const play = () => {
      const p = current().play();
      if (p && p.catch) p.catch(() => sync());
    };
    const progress = () => {
      const video = current();
      dots[index].style.setProperty('--p', video.duration ? video.currentTime / video.duration : 0);
      frame = video.paused ? 0 : requestAnimationFrame(progress);
    };

    const show = (next) => {
      if (next !== index) {
        current().pause();
        dots[index].style.setProperty('--p', 0);
        index = next;
        current().currentTime = 0;
      }
      track.style.transform = `translateX(${-100 * index}%)`;
      slides.forEach((slide, i) => { slide.inert = i !== index; });
      dots.forEach((dot, i) => {
        if (i === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      if (onScreen && !userPaused) play();
      else sync();
    };
    const advance = () => {
      if (!videos[index + dir]) dir = -dir;
      show(index + dir);
    };

    const dots = videos.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', label.replace('%1', i + 1).replace('%2', videos.length));
      dot.append(document.createElement('span'));
      dot.addEventListener('click', () => show(i));
      dotsWrap.append(dot);
      return dot;
    });

    videos.forEach((video, i) => {
      video.addEventListener('ended', () => { if (i === index) advance(); });
      video.addEventListener('play', () => {
        if (i !== index) return;
        sync();
        cancelAnimationFrame(frame);
        progress();
      });
      video.addEventListener('pause', () => { if (i === index) sync(); });
      // Fetch the next clip once this one is buffered, so the roll lands on a playing video.
      video.addEventListener('canplaythrough', () => {
        const next = videos[i + dir] || videos[i - dir];
        if (i === index && next && next.preload === 'none') next.preload = 'auto';
      });
    });

    button.addEventListener('click', () => {
      if (current().paused) {
        userPaused = false;
        play();
      } else {
        userPaused = true;
        current().pause();
      }
    });

    let startX = null;
    track.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    track.addEventListener('pointercancel', () => { startX = null; });
    track.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      const next = index + (dx < 0 ? 1 : -1);
      if (Math.abs(dx) < 40 || !videos[next]) return;
      dir = dx < 0 ? 1 : -1;
      show(next);
    });

    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen && !userPaused) play();
      else if (!onScreen && !current().paused) current().pause();
    }, { threshold: 0.35 }).observe(reel);

    show(0);
  });

  /* News shelf arrows */
  document.querySelectorAll('[data-shelf-nav]').forEach((controls) => {
    const shelf = document.getElementById(controls.dataset.shelfNav);
    if (!shelf) return;
    const items = shelf.children;
    const [prev, next] = controls.querySelectorAll('button');

    const step = () => {
      const first = items[0];
      const gap = parseFloat(getComputedStyle(shelf).columnGap) || 0;
      const cardWidth = first.getBoundingClientRect().width + gap;
      return Math.max(1, Math.floor(shelf.clientWidth / cardWidth) - 1) * cardWidth;
    };
    controls.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        shelf.scrollBy({ left: Number(btn.dataset.dir) * step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      });
    });

    const edgeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === items[0]) prev.disabled = entry.intersectionRatio > 0.95;
        if (entry.target === items[items.length - 1]) next.disabled = entry.intersectionRatio > 0.95;
      });
    }, { root: shelf, threshold: [0, 0.95, 1] });
    edgeObserver.observe(items[0]);
    edgeObserver.observe(items[items.length - 1]);
  });

  /* Publication filter: segmented control with a sliding thumb */
  const filter = document.querySelector('[data-pub-filter]');
  if (filter) {
    const buttons = [...filter.querySelectorAll('button[data-filter]')];
    const thumb = filter.querySelector('.segmented-thumb');
    const pubs = [...document.querySelectorAll('#publications .pub')];
    const years = [...document.querySelectorAll('#publications [data-year]')];

    const moveThumb = () => {
      const active = buttons.find((b) => b.getAttribute('aria-checked') === 'true');
      thumb.style.width = `${active.offsetWidth}px`;
      thumb.style.transform = `translateX(${active.offsetLeft}px)`;
    };

    const apply = (value, focus) => {
      buttons.forEach((b) => {
        const on = b.dataset.filter === value;
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      moveThumb();
      pubs.forEach((pub) => {
        pub.hidden = value === 'lead' && !pub.hasAttribute('data-lead');
        pub.classList.remove('is-shown');
        if (!pub.hidden && !reduceMotion.matches) {
          void pub.offsetWidth;
          pub.classList.add('is-shown');
        }
      });
      years.forEach((year) => {
        year.hidden = !year.querySelector('.pub:not([hidden])');
      });
    };

    buttons.forEach((b, i) => {
      b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
      b.addEventListener('click', () => apply(b.dataset.filter));
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const nextIndex = (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        apply(buttons[nextIndex].dataset.filter, true);
      });
    });

    moveThumb();
    if ('ResizeObserver' in window) new ResizeObserver(moveThumb).observe(filter);
  }
})();
