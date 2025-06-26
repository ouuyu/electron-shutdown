document.addEventListener('DOMContentLoaded', () => {
    function isPoem(text) {
        // ... (保持不变)
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

        const delimiters = /[，、。；！？.,]/g; // 分隔符

        let lines = [];
        let currentLine = '';
        let lastSplitIndex = 0;

        let match;
        const potentialSegments = []; // 潜在的文本段
        while ((match = delimiters.exec(text)) !== null) {
            const segment = text.substring(lastSplitIndex, match.index + 1);
            potentialSegments.push(segment);
            lastSplitIndex = match.index + 1;
        }
        // 添加最后一段文本（如果存在）
        if (lastSplitIndex < text.length) {
            potentialSegments.push(text.substring(lastSplitIndex));
        }

        // 尝试按规则分行
        let tempLines = [];
        let tempCurrentLine = '';
        let canWrapSuccessfully = true; // 标记是否能成功分行

        for (let i = 0; i < potentialSegments.length; i++) {
            const segment = potentialSegments[i].trim();
            if (segment.length === 0) continue;

            // 如果当前行加上新段不会超过最大字符限制，并且总行数未超过最大行数
            if ((tempCurrentLine + segment).length <= MAX_CHARS_PER_LINE && tempLines.length < MAX_LINES) {
                tempCurrentLine += segment;
            } else {
                // 如果当前行有内容，先将其添加到临时行数组
                if (tempCurrentLine.length > 0) {
                    tempLines.push(tempCurrentLine);
                }
                tempCurrentLine = segment; // 开始新行

                // 如果新行本身就超过了最大字符限制，或者已经达到最大行数但还有内容
                // 则无法在不截断或不超出限制的情况下分行
                if (tempCurrentLine.length > MAX_CHARS_PER_LINE || (tempLines.length >= MAX_LINES && tempCurrentLine.length > 0)) {
                    canWrapSuccessfully = false;
                    break; // 无法成功分行，退出循环
                }
            }
        }

        // 将最后一行添加到临时行数组
        if (tempCurrentLine.length > 0 && tempLines.length < MAX_LINES) {
            tempLines.push(tempCurrentLine);
        } else if (tempCurrentLine.length > 0) { // 如果最后一行有内容但无法添加（超出 MAX_LINES）
            canWrapSuccessfully = false;
        }


        // 最终检查：确保所有行都在限制内，并且没有内容丢失
        const allContentWrapped = (tempLines.join('').replace(/\s/g, '') === text.replace(/\s/g, '')); // 检查是否所有内容都被包含
        const allLinesValid = tempLines.every(line => line.length <= MAX_CHARS_PER_LINE);
        const totalLinesValid = tempLines.length > 0 && tempLines.length <= MAX_LINES;


        if (canWrapSuccessfully && allContentWrapped && allLinesValid && totalLinesValid && tempLines.length > 1) {
            // 如果成功分行且没有内容丢失，返回分行后的内容
            return tempLines.join('<br>');
        } else {
            // 否则，返回原始文本
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

                        // 使用修改后的 smartWrapPoetry 函数
                        const wrappedContent = smartWrapPoetry(randomLine);
                        container.innerHTML = wrappedContent;
                        footer.textContent = `${entry.title} · ${entry.author}`;

                        // 根据是否分行决定样式
                        // if (wrappedContent.includes('<br>')) {
                            container.classList.add('is-poem');
                            container.classList.remove('is-prose');
                        // } else {
                        //     container.classList.add('is-prose');
                        //     container.classList.remove('is-poem');
                        // }

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