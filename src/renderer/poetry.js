document.addEventListener("DOMContentLoaded", () => {
  function isPoem(text) {
    const segments = text
      .split(/[，。！？]/)
      .filter((s) => s.trim().length > 0);
    if (segments.length <= 1) return false;

    let totalLen = 0;
    let maxLen = 0;
    let minLen = Infinity;

    segments.forEach((s) => {
      const len = s.length;
      totalLen += len;
      if (len > maxLen) maxLen = len;
      if (len < minLen) minLen = len;
    });

    const averageLen = totalLen / segments.length;
    return maxLen - minLen < averageLen / 2 && segments.length >= 2;
  }

  function smartWrapPoetry(text) {
    const IDEAL_CHARS_PER_LINE = 15;
    const MAX_LINES = 4;
    const MAX_CHARS_TOLERANCE = 5;
    const delimiters = /[，、。；！？.,]/;

    const rawSegments = text
      .split(new RegExp(`(${delimiters.source})`))
      .filter((s) => s.length > 0);

    let processedSegments = [];
    for (let i = 0; i < rawSegments.length; i++) {
      let segment = rawSegments[i];
      if (segment.match(delimiters)) {
        if (
          processedSegments.length > 0 &&
          !processedSegments[processedSegments.length - 1].match(delimiters)
        ) {
          processedSegments[processedSegments.length - 1] += segment;
        } else {
          processedSegments.push(segment);
        }
      } else {
        processedSegments.push(segment);
      }
    }

    let lines = [];
    let currentLine = "";

    for (let i = 0; i < processedSegments.length; i++) {
      let segment = processedSegments[i].trim();

      if (segment.length === 0) continue;

      const wouldExceedIdeal =
        (currentLine + segment).length >
        IDEAL_CHARS_PER_LINE + MAX_CHARS_TOLERANCE;
      const wouldExceedMaxLines = lines.length >= MAX_LINES - 1;

      if (currentLine.length === 0) {
        currentLine = segment;
      } else if (!wouldExceedIdeal && !wouldExceedMaxLines) {
        currentLine += segment;
      } else {
        lines.push(currentLine);
        currentLine = segment;
      }

      if (
        segment.match(delimiters) &&
        currentLine.length > 0 &&
        currentLine === segment
      ) {
        if (
          currentLine.length <= IDEAL_CHARS_PER_LINE + MAX_CHARS_TOLERANCE &&
          lines.length < MAX_LINES
        ) {
          if (lines.length < MAX_LINES) {
            lines.push(currentLine);
            currentLine = "";
          }
        }
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    const allLinesValid = lines.every(
      (line) =>
        line.length > 0 &&
        line.length <= IDEAL_CHARS_PER_LINE + MAX_CHARS_TOLERANCE
    );
    const totalLinesValid = lines.length > 1 && lines.length <= MAX_LINES;

    const originalClean = text.replace(/\s/g, "");
    const wrappedClean = lines.join("").replace(/\s/g, "");
    const allContentWrapped = originalClean === wrappedClean;

    if (allLinesValid && totalLinesValid && allContentWrapped) {
      return lines.join("<br>");
    } else {
      return text;
    }
  }

  let poetryInterval;

  function loadRandomPoetry() {
    fetch("../cdn/sentences.json")
      .then((res) => res.json())
      .then((data) => {
        const container = document.getElementById("poem-content");
        const footer = document.querySelector(".poem-footer");

        if (container && footer) {
          container.classList.add("poem-content-exit");
          footer.classList.add("poem-footer-exit");

          const exitAnimationDuration = 800;

          setTimeout(() => {
            const entry = data[Math.floor(Math.random() * data.length)];
            const randomLine =
              entry.content[Math.floor(Math.random() * entry.content.length)];

            const wrappedContent = smartWrapPoetry(randomLine);
            container.innerHTML = wrappedContent;
            footer.textContent = `${entry.title} · ${entry.author}`;

            container.classList.add("is-poem");
            container.classList.remove("is-prose");

            const baseFontSize = 4.5;
            const maxLengthForMinFont = 25;
            const minFontSize = 2;

            const displayedTextLength = container.textContent.length;
            let newFontSize = baseFontSize;

            if (displayedTextLength > maxLengthForMinFont) {
              newFontSize = Math.max(
                minFontSize,
                baseFontSize -
                  (displayedTextLength - maxLengthForMinFont) * 0.05
              );
            }
            container.style.fontSize = `${newFontSize}vw`;

            container.classList.remove("poem-content-exit");
            footer.classList.remove("poem-footer-exit");
            container.classList.add("poem-content-enter");
            footer.classList.add("poem-content-enter");

            const displayedText = container.textContent || container.innerText;
            const baseTime = 3000;
            const timePerChar = 150;
            const newInterval = baseTime + displayedText.length * timePerChar;

            clearInterval(poetryInterval);
            poetryInterval = setInterval(loadRandomPoetry, newInterval);
          }, exitAnimationDuration);
        }
      })
      .catch((err) => console.error("加载诗词失败：", err));
  }

  loadRandomPoetry();
  poetryInterval = setInterval(loadRandomPoetry, 5000);

  const script = document.createElement('script');
  script.src = 'poetry-bg.js';
  document.body.appendChild(script);
});
