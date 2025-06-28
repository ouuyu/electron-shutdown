document.addEventListener("DOMContentLoaded", () => {
  /**
   * 使用动态规划寻找诗文的最佳分行方式。
   * 该函数会尝试 2 到 maxLines 的所有分行可能性，
   * 并找出使各行长度方差最小（即各行长度最平均）的方案。
   * @param {string} text - 待处理的诗文。
   * @param {number} maxLines - 允许的最大行数。
   * @returns {string} - 处理后，用 <br> 连接的 HTML 字符串。
   */
  function smartWrapPoetry(text, maxLines = 4) {
    // 1. 预处理：切分短语，处理边缘情况
    if (!text || typeof text !== 'string') return '';
    const clauses = text.match(/[^，。；！？、]+[，。；！？、]?/g) || [];
    const n = clauses.length;
    if (n <= 1) return text;

    // 计算每个短语的长度和长度的前缀和，用于高效计算区间长度
    const lengths = clauses.map(c => c.length);
    const prefixSums = [0];
    for (let i = 0; i < n; i++) {
      prefixSums[i + 1] = prefixSums[i] + lengths[i];
    }
    const totalLength = prefixSums[n];

    let bestOverall = {
      variance: Infinity,
      partition: [text], // 存储找到的最佳分割方案
    };

    // 2. 遍历所有可能的分行数量 (k)
    const maxPossibleLines = Math.min(n, maxLines);
    for (let k = 2; k <= maxPossibleLines; k++) {
      // 3. 动态规划：为当前的 k 寻找最优分割（最小平方和）
      // dp[i][j] = 将前 j 个短语分成 i 行的最小"长度平方和"
      const dp = Array(k + 1).fill(0).map(() => Array(n + 1).fill(Infinity));
      // splits[i][j] = 记录达成 dp[i][j] 时，最后一行的起始短语索引
      const splits = Array(k + 1).fill(0).map(() => Array(n + 1).fill(0));

      // 初始化：当只分为 1 行时
      for (let j = 1; j <= n; j++) {
        const len = prefixSums[j];
        dp[1][j] = len * len;
      }

      // DP 核心递推：计算 2 到 k 行的情况
      for (let i = 2; i <= k; i++) {       // i: 当前目标行数
        for (let j = i; j <= n; j++) {     // j: 当前处理的短语数
          for (let p = i - 1; p < j; p++) { // p: 尝试不同的分割点
            const lastLineLen = prefixSums[j] - prefixSums[p];
            const currentCost = dp[i - 1][p] + lastLineLen * lastLineLen;
            if (currentCost < dp[i][j]) {
              dp[i][j] = currentCost;
              splits[i][j] = p; // 记录这个最佳分割点
            }
          }
        }
      }

      // 4. 计算当前 k 分行方案的方差
      const sumOfSquares = dp[k][n];
      if (sumOfSquares === Infinity) continue;
      const mean = totalLength / k;
      const variance = (sumOfSquares / k) - (mean * mean);

      // 5. 如果当前方案更优，则更新最佳结果
      if (variance < bestOverall.variance) {
        bestOverall.variance = variance;
        
        // 回溯 `splits` 表以重建分割方案
        const currentPartition = [];
        let currentSplit = n;
        for (let i = k; i > 0; i--) {
          const prevSplit = splits[i][currentSplit];
          const lineClauses = clauses.slice(prevSplit, currentSplit);
          currentPartition.unshift(lineClauses.join(''));
          currentSplit = prevSplit;
        }
        bestOverall.partition = currentPartition;
      }
    }

    // 6. 返回找到的最优分割方案
    return bestOverall.partition.join('<br>');
  }

  let poetryInterval;

  function loadRandomPoetry() {
    fetch("../cdn/sentences.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP 错误! 状态: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const container = document.getElementById("poem-content");
        const footer = document.querySelector(".poem-footer");

        if (!Array.isArray(data) || data.length === 0) {
          console.error("诗词数据加载失败：文件为空或格式不正确。");
          if (container) container.innerHTML = "诗词数据加载失败<br>请检查文件格式";
          if (poetryInterval) clearInterval(poetryInterval);
          return;
        }

        if (container && footer) {
          container.classList.add("poem-content-exit");
          footer.classList.add("poem-footer-exit");

          const exitAnimationDuration = 800;

          setTimeout(() => {
            const entry = data[Math.floor(Math.random() * data.length)];
            if (!entry || !entry.content || !Array.isArray(entry.content) || entry.content.length === 0) {
              console.error("当前诗词条目无效或内容为空，将尝试重新加载。", entry);
              loadRandomPoetry();
              return;
            }

            const randomLine = entry.content[Math.floor(Math.random() * entry.content.length)];

            if (typeof randomLine !== 'string' || randomLine.trim() === '') {
              console.error("当前诗句无效或为空，将尝试重新加载。");
              loadRandomPoetry();
              return;
            }
            
            const wrappedContent = smartWrapPoetry(randomLine, 3);
            container.innerHTML = wrappedContent;
            footer.textContent = `${entry.author} 《${entry.title}》`;

            container.classList.add("is-poem");
            container.classList.remove("is-prose");
            
            const baseFontSize = 4.5;
            const maxLengthForMinFont = 25;
            const minFontSize = 2.5;
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
            const baseTime = 1500;
            const timePerChar = 100;
            const newInterval = baseTime + displayedText.length * timePerChar;

            clearInterval(poetryInterval);
            poetryInterval = setInterval(loadRandomPoetry, newInterval);
          }, exitAnimationDuration);
        }
      })
      .catch((err) => {
        console.error("加载诗词文件失败：", err);
        const container = document.getElementById("poem-content");
        if (container) {
          container.innerHTML = "诗词加载失败<br>请检查网络或文件路径";
        }
        if (poetryInterval) clearInterval(poetryInterval);
      });
  }

  loadRandomPoetry();
  poetryInterval = setInterval(loadRandomPoetry, 1000);

  const script = document.createElement("script");
  script.src = "poetry-bg.js";
  document.body.appendChild(script);
});