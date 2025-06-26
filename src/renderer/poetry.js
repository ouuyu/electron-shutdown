document.addEventListener('DOMContentLoaded', () => {
    function isPoem(text) {
        const segments = text.split(/[，。！？]/).filter(s => s.trim().length > 0);
        if (segments.length <= 1) return false;

        let totalLen = 0;
        let maxLen = 0;
        let minLen = Infinity;

        segments.forEach(s => {
            const len = s.length;
            totalLen += len;
            if (len > maxLen) maxLen = len;
            if (len < minLen) minLen = len;
        });

        const averageLen = totalLen / segments.length;
        return (maxLen - minLen) < (averageLen / 2) && segments.length >= 2;
    }

    function smartWrapPoetry(text) {
        const MAX_LINES = 4;
        const MAX_CHARS_PER_LINE = 10;

        const delimiters = /[，、。；！？.,]/g;

        let lines = [];
        let currentLine = '';
        let lastSplitIndex = 0;

        let match;
        const potentialSegments = [];
        while ((match = delimiters.exec(text)) !== null) {
            const segment = text.substring(lastSplitIndex, match.index + 1);
            potentialSegments.push(segment);
            lastSplitIndex = match.index + 1;
        }
        if (lastSplitIndex < text.length) {
            potentialSegments.push(text.substring(lastSplitIndex));
        }

        for (let i = 0; i < potentialSegments.length; i++) {
            const segment = potentialSegments[i].trim();
            if (segment.length === 0) continue;

            if ((currentLine + segment).length <= MAX_CHARS_PER_LINE && lines.length < MAX_LINES) {
                currentLine += segment;
            } else {
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                }
                currentLine = segment;

                while (currentLine.length > MAX_CHARS_PER_LINE && lines.length < MAX_LINES) {
                    lines.push(currentLine.substring(0, MAX_CHARS_PER_LINE));
                    currentLine = currentLine.substring(MAX_CHARS_PER_LINE);
                }
            }
        }
        if (currentLine.length > 0 && lines.length < MAX_LINES) {
            lines.push(currentLine);
        }

        const isValidLines = lines.length > 0 && lines.length <= MAX_LINES && lines.every(line => line.length <= MAX_CHARS_PER_LINE);

        if (isValidLines && lines.length > 1) {
            return lines.join('<br>');
        } else {
            return text;
        }
    }

    let poetryInterval;

    function loadRandomPoetry() {
        fetch('../cdn/sentences.json')
            .then(res => res.json())
            .then(data => {
                const container = document.getElementById('poem-content');
                const footer = document.querySelector('.poem-footer');

                if (container && footer) {
                    container.classList.add('poem-content-exit');
                    footer.classList.add('poem-footer-exit');

                    const exitAnimationDuration = 800;

                    setTimeout(() => {
                        const entry = data[Math.floor(Math.random() * data.length)];
                        const randomLine = entry.content[Math.floor(Math.random() * entry.content.length)];

                        const wrappedContent = smartWrapPoetry(randomLine);
                        container.innerHTML = wrappedContent;
                        footer.textContent = `${entry.title} · ${entry.author}`;

                        container.classList.add('is-poem');
                        container.classList.remove('is-prose');

                        const baseFontSize = 4.5;
                        const maxLengthForMinFont = 25;
                        const minFontSize = 2;

                        const displayedTextLength = container.textContent.length;
                        let newFontSize = baseFontSize;

                        if (displayedTextLength > maxLengthForMinFont) {
                            newFontSize = Math.max(minFontSize, baseFontSize - (displayedTextLength - maxLengthForMinFont) * 0.05);
                        }
                        container.style.fontSize = `${newFontSize}vw`;

                        container.classList.remove('poem-content-exit');
                        footer.classList.remove('poem-footer-exit');
                        container.classList.add('poem-content-enter');
                        footer.classList.add('poem-content-enter');

                        const displayedText = container.textContent || container.innerText;
                        const baseTime = 3000;
                        const timePerChar = 150;
                        const newInterval = baseTime + (displayedText.length * timePerChar);

                        clearInterval(poetryInterval);
                        poetryInterval = setInterval(loadRandomPoetry, newInterval);
                    }, exitAnimationDuration);
                }
            })
            .catch(err => console.error('加载诗词失败：', err));
    }

    loadRandomPoetry();
    poetryInterval = setInterval(loadRandomPoetry, 5000);
});